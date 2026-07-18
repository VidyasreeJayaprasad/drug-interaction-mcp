import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  Injectable
} from '@nitrostack/core';

import { z } from 'zod';

import { ClinicalTrialsService } from '../services/clinical-trials.service.js';


@Injectable({
  deps: [ClinicalTrialsService]
})
@Controller('clinical_trials')
export class ClinicalTrialsTools {

    
  constructor(
    private readonly clinicalTrialsService: ClinicalTrialsService
  ) {}


    @Tool({
  name: 'search_clinical_trials',
  description:
    'Search ClinicalTrials.gov for studies related to a drug and current medications.',
  inputSchema: z.object({
    newDrug: z.string(),
    currentMedications: z.array(z.string())
  }),
})
async searchClinicalTrials(input: {
  newDrug: string;
  currentMedications: string[];
}) {

  return await this.clinicalTrialsService.searchStudies(
    input.newDrug,
    input.currentMedications
  );

 }


}