/**
 * Dynamic pipeline — runs an AI-generated agent configuration.
 */

import { GreenTracker, BudgetExceededError } from './tracker.js';
import { runAgent } from './runner.js';
import { READ_TOOLS, WRITE_TOOLS, setCurrentSubdir } from './tools.js';
import { cleanOutputDir, listOutputFiles, printGeneratedFiles } from './helpers.js';
import { RESET, BOLD, YELLOW_FG } from './colors.js';

export interface AgentConfig {
  name: string;
  icon: string;
  category: string;
  model: string;  // "haiku" or "sonnet"
  tools: string[];
  maxToolRounds: number;
  maxTokens: number;
  prompt: string;
  inputFrom: string[];
  note: string;
}

export interface PipelineConfig {
  budgetLimitUsd: number;
  maxIterations: number;
  agents: AgentConfig[];
}

export interface DemoResult {
  tracker: GreenTracker;
  output: string;
}

export const PIPELINE_OPTIMIZER_PROMPT =
  `You are an AI multi-agent pipeline optimizer. You receive:\n` +
  `1. X-Ray analysis with specific optimization suggestions\n` +
  `2. Current agent system prompts (the md files)\n` +
  `3. The current pipeline structure (which agents run, in what order, with what tools and models)\n\n` +
  `Your job: produce an optimized pipeline configuration that addresses the suggestions.\n\n` +
  `You can:\n` +
  `- Remove agents that are redundant (e.g. remove Quality Gate if Code Reviewer already validates)\n` +
  `- Combine agents (e.g. merge Backend + Frontend into Full-Stack Implementer)\n` +
  `- Change models (e.g. use Haiku for planning, keep Sonnet for execution)\n` +
  `- Reduce maxToolRounds (e.g. cap planner at 5 rounds instead of 20)\n` +
  `- Rewrite agent prompts to be more focused and efficient\n` +
  `- Add constraints to prompts (e.g. "output a summary, not raw file contents")\n` +
  `- Change tool access (e.g. give reader read_file only, not list_files)\n` +
  `- Add budget guardrails\n\n` +
  `Respond with ONLY a JSON object (no markdown, no code fences):\n` +
  `{\n` +
  `  "budgetLimitUsd": 1.0,\n` +
  `  "maxIterations": 30,\n` +
  `  "agents": [\n` +
  `    {\n` +
  `      "name": "AGENT NAME",\n` +
  `      "icon": "emoji",\n` +
  `      "category": "planning|coordination|routing|execution|reflection|validation",\n` +
  `      "model": "haiku|sonnet",\n` +
  `      "tools": ["list_files", "read_file", "write_file"],\n` +
  `      "maxToolRounds": 5,\n` +
  `      "maxTokens": 500,\n` +
  `      "prompt": "The full system prompt for this agent...",\n` +
  `      "inputFrom": ["PREVIOUS AGENT NAME"],\n` +
  `      "note": "Short description for the X-Ray step log"\n` +
  `    }\n` +
  `  ]\n` +
  `}\n\n` +
  `The "inputFrom" array specifies which previous agents' outputs get passed as context. ` +
  `The orchestrator concatenates them into the user message automatically.\n\n` +
  `Model values: "haiku" for cheap/fast tasks, "sonnet" for quality-critical tasks.\n` +
  `Tool values: "list_files", "read_file", "write_file" (or empty array for no tools).\n` +
  `Category values: "planning", "coordination", "routing", "execution", "reflection", "validation".`;

export async function runDynamicPipeline(
  config: PipelineConfig,
  task: string,
  haikuModel: string,
  sonnetModel: string,
  client: any,
): Promise<DemoResult> {
  setCurrentSubdir('optimized');
  cleanOutputDir('optimized');

  const tracker = new GreenTracker({
    carbonRegion: 'eu_avg',
    budgetLimitUsd: config.budgetLimitUsd ?? 2.0,
    maxIterations: Math.max(config.maxIterations ?? 50, 50), // floor at 50 steps
  });

  const agentOutputs: Record<string, string> = {};

  const toolMap: Record<string, any> = {
    'list_files': READ_TOOLS[0],
    'read_file': READ_TOOLS[1],
    'write_file': WRITE_TOOLS[0],
  };

  for (const agent of config.agents) {
    const inputs = agent.inputFrom
      .map(name => agentOutputs[name] ? `${name} output:\n${agentOutputs[name]}` : '')
      .filter(s => s.length > 0)
      .join('\n\n');

    const userMessage = inputs
      ? `Task: ${task}\n\n${inputs}`
      : `Task: ${task}`;

    const tools = agent.tools
      .map(t => toolMap[t])
      .filter(Boolean);

    try {
      const output = await runAgent(tracker, {
        agentName: agent.name,
        agentIcon: agent.icon,
        category: agent.category,
        model: agent.model === 'haiku' ? haikuModel : sonnetModel,
        system: agent.prompt,
        userMessage,
        tools: tools.length > 0 ? tools : undefined,
        maxTokens: agent.maxTokens,
        maxToolRounds: agent.maxToolRounds,
        note: agent.note,
      }, client);

      agentOutputs[agent.name] = output;
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        console.log(`\n  ${YELLOW_FG}${BOLD}⚠️  Budget guardrail hit: ${err.message}${RESET}`);
        console.log(`  ${YELLOW_FG}Stopping pipeline gracefully — partial results saved.${RESET}`);
        break;
      }
      throw err;
    }
  }

  printGeneratedFiles('optimized');
  const files = listOutputFiles('optimized');
  const outputStr = `Files generated (${files.length}):\n${files.map(f => `  - ${f}`).join('\n')}`;
  return { tracker, output: outputStr };
}
