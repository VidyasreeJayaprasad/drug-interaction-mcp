# Drug Interaction MCP Server

Real-time drug interaction checker powered by NitroStack MCP. Queries **FDA adverse event reports**, **PubMed biomedical research**, and **ClinicalTrials.gov** simultaneously to provide evidence-based drug safety analysis.

## What This Server Does

- **check_drug_interactions** — Orchestrates parallel queries to all 3 APIs for a new drug vs. current medications
- **get_drug_info** — Returns enzyme pathways (CYP450), drug class, mechanisms, and pharmacology
- **get_drug_alternatives** — Suggests safer alternatives when a dangerous interaction is found
- **get_patient_polypharmacy_risk** — Audits a patient's entire medication list for existing interactions
- **search_clinical_trials** — Searches ClinicalTrials.gov for relevant studies

## Quick Start

```bash
npm install
npm run dev
```

## Common Commands

```bash
npm run dev       # Start dev server (STDIO transport)
npm run build     # Compile TypeScript
npm start         # Build + start
```

## Project Structure

```
src/
├── index.ts                          # Entry point
├── app.module.ts                     # Root module
├── health/system.health.ts           # System health check
└── modules/drug-interaction/
    ├── drug-interaction.module.ts     # Feature module
    ├── types/index.ts                # Shared interfaces
    ├── services/                     # API service classes
    ├── tools/                        # MCP tool definitions
    ├── resources/                    # MCP resource definitions
    └── prompts/                      # MCP prompt templates
```

## APIs Used (all free, no auth required)

| API | Purpose |
|---|---|
| [OpenFDA](https://api.fda.gov/) | Adverse event reports, drug labels |
| [PubMed / NCBI E-Utilities](https://eutils.ncbi.nlm.nih.gov/) | Biomedical research papers |
| [ClinicalTrials.gov](https://clinicaltrials.gov/api/v2/) | Clinical trial registry |

## NitroStudio

NitroStudio is the recommended way to test and debug this server during development.

- Download: <https://nitrostack.ai/studio>

## Links

- Docs: <https://docs.nitrostack.ai>
- Main repository: <https://github.com/nitrocloudofficial/nitrostack>

## Disclaimer

This is a clinical decision support tool. All prescribing decisions are the responsibility of the treating physician.
