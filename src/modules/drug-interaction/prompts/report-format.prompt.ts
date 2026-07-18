import { Injectable } from '@nitrostack/core';
import { PromptDecorator as Prompt } from '@nitrostack/core';

@Injectable()
export class ReportFormatPrompts {

  @Prompt({
    name: 'interaction_report',
    description: 'Generates a structured, shareable interaction report from retrieved evidence. Use after check_drug_interactions has returned data.',
    arguments: [
      { name: 'new_drug', description: 'The proposed new drug', required: true },
      { name: 'patient_medications', description: 'Comma-separated list of patient current medications', required: true },
    ],
  })
  async interactionReport(args: { new_drug: string; patient_medications: string }) {
    const medications = args.patient_medications.split(',').map(m => m.trim());
    return {
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Generate a structured clinical report for:
- Proposed drug: ${args.new_drug}
- Patient's current medications: ${medications.join(', ')}

Format:

---
# Drug Interaction Safety Report
**Date:** ${new Date().toLocaleString()}
**Proposed drug:** ${args.new_drug}
**Current medications:** ${medications.join(', ')}

## Summary
[One sentence: safe / unsafe / needs monitoring]

## Interactions Found
[Table format if multiple: Drug Pair | Risk | Mechanism | Evidence Date | Source]

## Evidence Details
[For each interaction: full evidence summary with citations]

## Alternatives Considered
[If unsafe: alternatives and why they are safer]

## Data Sources
| Source | Records Retrieved | As of |
|---|---|---|
| OpenFDA Adverse Events | [n] reports | [timestamp] |
| PubMed | [n] papers (most recent: [date]) | [timestamp] |
| ClinicalTrials.gov | [n] studies | [timestamp] |

---
*This report was generated using real-time data from FDA, PubMed, and ClinicalTrials.gov. It is a clinical decision support tool. All prescribing decisions are the responsibility of the treating physician.*
---`,
        },
      }],
    };
  }
}