/**
 * Type definitions for agent-scenario-tester.
 */

export type Framework = 'express' | 'nextjs' | 'fastapi';

export type WorkflowStage = 'setup' | 'scaffold' | 'listen' | 'iterate';

export interface EvaluationSection {
  stage: string;
  points: number;
  checks: string[];
}

export interface ScenarioConfig {
  name: string;
  displayName: string;
  description: string;
  stages: WorkflowStage[];
  prompt: string;
  providers?: string[];
  providerDefault?: string;
  providerConfig?: Record<string, { events: string[] }>;
  evaluation: EvaluationSection[];
  requiresSetup?: boolean;
  setupFixture?: string;
}

export interface ResolvedScenario {
  config: ScenarioConfig;
  prompt: string;
  framework: Framework;
  provider?: string;
}

export interface ScenarioResult {
  scenario: ScenarioConfig;
  framework: Framework;
  provider?: string;
  directory: string;
  duration: number;
  filesGenerated: string[];
  logFile: string;
  reportFile: string;
  prompt: string;
}

export interface ScenariosDoc {
  frameworks: Framework[];
  scenarios: ScenarioConfig[];
}
