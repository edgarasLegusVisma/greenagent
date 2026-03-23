/**
 * GreenAgent Live Demo — Real Multi-Agent Orchestration
 *
 * Agents implement a NEW FEATURE in a real codebase (IntelliDesk).
 * They read existing code to understand patterns, then write new files.
 * GreenTracker wraps every LLM call. The X-Ray reveals the "agent tax."
 *
 * Task: Add a KnowledgeBase feature — a service that suggests answers
 * from resolved tickets. Agents generate backend service, interface,
 * DTO, controller endpoint, and frontend component.
 *
 * Requires: ANTHROPIC_API_KEY environment variable (or .env file)
 *
 * Usage:
 *   npx tsx demo/live.ts              — run all 3 approaches and compare
 *   npx tsx demo/live.ts single       — approach 1 only
 *   npx tsx demo/live.ts standard     — approach 2 only
 *   npx tsx demo/live.ts optimized    — approach 3 only
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { GreenTracker, XRay } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────

const client = new Anthropic();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODEBASE_DIR = path.resolve(__dirname, 'intellidesk');
const OUTPUT_DIR = path.resolve(__dirname, 'output');

// Models
const SONNET = 'claude-sonnet-4-6';
const HAIKU = 'claude-haiku-4-5-20251001';

const TASK =
  'Add a KnowledgeBase feature to IntelliDesk — a service that suggests ' +
  'answers from previously resolved tickets. Generate the new backend ' +
  'service, interface, DTO, controller endpoint, and Angular frontend ' +
  'component, following the existing code patterns in the codebase.';

const EXPECTED_FILES =
  'Write these files using write_file:\n' +
  '1. backend/IntelliDesk.Application/Interfaces/IKnowledgeBaseService.cs\n' +
  '2. backend/IntelliDesk.Application/Services/KnowledgeBaseService.cs\n' +
  '3. backend/IntelliDesk.Application/DTOs/KnowledgeBaseSuggestionDto.cs\n' +
  '4. backend/IntelliDesk.API/Controllers/KnowledgeBaseController.cs\n' +
  '5. frontend/src/app/features/knowledge-base/knowledge-base.component.ts';

// ─────────────────────────────────────────────────────────────────────
// ANSI colors
// ─────────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN_FG = '\x1b[38;5;87m';
const GREEN_FG = '\x1b[38;5;82m';
const YELLOW_FG = '\x1b[38;5;220m';
const MAGENTA_FG = '\x1b[38;5;213m';
const GRAY_FG = '\x1b[38;5;245m';
const WHITE_FG = '\x1b[38;5;255m';

// ─────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────

const READ_TOOLS = [
  {
    name: 'list_files',
    description:
      'List files and subdirectories in a directory. Returns entries ' +
      'prefixed with [DIR] or [FILE].',
    input_schema: {
      type: 'object' as const,
      properties: {
        directory: {
          type: 'string',
          description:
            'Directory path relative to project root (e.g. "backend/IntelliDesk.API/Controllers"). Use "." for root.',
        },
      },
    },
  },
  {
    name: 'read_file',
    description: 'Read the full contents of a source file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'File path relative to project root (e.g. "backend/IntelliDesk.API/Program.cs")',
        },
      },
      required: ['path'],
    },
  },
];

const ALL_TOOLS = [
  ...READ_TOOLS,
  {
    name: 'write_file',
    description:
      'Write a new file to the project. Creates directories if needed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'File path relative to project root (e.g. "backend/IntelliDesk.Application/Services/KnowledgeBaseService.cs")',
        },
        content: {
          type: 'string',
          description: 'The full file content to write.',
        },
      },
      required: ['path', 'content'],
    },
  },
];

const WRITE_TOOLS = [ALL_TOOLS[2]];     // write_file only
const READ_FILE_ONLY = [READ_TOOLS[1]]; // read_file only (no directory listing)

// Current output subdirectory — set before each approach
let currentOutputSubdir = '';

function executeTool(name: string, input: Record<string, any>): string {
  if (name === 'list_files') {
    const relDir = input.directory || '.';
    console.log(`     ${DIM}📂 list_files → ${relDir}/${RESET}`);
    const dir = path.join(CODEBASE_DIR, relDir);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory()).length;
      const files = entries.filter((e) => !e.isDirectory()).length;
      console.log(`        ${DIM}${dirs} dirs, ${files} files${RESET}`);
      return entries
        .map((e) =>
          e.isDirectory() ? `[DIR]  ${e.name}/` : `[FILE] ${e.name}`,
        )
        .join('\n');
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  if (name === 'read_file') {
    const filePath = path.join(CODEBASE_DIR, input.path);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      console.log(
        `     ${CYAN_FG}📖 read_file → ${input.path}${RESET} ${DIM}(${lines} lines)${RESET}`,
      );
      return content;
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  if (name === 'write_file') {
    const filePath = path.join(OUTPUT_DIR, currentOutputSubdir, input.path);
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, input.content, 'utf-8');
      const lines = input.content.split('\n').length;
      console.log(
        `     ${GREEN_FG}✏️  write_file → ${input.path}${RESET} ${DIM}(${lines} lines)${RESET}`,
      );
      return `File written successfully: ${input.path}`;
    } catch (e: any) {
      return `Error writing file: ${e.message}`;
    }
  }

  return `Unknown tool: ${name}`;
}

// ─────────────────────────────────────────────────────────────────────
// Agent runner
// ─────────────────────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 20;

interface AgentOptions {
  agentName: string;
  agentIcon: string;
  category: string;
  model: string;
  system: string;
  userMessage: string;
  tools?: any[];
  maxTokens?: number;
  maxToolRounds?: number;
  note: string;
}

async function runAgent(
  tracker: GreenTracker,
  options: AgentOptions,
): Promise<string> {
  const { agentName, agentIcon, category, model, system, maxTokens = 4096, note } = options;
  const maxRounds = options.maxToolRounds ?? MAX_TOOL_ROUNDS;
  const messages: any[] = [{ role: 'user', content: options.userMessage }];

  // Print agent header
  const modelShort = model.includes('haiku') ? 'Haiku' :
                     model.includes('opus') ? 'Opus' : 'Sonnet';
  console.log();
  console.log(
    `  ${MAGENTA_FG}${BOLD}┌─ ${agentIcon} ${agentName}${RESET} ${DIM}(${modelShort})${RESET}`,
  );
  console.log(`  ${MAGENTA_FG}│${RESET}  ${DIM}${note}${RESET}`);

  let finalText = '';

  for (let round = 1; round <= maxRounds; round++) {
    // Show live timer while waiting for API response
    const thinkLabel =
      round === 1 ? 'Thinking' : 'Processing tool results';
    const thinkStart = Date.now();
    const timer = setInterval(() => {
      const elapsed = ((Date.now() - thinkStart) / 1000).toFixed(1);
      process.stdout.write(
        `\r  ${MAGENTA_FG}│${RESET}  ${GRAY_FG}⏳ ${thinkLabel}... (${elapsed}s)${RESET}`,
      );
    }, 200);

    tracker.startStep(category, model);

    const params: any = {
      model,
      max_tokens: maxTokens,
      system,
      messages,
    };
    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
    }

    const response = await client.messages.create(params);
    clearInterval(timer);
    const step = tracker.recordStep(
      response,
      round === 1 ? note : `${note} (processing tool results)`,
    );

    // Clear timer line, print step result
    process.stdout.write(`\r\x1b[K  ${MAGENTA_FG}│${RESET}  `);
    XRay.stepLive(step);

    const textBlocks = response.content.filter((b: any) => b.type === 'text');
    if (textBlocks.length > 0) {
      finalText = textBlocks.map((b: any) => b.text).join('\n');
    }

    if (response.stop_reason !== 'tool_use') {
      break;
    }

    // Execute tools — activity logged inside executeTool()
    const toolBlocks = response.content.filter(
      (b: any) => b.type === 'tool_use',
    );
    console.log(
      `  ${MAGENTA_FG}│${RESET}  ${YELLOW_FG}🔧 Calling ${toolBlocks.length} tool${toolBlocks.length > 1 ? 's' : ''}...${RESET}`,
    );
    const toolResults = toolBlocks.map((t: any) => ({
      type: 'tool_result' as const,
      tool_use_id: t.id,
      content: executeTool(t.name, t.input as Record<string, any>),
    }));

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  // Print agent footer
  console.log(`  ${MAGENTA_FG}${BOLD}└─ Done${RESET}`);

  return finalText;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

interface DemoResult {
  tracker: GreenTracker;
  output: string;
}

function cleanOutputDir(subdir: string): void {
  const dir = path.join(OUTPUT_DIR, subdir);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function listOutputFiles(subdir: string): string[] {
  const dir = path.join(OUTPUT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(path.relative(dir, full));
    }
  }
  walk(dir);
  return files;
}

function printGeneratedFiles(subdir: string): void {
  const files = listOutputFiles(subdir);
  if (files.length === 0) return;
  const dir = path.join(OUTPUT_DIR, subdir);
  console.log();
  console.log(`  ${WHITE_FG}${BOLD}📁 Generated files (${files.length}):${RESET}`);
  for (const f of files) {
    const absPath = path.join(dir, f);
    const lines = fs.readFileSync(absPath, 'utf-8').split('\n').length;
    console.log(`     ${GREEN_FG}→${RESET} ${absPath} ${DIM}(${lines} lines)${RESET}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// APPROACH 1: Single Prompt
//
// One Sonnet call with write_file tool. Same output as agents —
// apples-to-apples comparison. No project awareness (can't read
// existing code), but writes the same files.
// ─────────────────────────────────────────────────────────────────────

async function runSinglePrompt(): Promise<DemoResult> {
  console.log(`\n  ${'='.repeat(60)}`);
  console.log('  🔵 APPROACH 1: Single Well-Crafted Prompt');
  console.log(`  ${'='.repeat(60)}`);
  console.log();

  currentOutputSubdir = 'single';
  cleanOutputDir('single');
  const tracker = new GreenTracker({ carbonRegion: 'eu_avg' });

  // Single prompt with tool loop — capped at 6 rounds to write all 5 files
  const userContent =
    `${TASK}\n\n` +
    'Context: IntelliDesk is a customer support platform built with ' +
    '.NET 8 backend (Clean Architecture with API/Application/Domain/' +
    'Infrastructure layers) and Angular 18 frontend (standalone components). ' +
    'It uses dependency injection, async/await, and has existing AI services ' +
    'like SmartReplyService that use Claude API via a ClaudeApiClient wrapper.\n\n' +
    `${EXPECTED_FILES}\n\n` +
    'Keep each file concise (30-60 lines). Do not over-engineer.';

  const messages: any[] = [{ role: 'user', content: userContent }];
  const systemPrompt =
    'You are a senior .NET/Angular developer. Generate production-quality ' +
    'code. Write files using write_file. Keep files concise — 30-60 lines each.';

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
      tools: WRITE_TOOLS as any,
      system: systemPrompt,
      messages,
    });
    clearInterval(timer);

    const step = tracker.recordStep(
      response,
      round === 1 ? 'Single prompt → generate & write code' : 'Single prompt → writing files (continued)',
    );
    process.stdout.write('\r\x1b[K');
    XRay.stepLive(step);

    const toolBlocks = response.content.filter((b: any) => b.type === 'tool_use');

    if (toolBlocks.length > 0) {
      console.log(
        `  ${YELLOW_FG}🔧 Writing ${toolBlocks.length} file${toolBlocks.length > 1 ? 's' : ''}...${RESET}`,
      );
      const toolResults = toolBlocks.map((t: any) => ({
        type: 'tool_result' as const,
        tool_use_id: t.id,
        content: executeTool(t.name, t.input as Record<string, any>),
      }));
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    if (response.stop_reason !== 'tool_use') {
      break;
    }
  }

  printGeneratedFiles('single');

  const output = listOutputFiles('single').join('\n');
  return { tracker, output };
}

// ─────────────────────────────────────────────────────────────────────
// APPROACH 2: Standard Multi-Agent Workflow
//
// This is how developers naturally build multi-agent systems.
// An orchestrator function chains 8 agents. Each agent gets its own
// context — they communicate via TEXT OUTPUT passed as INPUT to the
// next agent. Agents don't re-explore from scratch; they receive
// the previous agent's summary. But each handoff is lossy, context
// accumulates, and the architecture has more steps than needed.
//
// The waste comes from realistic patterns:
// - Planner explores thoroughly (many tool round-trips)
// - Code Reader gets plan text but still reads many files because
//   it only received a summary, not what the planner "saw"
// - Full text output from each agent dumped into next (context bloat)
// - Architect is a separate step (could be combined with implementation)
// - Two implementation passes (write + rewrite after review)
// - Frontend separate from backend (could be one agent)
// - Quality gate redundant after review
// ─────────────────────────────────────────────────────────────────────

async function runStandardMultiAgent(): Promise<DemoResult> {
  console.log(`\n  ${'='.repeat(60)}`);
  console.log('  🟡 APPROACH 2: Standard Multi-Agent Workflow');
  console.log(`  ${'='.repeat(60)}`);

  currentOutputSubdir = 'standard';
  cleanOutputDir('standard');
  const tracker = new GreenTracker({ carbonRegion: 'eu_avg' });

  // ────────────────────────────────────────────────────────────────
  // ORCHESTRATOR: chains agents, passes text output between them.
  // Each agent has its own context — only receives text from prior.
  // ────────────────────────────────────────────────────────────────

  // ── Agent 1: Planner ──
  // INPUT: task description
  // TOOLS: list_files, read_file (explores the codebase)
  // OUTPUT: plan text → passed to Code Reader and Architect
  const plan = await runAgent(tracker, {
    agentName: 'PLANNER',
    agentIcon: '🗺️',
    category: 'planning',
    model: SONNET,
    system:
      'You are a planning agent. Explore the codebase structure to ' +
      'understand the project. List directories, identify key files, ' +
      'and create an implementation plan for the new feature. Include ' +
      'which existing files are most relevant as patterns to follow.',
    userMessage:
      `Task: ${TASK}\n\n` +
      'Explore the project structure. List directories, identify key files. ' +
      'Create an implementation plan noting which existing files to study.',
    tools: READ_TOOLS,
    maxTokens: 2000,
    note: 'Explore project structure and create implementation plan',
  });

  // ── Agent 2: Code Reader ──
  // INPUT: plan text from Planner (lossy handoff — only gets the summary)
  // TOOLS: list_files, read_file (reads files the planner identified)
  // OUTPUT: detailed code patterns → passed to Architect, Backend Dev, Frontend Dev
  //
  // WASTE: This agent exists because the planner's text output doesn't
  // contain actual file contents — only summaries. The Code Reader
  // re-reads the same files to build its own understanding. This is
  // the "lossy handoff" problem in multi-agent systems.
  const codeContext = await runAgent(tracker, {
    agentName: 'CODE READER',
    agentIcon: '📖',
    category: 'coordination',
    model: SONNET,
    system:
      'You are a code reader agent. The planner has already mapped the ' +
      'directory structure — do NOT call list_files. Use read_file only. ' +
      'Read the specific files identified in the plan to extract code patterns. ' +
      'Focus on: service structure, interface conventions, controller patterns, ' +
      'DTO style, and frontend component patterns. ' +
      'Provide detailed code context for downstream agents.',
    userMessage:
      `Implementation plan from planner:\n\n${plan}\n\n` +
      'The directory structure is already in the plan above. Do NOT explore directories. ' +
      'Use read_file to read the specific files the planner identified. Focus on ' +
      'patterns for: services, interfaces, controllers, DTOs, and Angular components.',
    tools: READ_FILE_ONLY,
    maxTokens: 3000,
    note: 'Read relevant files to build detailed code context',
  });

  // ── Agent 3: Architect ──
  // INPUT: plan + codeContext (text from Planner + Code Reader)
  // TOOLS: none (pure thinking)
  // OUTPUT: detailed design → passed to Backend Dev, Reviewer, Frontend Dev
  const design = await runAgent(tracker, {
    agentName: 'ARCHITECT',
    agentIcon: '🏗️',
    category: 'coordination',
    model: SONNET,
    system:
      'You are a software architect. Based on the implementation plan ' +
      'and code patterns, design the new feature in detail: class names, ' +
      'method signatures, dependencies, DI registration, file locations.',
    userMessage:
      `Task: ${TASK}\n\n` +
      `Implementation plan:\n${plan}\n\n` +
      `Code context and patterns:\n${codeContext}\n\n` +
      'Design the KnowledgeBase feature. Specify every class, interface, ' +
      'method signature, dependency, and file path.',
    maxTokens: 2000,
    note: 'Design feature architecture — classes, methods, file paths',
  });

  // ── Agent 4: Backend Developer ──
  // INPUT: design + codeContext (from Architect + Code Reader)
  // TOOLS: write_file only (doesn't re-read — uses code context from Reader)
  // OUTPUT: implementation summary → passed to Reviewer
  const backendWork = await runAgent(tracker, {
    agentName: 'BACKEND DEVELOPER',
    agentIcon: '💻',
    category: 'execution',
    model: SONNET,
    system:
      'You are a backend developer. Implement the feature by writing ' +
      'production-quality C# code. Follow the patterns described in the ' +
      'code context. Use write_file for each file.',
    userMessage:
      `Architecture design:\n${design}\n\n` +
      `Code patterns to follow:\n${codeContext}\n\n` +
      'Write all backend files: interface, service, DTO, and controller. ' +
      'Use write_file for each file. Follow the patterns exactly.',
    tools: WRITE_TOOLS,
    maxTokens: 4096,
    note: 'Write backend service, interface, DTO, and controller',
  });

  // ── Agent 5: Code Reviewer ──
  // INPUT: design + backendWork (from Architect + Backend Dev)
  // TOOLS: none (reviews based on implementation summary)
  // OUTPUT: review feedback → passed to Backend Dev (fixes)
  const review = await runAgent(tracker, {
    agentName: 'CODE REVIEWER',
    agentIcon: '🔍',
    category: 'reflection',
    model: SONNET,
    system:
      'You are a code reviewer. Review the implementation against the ' +
      'architecture design for correctness, pattern consistency, and ' +
      'completeness. List specific issues with file names and line-level detail.',
    userMessage:
      `Architecture design:\n${design}\n\n` +
      `Backend implementation:\n${backendWork}\n\n` +
      'Review the implementation. List all issues found.',
    maxTokens: 1500,
    note: 'Review implementation for correctness and consistency',
  });

  // ── Agent 6: Backend Developer (fixes) ──
  // INPUT: review + backendWork (from Reviewer + Backend Dev)
  // TOOLS: write_file only
  // OUTPUT: fix summary → passed to Quality Gate
  const fixes = await runAgent(tracker, {
    agentName: 'BACKEND DEVELOPER (fixes)',
    agentIcon: '🔄',
    category: 'execution',
    model: SONNET,
    system:
      'You are a backend developer. Apply the review feedback by ' +
      'rewriting affected files. Use write_file to overwrite them.',
    userMessage:
      `Review feedback:\n${review}\n\n` +
      `Original implementation:\n${backendWork}\n\n` +
      'Rewrite any files that need fixes. Use write_file to overwrite.',
    tools: WRITE_TOOLS,
    maxTokens: 4096,
    note: 'Apply review fixes and rewrite affected files',
  });

  // ── Agent 7: Frontend Developer ──
  // INPUT: design + codeContext (from Architect + Code Reader)
  // TOOLS: write_file only (doesn't re-read — uses code context)
  // OUTPUT: frontend summary → passed to Quality Gate
  const frontendWork = await runAgent(tracker, {
    agentName: 'FRONTEND DEVELOPER',
    agentIcon: '🎨',
    category: 'execution',
    model: SONNET,
    system:
      'You are a frontend developer. Write Angular 18 components ' +
      'following the patterns described in the code context. Use ' +
      'standalone components, signals, and inject().',
    userMessage:
      `Architecture design:\n${design}\n\n` +
      `Frontend code patterns:\n${codeContext}\n\n` +
      'Write the Angular knowledge-base component. Use write_file.',
    tools: WRITE_TOOLS,
    maxTokens: 4096,
    note: 'Write Angular frontend component',
  });

  // ── Agent 8: Quality Gate ──
  // INPUT: design + fixes + frontendWork (from Architect + Backend fixes + Frontend)
  // TOOLS: none (validates based on text summaries)
  // OUTPUT: pass/fail assessment
  await runAgent(tracker, {
    agentName: 'QUALITY GATE',
    agentIcon: '✅',
    category: 'validation',
    model: SONNET,
    system:
      'You are a quality assurance agent. Verify the implementation is ' +
      'complete and consistent with the architecture design.',
    userMessage:
      `Architecture design:\n${design}\n\n` +
      `Backend fixes:\n${fixes}\n\n` +
      `Frontend work:\n${frontendWork}\n\n` +
      'Validate completeness against the design. Provide pass/fail.',
    maxTokens: 500,
    note: 'Final quality check — verify all requirements are met',
  });

  printGeneratedFiles('standard');
  const files = listOutputFiles('standard');
  const output = `Files generated (${files.length}):\n${files.map((f) => `  - ${f}`).join('\n')}`;

  return { tracker, output };
}

// ─────────────────────────────────────────────────────────────────────
// APPROACH 3: Optimized Multi-Agent
//
// The savings come from ARCHITECTURE, not just model routing:
// - Fewer tool round-trips (planner is focused, not exploratory)
// - No coordinator agent (removed — pure overhead)
// - Reader reads 5-6 key files, not all 72
// - Analyzer + Writer combined into one agent
// - One review pass with early exit, not two
// - No validator (redundant)
// - Summarized context between agents, not full history dump
//
// Model routing (Haiku for planning, Sonnet for execution) is a
// bonus on top, not the main story.
// ─────────────────────────────────────────────────────────────────────

async function runOptimizedMultiAgent(): Promise<DemoResult> {
  console.log(`\n  ${'='.repeat(60)}`);
  console.log('  🟢 APPROACH 3: Optimized Multi-Agent (GreenAgent)');
  console.log(`  ${'='.repeat(60)}`);

  currentOutputSubdir = 'optimized';
  cleanOutputDir('optimized');
  const tracker = new GreenTracker({
    carbonRegion: 'eu_avg',
    budgetLimitUsd: 1.0,
    maxIterations: 30,
  });

  // ── Agent 1: Planner — focused scan, not exhaustive exploration ──
  // Key optimization: lists root + 2-3 key dirs ONLY, picks 5-6 files
  // by name. No reading file contents. Fewer tool round-trips.
  const plan = await runAgent(tracker, {
    agentName: 'PLANNER',
    agentIcon: '🗺️',
    category: 'planning',
    model: HAIKU,
    system:
      'You are a planning agent. Do a QUICK scan of the project structure. ' +
      'List root directory and 2-3 key subdirectories ONLY (Services, ' +
      'Controllers, Interfaces). Based on file NAMES alone, identify 5-6 ' +
      'files that best show existing patterns: one service implementation, ' +
      'one interface, one controller, one DTO, and optionally one frontend ' +
      'component. Output a short list of file paths. Nothing else.',
    userMessage:
      `Task: ${TASK}\n\n` +
      'Quick scan: list root, then backend/IntelliDesk.Application/Services/ ' +
      'and backend/IntelliDesk.API/Controllers/. Pick 5-6 pattern files ' +
      'by their names. Do NOT read any file contents.',
    tools: READ_TOOLS,
    maxTokens: 500,
    maxToolRounds: 5,
    note: 'Quick scan — pick 5-6 key files by name (not exhaustive)',
  });

  // ── Agent 2: Pattern Reader — reads only the key files ──
  // Key optimization: reads 5-6 files, not all 72. Summarizes patterns
  // instead of dumping raw content.
  const patterns = await runAgent(tracker, {
    agentName: 'PATTERN READER',
    agentIcon: '📖',
    category: 'routing',
    model: HAIKU,
    system:
      'You are a file reader. Read ONLY the specific files from the plan ' +
      '(5-6 files max). After reading, output a concise SUMMARY of the ' +
      'patterns you observed: naming conventions, class structure, DI ' +
      'patterns, namespace conventions. Do NOT include full file contents ' +
      'in your summary — just the patterns.',
    userMessage:
      `Based on this plan:\n\n${plan}\n\n` +
      'Read only the files listed above. Then summarize the patterns you see.',
    tools: READ_TOOLS,
    maxTokens: 1000,
    maxToolRounds: 8,
    note: 'Read 5-6 key files, output pattern SUMMARY (not raw contents)',
  });

  // ── Agent 3: Full-Stack Implementer — ALL files in one pass ──
  // Key optimizations:
  // - Combined analyzer + writer + frontend into ONE agent
  // - Gets pattern summary (small), not raw file contents (huge)
  // - Writes all 5 files in a single agent call
  // - ONLY has write_file tool — no reading, no exploring
  const implementation = await runAgent(tracker, {
    agentName: 'FULL-STACK IMPLEMENTER',
    agentIcon: '⚡',
    category: 'execution',
    model: SONNET,
    system:
      'You are a senior full-stack developer. Implement the entire feature ' +
      'in one pass — backend service, interface, DTO, controller, AND ' +
      'frontend component. Follow the patterns described. Use write_file ' +
      'for each file. Do NOT read or list files — you already have the ' +
      'patterns. Just write. Keep files concise (30-60 lines each).',
    userMessage:
      `Task: ${TASK}\n\n` +
      `Existing code patterns:\n\n${patterns}\n\n` +
      `${EXPECTED_FILES}`,
    tools: WRITE_TOOLS,
    maxTokens: 8192,
    note: 'Write ALL files in one pass — backend + frontend combined',
  });

  // ── Agent 4: Quick review — one pass, early exit ──
  // Key optimization: gets only the implementation summary, not the
  // full patterns or plan. One pass. APPROVED = no revision needed.
  const review = await runAgent(tracker, {
    agentName: 'REVIEWER',
    agentIcon: '🔍',
    category: 'reflection',
    model: SONNET,
    system:
      'You are a reviewer. Rate the implementation 1-10. List only ' +
      'critical issues (things that would break at runtime). If quality ' +
      'is 8+, say APPROVED — no changes needed.',
    userMessage:
      `Quick review of this implementation:\n\n${implementation}\n\n` +
      'Rate 1-10. Only list issues that would break at runtime.',
    maxTokens: 400,
    note: 'One pass — only critical/runtime issues (early exit if 8+)',
  });

  // ── Agent 5: Final fixes — skip entirely if APPROVED ──
  await runAgent(tracker, {
    agentName: 'FINAL FIXES',
    agentIcon: '🔧',
    category: 'execution',
    model: SONNET,
    system:
      'You are a developer. If the review says APPROVED, just confirm ' +
      'with a short message — do NOT rewrite any files. Only use ' +
      'write_file if there are critical runtime issues to fix. ' +
      'Do NOT read or list files.',
    userMessage:
      `Review:\n${review}\n\n` +
      'If APPROVED, confirm and done. Otherwise fix only critical issues.',
    tools: WRITE_TOOLS,
    maxTokens: 2000,
    maxToolRounds: 3,
    note: 'Skip rewrite if APPROVED — fix only critical runtime issues',
  });

  printGeneratedFiles('optimized');
  const files = listOutputFiles('optimized');
  const output = `Files generated (${files.length}):\n${files.map((f) => `  - ${f}`).join('\n')}`;

  return { tracker, output };
}

// ─────────────────────────────────────────────────────────────────────
// Save results — xray-report.md + tracker-data.json
// ─────────────────────────────────────────────────────────────────────

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
// Apply command — read suggestions, show fixes, run optimized
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

  // Extract suggestions section
  const suggestionsMatch = report.match(/## Optimization Suggestions\n([\s\S]*?)(?=\n## |$)/);
  if (suggestionsMatch) {
    const suggestions = suggestionsMatch[1].trim();
    const titles = suggestions.match(/### .+/g) || [];
    for (const title of titles) {
      console.log(`  ${YELLOW_FG}${title.replace('### ', '')}${RESET}`);
    }
  }

  console.log();
  console.log(`  ${GREEN_FG}${BOLD}Applying fixes:${RESET}`);
  console.log();

  const fixes = [
    'Reducing planner tool rounds — using Haiku instead of Sonnet',
    'Removing Architect agent — combining with Implementer',
    'Code Reader reads 5-6 key files, outputs summary instead of raw dumps',
    'Adding pattern summary between agents instead of full context dump',
    'Combining Backend + Frontend into one Full-Stack Implementer',
    'Reducing review to 1 pass with early exit — removing Quality Gate',
    'Adding budget guardrails: $1.00 limit, 30 max iterations',
  ];

  for (const fix of fixes) {
    console.log(`  ${GREEN_FG}✅ ${fix}${RESET}`);
  }

  console.log();
  console.log(`  ${CYAN_FG}${BOLD}🚀 Running optimized workflow with fixes applied...${RESET}`);

  const { tracker } = await runOptimizedMultiAgent();
  XRay.report(tracker, 'Optimized Multi-Agent (fixes applied)');
  saveResults('optimized', 'Optimized Multi-Agent', tracker);
}

// ─────────────────────────────────────────────────────────────────────
// Compare command — load saved tracker data, render comparison
// ─────────────────────────────────────────────────────────────────────

function runCompare(paths: string[]): void {
  if (paths.length < 2) {
    console.error('  Usage: npx tsx demo/live.ts compare <path1.json> <path2.json> [path3.json]');
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
  const arg = process.argv[2];

  // ── Compare command (no API calls) ──
  if (arg === 'compare') {
    const paths = process.argv.slice(3);
    runCompare(paths);
    return;
  }

  // ── Apply command ──
  if (arg === 'apply') {
    const reportPath = process.argv[3];
    if (!reportPath) {
      console.error('  Usage: npx tsx demo/live.ts apply <path-to-xray-report.md>');
      process.exit(1);
    }
    XRay.header('GreenAgent X-Ray — Apply Fixes');
    await runApply(reportPath);
    return;
  }

  // ── Standard commands ──
  XRay.header('GreenAgent X-Ray — Live Demo');
  console.log(`  Task: "${TASK}"`);
  console.log(`  Codebase: IntelliDesk (${CODEBASE_DIR})`);
  console.log();

  if (arg === 'single') {
    const { tracker } = await runSinglePrompt();
    XRay.report(tracker, 'Approach 1: Single Prompt');
    saveResults('single', 'Single Prompt', tracker);
    return;
  }

  if (arg === 'standard') {
    const { tracker } = await runStandardMultiAgent();
    XRay.report(tracker, 'Approach 2: Standard Multi-Agent');
    saveResults('standard', 'Standard Multi-Agent', tracker);
    return;
  }

  if (arg === 'optimized') {
    const { tracker } = await runOptimizedMultiAgent();
    XRay.report(tracker, 'Approach 3: Optimized Multi-Agent');
    saveResults('optimized', 'Optimized Multi-Agent', tracker);
    return;
  }

  // Default: run all three and compare
  console.log('  Running all 3 approaches...\n');

  const single = await runSinglePrompt();
  console.log();
  const standard = await runStandardMultiAgent();
  console.log();
  const optimized = await runOptimizedMultiAgent();

  // Individual reports
  console.log('\n' + '🔵 '.repeat(20));
  XRay.report(single.tracker, 'Approach 1: Single Prompt');
  saveResults('single', 'Single Prompt', single.tracker);

  console.log('\n' + '🟡 '.repeat(20));
  XRay.report(standard.tracker, 'Approach 2: Standard Multi-Agent');
  saveResults('standard', 'Standard Multi-Agent', standard.tracker);

  console.log('\n' + '🟢 '.repeat(20));
  XRay.report(optimized.tracker, 'Approach 3: Optimized Multi-Agent');
  saveResults('optimized', 'Optimized Multi-Agent', optimized.tracker);

  // The finale — side-by-side comparison
  XRay.compare(
    {
      'Single Prompt': single.tracker,
      'Standard Multi-Agent': standard.tracker,
      'Optimized Multi-Agent': optimized.tracker,
    },
    '🔬 Side-by-Side Comparison',
  );
}

main().catch(console.error);
