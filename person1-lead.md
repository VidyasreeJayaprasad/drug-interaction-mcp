# Person 1 — Project Lead
## Role: Scaffold Fixes, Shared Types, Feature Module, Orchestrator Tool, App Wiring, Deployment

You are the backbone of this project. The NitroStack scaffold has already been generated, but it needs cleanup and configuration. You work first (Phase 1), then in parallel with others (Phase 2), then last (Phase 5 wiring). Nothing can be built until you finish Phase 1.

---

## PHASE 1 — Fix the scaffold and set up shared infrastructure (1 hour)

The project was scaffolded from a NitroStack starter template. It currently has remnants of a "calculator" template that must be cleaned up, and the drug-interaction module needs to be properly initialized.

### Step 1: Clean up the scaffold

The generated `src/app.module.ts` imports a `CalculatorModule` that no longer exists in the source tree. Fix it:

```typescript
// src/app.module.ts
import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DrugInteractionModule } from './modules/drug-interaction/drug-interaction.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'drug-interaction-checker',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Drug Interaction MCP Server — Real-time drug safety checker',
  imports: [
    ConfigModule.forRoot(),
    DrugInteractionModule,
  ],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
```

### Step 2: Verify `src/index.ts`

The entry point is already generated. Just update the comment. Do NOT create a `main.ts` file — use the existing `index.ts`:

```typescript
// src/index.ts
/**
 * Drug Interaction MCP Server
 *
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
```

### Step 3: Verify shared types at `src/modules/drug-interaction/types/index.ts`

This file has already been generated with the correct types. Verify it contains all the interfaces (PatientContext, DrugMechanism, DrugInfo, DrugAlternative, FdaAdverseEvent, FdaLabelResult, PubmedResult, ClinicalTrialResult, InteractionCheckOutput, PolypharmacyRiskOutput). Everyone imports from this file.

### Step 4: Create the feature module `src/modules/drug-interaction/drug-interaction.module.ts`

**Important:** The generated scaffold has a file named `drug-interaction.modules.ts` (with an "s"). Rename it to `drug-interaction.module.ts` (singular) for consistency, then implement:

```typescript
// src/modules/drug-interaction/drug-interaction.module.ts
import { Module } from '@nitrostack/core';

// Services — uncomment as team members finish
// import { OpenFdaService } from './services/openfda.service.js';
// import { PubmedService } from './services/pubmed.service.js';
// import { ClinicalTrialsService } from './services/clinical-trials.service.js';

// Tools — uncomment as team members finish
// import { OrchestratorTools } from './tools/orchestrator.tools.js';
// import { DrugInfoTools } from './tools/drug-info.tools.js';
// import { DrugAlternativesTools } from './tools/drug-alternatives.tools.js';
// import { PolypharmacyRiskTools } from './tools/polypharmacy-risk.tools.js';
// import { ClinicalTrialsTools } from './tools/clinical-trials.tools.js';

// Resources — uncomment as team members finish
// import { PatientProfileResource } from './resources/patient-profile.resource.js';

// Prompts — uncomment as team members finish
// import { ClinicalSafetyPrompts } from './prompts/clinical-safety.prompt.js';
// import { ReportFormatPrompts } from './prompts/report-format.prompt.js';

@Module({
  name: 'drug-interaction',
  description: 'Drug interaction checking — services, tools, resources, and prompts',
  providers: [
    // Add providers here as team members finish their work
  ],
  exports: [
    // Export services so other modules can use them if needed
  ],
})
export class DrugInteractionModule {}
```

### Step 5: Update README.md and widget-manifest.json

Update `README.md` to describe the actual project (remove calculator references). Update `src/widgets/widget-manifest.json` to remove calculator widget references.

### Step 6: Clean and verify

```bash
# Remove stale build artifacts
rm -rf dist

# Verify the project compiles
npm run build
```

### Step 7: Push to GitHub

```bash
git add .
git commit -m "feat: clean scaffold, set up drug-interaction module and shared types"
git push -u origin main
```

**Tell everyone to pull now. Phase 1 done.**

---

## PHASE 2 — Build the Orchestrator Tool (while others build their services)

Create `src/modules/drug-interaction/tools/orchestrator.tools.ts`. This tool calls the 3 services in parallel. The services are being built by Persons 2 and 3 simultaneously — import them but don't worry if they error until Phase 5.

```typescript
// src/modules/drug-interaction/tools/orchestrator.tools.ts
import { ControllerDecorator as Controller, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { OpenFdaService } from '../services/openfda.service.js';
import { PubmedService } from '../services/pubmed.service.js';
import { ClinicalTrialsService } from '../services/clinical-trials.service.js';
import { InteractionCheckOutput } from '../types/index.js';

@Controller('orchestrator')
export class OrchestratorTools {
  constructor(
    private readonly openFda: OpenFdaService,
    private readonly pubmed: PubmedService,
    private readonly clinicalTrials: ClinicalTrialsService,
  ) {}

  @Tool({
    name: 'check_drug_interactions',
    description: `Checks real-time drug interaction safety by querying FDA adverse event reports, PubMed biomedical research, and ClinicalTrials.gov simultaneously.
    Call this when a doctor wants to prescribe a new drug to a patient already on other medications.
    Returns live evidence from all three sources with dates, so you know the data is current.
    Always call get_drug_info first to understand the mechanism, then call this tool.`,
    inputSchema: z.object({
      new_drug: z.string().describe('The new drug the doctor wants to prescribe. Use the generic name where possible.'),
      current_medications: z.array(z.string()).describe('Complete list of drugs the patient is currently taking.'),
      patient_context: z.object({
        age: z.number().optional().describe('Patient age in years'),
        weight_kg: z.number().optional().describe('Patient weight in kilograms'),
        conditions: z.array(z.string()).optional().describe('Existing medical conditions e.g. ["atrial fibrillation", "type 2 diabetes"]'),
        kidney_function: z.string().optional().describe('eGFR value or descriptor e.g. "eGFR 45 - mild-moderate impairment"'),
        liver_function: z.string().optional().describe('Liver function status if known'),
      }).optional().describe('Patient clinical context — the more you provide, the more specific the analysis'),
    }),
  })
  async checkDrugInteractions(input: {
    new_drug: string;
    current_medications: string[];
    patient_context?: {
      age?: number;
      weight_kg?: number;
      conditions?: string[];
      kidney_function?: string;
      liver_function?: string;
    };
  }): Promise<InteractionCheckOutput> {

    // Run all 3 data sources in parallel — this is the key performance feature
    const [fdaResults, pubmedResults, trialResults] = await Promise.all([
      this.openFda.searchInteractions(input.new_drug, input.current_medications),
      this.pubmed.searchInteractions(input.new_drug, input.current_medications),
      this.clinicalTrials.searchStudies(input.new_drug, input.current_medications),
    ]);

    return {
      new_drug: input.new_drug,
      current_medications: input.current_medications,
      patient_context: input.patient_context,
      fda_adverse_events: fdaResults.adverse_events,
      fda_labels: fdaResults.labels,
      pubmed_research: pubmedResults,
      clinical_trials: trialResults,
      retrieved_at: new Date().toISOString(),
      ai_instruction: `You have received live data from three medical databases retrieved at ${new Date().toISOString()}.
Analyze the following for dangerous drug-drug interactions between ${input.new_drug} and ${input.current_medications.join(', ')}.
For each interaction found:
1. State the risk level (HIGH/MODERATE/LOW)
2. Name the exact drug pair
3. Explain the mechanism (e.g. CYP enzyme inhibition, additive effect)
4. Quote the source and its date
5. Consider the patient context: ${JSON.stringify(input.patient_context || {})}
6. Suggest a safer alternative and recommend calling get_drug_alternatives if a serious interaction is found.
This is clinical decision support — the prescribing decision rests with the treating physician.`,
    };
  }
}
```

---

## PHASE 5 — Wire Everything Together (after others finish)

Once Persons 2, 3, and 4 have all merged their PRs, update `src/modules/drug-interaction/drug-interaction.module.ts`:

```typescript
// src/modules/drug-interaction/drug-interaction.module.ts — FINAL VERSION
import { Module } from '@nitrostack/core';
import { OpenFdaService } from './services/openfda.service.js';
import { PubmedService } from './services/pubmed.service.js';
import { ClinicalTrialsService } from './services/clinical-trials.service.js';
import { OrchestratorTools } from './tools/orchestrator.tools.js';
import { DrugInfoTools } from './tools/drug-info.tools.js';
import { DrugAlternativesTools } from './tools/drug-alternatives.tools.js';
import { PolypharmacyRiskTools } from './tools/polypharmacy-risk.tools.js';
import { ClinicalTrialsTools } from './tools/clinical-trials.tools.js';
import { PatientProfileResource } from './resources/patient-profile.resource.js';
import { ClinicalSafetyPrompts } from './prompts/clinical-safety.prompt.js';
import { ReportFormatPrompts } from './prompts/report-format.prompt.js';

@Module({
  name: 'drug-interaction',
  description: 'Drug interaction checking — services, tools, resources, and prompts',
  providers: [
    // Services (data layer)
    OpenFdaService,
    PubmedService,
    ClinicalTrialsService,
    // Tools
    OrchestratorTools,
    DrugInfoTools,
    DrugAlternativesTools,
    PolypharmacyRiskTools,
    ClinicalTrialsTools,
    // Resources
    PatientProfileResource,
    // Prompts
    ClinicalSafetyPrompts,
    ReportFormatPrompts,
  ],
  exports: [
    OpenFdaService,
    PubmedService,
    ClinicalTrialsService,
  ],
})
export class DrugInteractionModule {}
```

The `src/app.module.ts` should already be correct from Phase 1. Then:
```bash
npm run build
```

Share the project with the whole team for final testing.

---

## PHASE 6 — Demo Prep
Test this exact sequence in NitroStudio Chat to verify the full agent flow works:

> "I have a 72-year-old patient with atrial fibrillation on warfarin, lisinopril, and metformin. I want to prescribe fluconazole for a fungal infection. Is this safe?"

The agent should autonomously: call `get_drug_info` → call `check_drug_interactions` → call `get_drug_alternatives`. If it does, the demo is ready.
