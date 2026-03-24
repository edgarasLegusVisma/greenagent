/**
 * GreenAgent Live Demo — CLI orchestrator
 *
 * Thin CLI that defines the approaches and routes commands.
 * All infrastructure lives in src/ modules.
 *
 * Usage:
 *   npx tsx .greenagent/live.ts single       — single prompt baseline
 *   npx tsx .greenagent/live.ts standard     — 8-agent pipeline from agent configs
 *   npx tsx .greenagent/live.ts apply <report.md> — AI generates + runs optimized pipeline
 *   npx tsx .greenagent/live.ts optimized    — re-run saved optimized pipeline
 *   npx tsx .greenagent/live.ts compare <a.json> <b.json> — side-by-side comparison
 *
 * Flags:
 *   --task "description"    — what the agents should build (default: IntelliDesk KnowledgeBase)
 *   --codebase ./path       — target codebase (default: auto-detected)
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  GreenTracker, XRay, generateAISuggestions,
  RESET, BOLD, DIM, CYAN_FG, GREEN_FG, GRAY_FG,
  READ_TOOLS, WRITE_TOOLS, READ_FILE_ONLY, setToolContext, setCurrentSubdir,
  runAgent, runDynamicPipeline, PIPELINE_OPTIMIZER_PROMPT,
  cleanOutputDir, listOutputFiles, printGeneratedFiles,
} from './src/index.js';
import type { PipelineConfig, DemoResult } from './src/index.js';

// ─────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────

const client = new Anthropic();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, 'output');

function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

// Codebase resolution: --codebase flag > ../intellidesk/ > ../
function resolveCodebase(): string {
  const flagPath = getFlag('codebase');
  if (flagPath) return path.resolve(flagPath);
  const intellideskPath = path.resolve(__dirname, '..', 'intellidesk');
  if (fs.existsSync(intellideskPath)) return intellideskPath;
  return path.resolve(__dirname, '..');
}

const CODEBASE_DIR = resolveCodebase();
setToolContext(CODEBASE_DIR, OUTPUT_DIR);

const DEFAULT_TASK =
  'Add a KnowledgeBase feature to IntelliDesk — a service that suggests ' +
  'answers from previously resolved tickets. Generate the new backend ' +
  'service, interface, DTO, controller endpoint, and Angular frontend ' +
  'component, following the existing code patterns in the codebase.';

const TASK = getFlag('task') || DEFAULT_TASK;

const SONNET = 'claude-sonnet-4-6';
const HAIKU = 'claude-haiku-4-5-20251001';

function loadAgentConfig(agentName: string): string {
  const filePath = path.join(CODEBASE_DIR, 'agents', `${agentName}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Agent config not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8').trim();
}

// ─────────────────────────────────────────────────────────────────────
// Analyze & save helpers
// ─────────────────────────────────────────────────────────────────────

async function analyzeAndReport(
  tracker: GreenTracker,
  title: string,
  subdir: string,
  label: string,
): Promise<void> {
  console.log(`\n  ${CYAN_FG}🔬 Running AI-powered suggestion analysis...${RESET}`);
  const result = await generateAISuggestions(tracker, client, SONNET);
  tracker.setSuggestions(result.suggestions, {
    tokens: result.analysisTokens,
    costUsd: result.analysisCostUsd,
  });
  XRay.report(tracker, title);
  saveResults(subdir, label, tracker);
}

function saveResults(subdir: string, label: string, tracker: GreenTracker): void {
  const dir = path.join(OUTPUT_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const reportPath = path.join(dir, 'xray-report.md');
  fs.writeFileSync(reportPath, XRay.reportToMarkdown(tracker, label), 'utf-8');

  const dataPath = path.join(dir, 'tracker-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(tracker.toJSON(label), null, 2), 'utf-8');

  console.log(`\n  ${GREEN_FG}📊 X-Ray report saved:${RESET}  ${reportPath}`);
  console.log(`  ${GREEN_FG}💾 Tracker data saved:${RESET}  ${dataPath}`);
}

// ─────────────────────────────────────────────────────────────────────
// APPROACH 1: Single Prompt
// ─────────────────────────────────────────────────────────────────────

async function runSinglePrompt(): Promise<DemoResult> {
  console.log(`\n  ${'='.repeat(60)}`);
  console.log('  🔵 APPROACH 1: Single Well-Crafted Prompt');
  console.log(`  ${'='.repeat(60)}`);
  console.log();

  setCurrentSubdir('single');
  cleanOutputDir('single');
  const tracker = new GreenTracker({ carbonRegion: 'eu_avg' });

  const isCustomTask = !!getFlag('task');
  const userContent = isCustomTask
    ? `${TASK}\n\nExplore the codebase to understand existing patterns and architecture, then implement the feature. Use write_file for each new file.`
    : `${TASK}\n\nContext: IntelliDesk is a customer support platform built with .NET 8 backend (Clean Architecture with API/Application/Domain/Infrastructure layers) and Angular 18 frontend (standalone components). It uses dependency injection, async/await, and has existing AI services like SmartReplyService that use Claude API via a ClaudeApiClient wrapper.\n\nUse write_file for each new file.`;

  const systemPrompt = isCustomTask
    ? 'You are a senior developer. Generate production-quality code following the existing codebase patterns. Use write_file for each file.'
    : 'You are a senior .NET/Angular developer. Generate production-quality code following the existing codebase patterns. Use write_file for each file.';

  const messages: any[] = [{ role: 'user', content: userContent }];

  for (let round = 1; round <= 6; round++) {
    const thinkStart = Date.now();
    const timer = setInterval(() => {
      const elapsed = ((Date.now() - thinkStart) / 1000).toFixed(1);
      process.stdout.write(
        `\r  ${GRAY_FG}⏳ Generating code... (${elapsed}s)${RESET}`,
      );
    }, 200);

    tracker.startStep('execution', SONNET);

    const response = await client.messages.create({
      model: SONNET,
      max_tokens: 8192,
      system: systemPrompt,
      messages,
      tools: [...READ_TOOLS, ...WRITE_TOOLS],
    });

    clearInterval(timer);
    const step = tracker.recordStep(
      response,
      round === 1 ? 'Single prompt generation' : 'Single prompt (continuation)',
    );
    process.stdout.write(`\r\x1b[K`);
    XRay.stepLive(step);

    if (response.stop_reason !== 'tool_use') break;

    const toolBlocks = response.content.filter((b: any) => b.type === 'tool_use');
    const { executeTool } = await import('./src/tools.js');
    const toolResults = toolBlocks.map((t: any) => ({
      type: 'tool_result' as const,
      tool_use_id: t.id,
      content: executeTool(t.name, t.input as Record<string, any>),
    }));

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  printGeneratedFiles('single');
  const files = listOutputFiles('single');
  const output = `Files generated (${files.length}):\n${files.map((f) => `  - ${f}`).join('\n')}`;
  return { tracker, output };
}

// ─────────────────────────────────────────────────────────────────────
// APPROACH 2: Standard Multi-Agent (reads from agent md files)
// ─────────────────────────────────────────────────────────────────────

async function runStandardMultiAgent(): Promise<DemoResult> {
  console.log(`\n  ${'='.repeat(60)}`);
  console.log('  🟡 APPROACH 2: Standard Multi-Agent Workflow');
  console.log(`  ${'='.repeat(60)}`);

  setCurrentSubdir('standard');
  cleanOutputDir('standard');
  const tracker = new GreenTracker({ carbonRegion: 'eu_avg' });

  // Agent 1: Planner
  const plan = await runAgent(tracker, {
    agentName: 'PLANNER', agentIcon: '🗺️', category: 'planning', model: SONNET,
    system: loadAgentConfig('planner'),
    userMessage: `Task: ${TASK}`,
    tools: READ_TOOLS, maxTokens: 2000,
    note: 'Explore project structure and create implementation plan',
  }, client);

  // Agent 2: Code Reader
  const codeContext = await runAgent(tracker, {
    agentName: 'CODE READER', agentIcon: '📖', category: 'coordination', model: SONNET,
    system: loadAgentConfig('code-reader'),
    userMessage: `Implementation plan:\n\n${plan}`,
    tools: READ_FILE_ONLY, maxTokens: 3000,
    note: 'Read relevant files to build detailed code context',
  }, client);

  // Agent 3: Architect
  const design = await runAgent(tracker, {
    agentName: 'ARCHITECT', agentIcon: '🏗️', category: 'coordination', model: SONNET,
    system: loadAgentConfig('architect'),
    userMessage: `Task: ${TASK}\n\nImplementation plan:\n${plan}\n\nCode context and patterns:\n${codeContext}`,
    maxTokens: 2000,
    note: 'Design feature architecture — classes, methods, file paths',
  }, client);

  // Agent 4: Backend Developer
  const backendWork = await runAgent(tracker, {
    agentName: 'BACKEND DEVELOPER', agentIcon: '💻', category: 'execution', model: SONNET,
    system: loadAgentConfig('backend-developer'),
    userMessage: `Task: ${TASK}\n\nArchitecture design:\n${design}\n\nCode patterns:\n${codeContext}`,
    tools: WRITE_TOOLS, maxTokens: 4096,
    note: 'Write backend implementation files',
  }, client);

  // Agent 5: Code Reviewer
  const review = await runAgent(tracker, {
    agentName: 'CODE REVIEWER', agentIcon: '🔍', category: 'reflection', model: SONNET,
    system: loadAgentConfig('code-reviewer'),
    userMessage: `Architecture design:\n${design}\n\nBackend implementation:\n${backendWork}`,
    maxTokens: 1500,
    note: 'Review implementation for correctness and consistency',
  }, client);

  // Agent 6: Backend Developer (fixes)
  const fixes = await runAgent(tracker, {
    agentName: 'BACKEND DEVELOPER (fixes)', agentIcon: '🔄', category: 'execution', model: SONNET,
    system: loadAgentConfig('backend-developer'),
    userMessage: `Review feedback:\n${review}\n\nOriginal implementation:\n${backendWork}`,
    tools: WRITE_TOOLS, maxTokens: 4096,
    note: 'Apply review fixes and rewrite affected files',
  }, client);

  // Agent 7: Frontend Developer
  const frontendWork = await runAgent(tracker, {
    agentName: 'FRONTEND DEVELOPER', agentIcon: '🎨', category: 'execution', model: SONNET,
    system: loadAgentConfig('frontend-developer'),
    userMessage: `Task: ${TASK}\n\nArchitecture design:\n${design}\n\nFrontend code patterns:\n${codeContext}`,
    tools: WRITE_TOOLS, maxTokens: 4096,
    note: 'Write frontend components',
  }, client);

  // Agent 8: Quality Gate
  await runAgent(tracker, {
    agentName: 'QUALITY GATE', agentIcon: '✅', category: 'validation', model: SONNET,
    system: loadAgentConfig('quality-gate'),
    userMessage: `Architecture design:\n${design}\n\nBackend implementation:\n${fixes}\n\nFrontend implementation:\n${frontendWork}`,
    maxTokens: 500,
    note: 'Final quality check — verify all requirements are met',
  }, client);

  printGeneratedFiles('standard');
  const files = listOutputFiles('standard');
  const output = `Files generated (${files.length}):\n${files.map((f) => `  - ${f}`).join('\n')}`;
  return { tracker, output };
}

// ─────────────────────────────────────────────────────────────────────
// Apply command — AI generates + runs optimized pipeline
// ─────────────────────────────────────────────────────────────────────

async function runApply(reportPath: string): Promise<void> {
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
  const agentDir = path.join(CODEBASE_DIR, 'agents');
  const agentFiles = fs.readdirSync(agentDir)
    .filter(f => f.endsWith('.md') && !fs.statSync(path.join(agentDir, f)).isDirectory());
  const agentConfigs = agentFiles.map(f => ({
    filename: f,
    content: fs.readFileSync(path.join(agentDir, f), 'utf-8').trim(),
  }));

  // Build pipeline description dynamically from agent files
  const currentPipeline =
    `Current standard pipeline (${agentFiles.length} agents, all using Sonnet):\n` +
    agentFiles.map((f, i) => {
      const name = f.replace('.md', '').replace(/-/g, ' ').toUpperCase();
      return `${i + 1}. ${name}`;
    }).join('\n') +
    '\n\nData flow: Each agent receives TEXT output from previous agents as its user message. ' +
    'The orchestrator passes outputs between agents — agents do not share conversation history. ' +
    'Tools available in the system: list_files (explore directories), read_file (read source files), write_file (create new files).';

  const agentConfigsText = agentConfigs
    .map(a => `--- ${a.filename} ---\n${a.content}`)
    .join('\n\n');

  const suggestionsSection = report.match(/## Optimization Suggestions\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || '';

  console.log();
  console.log(`  ${CYAN_FG}🔬 Generating optimized pipeline configuration...${RESET}`);

  const pipelineTracker = new GreenTracker({ carbonRegion: 'eu_avg' });
  pipelineTracker.startStep('analysis', SONNET);

  const pipelineResponse = await client.messages.create({
    model: SONNET,
    max_tokens: 4000,
    system: PIPELINE_OPTIMIZER_PROMPT,
    messages: [{
      role: 'user',
      content:
        `X-Ray Optimization Suggestions:\n${suggestionsSection}\n\n` +
        `Current Agent Configurations:\n${agentConfigsText}\n\n` +
        `Current Pipeline Structure:\n${currentPipeline}`,
    }],
  });

  pipelineTracker.recordStep(pipelineResponse, 'Generate optimized pipeline config');

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
  console.log(`  ${GREEN_FG}${BOLD}🔧 Generated optimized pipeline (${config.agents.length} agents, down from ${agentFiles.length}):${RESET}`);
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

  const { tracker } = await runDynamicPipeline(config, TASK, HAIKU, SONNET, client);

  // Save pipeline config
  const configPath = path.join(OUTPUT_DIR, 'optimized', 'pipeline-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  await analyzeAndReport(tracker, 'Optimized Multi-Agent (AI-generated pipeline)', 'optimized', 'Optimized Multi-Agent');

  console.log(`  ${GREEN_FG}🔧 Pipeline config saved:${RESET}  ${configPath}`);
  console.log(`  ${DIM}To inspect what the AI changed, see pipeline-config.json${RESET}`);
}

// ─────────────────────────────────────────────────────────────────────
// Compare command
// ─────────────────────────────────────────────────────────────────────

function runCompare(paths: string[]): void {
  if (paths.length < 2) {
    console.error('  Usage: npx tsx .greenagent/live.ts compare <path1.json> <path2.json> [path3.json]');
    process.exit(1);
  }

  const trackers: Record<string, GreenTracker> = {};
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.error(`  Error: File not found: ${p}`);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const { tracker, label } = GreenTracker.fromJSON(data);
    trackers[label] = tracker;
    console.log(`  ${DIM}Loaded: ${label} (${tracker.steps.length} steps, $${tracker.totalCostUsd.toFixed(4)})${RESET}`);
  }

  console.log();
  XRay.compare(trackers, '🔬 Side-by-Side Comparison');
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

async function main() {
  const positional = process.argv.slice(2).filter(
    (a, i, arr) => !a.startsWith('--') && !(i > 0 && arr[i - 1].startsWith('--'))
  );
  const arg = positional[0];

  if (arg === 'compare') {
    runCompare(positional.slice(1));
    return;
  }

  if (arg === 'apply') {
    const reportPath = positional[1];
    if (!reportPath) {
      console.error('  Usage: npx tsx .greenagent/live.ts apply <path-to-xray-report.md>');
      process.exit(1);
    }
    XRay.header('GreenAgent X-Ray — Apply Fixes');
    await runApply(reportPath);
    return;
  }

  XRay.header('GreenAgent X-Ray — Live Demo');
  console.log(`  Task: "${TASK}"`);
  console.log(`  Codebase: ${CODEBASE_DIR}`);
  console.log();

  if (arg === 'single') {
    const { tracker } = await runSinglePrompt();
    await analyzeAndReport(tracker, 'Approach 1: Single Prompt', 'single', 'Single Prompt');
    return;
  }

  if (arg === 'standard') {
    const { tracker } = await runStandardMultiAgent();
    await analyzeAndReport(tracker, 'Approach 2: Standard Multi-Agent', 'standard', 'Standard Multi-Agent');
    return;
  }

  if (arg === 'optimized') {
    const configPath = path.join(OUTPUT_DIR, 'optimized', 'pipeline-config.json');
    if (!fs.existsSync(configPath)) {
      console.error(`  No saved pipeline config found at ${configPath}`);
      console.error('  Run "apply" first to generate an optimized pipeline.');
      process.exit(1);
    }
    const config: PipelineConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log(`  ${DIM}Loaded pipeline config: ${config.agents.length} agents${RESET}`);
    console.log();
    const { tracker } = await runDynamicPipeline(config, TASK, HAIKU, SONNET, client);
    await analyzeAndReport(tracker, 'Optimized Multi-Agent (saved pipeline)', 'optimized', 'Optimized Multi-Agent');
    return;
  }

  // Default: show usage
  console.log('  Available commands:');
  console.log(`    npx tsx .greenagent/live.ts single      ${DIM}— single prompt baseline${RESET}`);
  console.log(`    npx tsx .greenagent/live.ts standard    ${DIM}— 8-agent pipeline from agent configs${RESET}`);
  console.log(`    npx tsx .greenagent/live.ts apply <report.md>  ${DIM}— AI generates + runs optimized pipeline${RESET}`);
  console.log(`    npx tsx .greenagent/live.ts optimized   ${DIM}— re-run saved optimized pipeline${RESET}`);
  console.log(`    npx tsx .greenagent/live.ts compare <a.json> <b.json>  ${DIM}— side-by-side comparison${RESET}`);
  console.log();
}

main().catch(console.error);
