import { OpenFdaService } from './dist/modules/drug-interaction/services/openfda.service.js';
import { PubmedService } from './dist/modules/drug-interaction/services/pubmed.service.js';
import { ClinicalTrialsService } from './dist/modules/drug-interaction/services/clinical-trials.service.js';
import { OrchestratorTools } from './dist/modules/drug-interaction/tools/orchestrator.tools.js';

async function test() {
  const fda = new OpenFdaService();
  const pubmed = new PubmedService();
  const trials = new ClinicalTrialsService();
  const orchestrator = new OrchestratorTools(fda, pubmed, trials);

  const input = {
    new_drug: "fluconazole",
    current_medications: ["warfarin"],
    patient_context: { age: 72, conditions: ["atrial fibrillation"] }
  };

  console.log("Running check_drug_interactions with:", input);
  try {
    const result = await orchestrator.checkDrugInteractions(input);
    console.log("\n✅ SUCCESS! Raw JSON Output:\n");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

test();
