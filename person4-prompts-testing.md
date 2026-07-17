# Person 4 — Resources, Prompts, NitroStudio Testing & Demo

## Your Role
You are the bridge between the backend (what Persons 1-3 build) and the experience the judge sees. You define HOW the AI agent reasons over the data through prompts, build the patient profile resource, and own all testing and the final demo. Your work in Phase 2 can happen in parallel. Your Phase 4 work (testing) is critical — nothing ships without it.

## What you must NOT touch
- `src/app.module.ts` — Person 1 wires this
- `src/modules/drug-interaction/drug-interaction.module.ts` — Person 1 wires this
- Any files in `src/modules/drug-interaction/services/` — those belong to Persons 2 and 3
- Any files in `src/modules/drug-interaction/tools/` — those belong to Persons 1, 2, and 3

## Dependencies you need from Person 1 (wait for Phase 1 to complete)
```typescript
import { PatientContext } from '../types/index.js';
```

## ⚠️ Critical: ESM Import Rules
This project uses `"type": "module"`. **All imports MUST use `.js` extensions.**

## ⚠️ Critical: @Prompt Decorator API
NitroStack prompts use the `arguments` array pattern, **NOT `argsSchema` with Zod**:
```typescript
// ✅ CORRECT — use arguments array
@Prompt({
  name: 'my_prompt',
  description: 'Does a thing',
  arguments: [
    { name: 'param1', description: 'First param', required: true },
    { name: 'param2', description: 'Second param', required: false },
  ],
})

// ❌ WRONG — argsSchema is not a valid option
@Prompt({
  name: 'my_prompt',
  argsSchema: z.object({ ... }),
})
```

---

## PHASE 2 — Build Resources and Prompts

### File 1: `src/modules/drug-interaction/resources/patient-profile.resource.ts`

Resources are data the AI can read passively — not tools it calls, but context it can reference. This resource holds the patient's profile so the agent always has full context.

```typescript
// src/modules/drug-interaction/resources/patient-profile.resource.ts
import { Injectable } from '@nitrostack/core';
import { Resource } from '@nitrostack/core';
import { PatientContext } from '../types/index.js';

@Injectable()
export class PatientProfileResource {

  // Store for the session patient profile
  // In production this would connect to an EHR system
  private currentProfile: PatientContext & {
    name?: string;
    medications: string[];
  } = {
    medications: [],
  };

  @Resource({
    name: 'patient_profile',
    description: 'Current patient clinical context including full medication list, age, existing conditions, and organ function status. The agent reads this before making tool calls to ensure all drug checks are relevant to this specific patient.',
    uri: 'patient://profile',
    mimeType: 'application/json',
  })
  async getPatientProfile() {
    const profile = this.currentProfile.medications.length > 0
      ? this.currentProfile
      : this.getDemoProfile();

    return {
      contents: [{
        uri: 'patient://profile',
        mimeType: 'application/json',
        text: JSON.stringify({
          profile,
          usage_note: 'Use this patient context when calling check_drug_interactions and get_patient_polypharmacy_risk. Pass medications as current_medications and include patient_context fields.',
        }, null, 2),
      }],
    };
  }

  @Resource({
    name: 'demo_patient',
    description: 'Pre-loaded demo patient for hackathon demonstration — 72-year-old with atrial fibrillation on warfarin, lisinopril, and metformin',
    uri: 'patient://demo',
    mimeType: 'application/json',
  })
  async getDemoPatientResource() {
    return {
      contents: [{
        uri: 'patient://demo',
        mimeType: 'application/json',
        text: JSON.stringify(this.getDemoProfile(), null, 2),
      }],
    };
  }

  private getDemoProfile() {
    return {
      name: 'Demo Patient',
      age: 72,
      weight_kg: 68,
      medications: ['warfarin', 'lisinopril', 'metformin'],
      conditions: ['atrial fibrillation', 'type 2 diabetes', 'hypertension'],
      kidney_function: 'eGFR 45 — mild-to-moderate impairment',
      liver_function: 'Normal',
      known_allergies: ['penicillin'],
      notes: 'Patient has been on warfarin for 3 years for AF. INR target 2.0-3.0. Last INR check: 2.4 (3 weeks ago).',
    };
  }
}
```

### File 2: `src/modules/drug-interaction/prompts/clinical-safety.prompt.ts`

Prompts are reusable instruction templates the agent uses to reason consistently. This is what shapes the quality of the agent's output.

**IMPORTANT:** Use `arguments` array, NOT `argsSchema` with Zod. This is a NitroStack convention.

```typescript
// src/modules/drug-interaction/prompts/clinical-safety.prompt.ts
import { Injectable } from '@nitrostack/core';
import { Prompt } from '@nitrostack/core';

@Injectable()
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
  }) {
    const medications = args.patient_medications.split(',').map(m => m.trim());
    const conditions = args.patient_conditions?.split(',').map(c => c.trim()) || [];

    return {
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You are a clinical pharmacologist providing real-time decision support to a physician. You are NOT providing a diagnosis. You are NOT prescribing. You are surfacing evidence so the physician can make an informed decision.

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
        },
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
  async polypharmacyAudit(args: { medications: string }) {
    const meds = args.medications.split(',').map(m => m.trim());
    const pairCount = (meds.length * (meds.length - 1)) / 2;
    return {
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You are performing a complete polypharmacy safety audit for a patient on ${meds.length} medications: ${meds.join(', ')}.

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
        },
      }],
    };
  }
}
```

### File 3: `src/modules/drug-interaction/prompts/report-format.prompt.ts`

```typescript
// src/modules/drug-interaction/prompts/report-format.prompt.ts
import { Injectable } from '@nitrostack/core';
import { Prompt } from '@nitrostack/core';

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
```

---

## PHASE 4 — Testing (your most important phase)

Run all tests in NitroStudio. Start `npm run dev` in the project folder first.

### Test Suite — run these in order

**Test 1: Individual tool smoke tests**
Go to NitroStudio → Tools panel and run each tool manually:

```json
// get_drug_info
{ "drug_name": "fluconazole" }
// Expected: returns CYP2C9 inhibitor, CYP3A4 inhibitor, azole antifungal class

// get_drug_info
{ "drug_name": "warfarin" }
// Expected: returns anticoagulant, CYP2C9 substrate mentioned

// check_drug_interactions
{
  "new_drug": "fluconazole",
  "current_medications": ["warfarin"],
  "patient_context": { "age": 72, "conditions": ["atrial fibrillation"] }
}
// Expected: returns FDA adverse events, PubMed papers, clinical trials — all with dates

// get_drug_alternatives
{
  "drug_to_replace": "fluconazole",
  "condition_being_treated": "fungal infection",
  "patient_current_medications": ["warfarin"],
  "drug_class": "azole antifungal"
}
// Expected: returns terbinafine, nystatin, micafungin with safety rationale

// get_patient_polypharmacy_risk
{
  "medications": ["warfarin", "lisinopril", "metformin", "aspirin"],
  "patient_context": { "age": 72, "kidney_function": "eGFR 45" }
}
// Expected: checks 6 drug pairs, returns risk levels for each

// search_clinical_trials
{ "search_terms": "fluconazole warfarin", "filter_status": "COMPLETED", "limit": 5 }
// Expected: returns real NCT IDs with titles and completion dates
```

**Test 2: Full agent flow in NitroStudio Chat**

Select the `clinical_safety_check` prompt, fill in:
- new_drug: `fluconazole`
- patient_medications: `warfarin, lisinopril, metformin`
- patient_age: `72`
- patient_conditions: `atrial fibrillation, type 2 diabetes`

Watch the agent's tool call sequence in the Chat panel. It should:
1. Call `get_drug_info("fluconazole")` autonomously
2. Call `check_drug_interactions(...)`
3. Call `get_drug_alternatives(...)` after finding the warfarin interaction
4. Return a structured risk assessment citing FDA, PubMed, and ClinicalTrials.gov

If the agent skips steps or doesn't call tools, the prompt description on each tool needs to be clearer. Tell Person 1.

**Test 3: Polypharmacy audit flow**
Use the `polypharmacy_audit` prompt with:
- medications: `warfarin, aspirin, lisinopril, metformin`

Should call `get_patient_polypharmacy_risk` and return a full audit of all 6 pairs.

**Test 4: Edge cases**
```json
// New drug with no known interactions (should return clean bill of health)
{ "new_drug": "vitamin d", "current_medications": ["metformin"] }

// Drug approved recently with little data (test handling of empty results)
{ "new_drug": "some_new_drug_2025", "current_medications": ["warfarin"] }
// Expected: returns "no results found" gracefully, does NOT crash
```

**Log all bugs you find with:** tool name, exact input, what went wrong, what you expected. Send to the relevant person immediately.

---

## PHASE 5 — Demo Preparation

### The 60-Second Demo Script

**What to have open:** NitroStudio Chat, `clinical_safety_check` prompt pre-loaded

**What to say:**
> "A 72-year-old patient with atrial fibrillation is on warfarin. Their doctor wants to prescribe fluconazole for a fungal infection. Watch what happens when we ask our MCP server."

**Type into chat:**
> "Is it safe to prescribe fluconazole to my patient on warfarin? They're 72 with atrial fibrillation."

**While it runs, narrate:**
> "The agent just called get_drug_info to understand fluconazole's mechanism — it found it's a strong CYP2C9 inhibitor. Now it's querying FDA, PubMed, and ClinicalTrials.gov simultaneously for warfarin interactions... This data is being fetched live right now."

**When the result appears:**
> "It found a high-risk interaction. Fluconazole inhibits the enzyme that breaks down warfarin — causing warfarin to build up in the blood, which can cause dangerous bleeding. The agent cited an FDA adverse event report from [date] and a PubMed paper from [date]. It then automatically called get_drug_alternatives and suggested terbinafine as a safer option."

**Closing line:**
> "A standard AI would have answered this from training data that might be 2 years old. Our server fetched that adverse event report seconds ago. That's what MCP makes possible."

### Anticipate These Judge Questions

**Q: Why not just use an existing drug checker?**
A: Existing checkers are static — updated quarterly. Ours hits live databases. A drug approved 3 months ago won't be in Drugs.com. It might be in OpenFDA already.

**Q: What if the APIs are down during the demo?**
A: Each API call is wrapped in try/catch and returns empty arrays on failure — the server stays alive. Prepare a backup by running the demo once before the presentation and screenshotting the output.

**Q: Is this safe to use in real hospitals?**
A: This is a clinical decision support tool — it surfaces evidence. The physician makes all decisions. Same model as UpToDate or Epocrates. We've included that disclaimer in every response.

**Q: What's the AI's role vs the MCP server's role?**
A: The MCP server provides the hands — the ability to reach out and fetch live data. The AI provides the brain — it decides which tools to call, in what order, and reasons over the returned evidence. Without MCP, the AI can only use its training data. Without the AI, the MCP server is just raw API calls with no reasoning.

## Branch and PR
```bash
git checkout -b feat/person4-resources-prompts
git add src/modules/drug-interaction/resources/patient-profile.resource.ts src/modules/drug-interaction/prompts/clinical-safety.prompt.ts src/modules/drug-interaction/prompts/report-format.prompt.ts
git commit -m "feat: patient profile resource, clinical safety prompts, report format prompt"
git push origin feat/person4-resources-prompts
# open PR to main
```
