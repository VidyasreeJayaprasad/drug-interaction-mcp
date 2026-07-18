// src/modules/drug-interaction/drug-interaction.module.ts
import { Module } from '@nitrostack/core';

// Services
import { OpenFdaService } from './services/openfda.service.js';
import { PubmedService } from './services/pubmed.service.js';
import { ClinicalTrialsService } from './services/clinical-trials.service.js';

// Tools
import { OrchestratorTools } from './tools/orchestrator.tools.js';
import { DrugInfoTools } from './tools/drug-info.tool.js';
import { DrugAlternativesTools } from './tools/drug-alternatives.tool.js';
import { ClinicalTrialsTools } from './tools/clinical-trials.tools.js';
import { PolypharmacyRiskTools } from './tools/polypharmacy-risk.tools.js';

// Resources (Person 4)
import { PatientProfileResource } from './resources/patient-profile.resource.js';

// Prompts (Person 4)
import { ClinicalSafetyPrompts } from './prompts/clinical-safety.prompt.js';
import { ReportFormatPrompts } from './prompts/report-format.prompt.js';

@Module({
  name: 'drug-interaction',
  description: 'Drug interaction checking — services, tools, resources, and prompts',

  controllers: [
    // Tools
    OrchestratorTools,
    DrugInfoTools,
    DrugAlternativesTools,
    ClinicalTrialsTools,
    PolypharmacyRiskTools,
    // Resources
    PatientProfileResource,
    // Prompts
    ClinicalSafetyPrompts,
    ReportFormatPrompts,
  ],

  providers: [
    OpenFdaService,
    PubmedService,
    ClinicalTrialsService,
  ],

  exports: [
    OpenFdaService,
    PubmedService,
    ClinicalTrialsService,
  ],
})
export class DrugInteractionModule { }