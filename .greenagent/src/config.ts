/**
 * GreenAgent configuration — all tunable values in one place.
 */

// ── Models ────────────────────────────────────────────────────────
export const SONNET = 'claude-sonnet-4-6';
export const HAIKU = 'claude-haiku-4-5-20251001';

// ── Default task ──────────────────────────────────────────────────
export const DEFAULT_TASK =
  'Add a KnowledgeBase feature to IntelliDesk — a service that suggests ' +
  'answers from previously resolved tickets. Generate the new backend ' +
  'service, interface, DTO, controller endpoint, and Angular frontend ' +
  'component, following the existing code patterns in the codebase.';

// ── Agent runner ──────────────────────────────────────────────────
export const MAX_TOOL_ROUNDS = 20;       // default max tool rounds per agent
export const SINGLE_PROMPT_MAX_ROUNDS = 6; // max continuation rounds for single prompt

// ── Tracking defaults ─────────────────────────────────────────────
export const DEFAULT_CARBON_REGION = 'eu_avg';

// ── Pipeline guardrails ───────────────────────────────────────────
export const PIPELINE_MIN_ITERATIONS = 50;   // floor — AI can't set lower
export const PIPELINE_DEFAULT_BUDGET = 2.0;  // USD — default if AI doesn't set one

// ── GreenAgent optimizer ──────────────────────────────────────────
export const OPTIMIZER_MAX_TOKENS = 4000;    // max response for pipeline generation
export const ANALYSIS_MAX_TOKENS = 2000;     // max response for X-Ray analysis
