import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DrugInteractionModule } from './modules/drug-interaction/drug-interaction.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 *
 * This is the main module that bootstraps the MCP server.
 * It registers the DrugInteractionModule and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'drug-interaction-checker',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Drug Interaction MCP Server — Real-time drug safety checker using FDA, PubMed, and ClinicalTrials.gov',
  imports: [
    ConfigModule.forRoot(),
    DrugInteractionModule,
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ],
})
export class AppModule {}
