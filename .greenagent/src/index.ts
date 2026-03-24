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
export { runAgent, MAX_TOOL_ROUNDS } from './runner.js';
export type { AgentOptions } from './runner.js';
export { runDynamicPipeline, PIPELINE_OPTIMIZER_PROMPT } from './pipeline.js';
export type { AgentConfig, PipelineConfig, DemoResult } from './pipeline.js';
export { cleanOutputDir, listOutputFiles, printGeneratedFiles } from './helpers.js';
