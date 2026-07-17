// src/modules/drug-interaction/services/clinical-trials.service.ts
// STUB — Person 3 will replace this with the full implementation.
// This stub exists so the project compiles while Person 3 works on the real service.

import { Injectable } from '@nitrostack/core';
import { ClinicalTrialResult } from '../types/index.js';

@Injectable()
export class ClinicalTrialsService {

  private readonly BASE_URL =
  'https://clinicaltrials.gov/api/query/study_fields';

  async searchStudies(
    newDrug: string,
    currentMedications: string[]
  ): Promise<ClinicalTrialResult[]> {
    // TODO: Person 3 — replace with real ClinicalTrials.gov API calls
    const searchExpression =
      `${newDrug} ${currentMedications.join(' ')}`;

    console.log("Searching Clinical Trials for:", searchExpression);
    
    const url =
      `${this.BASE_URL}?expr=${encodeURIComponent(searchExpression)}&fields=NCTId,BriefTitle,OverallStatus,Condition,BriefSummary,StartDate,CompletionDate&min_rnk=1&max_rnk=5&fmt=json`;

    console.log("API URL:", url);

    try {

      const response = await fetch(url);

       if (!response.ok) {
         throw new Error(`HTTP Error: ${response.status}`);
      }

      const data: any = await response.json();

      console.log("Clinical Trials Response:", data);

const studies = data.StudyFieldsResponse?.StudyFields || [];

return studies.map((study: any) => ({
  source: 'ClinicalTrials.gov',
  drugs: [newDrug, ...currentMedications],
  nct_id: study.NCTId?.[0],
  title: study.BriefTitle?.[0],
  status: study.OverallStatus?.[0],
  start_date: study.StartDate?.[0],
  completion_date: study.CompletionDate?.[0],
  summary: study.BriefSummary?.[0],
  conditions: study.Condition || [],
  url: study.NCTId?.[0]
    ? `https://clinicaltrials.gov/study/${study.NCTId[0]}`
    : undefined,
}));

      

    } catch (error) {

      console.error("Clinical Trials API Error:", error);

      return [];

    }
  }

  async searchByTerms(
  searchTerm: string,
  filters?: {
    status?: 'RECRUITING' | 'COMPLETED' | 'ACTIVE_NOT_RECRUITING';
    condition?: string;
    limit?: number;
  }
): Promise<ClinicalTrialResult[]> {

  let expression = searchTerm;

  if (filters?.condition) {
    expression += ` AND ${filters.condition}`;
  }

  const limit = filters?.limit || 5;

  const url =
    `${this.BASE_URL}?expr=${encodeURIComponent(expression)}&fields=NCTId,BriefTitle,OverallStatus,Condition,BriefSummary,StartDate,CompletionDate&min_rnk=1&max_rnk=${limit}&fmt=json`;

  try {

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data: any = await response.json();

    const studies = data.StudyFieldsResponse?.StudyFields || [];

    return studies
      .filter((study: any) =>
        !filters?.status ||
        study.OverallStatus?.[0] === filters.status
      )
      .map((study: any) => ({
        source: 'ClinicalTrials.gov',
        drugs: [searchTerm],
        nct_id: study.NCTId?.[0],
        title: study.BriefTitle?.[0],
        status: study.OverallStatus?.[0],
        start_date: study.StartDate?.[0],
        completion_date: study.CompletionDate?.[0],
        summary: study.BriefSummary?.[0],
        conditions: study.Condition || [],
        url: study.NCTId?.[0]
          ? `https://clinicaltrials.gov/study/${study.NCTId[0]}`
          : undefined,
      }));

  } catch (error) {

    console.error("Clinical Trials API Error:", error);

    return [];

  }
}

  async searchMedicationPair(
  drug1: string,
  drug2: string
): Promise<ClinicalTrialResult[]> {

  return this.searchStudies(drug1, [drug2]);

}


}
