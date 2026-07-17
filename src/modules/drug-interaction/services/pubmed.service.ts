// src/modules/drug-interaction/services/pubmed.service.ts
// STUB — Person 2 will replace this with the full implementation.
// This stub exists so the project compiles while Person 2 works on the real service.

import { Injectable } from '@nitrostack/core';
import { PubmedResult } from '../types/index.js';

@Injectable()
export class PubmedService {
  async searchInteractions(
    newDrug: string,
    currentMedications: string[]
  ): Promise<PubmedResult[]> {
    // TODO: Person 2 — replace with real PubMed API calls
    return [];
  }

  async searchDrugPharmacology(drugName: string): Promise<PubmedResult[]> {
    // TODO: Person 2 — replace with real PubMed pharmacology search
    return [];
  }
}
