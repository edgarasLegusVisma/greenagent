/**
 * Dynamic pipeline — runs an AI-generated agent configuration.
 */

import { GreenTracker, BudgetExceededError } from './tracker.js';
import { runAgent } from './runner.js';
import { READ_TOOLS, WRITE_TOOLS, setCurrentSubdir } from './tools.js';
import { cleanOutputDir, listOutputFiles, printGeneratedFiles } from './helpers.js';
import { RESET, BOLD, YELLOW_FG } from './colors.js';
import { DEFAULT_CARBON_REGION, PIPELINE_MIN_ITERATIONS, PIPELINE_DEFAULT_BUDGET } from './config.js';

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

export async function runDynamicPipeline(
  config: PipelineConfig,
  task: string,
  haikuModel: string,
  sonnetModel: string,
  client: any,
  outputSubdir: string = 'optimized',
): Promise<DemoResult> {
  setCurrentSubdir(outputSubdir);
  cleanOutputDir(outputSubdir);

  const tracker = new GreenTracker({
    carbonRegion: DEFAULT_CARBON_REGION,
    budgetLimitUsd: config.budgetLimitUsd ?? PIPELINE_DEFAULT_BUDGET,
    maxIterations: Math.max(config.maxIterations ?? PIPELINE_MIN_ITERATIONS, PIPELINE_MIN_ITERATIONS),
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

  printGeneratedFiles(outputSubdir);
  const files = listOutputFiles(outputSubdir);
  const outputStr = `Files generated (${files.length}):\n${files.map(f => `  - ${f}`).join('\n')}`;
  return { tracker, output: outputStr };
}
