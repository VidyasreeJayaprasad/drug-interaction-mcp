// src/modules/drug-interaction/types/index.ts
// Shared types for the Drug Interaction MCP Server.
// ALL team members import from this file. Do NOT modify without coordinating with Person 1.

export interface PatientContext {
  age?: number;
  weight_kg?: number;
  conditions?: string[];
  kidney_function?: string;
  liver_function?: string;
}

export interface DrugMechanism {
  type: string;           // e.g. "CYP2C9 inhibitor", "CYP3A4 inhibitor"
  strength: 'strong' | 'moderate' | 'weak';
  affected_drugs: string[]; // drugs metabolized by this pathway
}

export interface DrugInfo {
  drug_name: string;
  generic_name?: string;
  brand_names: string[];
  drug_class: string;
  mechanisms: DrugMechanism[];
  primary_use: string;
  contraindications: string[];
  source: string;
  retrieved_at: string;
}

export interface DrugAlternative {
  drug_name: string;
  generic_name?: string;
  brand_names: string[];
  drug_class: string;
  why_safer: string;
  key_side_effects: string[];
  contraindications: string[];
  notes: string;
}

export interface FdaAdverseEvent {
  source: 'OpenFDA Adverse Events';
  drug_pair: string[];
  serious: boolean;
  outcome: string;
  report_date: string;
  death_reported: boolean;
}

export interface FdaLabelResult {
  source: 'OpenFDA Drug Label';
  drug_name: string;
  brand_name?: string;
  interaction_section?: string;
  warnings?: string;
}

export interface PubmedResult {
  source: 'PubMed';
  drug_pair: string[];
  pmids: string[];
  abstracts: string;
  result_count: number;
  pubmed_url: string;
}

export interface ClinicalTrialResult {
  source: 'ClinicalTrials.gov';
  drugs: string[];
  nct_id?: string;
  title?: string;
  status?: string;
  start_date?: string;
  completion_date?: string;
  summary?: string;
  conditions?: string[];
  url?: string;
}

export interface InteractionCheckOutput {
  new_drug: string;
  current_medications: string[];
  patient_context?: PatientContext;
  fda_adverse_events: FdaAdverseEvent[];
  fda_labels: FdaLabelResult[];
  pubmed_research: PubmedResult[];
  clinical_trials: ClinicalTrialResult[];
  retrieved_at: string;
  ai_instruction: string;
}

export interface PolypharmacyRiskOutput {
  patient_medications: string[];
  risk_pairs: {
    drug_a: string;
    drug_b: string;
    shared_mechanism: string;
    risk_level: 'high' | 'moderate' | 'low';
    fda_events: FdaAdverseEvent[];
    pubmed_evidence: PubmedResult[];
  }[];
  total_pairs_checked: number;
  retrieved_at: string;
}