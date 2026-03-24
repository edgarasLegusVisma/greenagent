/**
 * Standard command — runs the current pipeline from pipeline.json.
 * If no pipeline.json exists, generates one from agent md files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GreenTracker } from '../tracker.js';
import { RESET, DIM, CYAN_FG, GREEN_FG } from '../colors.js';
import { SONNET, DEFAULT_CARBON_REGION, OPTIMIZER_MAX_TOKENS } from '../config.js';
import { runDynamicPipeline } from '../pipeline.js';
import type { PipelineConfig } from '../pipeline.js';
import { loadPrompt, readAgentConfigs } from '../helpers.js';

export async function generatePipelineConfig(
  codebaseDir: string,
  promptsDir: string,
  client: any,
): Promise<PipelineConfig> {
  const agentDir = path.join(codebaseDir, 'agents');
  const agentConfigs = readAgentConfigs(agentDir);

  const agentConfigsText = agentConfigs
    .map(a => `--- ${a.filename} ---\n${a.content}`)
    .join('\n\n');

  console.log(`  ${CYAN_FG}🔬 Generating pipeline config from ${agentConfigs.length} agent configs...${RESET}`);

  const greenagentPrompt = loadPrompt(path.join(promptsDir, 'greenagent.md'));

  const response = await client.messages.create({
    model: SONNET,
    max_tokens: OPTIMIZER_MAX_TOKENS,
    system: greenagentPrompt,
    messages: [{
      role: 'user',
      content: `Agent configurations:\n\n${agentConfigsText}`,
    }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  const config: PipelineConfig = JSON.parse(cleaned);

  // Save to project so subsequent runs reuse it
  const pipelinePath = path.join(codebaseDir, 'pipeline.json');
  fs.writeFileSync(pipelinePath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`  ${GREEN_FG}✅ Pipeline config saved: ${pipelinePath}${RESET}`);
  console.log(`  ${DIM}${config.agents.length} agents wired. Cached for subsequent runs.${RESET}`);
  console.log();

  return config;
}

export async function runStandard(
  task: string,
  codebaseDir: string,
  promptsDir: string,
  haikuModel: string,
  sonnetModel: string,
  client: any,
): Promise<{ tracker: GreenTracker }> {
  const pipelinePath = path.join(codebaseDir, 'pipeline.json');
  let config: PipelineConfig;

  if (fs.existsSync(pipelinePath)) {
    config = JSON.parse(fs.readFileSync(pipelinePath, 'utf-8'));
    console.log(`  ${DIM}Using cached pipeline: ${config.agents.length} agents${RESET}`);
  } else {
    config = await generatePipelineConfig(codebaseDir, promptsDir, client);
  }

  console.log();
  return runDynamicPipeline(config, task, haikuModel, sonnetModel, client, 'standard');
}
