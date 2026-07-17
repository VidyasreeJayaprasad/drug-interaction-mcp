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
  ) { }

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
