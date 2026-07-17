// src/modules/drug-interaction/drug-interaction.module.ts
import { Module } from '@nitrostack/core';

// Services (stub implementations — team members will replace with real code)
import { OpenFdaService } from './services/openfda.service.js';
import { PubmedService } from './services/pubmed.service.js';
import { ClinicalTrialsService } from './services/clinical-trials.service.js';

// Tools (Person 1's orchestrator is implemented; others are pending)
import { OrchestratorTools } from './tools/orchestrator.tools.js';
// import { DrugInfoTools } from './tools/drug-info.tools.js';           // Person 2
// import { DrugAlternativesTools } from './tools/drug-alternatives.tools.js'; // Person 2
// import { ClinicalTrialsTools } from './tools/clinical-trials.tools.js';     // Person 3
// import { PolypharmacyRiskTools } from './tools/polypharmacy-risk.tools.js'; // Person 3

// Resources — uncomment when Person 4 finishes
// import { PatientProfileResource } from './resources/patient-profile.resource.js';

// Prompts — uncomment when Person 4 finishes
// import { ClinicalSafetyPrompts } from './prompts/clinical-safety.prompt.js';
// import { ReportFormatPrompts } from './prompts/report-format.prompt.js';

@Module({
  name: 'drug-interaction',
  description: 'Drug interaction checking — services, tools, resources, and prompts',
  providers: [
    // Services (data layer) — stubs for now, team will replace
    OpenFdaService,
    PubmedService,
    ClinicalTrialsService,
    // Tools — add more as team members merge PRs
    OrchestratorTools,
  ],
  exports: [
    // Export services so they can be injected across tools
    OpenFdaService,
    PubmedService,
    ClinicalTrialsService,
  ],
})
export class DrugInteractionModule {}
