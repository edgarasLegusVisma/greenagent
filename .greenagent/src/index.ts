// Core
export { GreenTracker, BudgetExceededError } from './tracker.js';
export type { Step, StepClassification, TrackerOptions } from './tracker.js';
export { XRay } from './xray.js';

// Carbon & suggestions
export { estimateEnergyWh, estimateCarbonMg, estimateWaterMl, makeRelatable, CARBON_INTENSITY } from './carbon.js';
export { generateAISuggestions, suggestionIcon } from './suggestions.js';
export type { Suggestion, AISuggestionResult } from './suggestions.js';

// Infrastructure
export { RESET, BOLD, DIM, CYAN_FG, GREEN_FG, YELLOW_FG, MAGENTA_FG, GRAY_FG, WHITE_FG } from './colors.js';
export { READ_TOOLS, WRITE_TOOLS, READ_FILE_ONLY, ALL_TOOLS, setToolContext, setCurrentSubdir, getOutputDir, executeTool } from './tools.js';
export { runAgent } from './runner.js';
export type { AgentOptions } from './runner.js';
export { runDynamicPipeline } from './pipeline.js';
export type { AgentConfig, PipelineConfig, DemoResult } from './pipeline.js';
export { cleanOutputDir, listOutputFiles, printGeneratedFiles, analyzeAndReport, saveResults, readAgentConfigs, loadPrompt } from './helpers.js';
export { SONNET, HAIKU, DEFAULT_CARBON_REGION, MAX_TOOL_ROUNDS, SINGLE_PROMPT_MAX_ROUNDS, PIPELINE_MIN_ITERATIONS, PIPELINE_DEFAULT_BUDGET, OPTIMIZER_MAX_TOKENS, ANALYSIS_MAX_TOKENS } from './config.js';

// Commands
export { runSinglePrompt } from './commands/single.js';
export { runStandard, generatePipelineConfig } from './commands/standard.js';
export { runApply } from './commands/apply.js';
export { runCompare } from './commands/compare.js';
