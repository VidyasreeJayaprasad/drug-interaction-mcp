
import { ResourceDecorator as Resource, ControllerDecorator as Controller } from '@nitrostack/core';
import { PatientContext } from '../types/index.js';

@Controller('patient_profile_resource')
export class PatientProfileResource {


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