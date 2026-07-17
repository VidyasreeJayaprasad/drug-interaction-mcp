# Drug Interaction MCP Server — Complete Division of Labour

> **This is the consolidated reference.** Individual person-specific documents (`person1-lead.md`, `person2-openfda-pubmed.md`, `person3-clinicaltrials-polypharmacy.md`, `person4-prompts-testing.md`) contain the same information broken out per team member. Use whichever format is easier for you.
>
> **Also read `00-master-brief.md`** for the folder structure, conventions, and rules that everyone must follow.

---

## Implementation Phases Overview

| Phase | Who | What | Estimated Time |
|---|---|---|---|
| **Phase 1** | Person 1 only | Fix scaffold, clean calculator refs, create feature module, verify types | 1 hour |
| **Phase 2A** | Persons 2 & 3 in parallel | Build services (OpenFDA, PubMed, ClinicalTrials) | 1–1.5 hours |
| **Phase 2B** | Persons 1, 2, 3, 4 in parallel | Build tools, resources, prompts | 1.5–2 hours |
| **Phase 3** | Person 1 | Wire all providers into feature module, verify build | 30 min |
| **Phase 4** | Person 4 | Integration testing in NitroStudio | 1 hour |
| **Phase 5** | Person 1 + 4 | Demo prep, final testing | 30 min |

### Dependency Graph
```
Person 1 (Phase 1) ──► Everyone else can start Phase 2
                    │
Person 2 (services) ──► Person 3 (polypharmacy tool needs Person 2's services)
                    │
Person 2 + 3 done  ──► Person 1 (Phase 3 wiring)
                    │
Person 1 (wired)   ──► Person 4 (Phase 4 testing)
```

---

## Critical Convention Reminders

### ESM Imports — Everyone must follow this
```typescript
// ✅ CORRECT — always use .js extensions
import { OpenFdaService } from '../services/openfda.service.js';
import { DrugInfo } from '../types/index.js';

// ❌ WRONG — will crash at runtime with "type": "module"
import { OpenFdaService } from '../services/openfda.service';
```

### Error Handling — Everyone must follow this
```typescript
try {
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
} catch {
  return [];
}
```

### @Prompt Decorator — Person 4 must follow this
```typescript
// ✅ CORRECT — use arguments array
@Prompt({
  name: 'my_prompt',
  arguments: [
    { name: 'param1', description: 'First param', required: true },
  ],
})

// ❌ WRONG — argsSchema is not a valid NitroStack option
@Prompt({ argsSchema: z.object({ ... }) })
```

### Bootstrap — Person 1 owns this
```typescript
// ✅ CORRECT — use server.start()
const server = await McpApplicationFactory.create(AppModule);
await server.start();

// ❌ WRONG — app.listen() does not exist
const app = await McpApplicationFactory.create(AppModule);
await app.listen();
```

---

## File Ownership Map

All files live under `src/modules/drug-interaction/` unless otherwise noted.

| File Path | Owner | Phase |
|---|---|---|
| `src/index.ts` | Person 1 | Phase 1 (verify/update) |
| `src/app.module.ts` | Person 1 | Phase 1 (fix) |
| `src/health/system.health.ts` | Generated | Do not modify |
| `src/modules/drug-interaction/drug-interaction.module.ts` | Person 1 | Phase 1 (create skeleton), Phase 3 (wire) |
| `src/modules/drug-interaction/types/index.ts` | Person 1 | Phase 1 (verify) |
| `src/modules/drug-interaction/services/openfda.service.ts` | Person 2 | Phase 2A |
| `src/modules/drug-interaction/services/pubmed.service.ts` | Person 2 | Phase 2A |
| `src/modules/drug-interaction/services/clinical-trials.service.ts` | Person 3 | Phase 2A |
| `src/modules/drug-interaction/tools/orchestrator.tools.ts` | Person 1 | Phase 2B |
| `src/modules/drug-interaction/tools/drug-info.tools.ts` | Person 2 | Phase 2B |
| `src/modules/drug-interaction/tools/drug-alternatives.tools.ts` | Person 2 | Phase 2B |
| `src/modules/drug-interaction/tools/clinical-trials.tools.ts` | Person 3 | Phase 2B |
| `src/modules/drug-interaction/tools/polypharmacy-risk.tools.ts` | Person 3 | Phase 2B (after Person 2 done) |
| `src/modules/drug-interaction/resources/patient-profile.resource.ts` | Person 4 | Phase 2B |
| `src/modules/drug-interaction/prompts/clinical-safety.prompt.ts` | Person 4 | Phase 2B |
| `src/modules/drug-interaction/prompts/report-format.prompt.ts` | Person 4 | Phase 2B |

---

## Per-Person Detailed Instructions

For complete code and instructions for each team member, see:
- **Person 1:** `person1-lead.md`
- **Person 2:** `person2-openfda-pubmed.md`
- **Person 3:** `person3-clinicaltrials-polypharmacy.md`
- **Person 4:** `person4-prompts-testing.md`

---

## The 5 Tools Being Built

| Tool | Owner | What it does |
|---|---|---|
| `check_drug_interactions` | Person 1 | Orchestrator — runs OpenFDA + PubMed + ClinicalTrials in parallel |
| `get_drug_info` | Person 2 | Returns enzyme pathways, class, mechanisms for any drug |
| `get_drug_alternatives` | Person 2 | Returns safer alternatives including brand/generic names, side effects |
| `get_patient_polypharmacy_risk` | Person 3 | Audits a patient's full existing medication list for interactions |
| `search_clinical_trials` | Person 3 | Standalone clinical trials search |

## The 3 APIs

| API | Base URL | Auth |
|---|---|---|
| OpenFDA | `https://api.fda.gov/drug/` | None needed |
| PubMed | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/` | None needed |
| ClinicalTrials.gov | `https://clinicaltrials.gov/api/v2/studies` | None needed |

## Git Rules
- `main` branch is protected — never push directly
- Branch naming: `feat/[your-name]-[what-you-built]`
- PRs reviewed by Person 1 before merging
- Always `npm install` after pulling
