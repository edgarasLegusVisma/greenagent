/**
 * Apply command — reads X-Ray diagnosis, generates optimized pipeline, runs it,
 * writes updated agent configs back to the project.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GreenTracker } from '../tracker.js';
import { RESET, BOLD, DIM, CYAN_FG, GREEN_FG } from '../colors.js';
import { SONNET, DEFAULT_CARBON_REGION, OPTIMIZER_MAX_TOKENS } from '../config.js';
import { getOutputDir } from '../tools.js';
import { runDynamicPipeline } from '../pipeline.js';
import type { PipelineConfig } from '../pipeline.js';
import { analyzeAndReport, loadPrompt, readAgentConfigs } from '../helpers.js';

export async function runApply(
  reportPath: string,
  task: string,
  codebaseDir: string,
  promptsDir: string,
  haikuModel: string,
  sonnetModel: string,
  client: any,
): Promise<void> {
  console.log();
  console.log(`  ${CYAN_FG}${BOLD}📋 Reading X-Ray suggestions from ${reportPath}...${RESET}`);
  console.log();

  if (!fs.existsSync(reportPath)) {
    console.error(`  Error: File not found: ${reportPath}`);
    process.exit(1);
  }

  const report = fs.readFileSync(reportPath, 'utf-8');

  // Extract suggestion titles for display
  const suggestionTitles = (report.match(/### .+/g) || [])
    .map(t => t.replace(/^### (?:🔴|🟡|🟢|⚪)\s*(?:\[(?:HIGH|MEDIUM|LOW)\]\s*)?/, '').trim())
    .filter(t => t.length > 0);

  console.log(`  ${BOLD}📋 X-Ray diagnosed these issues:${RESET}`);
  console.log();
  for (const title of suggestionTitles) {
    console.log(`  🟡 ${title}`);
  }

  // Read all current agent md files
  const agentDir = path.join(codebaseDir, 'agents');
  const agentConfigs = readAgentConfigs(agentDir);

  // Build pipeline description dynamically from agent files
  const currentPipeline =
    `Current standard pipeline (${agentConfigs.length} agents, all using Sonnet):\n` +
    agentConfigs.map((a, i) => {
      const name = a.filename.replace('.md', '').replace(/-/g, ' ').toUpperCase();
      return `${i + 1}. ${name}`;
    }).join('\n') +
    '\n\nData flow: Each agent receives TEXT output from previous agents as its user message. ' +
    'The orchestrator passes outputs between agents — agents do not share conversation history. ' +
    'Tools available in the system: list_files (explore directories), read_file (read source files), write_file (create new files).';

  const agentConfigsText = agentConfigs
    .map(a => `--- ${a.filename} ---\n${a.content}`)
    .join('\n\n');

  const suggestionsSection = report.match(/## Optimization Suggestions\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || '';

  // Load GreenAgent prompt
  const greenagentPrompt = loadPrompt(path.join(promptsDir, 'greenagent.md'));

  // Load tracker data if available for richer context
  const outputDir = getOutputDir();
  const trackerDataPath = path.join(outputDir, 'standard', 'tracker-data.json');
  const trackerDataSection = fs.existsSync(trackerDataPath)
    ? `\nStep Telemetry (raw data):\n${fs.readFileSync(trackerDataPath, 'utf-8')}`
    : '';

  console.log();
  console.log(`  ${CYAN_FG}🔬 GreenAgent is redesigning the pipeline...${RESET}`);

  const pipelineTracker = new GreenTracker({ carbonRegion: DEFAULT_CARBON_REGION });
  pipelineTracker.startStep('analysis', SONNET);

  const pipelineResponse = await client.messages.create({
    model: SONNET,
    max_tokens: OPTIMIZER_MAX_TOKENS,
    system: greenagentPrompt,
    messages: [{
      role: 'user',
      content:
        `X-Ray Optimization Suggestions:\n${suggestionsSection}\n\n` +
        `Current Agent Configurations:\n${agentConfigsText}\n\n` +
        `Current Pipeline Structure:\n${currentPipeline}` +
        trackerDataSection,
    }],
  });

  pipelineTracker.recordStep(pipelineResponse, 'GreenAgent pipeline redesign');

  const responseText = pipelineResponse.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const cleaned = responseText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  let config: PipelineConfig;
  try {
    config = JSON.parse(cleaned);
  } catch (err) {
    console.error(`  ⚠️  Failed to parse pipeline config: ${(err as Error).message}`);
    console.error(`  Response:\n${cleaned.slice(0, 500)}`);
    process.exit(1);
  }

  // Display the generated pipeline
  console.log();
  console.log(`  ${GREEN_FG}${BOLD}🔧 Generated optimized pipeline (${config.agents.length} agents, down from ${agentConfigs.length}):${RESET}`);
  console.log();
  for (let i = 0; i < config.agents.length; i++) {
    const a = config.agents[i];
    const model = a.model === 'haiku' ? 'Haiku' : 'Sonnet';
    const toolStr = a.tools.length > 0 ? a.tools.join(', ') : 'no tools';
    const rounds = a.maxToolRounds ? `, ${a.maxToolRounds} rounds max` : '';
    console.log(`  ${i + 1}. ${a.icon} ${a.name} (${model}, ${toolStr}${rounds})`);
  }

  console.log();
  console.log(`  ${CYAN_FG}${BOLD}🚀 Running optimized pipeline...${RESET}`);

  const { tracker } = await runDynamicPipeline(config, task, haikuModel, sonnetModel, client);

  // Save pipeline config to output
  const configPath = path.join(outputDir, 'optimized', 'pipeline-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  await analyzeAndReport(tracker, 'Optimized Multi-Agent (AI-generated pipeline)', 'optimized', 'Optimized Multi-Agent', client, sonnetModel);

  // ── Apply changes: write optimized agent configs back to the project ──
  console.log();
  console.log(`  ${GREEN_FG}${BOLD}📝 Updating agent configs in ${agentDir}/${RESET}`);

  // Remove old agent md files
  for (const a of agentConfigs) {
    fs.unlinkSync(path.join(agentDir, a.filename));
  }

  // Write new agent md files from the pipeline config
  for (const agent of config.agents) {
    const filename = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') + '.md';
    const filePath = path.join(agentDir, filename);
    fs.writeFileSync(filePath, agent.prompt + '\n', 'utf-8');
    console.log(`  ${GREEN_FG}✅${RESET} ${filename}`);
  }

  // Save pipeline config to the project so `standard` picks it up
  const projectPipelinePath = path.join(codebaseDir, 'pipeline.json');
  fs.writeFileSync(projectPipelinePath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`  ${GREEN_FG}✅${RESET} pipeline.json`);

  console.log();
  console.log(`  ${GREEN_FG}🔧 Pipeline config saved:${RESET}  ${configPath}`);
  console.log(`  ${DIM}Agent configs updated. Run 'standard' to use the optimized agents.${RESET}`);
  console.log(`  ${DIM}To revert: git checkout intellidesk/${RESET}`);
}
