/**
 * Type definitions for agent-scenario-tester.
 */

export type Framework = 'express' | 'nextjs' | 'fastapi';

export type WorkflowStage = 'setup' | 'scaffold' | 'listen' | 'iterate';

/** Exactly one skill copied into .claude/skills/ for the run. Omitted defaults to event-gateway. */
export type SkillUnderTest = 'hookdeck' | 'event-gateway' | 'outpost';

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
  /** Which skill directory to install (default: event-gateway). */
  skillUnderTest?: SkillUnderTest;
  /**
   * Optional markdown rubric for the LLM judge. If omitted, criteria are derived from evaluation.checks.
   */
  successCriteriaMarkdown?: string;
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
