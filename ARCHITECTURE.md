# GreenAgent — Architecture Report

## Overview

GreenAgent is an AI workflow sustainability tool that X-rays multi-agent pipelines. It wraps every LLM API call, tracks tokens/cost/carbon/latency per step, classifies each step (useful work vs overhead vs waste), and generates AI-powered optimization suggestions. It then applies those suggestions by dynamically generating and running an optimized pipeline.

The project has two parts:
1. **IntelliDesk** (`intellidesk/`) — a realistic .NET 8 + Angular 18 helpdesk application that serves as the target codebase agents work on
2. **GreenAgent** (`.greenagent/`) — the X-Ray tool that instruments, analyzes, and optimizes agent workflows

---

## Project Structure

```
greenagent/
├── .greenagent/                  ← THE TOOL
│   ├── live.ts                   ← CLI orchestrator (521 lines)
│   ├── output/                   ← Generated artifacts (gitignored)
│   │   ├── single/               ← Single prompt results
│   │   ├── standard/             ← Standard pipeline results
│   │   └── optimized/            ← Optimized pipeline results
│   └── src/                      ← GreenAgent library (11 files, 1444 lines)
│       ├── index.ts              ← Re-exports all modules
│       ├── tracker.ts            ← Core: token/cost/carbon tracking
│       ├── xray.ts               ← Visualization: terminal + markdown reports
│       ├── suggestions.ts        ← AI-powered suggestion analysis
│       ├── carbon.ts             ← Carbon/energy estimation
│       ├── pipeline.ts           ← Dynamic pipeline runner
│       ├── runner.ts             ← Agent tool_use loop engine
│       ├── tools.ts              ← Tool definitions + execution
│       ├── helpers.ts            ← Output directory utilities
│       └── colors.ts             ← ANSI color constants
│
├── intellidesk/                  ← THE PROJECT
│   ├── agents/                   ← Agent system prompts (7 md files)
│   ├── backend/                  ← .NET 8 Clean Architecture (48 files)
│   └── frontend/                 ← Angular 18 standalone components (24 files)
│
├── package.json                  ← Dependencies
├── tsconfig.json                 ← TypeScript config
├── README.md                     ← Public documentation
├── LICENSE                       ← MIT
├── .env.example                  ← API key template
├── .env                          ← ANTHROPIC_API_KEY (gitignored)
├── CLAUDE.md                     ← Living plan (gitignored from public repo)
├── CONTEXT.md                    ← Background context (gitignored)
└── TALK_PLAN.md                  ← Talk structure (gitignored)
```

---

## .greenagent/src/ — The Library

### tracker.ts (323 lines) — Core Tracking Engine

The heart of GreenAgent. `GreenTracker` wraps every LLM API call and records:

- **Token counts** (input/output) from the API response `usage` object
- **Cost** calculated from model-specific pricing tables (Sonnet $3/$15, Haiku $1/$5 per 1M tokens)
- **Energy** estimated from tokens × energy-per-token (Google/IEA methodology)
- **Carbon** from energy × regional grid intensity (supports eu_avg, nordics, lithuania, us_avg, etc.)
- **Latency** via wall-clock `performance.now()`
- **Classification** of each step: `useful_work`, `overhead`, `potential_waste`, `analysis`, or `other`

**Key API:**
```typescript
tracker.startStep('planning', 'claude-sonnet-4-6');  // before API call
tracker.recordStep(response, 'Explore project');      // after API call
tracker.setSuggestions(suggestions, { tokens, costUsd }); // inject AI suggestions
tracker.toJSON('label');    // serialize for saving
GreenTracker.fromJSON(data); // deserialize for compare
```

**Budget guardrails:** `budgetLimitUsd` and `maxIterations` throw `BudgetExceededError` when exceeded, stopping runaway agent loops.

**Step classifications:**
| Category | Classification | What it means |
|----------|---------------|---------------|
| execution, final_output | useful_work | Actual code generation |
| planning, routing, coordination, delegation | overhead | Agents talking to each other |
| reflection, retry, validation, loop | potential_waste | Review/retry cycles |
| analysis | analysis (diagnosis) | GreenAgent's own analysis cost |

### xray.ts (428 lines) — Visualization

Renders the X-Ray report in two formats:

- **`XRay.report(tracker)`** — Rich terminal output with ANSI colors, bar charts, step-by-step detail, suggestions with severity icons, and sustainability score
- **`XRay.reportToMarkdown(tracker)`** — Plain markdown for saving to xray-report.md
- **`XRay.compare(trackers)`** — Side-by-side comparison table of multiple runs
- **`XRay.stepLive(step)`** — Single-line step output during live runs

**Sustainability Score:**
- 🌿 Excellent: >70% useful work tokens AND 0 high-severity issues
- 🌱 Fair: >50% useful work AND ≤1 high-severity issue
- 🔥 Needs Work: everything else

Footer shows both token ratio and cost ratio: "Useful work: 35% by tokens | 41% by cost"

### suggestions.ts (139 lines) — AI-Powered Analysis

Sends the full step telemetry to Claude Sonnet and asks it to analyze the workflow like a senior engineer. No hardcoded pattern matching — works for any workflow.

**What it sends:** step number, category, model, input/output tokens, cost, latency, and the note describing what each step did, plus totals and classification breakdowns.

**What it gets back:** 4-8 specific suggestions with severity, title, detail, and estimated savings in tokens and dollars. Each suggestion references actual step numbers and agent names.

**The analysis call itself** is tracked as category `analysis` so it appears transparently in the X-Ray as "Diagnosis" cost.

### carbon.ts (77 lines) — Environmental Impact

Estimates energy and carbon from token counts:
- **Energy:** `tokens × 0.00036 Wh/token` (derived from Google's ~0.3 Wh per prompt at ~850 tokens)
- **Carbon:** `energy × grid_intensity × PUE(1.2)` using IEA regional data
- **Water:** `tokens × 0.0005 mL/token`
- **Relatable comparisons:** "≈ 751 Google searches", "≈ driving 469 meters"

### pipeline.ts (150 lines) — Dynamic Pipeline Runner

Runs any AI-generated pipeline configuration. This is what makes the `apply` command work.

**Interfaces:**
```typescript
interface AgentConfig {
  name: string;        // "EXPLORER"
  icon: string;        // "🗺️"
  category: string;    // "planning"
  model: string;       // "haiku" or "sonnet"
  tools: string[];     // ["list_files", "read_file"]
  maxToolRounds: number;
  maxTokens: number;
  prompt: string;      // Full system prompt
  inputFrom: string[]; // ["PLANNER"] — which agents' outputs to pass
  note: string;        // Step log description
}

interface PipelineConfig {
  budgetLimitUsd: number;
  maxIterations: number;
  agents: AgentConfig[];
}
```

**`runDynamicPipeline(config)`:** Iterates through agents, builds user messages from `inputFrom` references, maps tool names to definitions, runs each agent via `runAgent()`, collects outputs. Catches `BudgetExceededError` gracefully.

**`PIPELINE_OPTIMIZER_PROMPT`:** The system prompt sent to Sonnet when generating an optimized pipeline. Tells the AI what it can change (remove/combine agents, switch models, rewrite prompts, add constraints) and the exact JSON schema to output.

### runner.ts (110 lines) — Agent Loop Engine

The tool_use loop that powers every agent. `runAgent()`:

1. Sends the system prompt + user message to the API
2. If the response contains `tool_use` blocks, executes them via `executeTool()`
3. Appends tool results and sends again
4. Repeats until `stop_reason !== 'tool_use'` or `maxToolRounds` reached
5. Returns the agent's final text output

**Live terminal output:** Shows agent header with icon/name/model, live timer during API calls, step metrics after each response, tool activity log.

### tools.ts (142 lines) — Tool Definitions & Execution

Three tools available to agents:

| Tool | What it does | Who uses it |
|------|-------------|-------------|
| `list_files` | Lists directory contents from IntelliDesk | Planner |
| `read_file` | Reads source files from IntelliDesk | Code Reader |
| `write_file` | Writes new files to `.greenagent/output/` | Backend Dev, Frontend Dev |

**Key design:** `list_files` and `read_file` operate on `CODEBASE_DIR` (the target project). `write_file` operates on `OUTPUT_DIR` (the output folder). Agents can read the real codebase but write to a separate output directory — they never modify the original project.

`setToolContext(codebaseDir, outputDir)` and `setCurrentSubdir(subdir)` configure the paths at startup.

### helpers.ts (44 lines) — Output Utilities

- `cleanOutputDir(subdir)` — removes and recreates output directory
- `listOutputFiles(subdir)` — recursively lists all generated files
- `printGeneratedFiles(subdir)` — prints file list with line counts

### colors.ts (13 lines) — ANSI Constants

Terminal color codes used across all modules: RESET, BOLD, DIM, CYAN_FG, GREEN_FG, YELLOW_FG, MAGENTA_FG, GRAY_FG, WHITE_FG.

### index.ts (18 lines) — Re-exports

Clean barrel file that re-exports everything from all modules so `live.ts` can do a single import.

---

## .greenagent/live.ts — The CLI Orchestrator (521 lines)

The main entry point. Handles CLI routing and defines the approaches.

### Config Section (~lines 1-85)
- Parses `--task` and `--codebase` CLI flags
- Resolves codebase path: `--codebase` flag → `../intellidesk/` → `../`
- Sets up Anthropic client, model constants (SONNET, HAIKU)
- `loadAgentConfig(name)` reads agent md files from `intellidesk/agents/`

### Single Prompt (~lines 115-183)
Direct API call with `write_file` tool, capped at 6 continuation rounds. No agent framework — just one LLM call that generates all files. The baseline for comparison.

### Standard Multi-Agent (~lines 185-275)
8 agents, all Sonnet, reading system prompts from `intellidesk/agents/*.md`:

```
PLANNER (list_files, read_file) → plan text
    ↓
CODE READER (read_file) → code patterns
    ↓
ARCHITECT (no tools) → design spec
    ↓
BACKEND DEVELOPER (write_file) → backend files
    ↓
CODE REVIEWER (no tools) → review feedback
    ↓
BACKEND DEVELOPER fixes (write_file) → fixed files
    ↓
FRONTEND DEVELOPER (write_file) → frontend files
    ↓
QUALITY GATE (no tools) → pass/fail
```

**Data flow:** Each agent receives TEXT output from previous agents as its user message. The orchestrator passes only data — all behavioral instructions live in the md files. This is realistic multi-agent orchestration with lossy text handoffs.

After pipeline.json exists (post-apply), `standard` uses `runDynamicPipeline()` with the updated config instead.

### Apply Command (~lines 277-410)
The core innovation. Flow:

1. Read X-Ray report and extract suggestion titles
2. Read all agent md files from `intellidesk/agents/`
3. Build pipeline description dynamically from agent files
4. Send everything to Sonnet with `PIPELINE_OPTIMIZER_PROMPT`
5. Parse the JSON pipeline config response
6. Display the optimized pipeline summary
7. Run it via `runDynamicPipeline()`
8. Save pipeline-config.json
9. **Write new agent md files** back to `intellidesk/agents/`
10. **Save pipeline.json** to `intellidesk/` so `standard` picks it up
11. Run AI analysis and save X-Ray report

### Compare Command (~lines 412-435)
Loads saved tracker-data.json files, renders `XRay.compare()`. No API calls.

### Main (~lines 437-505)
CLI routing: `single | standard | apply | optimized | compare`. Shows usage if no command.

---

## intellidesk/ — The Target Project

### agents/ (7 files)

Each file IS the system prompt — the entire content gets sent to the API as the agent's `system` parameter. No headers, no documentation, just plain-text instructions.

| File | Role | Tools | Category |
|------|------|-------|----------|
| planner.md | Explore codebase, create implementation plan | list_files, read_file | planning |
| code-reader.md | Read specific files, extract code patterns | read_file only | coordination |
| architect.md | Design feature: classes, methods, file paths | none | coordination |
| backend-developer.md | Write C# backend files | write_file | execution |
| frontend-developer.md | Write Angular frontend files | write_file | execution |
| code-reviewer.md | Review implementation against design | none | reflection |
| quality-gate.md | Final pass/fail completeness check | none | validation |

After `apply` runs, these files get overwritten with the AI-optimized versions. `git checkout intellidesk/agents/` reverts to originals.

### backend/ (48 files)

.NET 8 Clean Architecture helpdesk application:

- **IntelliDesk.API/** — Controllers (6), Middleware (2), Program.cs, appsettings.json
- **IntelliDesk.Application/** — Services (7), Interfaces (6), DTOs (5), Mappings (1)
- **IntelliDesk.Domain/** — Entities (6), Enums (3), ValueObjects (1)
- **IntelliDesk.Infrastructure/** — Repositories (2), Data/DbContext (1), Configurations (2), Migrations (1), External clients (3)

AI services (SmartReplyService, PriorityDetectorService, etc.) use Claude API via ClaudeApiClient — realistic patterns for agents to follow.

### frontend/ (24 files)

Angular 18 standalone components:

- **core/** — Services (3), Guards (1), Interceptors (1), Models (2)
- **features/** — Tickets (6), Customers (2), Dashboard (2)
- **shared/** — Components (2), Pipes (1)
- **environments/** — Dev + Prod configs (2)

Uses signals, `inject()`, functional guards, lazy routes — modern Angular patterns.

---

## The Demo Flow

```bash
# 1. Run the standard 8-agent pipeline (~$2.50, ~9 min)
npx tsx .greenagent/live.ts standard

# 2. AI analyzes the X-Ray, generates optimized pipeline, runs it (~$0.60, ~4 min)
npx tsx .greenagent/live.ts apply ./.greenagent/output/standard/xray-report.md

# 3. Compare side by side (no API calls)
npx tsx .greenagent/live.ts compare \
  ./.greenagent/output/standard/tracker-data.json \
  ./.greenagent/output/optimized/tracker-data.json

# 4. Revert agent configs to original
git checkout intellidesk/
```

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Agent configs as md files | Entire file = system prompt | Like CLAUDE.md in Claude Code — no parsing, no extraction |
| Orchestrator is data-only | User messages contain zero instructions | All behavior in system prompts (md files or inline) |
| AI generates optimizations | No hardcoded "optimized" function | Works for any codebase, any agent setup |
| Apply writes back to project | New md files + pipeline.json | Running `standard` after apply uses optimized agents |
| Separate read/write paths | Agents read from intellidesk/, write to .greenagent/output/ | Never modifies the original codebase |
| Analysis tracked as "Diagnosis" | Separate classification with 🔬 icon | Meta-cost is transparent — audience sees what the X-Ray itself costs |
| Budget guardrails | BudgetExceededError caught gracefully | Pipeline stops and saves partial results instead of crashing |

---

## Output Artifacts

Each approach saves to `.greenagent/output/{approach}/`:

| File | Purpose |
|------|---------|
| `xray-report.md` | Full markdown X-Ray report |
| `tracker-data.json` | Serialized tracker for offline comparison |
| `pipeline-config.json` | AI-generated pipeline config (optimized only) |
| `backend/**/*.cs` | Generated C# files |
| `frontend/**/*.ts` | Generated Angular files |

---

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.39.0",   // Claude API client
  "dotenv": "^17.3.1",              // .env loading
  "tsx": "^4.19.0",                 // TypeScript execution (dev)
  "typescript": "^5.7.0",           // Type checking (dev)
  "@types/node": "^25.5.0"          // Node.js types (dev)
}
```

Zero frameworks. Raw Anthropic SDK. Framework-agnostic message.
