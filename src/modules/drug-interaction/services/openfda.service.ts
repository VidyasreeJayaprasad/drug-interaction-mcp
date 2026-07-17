// src/services/openfda.service.ts
import { Injectable } from '@nitrostack/core';
import { FdaAdverseEvent, FdaLabelResult } from '../types';

@Injectable()
export class OpenFdaService {
  private readonly BASE = 'https://api.fda.gov/drug';

  // Called by OrchestratorTools — returns both adverse events and label data
  async searchInteractions(
    newDrug: string,
    currentMedications: string[]
  ): Promise<{ adverse_events: FdaAdverseEvent[]; labels: FdaLabelResult[] }> {
    const [adverseEvents, labels] = await Promise.all([
      this.fetchAllAdverseEvents(newDrug, currentMedications),
      this.fetchDrugLabel(newDrug),
    ]);
    return { adverse_events: adverseEvents, labels };
  }

  // Called by DrugInfoTools — gets label data for a single drug
  async getDrugLabel(drugName: string): Promise<FdaLabelResult[]> {
    return this.fetchDrugLabel(drugName);
  }

  // Called by DrugAlternativesTools — searches by drug class
  async searchByDrugClass(drugClass: string): Promise<FdaLabelResult[]> {
    try {
      const url = `${this.BASE}/label.json?search=pharm_class_epc:"${encodeURIComponent(drugClass)}"&limit=8`;
      const res = await fetch(url);
      const data:any = await res.json();
      return (data.results || []).map((r: any) => ({
        source: 'OpenFDA Drug Label' as const,
        drug_name: r.openfda?.generic_name?.[0] || 'Unknown',
        brand_name: r.openfda?.brand_name?.[0],
        interaction_section: r.drug_interactions?.[0]?.substring(0, 400),
        warnings: r.warnings?.[0]?.substring(0, 300),
      }));
    } catch {
      return [];
    }
  }

  private async fetchAllAdverseEvents(
    newDrug: string,
    currentMedications: string[]
  ): Promise<FdaAdverseEvent[]> {
    // Check new drug paired with EACH current medication
    const results = await Promise.all(
      currentMedications.map(med => this.fetchAdverseEventPair(newDrug, med))
    );
    return results.flat();
  }

  private async fetchAdverseEventPair(
    drug1: string,
    drug2: string
  ): Promise<FdaAdverseEvent[]> {
    try {
      //hello
      const search = `patient.drug.medicinalproduct:"${drug1}"+AND+patient.drug.medicinalproduct:"${drug2}"`;
      const url = `${this.BASE}/event.json?search=${encodeURIComponent(search)}&limit=5&sort=receivedate:desc`;
      const res = await fetch(url);
      //const data: any = await res.json();
      return (data.results || []).map((r: any) => ({
        source: 'OpenFDA Adverse Events' as const,
        drug_pair: [drug1, drug2],
        serious: r.serious === 1,
        outcome: r.patient?.patientdeath === 1
          ? 'death reported'
          : r.seriousnesshospitalization === 1
          ? 'hospitalization'
          : r.seriousnessother === 1
          ? 'serious other'
          : 'non-serious',
        report_date: r.receivedate || 'unknown',
        death_reported: r.patient?.patientdeath === 1,
      }));
    } catch {
      return [];
    }
  }

  private async fetchDrugLabel(drugName: string): Promise<FdaLabelResult[]> {
    try {
      const url = `${this.BASE}/label.json?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=3`;
      const res = await fetch(url);
      const data:any = await res.json();
      return (data.results || []).map((r: any) => ({
        source: 'OpenFDA Drug Label' as const,
        drug_name: drugName,
        brand_name: r.openfda?.brand_name?.[0],
        interaction_section: r.drug_interactions?.[0]?.substring(0, 600),
        warnings: r.boxed_warning?.[0]?.substring(0, 400) || r.warnings?.[0]?.substring(0, 400),
      }));
    } catch {
      return [];
    }
  }
}