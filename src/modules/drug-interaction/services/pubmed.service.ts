// src/services/pubmed.service.ts
import { Injectable } from '@nitrostack/core';
import { PubmedResult } from '../types';

@Injectable()
export class PubmedService {
  private readonly BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

  // Called by OrchestratorTools
  async searchInteractions(
    newDrug: string,
    currentMedications: string[]
  ): Promise<PubmedResult[]> {
    const searches = currentMedications.map(med =>
      this.searchDrugPair(newDrug, med)
    );
    const results = await Promise.all(searches);
    return results.flat().filter(r => r.pmids.length > 0);
  }

  // Called by DrugInfoTools — searches pharmacology of a single drug
  async searchDrugPharmacology(drugName: string): Promise<PubmedResult[]> {
    return this.runSearch(
      `${drugName} pharmacology enzyme inhibition metabolism`,
      [drugName]
    );
  }

  private async searchDrugPair(drug1: string, drug2: string): Promise<PubmedResult[]> {
    return this.runSearch(
      `${drug1} ${drug2} drug interaction adverse`,
      [drug1, drug2]
    );
  }

  private async runSearch(query: string, drugs: string[]): Promise<PubmedResult[]> {
    try {
      // Step 1: Get PMIDs (sorted by most recent first)
      const searchUrl = `${this.BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&retmode=json&sort=date`;
      const searchRes = await fetch(searchUrl);
      const searchData: any = await searchRes.json();
      const pmids: string[] = searchData.esearchresult?.idlist || [];
      const totalFound: number = parseInt(searchData.esearchresult?.count || '0');

      if (!pmids.length) {
        return [{
          source: 'PubMed',
          drug_pair: drugs,
          pmids: [],
          abstracts: 'No PubMed results found for this drug combination.',
          result_count: 0,
          pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}&sort=date`,
        }];
      }

      // Step 2: Fetch abstracts for those PMIDs
      const fetchUrl = `${this.BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=text`;
      const fetchRes = await fetch(fetchUrl);
      const abstracts = await fetchRes.text();

      return [{
        source: 'PubMed',
        drug_pair: drugs,
        pmids,
        abstracts: abstracts.substring(0, 3000),
        result_count: totalFound,
        pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}&sort=date`,
      }];
    } catch {
      return [];
    }
  }
}