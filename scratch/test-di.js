import 'reflect-metadata';
import { AppModule } from '../dist/app.module.js';
import { DIContainer } from '../node_modules/@nitrostack/core/dist/core/di/container.js';
import { DrugInfoTools } from '../dist/modules/drug-interaction/tools/drug-info.tool.js';
import { OpenFdaService } from '../dist/modules/drug-interaction/services/openfda.service.js';

const container = DIContainer.getInstance();

console.log('--- TEST DI ---');
console.log('DrugInfoTools class:', DrugInfoTools);
console.log('OpenFdaService class:', OpenFdaService);

// Check metadata directly on DrugInfoTools
const params = Reflect.getMetadata('design:paramtypes', DrugInfoTools);
console.log('Reflect.getMetadata("design:paramtypes", DrugInfoTools):', params);

// Resolve DrugInfoTools from DI
try {
  // We need to register AppModule or its providers
  container.register(OpenFdaService);
  container.register(DrugInfoTools);
  
  const instance = container.resolve(DrugInfoTools);
  console.log('Resolved DrugInfoTools instance:', instance);
  console.log('openFda injected:', instance.openFda);
  console.log('pubmed injected:', instance.pubmed);
} catch (e) {
  console.error('Resolve failed:', e);
}
