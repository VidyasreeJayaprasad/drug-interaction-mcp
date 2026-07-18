// src/modules/drug-interaction/services/clinical-trials.service.ts
import { Injectable } from '@nitrostack/core';
import { ClinicalTrialResult } from '../types/index.js';

@Injectable()
export class ClinicalTrialsService {

  private readonly BASE_URL = 'https://clinicaltrials.gov/api/v2/studies';

  async searchStudies(
    newDrug: string,
    currentMedications: string[]
  ): Promise<ClinicalTrialResult[]> {
    const searchExpression = `${newDrug} ${currentMedications.join(' ')}`;
    console.log("Searching Clinical Trials for:", searchExpression);
    
    // APIv2 Parameters
    const params = new URLSearchParams({
      'query.term': searchExpression,
      'fields': 'NCTId,BriefTitle,OverallStatus,ConditionsModule,BriefSummary,StartDate,CompletionDate',
      'pageSize': '5'
    });

    const url = `${this.BASE_URL}?${params.toString()}`;
    console.log("API URL:", url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data: any = await response.json();
      const studies = data.studies || [];

      return studies.map((study: any) => {
        const p = study.protocolSection || {};
        const id = p.identificationModule || {};
        const status = p.statusModule || {};
        const desc = p.descriptionModule || {};
        const cond = p.conditionsModule || {};

        return {
          source: 'ClinicalTrials.gov',
          drugs: [newDrug, ...currentMedications],
          nct_id: id.nctId,
          title: id.briefTitle,
          status: status.overallStatus,
          start_date: status.startDateStruct?.date,
          completion_date: status.completionDateStruct?.date,
          summary: desc.briefSummary,
          conditions: cond.conditions || [],
          url: id.nctId ? `https://clinicaltrials.gov/study/${id.nctId}` : undefined,
        };
      });
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

    const params = new URLSearchParams();
    
    let term = searchTerm;
    if (filters?.condition) {
      params.append('query.cond', filters.condition);
    }
    params.append('query.term', term);
    if (filters?.status) {
      params.append('filter.overallStatus', filters.status);
    }
    
    params.append('fields', 'NCTId,BriefTitle,OverallStatus,ConditionsModule,BriefSummary,StartDate,CompletionDate');
    params.append('pageSize', (filters?.limit || 5).toString());

    const url = `${this.BASE_URL}?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data: any = await response.json();
      const studies = data.studies || [];

      return studies.map((study: any) => {
        const p = study.protocolSection || {};
        const id = p.identificationModule || {};
        const status = p.statusModule || {};
        const desc = p.descriptionModule || {};
        const cond = p.conditionsModule || {};

        return {
          source: 'ClinicalTrials.gov',
          drugs: [searchTerm],
          nct_id: id.nctId,
          title: id.briefTitle,
          status: status.overallStatus,
          start_date: status.startDateStruct?.date,
          completion_date: status.completionDateStruct?.date,
          summary: desc.briefSummary,
          conditions: cond.conditions || [],
          url: id.nctId ? `https://clinicaltrials.gov/study/${id.nctId}` : undefined,
        };
      });
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
