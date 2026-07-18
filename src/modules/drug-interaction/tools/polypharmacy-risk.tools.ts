import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
} from '@nitrostack/core';

import { z } from 'zod';

import { OpenFdaService } from '../services/openfda.service.js';
import { PubmedService } from '../services/pubmed.service.js';
import { PolypharmacyRiskOutput } from '../types/index.js';

@Controller('polypharmacy_risk')
export class PolypharmacyRiskTools {
  constructor(
    private readonly openFda: OpenFdaService,
    private readonly pubmed: PubmedService,
  ) {}

  @Tool({
    name: 'check_polypharmacy_risk',
    description:
      'Checks every pair of medications in a patient medication list for interaction risks.',

    inputSchema: z.object({
      patient_medications: z.array(z.string()).min(2),
    }),
  })
  async checkPolypharmacyRisk(input: {
    patient_medications: string[];
  }): Promise<PolypharmacyRiskOutput> {

    const riskPairs = [];

    for (let i = 0; i < input.patient_medications.length; i++) {

      for (let j = i + 1; j < input.patient_medications.length; j++) {

        const drugA = input.patient_medications[i];
        const drugB = input.patient_medications[j];

        const fda = await this.openFda.searchInteractions(
          drugA,
          [drugB]
        );

        const pubmed = await this.pubmed.searchInteractions(
          drugA,
          [drugB]
        );

        riskPairs.push({
          drug_a: drugA,
          drug_b: drugB,
          shared_mechanism: 'Potential interaction',

          risk_level:
            fda.adverse_events.length > 0
              ? ('high' as const)
              : pubmed.length > 0
              ? ('moderate' as const)
              : ('low' as const),

          fda_events: fda.adverse_events,
          pubmed_evidence: pubmed,
        });
      }
    }

    return {
      patient_medications: input.patient_medications,
      risk_pairs: riskPairs,
      total_pairs_checked: riskPairs.length,
      retrieved_at: new Date().toISOString(),
    };
  }
}