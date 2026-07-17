// src/modules/drug-interaction/drug-interaction.module.ts
import { Module } from '@nitrostack/core';

// Services
import { OpenFdaService } from './services/openfda.service.js';
import { PubmedService } from './services/pubmed.service.js';
import { ClinicalTrialsService } from './services/clinical-trials.service.js';

// Tools
import { OrchestratorTools } from './tools/orchestrator.tools.js';
import { DrugInfoTools } from './tools/drug-info.tools.js';
import { DrugAlternativesTools } from './tools/drug-alternatives.tools.js';
import { ClinicalTrialsTools } from './tools/clinical-trials.tools.js';
import { PolypharmacyRiskTools } from './tools/polypharmacy-risk.tools.js';

@Module({
  name: 'drug-interaction',
  description: 'Drug interaction checking — services, tools, resources, and prompts',

  controllers: [
    OrchestratorTools,
    DrugInfoTools,
    DrugAlternativesTools,
    ClinicalTrialsTools,
    PolypharmacyRiskTools,
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