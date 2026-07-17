# Drug Interaction MCP Server — Master Project Brief

## Stack
- NitroStack (TypeScript) — MCP server framework
- Node.js 18+
- Zod — input validation (comes with NitroStack)
- ESM modules (`"type": "module"` in package.json — **all imports must use `.js` extensions**)
- All APIs are free, no payment required

## Folder Structure (everyone must follow this exactly)
```
drug-interaction-mcp/
├── src/
│   ├── index.ts                         ← Entry point (Person 1 owns)
│   ├── app.module.ts                    ← Root module (Person 1 owns)
│   ├── health/
│   │   └── system.health.ts             ← Health check (generated, do not modify)
│   └── modules/
│       └── drug-interaction/
│           ├── drug-interaction.module.ts  ← Feature module (Person 1 owns)
│           ├── types/
│           │   └── index.ts               ← Shared types (Person 1 creates, EVERYONE imports from here)
│           ├── services/
│           │   ├── openfda.service.ts      ← Person 2 owns
│           │   ├── pubmed.service.ts       ← Person 2 owns
│           │   └── clinical-trials.service.ts ← Person 3 owns
│           ├── tools/
│           │   ├── orchestrator.tools.ts   ← Person 1 owns
│           │   ├── drug-info.tools.ts      ← Person 2 owns
│           │   ├── drug-alternatives.tools.ts ← Person 2 owns
│           │   ├── polypharmacy-risk.tools.ts ← Person 3 owns
│           │   └── clinical-trials.tools.ts   ← Person 3 owns
│           ├── resources/
│           │   └── patient-profile.resource.ts ← Person 4 owns
│           └── prompts/
│               ├── clinical-safety.prompt.ts   ← Person 4 owns
│               └── report-format.prompt.ts     ← Person 4 owns
├── .env.example
├── package.json
└── tsconfig.json
```

## Critical NitroStack Conventions
1. **ESM Imports**: Always use `.js` extensions in imports: `import { Foo } from './bar.js';`
2. **Bootstrap**: Entry point is `src/index.ts`, calls `server.start()` (NOT `app.listen()`)
3. **Modules**: Use feature modules with `@Module({ providers, exports })`. Root module uses `imports` to wire feature modules.
4. **DI**: Use `@Injectable()` on services. Tools/resources/prompts also need `@Injectable()`.
5. **ConfigModule**: Root module imports `ConfigModule.forRoot()` — do not remove.
6. **Health Checks**: `src/health/system.health.ts` is already generated — keep it.
7. **Prompts**: Use `arguments` array syntax (NOT `argsSchema` with Zod). See Person 4's doc.

## The 5 Tools Being Built
| Tool | Owner | What it does |
|---|---|---|
| `check_drug_interactions` | Person 1 | Orchestrator — runs OpenFDA + PubMed + ClinicalTrials in parallel |
| `get_drug_info` | Person 2 | Returns enzyme pathways, class, mechanisms for any drug |
| `get_drug_alternatives` | Person 2 | Returns safer alternatives including brand/generic names, side effects |
| `get_patient_polypharmacy_risk` | Person 3 | Audits a patient's full existing medication list for interactions |
| `search_clinical_trials` | Person 3 | Standalone clinical trials search |

## The 2 Resources
| Resource | Owner | What it does |
|---|---|---|
| `patient_profile` | Person 4 | Current patient's clinical context |
| `demo_patient` | Person 4 | Pre-loaded demo patient for hackathon |

## The 3 Prompts (4 prompt methods)
| Prompt | Owner | What it does |
|---|---|---|
| `clinical_safety_check` | Person 4 | Clinical pharmacologist reasoning workflow |
| `polypharmacy_audit` | Person 4 | Full medication audit workflow |
| `interaction_report` | Person 4 | Structured clinical report generator |

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

## Error Handling Rule (everyone follows this)
Every API call must be wrapped in try/catch and return an empty array on failure — never throw. The server must stay alive even if one API is down.
```typescript
try {
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
} catch {
  return [];
}
```

## Import Pattern Rule (everyone follows this)
Always use `.js` extensions in imports. This project uses ESM modules.
```typescript
// ✅ CORRECT
import { OpenFdaService } from '../services/openfda.service.js';
import { DrugInfo } from '../types/index.js';

// ❌ WRONG — will crash at runtime
import { OpenFdaService } from '../services/openfda.service';
```
