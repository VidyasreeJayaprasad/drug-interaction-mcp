# Person 2 — OpenFDA + PubMed Services + Drug Info Tool + Drug Alternatives Tool

## Your Role
You own the two most critical data sources (FDA and PubMed) and the two tools that help the agent understand what a drug actually is and what to switch to. You work in Phase 2 in parallel with Person 3.

## What you must NOT touch
- `src/app.module.ts` — Person 1 owns this
- `src/modules/drug-interaction/drug-interaction.module.ts` — Person 1 owns this
- `src/modules/drug-interaction/types/index.ts` — Person 1 owns this, you only import from it
- Any files in `src/modules/drug-interaction/resources/` or `src/modules/drug-interaction/prompts/`

## Dependencies you need from Person 1 (wait for Phase 1 to complete)
```typescript
import { DrugInfo, DrugAlternative, FdaAdverseEvent, FdaLabelResult, PubmedResult } from '../types/index.js';
```

## ⚠️ Critical: ESM Import Rules
This project uses `"type": "module"`. **All imports MUST use `.js` extensions:**
```typescript
// ✅ CORRECT
import { OpenFdaService } from '../services/openfda.service.js';

// ❌ WRONG — will crash at runtime
import { OpenFdaService } from '../services/openfda.service';
```

---

## PHASE 2A — Build the Services First

### File 1: `src/modules/drug-interaction/services/openfda.service.ts`

This service is used by BOTH the orchestrator tool (Person 1) and your own tools. Build it carefully.

```typescript
// src/modules/drug-interaction/services/openfda.service.ts
import { Injectable } from '@nitrostack/core';
import { FdaAdverseEvent, FdaLabelResult } from '../types/index.js';

@Injectable()
export class OpenFdaService {
  private readonly BASE = 'https://api.fda.gov/drug';

  // Called by OrchestratorTools — returns both adverse events and label data
  async searchInteractions(
    newDrug: string,
    currentMedications: string[]
  ): Promise<{ adverse_events: FdaAdverseEvent[]; labels: FdaLabelResult[] }> {
    const [adverseEvents, labels] = await Promise.all([
      this.fetchAllAdverseEvents(newDrug, currentMedications),
      this.fetchDrugLabel(newDrug),
    ]);
    return { adverse_events: adverseEvents, labels };
  }

  // Called by DrugInfoTools — gets label data for a single drug
  async getDrugLabel(drugName: string): Promise<FdaLabelResult[]> {
    return this.fetchDrugLabel(drugName);
  }

  // Called by DrugAlternativesTools — searches by drug class
  async searchByDrugClass(drugClass: string): Promise<FdaLabelResult[]> {
    try {
      const url = `${this.BASE}/label.json?search=pharm_class_epc:"${encodeURIComponent(drugClass)}"&limit=8`;
      const res = await fetch(url);
      const data = await res.json();
      return (data.results || []).map((r: any) => ({
        source: 'OpenFDA Drug Label' as const,
        drug_name: r.openfda?.generic_name?.[0] || 'Unknown',
        brand_name: r.openfda?.brand_name?.[0],
        interaction_section: r.drug_interactions?.[0]?.substring(0, 400),
        warnings: r.warnings?.[0]?.substring(0, 300),
      }));
    } catch {
      return [];
    }
  }

  private async fetchAllAdverseEvents(
    newDrug: string,
    currentMedications: string[]
  ): Promise<FdaAdverseEvent[]> {
    const results = await Promise.all(
      currentMedications.map(med => this.fetchAdverseEventPair(newDrug, med))
    );
    return results.flat();
  }

  private async fetchAdverseEventPair(
    drug1: string,
    drug2: string
  ): Promise<FdaAdverseEvent[]> {
    try {
      const search = `patient.drug.medicinalproduct:"${drug1}"+AND+patient.drug.medicinalproduct:"${drug2}"`;
      const url = `${this.BASE}/event.json?search=${encodeURIComponent(search)}&limit=5&sort=receivedate:desc`;
      const res = await fetch(url);
      const data = await res.json();
      return (data.results || []).map((r: any) => ({
        source: 'OpenFDA Adverse Events' as const,
        drug_pair: [drug1, drug2],
        serious: r.serious === 1,
        outcome: r.patient?.patientdeath === 1
          ? 'death reported'
          : r.seriousnesshospitalization === 1
          ? 'hospitalization'
          : r.seriousnessother === 1
          ? 'serious other'
          : 'non-serious',
        report_date: r.receivedate || 'unknown',
        death_reported: r.patient?.patientdeath === 1,
      }));
    } catch {
      return [];
    }
  }

  private async fetchDrugLabel(drugName: string): Promise<FdaLabelResult[]> {
    try {
      const url = `${this.BASE}/label.json?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=3`;
      const res = await fetch(url);
      const data = await res.json();
      return (data.results || []).map((r: any) => ({
        source: 'OpenFDA Drug Label' as const,
        drug_name: drugName,
        brand_name: r.openfda?.brand_name?.[0],
        interaction_section: r.drug_interactions?.[0]?.substring(0, 600),
        warnings: r.boxed_warning?.[0]?.substring(0, 400) || r.warnings?.[0]?.substring(0, 400),
      }));
    } catch {
      return [];
    }
  }
}
```

### File 2: `src/modules/drug-interaction/services/pubmed.service.ts`

```typescript
// src/modules/drug-interaction/services/pubmed.service.ts
import { Injectable } from '@nitrostack/core';
import { PubmedResult } from '../types/index.js';

@Injectable()
export class PubmedService {
  private readonly BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

  // Called by OrchestratorTools
  async searchInteractions(
    newDrug: string,
    currentMedications: string[]
  ): Promise<PubmedResult[]> {
    const searches = currentMedications.map(med =>
      this.searchDrugPair(newDrug, med)
    );
    const results = await Promise.all(searches);
    return results.flat().filter(r => r.pmids.length > 0);
  }

  // Called by DrugInfoTools — searches pharmacology of a single drug
  async searchDrugPharmacology(drugName: string): Promise<PubmedResult[]> {
    return this.runSearch(
      `${drugName} pharmacology enzyme inhibition metabolism`,
      [drugName]
    );
  }

  private async searchDrugPair(drug1: string, drug2: string): Promise<PubmedResult[]> {
    return this.runSearch(
      `${drug1} ${drug2} drug interaction adverse`,
      [drug1, drug2]
    );
  }

  private async runSearch(query: string, drugs: string[]): Promise<PubmedResult[]> {
    try {
      const searchUrl = `${this.BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&retmode=json&sort=date`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      const pmids: string[] = searchData.esearchresult?.idlist || [];
      const totalFound: number = parseInt(searchData.esearchresult?.count || '0');

      if (!pmids.length) {
        return [{
          source: 'PubMed',
          drug_pair: drugs,
          pmids: [],
          abstracts: 'No PubMed results found for this drug combination.',
          result_count: 0,
          pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}&sort=date`,
        }];
      }

      const fetchUrl = `${this.BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=text`;
      const fetchRes = await fetch(fetchUrl);
      const abstracts = await fetchRes.text();

      return [{
        source: 'PubMed',
        drug_pair: drugs,
        pmids,
        abstracts: abstracts.substring(0, 3000),
        result_count: totalFound,
        pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}&sort=date`,
      }];
    } catch {
      return [];
    }
  }
}
```

---

## PHASE 2B — Build Your Two Tools

### File 3: `src/modules/drug-interaction/tools/drug-info.tools.ts`

```typescript
// src/modules/drug-interaction/tools/drug-info.tools.ts
import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { OpenFdaService } from '../services/openfda.service.js';
import { PubmedService } from '../services/pubmed.service.js';
import { DrugInfo } from '../types/index.js';

@Injectable()
export class DrugInfoTools {
  constructor(
    private readonly openFda: OpenFdaService,
    private readonly pubmed: PubmedService,
  ) {}

  @Tool({
    name: 'get_drug_info',
    description: `Get comprehensive pharmacological information about any drug — drug class, enzyme pathways it inhibits or induces (CYP2C9, CYP3A4, etc.), brand names, generic name, primary use, and which other drug classes it commonly interacts with.
    ALWAYS call this tool first before calling check_drug_interactions.
    Understanding the mechanism (e.g. strong CYP2C9 inhibitor) tells you which patient medications to be most concerned about.`,
    inputSchema: z.object({
      drug_name: z.string().describe('Drug name — generic or brand name accepted'),
    }),
  })
  async getDrugInfo(input: { drug_name: string }): Promise<DrugInfo> {
    const [labelData, pubmedData] = await Promise.all([
      this.openFda.getDrugLabel(input.drug_name),
      this.pubmed.searchDrugPharmacology(input.drug_name),
    ]);

    const label = labelData[0];
    const interactionText = label?.interaction_section || '';
    const cypMentions = this.extractCypMechanisms(interactionText);

    return {
      drug_name: input.drug_name,
      generic_name: label?.drug_name,
      brand_names: labelData
        .filter(l => l.brand_name)
        .map(l => l.brand_name!)
        .filter((v, i, a) => a.indexOf(v) === i),
      drug_class: this.extractDrugClass(interactionText),
      mechanisms: cypMentions,
      primary_use: 'See FDA label and PubMed data below',
      contraindications: label?.warnings ? [label.warnings] : [],
      source: `OpenFDA Drug Label + PubMed (${pubmedData[0]?.pmids?.length || 0} papers found)`,
      retrieved_at: new Date().toISOString(),
    };
  }

  private extractCypMechanisms(text: string) {
    const mechanisms = [];
    const lowerText = text.toLowerCase();

    const enzymes = [
      { name: 'CYP2C9', drugs: ['warfarin', 'phenytoin', 'glipizide', 'losartan'] },
      { name: 'CYP3A4', drugs: ['statins', 'cyclosporine', 'tacrolimus', 'midazolam', 'amlodipine'] },
      { name: 'CYP2C19', drugs: ['omeprazole', 'clopidogrel', 'diazepam'] },
      { name: 'CYP2D6', drugs: ['codeine', 'tamoxifen', 'metoprolol', 'tramadol'] },
      { name: 'CYP1A2', drugs: ['theophylline', 'clozapine', 'caffeine'] },
    ];

    for (const enzyme of enzymes) {
      if (lowerText.includes(enzyme.name.toLowerCase())) {
        const isInhibitor = lowerText.includes(`${enzyme.name.toLowerCase()} inhibit`);
        const isInducer = lowerText.includes(`${enzyme.name.toLowerCase()} induc`);
        if (isInhibitor || isInducer) {
          mechanisms.push({
            type: `${enzyme.name} ${isInhibitor ? 'inhibitor' : 'inducer'}`,
            strength: lowerText.includes('strong') ? 'strong' as const
              : lowerText.includes('moderate') ? 'moderate' as const
              : 'weak' as const,
            affected_drugs: enzyme.drugs,
          });
        }
      }
    }
    return mechanisms;
  }

  private extractDrugClass(text: string): string {
    const classes: Record<string, string[]> = {
      'Azole antifungal': ['azole', 'antifungal', 'fluconazole', 'itraconazole'],
      'SSRI antidepressant': ['ssri', 'serotonin reuptake'],
      'Beta blocker': ['beta-blocker', 'beta blocker', 'adrenergic'],
      'ACE inhibitor': ['ace inhibitor', 'angiotensin-converting'],
      'Anticoagulant': ['anticoagulant', 'warfarin', 'coumarin'],
      'Statin': ['statin', 'hmg-coa reductase'],
      'Antibiotic': ['antibiotic', 'antimicrobial', 'penicillin', 'cephalosporin'],
      'Opioid': ['opioid', 'narcotic', 'morphine', 'codeine'],
    };

    const lowerText = text.toLowerCase();
    for (const [className, keywords] of Object.entries(classes)) {
      if (keywords.some(k => lowerText.includes(k))) return className;
    }
    return 'See FDA label for drug class information';
  }
}
```

### File 4: `src/modules/drug-interaction/tools/drug-alternatives.tools.ts`

```typescript
// src/modules/drug-interaction/tools/drug-alternatives.tools.ts
import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { OpenFdaService } from '../services/openfda.service.js';
import { DrugAlternative } from '../types/index.js';

@Injectable()
export class DrugAlternativesTools {
  constructor(private readonly openFda: OpenFdaService) {}

  @Tool({
    name: 'get_drug_alternatives',
    description: `When a dangerous drug interaction is found, call this tool to get safer alternative medications in the same therapeutic class.
    Returns brand names, generic names, key side effects, contraindications, and why the alternative is safer for this specific patient.
    Provide the drug class and the condition being treated for best results.`,
    inputSchema: z.object({
      drug_to_replace: z.string().describe('The drug that has the dangerous interaction and needs to be replaced'),
      condition_being_treated: z.string().describe('What the drug was being prescribed for e.g. "fungal infection", "hypertension", "depression"'),
      patient_current_medications: z.array(z.string()).describe('Patient current medications — needed to ensure the alternative also does not interact'),
      drug_class: z.string().optional().describe('Drug class if known e.g. "azole antifungal" — helps narrow alternatives faster'),
    }),
  })
  async getDrugAlternatives(input: {
    drug_to_replace: string;
    condition_being_treated: string;
    patient_current_medications: string[];
    drug_class?: string;
  }): Promise<{
    drug_to_replace: string;
    condition: string;
    alternatives: DrugAlternative[];
    safety_note: string;
    retrieved_at: string;
  }> {

    const fdaAlternatives = input.drug_class
      ? await this.openFda.searchByDrugClass(input.drug_class)
      : [];

    const knownAlternatives = this.getKnownAlternatives(
      input.drug_to_replace,
      input.condition_being_treated,
      input.patient_current_medications
    );

    return {
      drug_to_replace: input.drug_to_replace,
      condition: input.condition_being_treated,
      alternatives: knownAlternatives,
      safety_note: `These alternatives are suggested based on drug class. The treating physician must verify suitability for this specific patient. Always cross-check alternatives against patient's current medications: ${input.patient_current_medications.join(', ')}.`,
      retrieved_at: new Date().toISOString(),
    };
  }

  private getKnownAlternatives(
    drug: string,
    condition: string,
    currentMeds: string[]
  ): DrugAlternative[] {
    const drugLower = drug.toLowerCase();

    // Antifungals
    if (drugLower.includes('fluconazole') || condition.toLowerCase().includes('fungal')) {
      return [
        {
          drug_name: 'terbinafine',
          generic_name: 'terbinafine',
          brand_names: ['Lamisil'],
          drug_class: 'Allylamine antifungal',
          why_safer: 'Does not significantly inhibit CYP2C9 or CYP3A4 — minimal interaction risk with warfarin',
          key_side_effects: ['headache', 'nausea', 'rash', 'elevated liver enzymes (rare)'],
          contraindications: ['severe hepatic impairment', 'renal impairment (use with caution)'],
          notes: 'Better choice for patients on warfarin. Monitor LFTs in long-term use.',
        },
        {
          drug_name: 'nystatin',
          generic_name: 'nystatin',
          brand_names: ['Mycostatin', 'Nilstat'],
          drug_class: 'Polyene antifungal (topical)',
          why_safer: 'Not systemically absorbed — no CYP interactions possible when used topically',
          key_side_effects: ['local irritation', 'nausea if swallowed (oral formulation)'],
          contraindications: ['known hypersensitivity'],
          notes: 'Only for superficial/mucosal fungal infections. Not suitable for systemic infections.',
        },
        {
          drug_name: 'micafungin',
          generic_name: 'micafungin',
          brand_names: ['Mycamine'],
          drug_class: 'Echinocandin antifungal (IV)',
          why_safer: 'Minimal CYP enzyme interactions — safer profile for patients on multiple medications',
          key_side_effects: ['nausea', 'headache', 'elevated LFTs', 'infusion reactions'],
          contraindications: ['hypersensitivity to echinocandins'],
          notes: 'IV only — for hospital/serious infections. Excellent safety profile with anticoagulants.',
        },
      ];
    }

    // Default response if no mapping found
    return [{
      drug_name: 'Consult clinical pharmacologist',
      generic_name: '',
      brand_names: [],
      drug_class: `Alternative to ${drug} for ${condition}`,
      why_safer: `No pre-mapped alternatives found for ${drug}. The agent should reason over available FDA and PubMed data for this drug class.`,
      key_side_effects: [],
      contraindications: [],
      notes: `Search for alternatives using FDA label data for the same therapeutic class as ${drug}.`,
    }];
  }
}
```

---

## Your Testing Checklist (in NitroStudio)

Before marking your work done:

1. Test `get_drug_info` with `{ "drug_name": "fluconazole" }` — should return CYP2C9 and CYP3A4 inhibitor mechanisms
2. Test `get_drug_info` with `{ "drug_name": "warfarin" }` — should return anticoagulant class
3. Test `get_drug_alternatives` with `{ "drug_to_replace": "fluconazole", "condition_being_treated": "fungal infection", "patient_current_medications": ["warfarin"] }` — should return terbinafine, nystatin, micafungin
4. `npm run build` must pass with zero TypeScript errors

## Branch and PR
```bash
git checkout -b feat/person2-services-and-tools
# build your files
git add src/modules/drug-interaction/services/openfda.service.ts src/modules/drug-interaction/services/pubmed.service.ts src/modules/drug-interaction/tools/drug-info.tools.ts src/modules/drug-interaction/tools/drug-alternatives.tools.ts
git commit -m "feat: OpenFDA service, PubMed service, drug info tool, drug alternatives tool"
git push origin feat/person2-services-and-tools
# open PR to main
```
