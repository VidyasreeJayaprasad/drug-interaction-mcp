// src/modules/drug-interaction/tools/drug-info.tools.ts
import { ControllerDecorator as Controller, ToolDecorator as Tool, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { OpenFdaService } from '../services/openfda.service.js';
import { PubmedService } from '../services/pubmed.service.js';
import { DrugInfo } from '../types/index.js';

@Injectable()
@Controller('drug_info')
export class DrugInfoTools {
  constructor(
    private readonly openFda: OpenFdaService,
    private readonly pubmed: PubmedService,
  ) {}

  @Tool({
    name: 'get_drug_info',
    description: `Get comprehensive pharmacological information about any drug — drug class, enzyme pathways it inhibits or induces (CYP2C9, CYP3A4, etc.), brand names, generic name, primary use, and which other drug classes it commonly interacts with.
    ALWAYS call this tool first before calling check_drug_interactions.
    Understanding the mechanism (e.g. strong CYP2C9 inhibitor) tells you which patient medications to be most concerned about.`,
    inputSchema: z.object({
      drug_name: z.string().describe('Drug name — generic or brand name accepted'),
    }),
  })
  async getDrugInfo(input: { drug_name: string }): Promise<DrugInfo> {
    const [labelData, pubmedData] = await Promise.all([
      this.openFda.getDrugLabel(input.drug_name),
      this.pubmed.searchDrugPharmacology(input.drug_name),
    ]);

    const label = labelData[0];
    const interactionText = label?.interaction_section || '';
    const cypMentions = this.extractCypMechanisms(interactionText);

    return {
      drug_name: input.drug_name,
      generic_name: label?.drug_name,
      brand_names: labelData
        .filter(l => l.brand_name)
        .map(l => l.brand_name!)
        .filter((v, i, a) => a.indexOf(v) === i),
      drug_class: this.extractDrugClass(interactionText),
      mechanisms: cypMentions,
      primary_use: 'See FDA label and PubMed data below',
      contraindications: label?.warnings ? [label.warnings] : [],
      source: `OpenFDA Drug Label + PubMed (${pubmedData[0]?.pmids?.length || 0} papers found)`,
      retrieved_at: new Date().toISOString(),
    };
  }

  private extractCypMechanisms(text: string) {
    const mechanisms = [];
    const lowerText = text.toLowerCase();

    const enzymes = [
      { name: 'CYP2C9', drugs: ['warfarin', 'phenytoin', 'glipizide', 'losartan'] },
      { name: 'CYP3A4', drugs: ['statins', 'cyclosporine', 'tacrolimus', 'midazolam', 'amlodipine'] },
      { name: 'CYP2C19', drugs: ['omeprazole', 'clopidogrel', 'diazepam'] },
      { name: 'CYP2D6', drugs: ['codeine', 'tamoxifen', 'metoprolol', 'tramadol'] },
      { name: 'CYP1A2', drugs: ['theophylline', 'clozapine', 'caffeine'] },
    ];

    for (const enzyme of enzymes) {
      if (lowerText.includes(enzyme.name.toLowerCase())) {
        const isInhibitor = lowerText.includes(`${enzyme.name.toLowerCase()} inhibit`);
        const isInducer = lowerText.includes(`${enzyme.name.toLowerCase()} induc`);
        if (isInhibitor || isInducer) {
          mechanisms.push({
            type: `${enzyme.name} ${isInhibitor ? 'inhibitor' : 'inducer'}`,
            strength: lowerText.includes('strong') ? 'strong' as const
              : lowerText.includes('moderate') ? 'moderate' as const
              : 'weak' as const,
            affected_drugs: enzyme.drugs,
          });
        }
      }
    }
    return mechanisms;
  }

  private extractDrugClass(text: string): string {
    const classes: Record<string, string[]> = {
      'Azole antifungal': ['azole', 'antifungal', 'fluconazole', 'itraconazole'],
      'SSRI antidepressant': ['ssri', 'serotonin reuptake'],
      'Beta blocker': ['beta-blocker', 'beta blocker', 'adrenergic'],
      'ACE inhibitor': ['ace inhibitor', 'angiotensin-converting'],
      'Anticoagulant': ['anticoagulant', 'warfarin', 'coumarin'],
      'Statin': ['statin', 'hmg-coa reductase'],
      'Antibiotic': ['antibiotic', 'antimicrobial', 'penicillin', 'cephalosporin'],
      'Opioid': ['opioid', 'narcotic', 'morphine', 'codeine'],
    };

    const lowerText = text.toLowerCase();
    for (const [className, keywords] of Object.entries(classes)) {
      if (keywords.some(k => lowerText.includes(k))) return className;
    }
    return 'See FDA label for drug class information';
  }
}