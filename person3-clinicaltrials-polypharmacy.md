# Person 3 — ClinicalTrials Service + Polypharmacy Risk Tool + Clinical Trials Tool

## Your Role
You own ClinicalTrials.gov (the data source that gives the project its "live emerging research" angle) and the polypharmacy risk tool — which is arguably the most clinically important tool because it doesn't wait for a doctor to ask, it audits everything the patient is already on.

## What you must NOT touch
- `src/app.module.ts` — Person 1 owns this
- `src/modules/drug-interaction/drug-interaction.module.ts` — Person 1 owns this
- `src/modules/drug-interaction/types/index.ts` — Person 1 owns this, only import from it
- Any files in `src/modules/drug-interaction/services/openfda.service.ts` or `src/modules/drug-interaction/services/pubmed.service.ts` — Person 2 owns those

## Dependencies you need from Person 1 (wait for Phase 1 to complete)
```typescript
import { ClinicalTrialResult, PolypharmacyRiskOutput } from '../types/index.js';
```

You also need Person 2's services for the polypharmacy risk tool:
```typescript
import { OpenFdaService } from '../services/openfda.service.js';
import { PubmedService } from '../services/pubmed.service.js';
```
These will exist once Person 2 pushes. Import them anyway — TypeScript will error until their files exist, which is fine.

**Recommended build order:** Build the clinical-trials service and clinical-trials tool first (no dependency on Person 2). Then build the polypharmacy-risk tool once Person 2's services exist.

## ⚠️ Critical: ESM Import Rules
This project uses `"type": "module"`. **All imports MUST use `.js` extensions:**
```typescript
// ✅ CORRECT
import { ClinicalTrialsService } from '../services/clinical-trials.service.js';

// ❌ WRONG — will crash at runtime
import { ClinicalTrialsService } from '../services/clinical-trials.service';
```

---

## PHASE 2A — Build the Service First

### File 1: `src/modules/drug-interaction/services/clinical-trials.service.ts`

```typescript
// src/modules/drug-interaction/services/clinical-trials.service.ts
import { Injectable } from '@nitrostack/core';
import { ClinicalTrialResult } from '../types/index.js';

@Injectable()
export class ClinicalTrialsService {
  private readonly BASE = 'https://clinicaltrials.gov/api/v2/studies';

  // Called by OrchestratorTools — check new drug against each current medication
  async searchStudies(
    newDrug: string,
    currentMedications: string[]
  ): Promise<ClinicalTrialResult[]> {
    const searches = currentMedications.map(med =>
      this.queryDrugPair(newDrug, med)
    );
    const results = await Promise.all(searches);
    return results.flat();
  }

  // Called by ClinicalTrialsTools (standalone) — search by any terms
  async searchByTerms(
    searchTerm: string,
    filters?: {
      status?: 'RECRUITING' | 'COMPLETED' | 'ACTIVE_NOT_RECRUITING';
      condition?: string;
      limit?: number;
    }
  ): Promise<ClinicalTrialResult[]> {
    try {
      const params = new URLSearchParams({
        'query.term': searchTerm,
        'pageSize': String(filters?.limit || 10),
        'format': 'json',
        'fields': 'NCTId,BriefTitle,OverallStatus,StartDate,CompletionDate,BriefSummary,Condition,InterventionName',
      });

      if (filters?.status) {
        params.append('filter.overallStatus', filters.status);
      }

      const res = await fetch(`${this.BASE}?${params}`);
      const data = await res.json();
      return this.parseStudies(data.studies || [], [searchTerm]);
    } catch {
      return [];
    }
  }

  // Called by PolypharmacyRiskTools — same as searchStudies but for existing med pairs
  async searchMedicationPair(drug1: string, drug2: string): Promise<ClinicalTrialResult[]> {
    return this.queryDrugPair(drug1, drug2);
  }

  private async queryDrugPair(drug1: string, drug2: string): Promise<ClinicalTrialResult[]> {
    try {
      const params = new URLSearchParams({
        'query.term': `${drug1} ${drug2}`,
        'pageSize': '5',
        'format': 'json',
        'fields': 'NCTId,BriefTitle,OverallStatus,StartDate,CompletionDate,BriefSummary,Condition',
        'sort': 'LastUpdatePostDate:desc',
      });

      const res = await fetch(`${this.BASE}?${params}`);
      const data = await res.json();
      return this.parseStudies(data.studies || [], [drug1, drug2]);
    } catch {
      return [];
    }
  }

  private parseStudies(studies: any[], drugs: string[]): ClinicalTrialResult[] {
    return studies.map(s => {
      const protocol = s.protocolSection || {};
      const id = protocol.identificationModule || {};
      const status = protocol.statusModule || {};
      const desc = protocol.descriptionModule || {};
      const conditions = protocol.conditionsModule?.conditions || [];

      return {
        source: 'ClinicalTrials.gov' as const,
        drugs,
        nct_id: id.nctId,
        title: id.briefTitle,
        status: status.overallStatus,
        start_date: status.startDateStruct?.date,
        completion_date: status.completionDateStruct?.date,
        summary: desc.briefSummary?.substring(0, 400),
        conditions,
        url: id.nctId ? `https://clinicaltrials.gov/study/${id.nctId}` : undefined,
      };
    });
  }
}
```

---

## PHASE 2B — Build Your Two Tools

### File 2: `src/modules/drug-interaction/tools/clinical-trials.tools.ts`

This is the standalone clinical trials tool. Build this first — it only depends on your own service.

```typescript
// src/modules/drug-interaction/tools/clinical-trials.tools.ts
import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { ClinicalTrialsService } from '../services/clinical-trials.service.js';
import { ClinicalTrialResult } from '../types/index.js';

@Injectable()
export class ClinicalTrialsTools {
  constructor(private readonly clinicalTrials: ClinicalTrialsService) {}

  @Tool({
    name: 'search_clinical_trials',
    description: `Search ClinicalTrials.gov — the US government registry of every clinical trial ever conducted — for studies involving specific drugs, drug combinations, or medical conditions.
    Use this to:
    - Find trials studying the interaction between two drugs
    - Find recently completed trials that may have safety data not yet in mainstream databases
    - Check if there are ongoing trials that have raised safety signals
    - Find trials for a specific drug and condition
    This is especially valuable for drugs approved in the last 1-2 years where trial data is newer than commercial databases.`,
    inputSchema: z.object({
      search_terms: z.string().describe('What to search for e.g. "fluconazole warfarin interaction" or "drug name + condition"'),
      filter_status: z.enum(['RECRUITING', 'COMPLETED', 'ACTIVE_NOT_RECRUITING']).optional()
        .describe('Filter by trial status. COMPLETED gives finished trials with results. RECRUITING shows ongoing trials.'),
      condition: z.string().optional()
        .describe('Narrow by medical condition e.g. "atrial fibrillation" or "fungal infection"'),
      limit: z.number().min(1).max(20).default(10)
        .describe('How many trials to return. Default 10. Use 5 for quick checks, 20 for comprehensive research.'),
    }),
  })
  async searchClinicalTrials(input: {
    search_terms: string;
    filter_status?: 'RECRUITING' | 'COMPLETED' | 'ACTIVE_NOT_RECRUITING';
    condition?: string;
    limit?: number;
  }): Promise<{
    search_terms: string;
    total_results: number;
    trials: ClinicalTrialResult[];
    retrieved_at: string;
    clinicaltrials_url: string;
  }> {
    const fullSearchTerm = input.condition
      ? `${input.search_terms} ${input.condition}`
      : input.search_terms;

    const trials = await this.clinicalTrials.searchByTerms(fullSearchTerm, {
      status: input.filter_status,
      limit: input.limit || 10,
    });

    return {
      search_terms: fullSearchTerm,
      total_results: trials.length,
      trials,
      retrieved_at: new Date().toISOString(),
      clinicaltrials_url: `https://clinicaltrials.gov/search?term=${encodeURIComponent(fullSearchTerm)}`,
    };
  }
}
```

### File 3: `src/modules/drug-interaction/tools/polypharmacy-risk.tools.ts`

⚠️ **This tool depends on Person 2's services.** Build it after Person 2 pushes, or stub the imports and accept TypeScript errors until then.

```typescript
// src/modules/drug-interaction/tools/polypharmacy-risk.tools.ts
import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { OpenFdaService } from '../services/openfda.service.js';
import { PubmedService } from '../services/pubmed.service.js';
import { ClinicalTrialsService } from '../services/clinical-trials.service.js';
import { PolypharmacyRiskOutput, FdaAdverseEvent, PubmedResult, ClinicalTrialResult, FdaLabelResult } from '../types/index.js';

@Injectable()
export class PolypharmacyRiskTools {
  constructor(
    private readonly openFda: OpenFdaService,
    private readonly pubmed: PubmedService,
    private readonly clinicalTrials: ClinicalTrialsService,
  ) {}

  @Tool({
    name: 'get_patient_polypharmacy_risk',
    description: `Audit a patient's COMPLETE existing medication list for drug-drug interactions they may already have — before any new drug is even proposed.
    This is critical for patients on 3 or more medications (polypharmacy).
    Checks every possible drug pair in the patient's current regimen against FDA, PubMed, and ClinicalTrials.gov.
    Use this at the start of a consultation to get a full picture of existing risk before evaluating any new prescription.
    Also call this when a patient is transferred from another doctor and their full medication history needs to be audited.`,
    inputSchema: z.object({
      medications: z.array(z.string()).min(2).describe('Complete current medication list — minimum 2 drugs needed to check interactions'),
      patient_context: z.object({
        age: z.number().optional(),
        conditions: z.array(z.string()).optional(),
        kidney_function: z.string().optional(),
        liver_function: z.string().optional(),
      }).optional().describe('Patient clinical context — helps interpret which interactions are most clinically relevant'),
    }),
  })
  async getPolypharmacyRisk(input: {
    medications: string[];
    patient_context?: {
      age?: number;
      conditions?: string[];
      kidney_function?: string;
      liver_function?: string;
    };
  }): Promise<PolypharmacyRiskOutput> {

    const pairs = this.generateDrugPairs(input.medications);

    const pairResults = await Promise.all(
      pairs.map(([drug1, drug2]) => this.checkPair(drug1, drug2))
    );

    const riskPairs = pairResults
      .filter(p => p.fda_events.length > 0 || p.pubmed_evidence.length > 0)
      .sort((a, b) => {
        const aDeaths = a.fda_events.filter(e => e.death_reported).length;
        const bDeaths = b.fda_events.filter(e => e.death_reported).length;
        return bDeaths - aDeaths;
      });

    return {
      patient_medications: input.medications,
      risk_pairs: riskPairs,
      total_pairs_checked: pairs.length,
      retrieved_at: new Date().toISOString(),
    };
  }

  private generateDrugPairs(medications: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        pairs.push([medications[i], medications[j]]);
      }
    }
    return pairs;
  }

  private async checkPair(drug1: string, drug2: string) {
    const [fdaData, pubmedData, trialData] = await Promise.all([
      this.openFda.searchInteractions(drug1, [drug2]),
      this.pubmed.searchInteractions(drug1, [drug2]),
      this.clinicalTrials.searchMedicationPair(drug1, drug2),
    ]);

    const hasDeaths = fdaData.adverse_events.some(e => e.death_reported);
    const hasSerious = fdaData.adverse_events.some(e => e.serious);

    return {
      drug_a: drug1,
      drug_b: drug2,
      shared_mechanism: 'See FDA label and PubMed data',
      risk_level: (hasDeaths ? 'high' : hasSerious ? 'moderate' : 'low') as 'high' | 'moderate' | 'low',
      fda_events: fdaData.adverse_events,
      pubmed_evidence: pubmedData,
    };
  }
}
```

---

## Your Testing Checklist (in NitroStudio)

Before marking your work done:

1. Test `search_clinical_trials` with `{ "search_terms": "fluconazole warfarin", "filter_status": "COMPLETED", "limit": 5 }` — should return real NCT IDs and titles
2. Test `search_clinical_trials` with `{ "search_terms": "warfarin interaction" }` — no filters, should return 10 results
3. Test `get_patient_polypharmacy_risk` with:
   ```json
   {
     "medications": ["warfarin", "lisinopril", "metformin", "aspirin"],
     "patient_context": { "age": 72, "conditions": ["atrial fibrillation", "type 2 diabetes"] }
   }
   ```
   With 4 medications this produces 6 drug pairs — all 6 should be checked and results returned.
4. Check that `get_patient_polypharmacy_risk` correctly generates pairs: 4 medications = 6 pairs, 5 medications = 10 pairs
5. `npm run build` must pass with zero TypeScript errors

## Branch and PR
```bash
git checkout -b feat/person3-clinicaltrials-polypharmacy
# build your files
git add src/modules/drug-interaction/services/clinical-trials.service.ts src/modules/drug-interaction/tools/clinical-trials.tools.ts src/modules/drug-interaction/tools/polypharmacy-risk.tools.ts
git commit -m "feat: ClinicalTrials service, standalone clinical trials tool, polypharmacy risk tool"
git push origin feat/person3-clinicaltrials-polypharmacy
# open PR to main
```
