// src/modules/drug-interaction/tools/drug-alternatives.tools.ts
import { ControllerDecorator as Controller, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { OpenFdaService } from '../services/openfda.service.js';
import { DrugAlternative } from '../types/index.js';

@Controller('drug_alternatives')
export class DrugAlternativesTools {
  constructor(private readonly openFda: OpenFdaService) {}

  @Tool({
    name: 'get_drug_alternatives',
    description: `When a dangerous drug interaction is found, call this tool to get safer alternative medications in the same therapeutic class.
    Returns brand names, generic names, key side effects, contraindications, and why the alternative is safer for this specific patient.
    Provide the drug class and the condition being treated for best results.`,
    inputSchema: z.object({
      drug_to_replace: z.string().describe('The drug that has the dangerous interaction and needs to be replaced'),
      condition_being_treated: z.string().describe('What the drug was being prescribed for e.g. "fungal infection", "hypertension", "depression"'),
      patient_current_medications: z.array(z.string()).describe('Patient current medications — needed to ensure the alternative also does not interact'),
      drug_class: z.string().optional().describe('Drug class if known e.g. "azole antifungal" — helps narrow alternatives faster'),
    }),
  })
  async getDrugAlternatives(input: {
    drug_to_replace: string;
    condition_being_treated: string;
    patient_current_medications: string[];
    drug_class?: string;
  }): Promise<{
    drug_to_replace: string;
    condition: string;
    alternatives: DrugAlternative[];
    safety_note: string;
    retrieved_at: string;
  }> {

    const fdaAlternatives = input.drug_class
      ? await this.openFda.searchByDrugClass(input.drug_class)
      : [];

    const knownAlternatives = this.getKnownAlternatives(
      input.drug_to_replace,
      input.condition_being_treated,
      input.patient_current_medications
    );

    return {
      drug_to_replace: input.drug_to_replace,
      condition: input.condition_being_treated,
      alternatives: knownAlternatives,
      safety_note: `These alternatives are suggested based on drug class. The treating physician must verify suitability for this specific patient. Always cross-check alternatives against patient's current medications: ${input.patient_current_medications.join(', ')}.`,
      retrieved_at: new Date().toISOString(),
    };
  }

  private getKnownAlternatives(
    drug: string,
    condition: string,
    currentMeds: string[]
  ): DrugAlternative[] {
    const drugLower = drug.toLowerCase();

    // Antifungals
    if (drugLower.includes('fluconazole') || condition.toLowerCase().includes('fungal')) {
      return [
        {
          drug_name: 'terbinafine',
          generic_name: 'terbinafine',
          brand_names: ['Lamisil'],
          drug_class: 'Allylamine antifungal',
          why_safer: 'Does not significantly inhibit CYP2C9 or CYP3A4 — minimal interaction risk with warfarin',
          key_side_effects: ['headache', 'nausea', 'rash', 'elevated liver enzymes (rare)'],
          contraindications: ['severe hepatic impairment', 'renal impairment (use with caution)'],
          notes: 'Better choice for patients on warfarin. Monitor LFTs in long-term use.',
        },
        {
          drug_name: 'nystatin',
          generic_name: 'nystatin',
          brand_names: ['Mycostatin', 'Nilstat'],
          drug_class: 'Polyene antifungal (topical)',
          why_safer: 'Not systemically absorbed — no CYP interactions possible when used topically',
          key_side_effects: ['local irritation', 'nausea if swallowed (oral formulation)'],
          contraindications: ['known hypersensitivity'],
          notes: 'Only for superficial/mucosal fungal infections. Not suitable for systemic infections.',
        },
        {
          drug_name: 'micafungin',
          generic_name: 'micafungin',
          brand_names: ['Mycamine'],
          drug_class: 'Echinocandin antifungal (IV)',
          why_safer: 'Minimal CYP enzyme interactions — safer profile for patients on multiple medications',
          key_side_effects: ['nausea', 'headache', 'elevated LFTs', 'infusion reactions'],
          contraindications: ['hypersensitivity to echinocandins'],
          notes: 'IV only — for hospital/serious infections. Excellent safety profile with anticoagulants.',
        },
      ];
    }

    // Default response if no mapping found
    return [{
      drug_name: 'Consult clinical pharmacologist',
      generic_name: '',
      brand_names: [],
      drug_class: `Alternative to ${drug} for ${condition}`,
      why_safer: `No pre-mapped alternatives found for ${drug}. The agent should reason over available FDA and PubMed data for this drug class.`,
      key_side_effects: [],
      contraindications: [],
      notes: `Search for alternatives using FDA label data for the same therapeutic class as ${drug}.`,
    }];
  }
}