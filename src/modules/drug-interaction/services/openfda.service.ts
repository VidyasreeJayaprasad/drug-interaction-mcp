// src/modules/drug-interaction/services/openfda.service.ts
// STUB — Person 2 will replace this with the full implementation.
// This stub exists so the project compiles while Person 2 works on the real service.

import { Injectable } from '@nitrostack/core';
import { FdaAdverseEvent, FdaLabelResult } from '../types/index.js';

@Injectable()
export class OpenFdaService {
  async searchInteractions(
    newDrug: string,
    currentMedications: string[]
  ): Promise<{ adverse_events: FdaAdverseEvent[]; labels: FdaLabelResult[] }> {
    // TODO: Person 2 — replace with real OpenFDA API calls
    return { adverse_events: [], labels: [] };
  }

  async getDrugLabel(drugName: string): Promise<FdaLabelResult[]> {
    // TODO: Person 2 — replace with real OpenFDA label lookup
    return [];
  }

  async searchByDrugClass(drugClass: string): Promise<FdaLabelResult[]> {
    // TODO: Person 2 — replace with real OpenFDA class search
    return [];
  }
}
