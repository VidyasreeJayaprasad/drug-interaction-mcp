// src/modules/drug-interaction/prompts/clinical-safety.prompt.ts
import { PromptDecorator as Prompt, ControllerDecorator as Controller, ExecutionContext } from '@nitrostack/core';

@Controller('clinical_safety_prompts')
export class ClinicalSafetyPrompts {

  @Prompt({
    name: 'clinical_safety_check',
    description: 'Activates clinical pharmacologist reasoning mode for drug interaction evaluation. Use this prompt to begin any drug safety consultation.',
    arguments: [
      { name: 'new_drug', description: 'Drug the doctor wants to prescribe', required: true },
      { name: 'patient_medications', description: 'Comma-separated list of patient current medications', required: true },
      { name: 'patient_age', description: 'Patient age in years', required: false },
      { name: 'patient_conditions', description: 'Comma-separated list of medical conditions', required: false },
    ],
  })
  async clinicalSafetyCheck(args: {
    new_drug: string;
    patient_medications: string;
    patient_age?: string;
    patient_conditions?: string;
  }, ctx: ExecutionContext) {
    const medications = args.patient_medications.split(',').map(m => m.trim());
    const conditions = args.patient_conditions?.split(',').map(c => c.trim()) || [];

    return {
      messages: [{
        role: 'user',
        content: `You are a clinical pharmacologist providing real-time decision support to a physician. You are NOT providing a diagnosis. You are NOT prescribing. You are surfacing evidence so the physician can make an informed decision.

A doctor wants to prescribe: ${args.new_drug}

Patient profile:
- Current medications: ${medications.join(', ')}
- Age: ${args.patient_age || 'not provided'}
- Conditions: ${conditions.join(', ') || 'not provided'}

Follow this exact reasoning sequence:

STEP 1 — Call get_drug_info("${args.new_drug}")
Understand the drug's mechanism, enzyme pathways, and drug class before anything else.

STEP 2 — Call check_drug_interactions with the complete patient medication list
Use the enzyme pathway knowledge from Step 1 to interpret what comes back.
Check ALL current medications — not just the most obvious one.

STEP 3 — If any serious interaction is found, call get_drug_alternatives
Provide the drug class and condition being treated.

STEP 4 — Synthesize and respond using this structure:

## Risk Assessment: [🔴 HIGH / 🟡 MODERATE / 🟢 LOW / ⚪ INSUFFICIENT DATA]

### Drug pairs of concern
[List each pair with mechanism and severity]

### Evidence
[For each finding: source name, date of data, what it shows]

### Patient-specific factors
[How does this patient's age/kidney function/conditions affect the risk?]

### Recommendation
[What should the doctor consider? Include the safer alternative if found.]

### Sources retrieved
- OpenFDA: accessed ${new Date().toISOString()}
- PubMed: accessed ${new Date().toISOString()}
- ClinicalTrials.gov: accessed ${new Date().toISOString()}

---
*Clinical decision support tool. All prescribing decisions rest with the treating physician.*`,
      }],
    };
  }

  @Prompt({
    name: 'polypharmacy_audit',
    description: 'Activates a full medication audit mode for patients on multiple drugs. Use when onboarding a new patient or auditing an existing medication regimen before adding anything new.',
    arguments: [
      { name: 'medications', description: 'Comma-separated list of all current medications to audit', required: true },
    ],
  })
  async polypharmacyAudit(args: { medications: string }, ctx: ExecutionContext) {
    const meds = args.medications.split(',').map(m => m.trim());
    const pairCount = (meds.length * (meds.length - 1)) / 2;
    return {
      messages: [{
        role: 'user',
        content: `You are performing a complete polypharmacy safety audit for a patient on ${meds.length} medications: ${meds.join(', ')}.

This will check ${pairCount} drug pair combinations.

STEP 1 — Call get_patient_polypharmacy_risk with the complete medication list.
This checks every drug pair against FDA adverse events, PubMed research, and ClinicalTrials.gov simultaneously.

STEP 2 — For any HIGH risk pairs found, call get_drug_alternatives.

STEP 3 — Synthesize findings:

## Polypharmacy Audit Report
**Patient medications audited:** ${meds.join(', ')}
**Total pairs checked:** ${pairCount}

### High Risk Interactions (requires immediate attention)
[List pairs with death reports or serious adverse events]

### Moderate Risk (monitor closely)
[List pairs with non-serious but documented interactions]

### Low Risk (note for records)
[Briefly list any other pairs with minor evidence]

### Priority actions for physician
[Ordered list of what to address first]

---
*This audit surfaces published evidence. Clinical judgment determines what action to take.*`,
      }],
    };
  }
}