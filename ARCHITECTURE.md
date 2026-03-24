# GreenAgent — Architecture & Project Guide

## What Is This

GreenAgent is an AI workflow sustainability tool. It X-rays multi-agent pipelines — tracking tokens, cost, energy, and carbon per step — then uses AI to classify each step, suggest optimizations, and dynamically generate an improved pipeline. The optimization is genuine: no hardcoded "optimized" function, the AI reads the diagnosis and redesigns the architecture.

Built for the Visma AI Conference 2026 talk: *"One Prompt Was Bad Enough: Sustainability in the Age of Multi-Agent AI"*

---

## Talk Info

- **Title:** "One Prompt Was Bad Enough: Sustainability in the Age of Multi-Agent AI"
- **Conference:** Visma AI Conference 2026, March 24–26 (remote, ~300 attendees)
- **Speaker:** Edgaras Legus, Visma Tech Lithuania
- **Format:** Live demo / minimal slides
- **Track:** AI-native Products
- **Duration:** 45 minutes total (including Q&A)

---

## Project Structure

```
greenagent/
├── .greenagent/                        ← THE TOOL
│   ├── live.ts                         ← CLI entry point (115 lines)
│   ├── prompts/
│   │   ├── greenagent.md               ← AI architect (wire + optimize pipelines)
│   │   └── analysis.md                 ← AI diagnostician (classify steps + suggest)
│   ├── src/
│   │   ├── commands/
│   │   │   ├── single.ts              ← single prompt approach (76 lines)
│   │   │   ├── standard.ts            ← standard pipeline + generator (79 lines)
│   │   │   ├── apply.ts              ← apply optimizations (164 lines)
│   │   │   └── compare.ts            ← side-by-side comparison (30 lines)
│   │   ├── config.ts                  ← all tunable values (22 lines)
│   │   ├── tracker.ts                 ← core tracking engine (333 lines)
│   │   ├── xray.ts                    ← terminal + markdown reports (428 lines)
│   │   ├── suggestions.ts            ← AI-powered analysis (154 lines)
│   │   ├── pipeline.ts               ← dynamic pipeline runner (104 lines)
│   │   ├── runner.ts                  ← agent tool_use loop (109 lines)
│   │   ├── tools.ts                   ← tool definitions + execution (142 lines)
│   │   ├── helpers.ts                 ← shared utilities (102 lines)
│   │   ├── carbon.ts                  ← energy/carbon estimation (77 lines)
│   │   ├── colors.ts                  ← ANSI constants (13 lines)
│   │   └── index.ts                   ← barrel exports (25 lines)
│   └── output/                        ← generated artifacts (gitignored)
│       ├── single/
│       ├── standard/
│       └── optimized/
│
├── intellidesk/                        ← THE PROJECT (target codebase)
│   ├── agents/                        ← agent system prompts (7 md files)
│   │   ├── planner.md
│   │   ├── code-reader.md
│   │   ├── architect.md
│   │   ├── backend-developer.md
│   │   ├── code-reviewer.md
│   │   ├── frontend-developer.md
│   │   └── quality-gate.md
│   ├── pipeline.json                  ← generated pipeline wiring (after first run)
│   ├── backend/                       ← .NET 8 Clean Architecture (48 files)
│   └── frontend/                      ← Angular 18 (24 files)
│
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── .env.example
└── ARCHITECTURE.md                    ← this file
```

---

## How It Works

### The Core Loop

```
standard → X-Ray diagnosis → apply → optimized pipeline → compare
```

1. **`standard`** runs the project's agent pipeline, tracking every API call
2. **AI analysis** classifies each step and suggests improvements
3. **`apply`** feeds the diagnosis to GreenAgent, which redesigns the pipeline
4. **The optimized pipeline** runs and produces the same output cheaper/faster
5. **`compare`** shows before vs after side by side

### Two AI Brains

| File | Role | When it runs |
|------|------|-------------|
| `prompts/analysis.md` | **Diagnostician** — classifies steps (useful/overhead/waste) and suggests improvements | After every pipeline run |
| `prompts/greenagent.md` | **Architect** — designs pipeline wiring from agent configs, or optimizes an existing pipeline | On first `standard` run + every `apply` |

GreenAgent operates in two modes:
- **Initial wiring** (no X-Ray data): reads agent md files, determines execution order, tools, data flow, and produces `pipeline.json`
- **Optimization** (X-Ray data provided): reads diagnosis + current configs, redesigns everything — merges agents, switches models, rewrites prompts, adds guardrails

### Dynamic Pipeline

There is no hardcoded pipeline. Both `standard` and `apply` use the same `runDynamicPipeline()` engine:

1. First `standard` run → no `pipeline.json` → AI generates it from agent md files → cached
2. Subsequent `standard` runs → loads cached `pipeline.json`
3. `apply` → AI generates optimized `pipeline.json` → overwrites agent md files + cache
4. `git checkout intellidesk/` → reverts everything → next `standard` regenerates from scratch

### Agent Configs Are System Prompts

Each file in `intellidesk/agents/` IS the system prompt — the entire content gets sent to the API. No headers, no parsing. Like CLAUDE.md in Claude Code or .cursorrules in Cursor.

The orchestrator (`runDynamicPipeline`) only passes data between agents — task description and outputs from previous agents. All behavioral instructions live in the md files.

### AI-Driven Step Classification

Steps are NOT classified by hardcoded category labels. They start as `unclassified` and the AI analysis (`analysis.md`) classifies each one based on what actually happened:

- A planning step that reads 3 key files efficiently → **useful_work**
- A planning step that explores 72 files and accumulates 200k tokens → **overhead**
- A review that catches a real bug → **useful_work**
- A review that triggers 13 fix rounds for cosmetic issues → **potential_waste**

---

## Module Reference

### CLI & Commands

| File | Purpose |
|------|---------|
| `live.ts` | CLI entry point — parses flags, routes to commands (115 lines) |
| `commands/single.ts` | Single prompt approach — one LLM call writes all files |
| `commands/standard.ts` | Loads/generates pipeline.json, runs via dynamic engine |
| `commands/apply.ts` | Reads X-Ray report, AI redesigns pipeline, runs it, writes new configs |
| `commands/compare.ts` | Loads saved tracker data, renders side-by-side comparison |

### Core Engine

| File | Purpose |
|------|---------|
| `tracker.ts` | Wraps every API call — records tokens, cost, energy, carbon, latency per step |
| `xray.ts` | Renders X-Ray reports — terminal (ANSI) and markdown, comparison tables |
| `suggestions.ts` | Sends step telemetry to AI, gets classifications + optimization suggestions |
| `pipeline.ts` | `runDynamicPipeline()` — runs any `PipelineConfig` using the agent loop engine |
| `runner.ts` | `runAgent()` — the tool_use loop that powers every agent |
| `tools.ts` | Tool definitions (list_files, read_file, write_file) and execution |
| `carbon.ts` | Energy/carbon estimation from token counts (Google/IEA methodology) |

### Config & Utilities

| File | Purpose |
|------|---------|
| `config.ts` | All tunable values — models, limits, guardrails, token budgets |
| `helpers.ts` | Shared utilities — analyzeAndReport, saveResults, readAgentConfigs, loadPrompt |
| `colors.ts` | ANSI terminal color constants |
| `index.ts` | Barrel re-exports for clean imports |

---

## Run Commands

```bash
# Run the standard agent pipeline
npx tsx .greenagent/live.ts standard --task "Add a KnowledgeBase feature..."

# Apply X-Ray suggestions — AI redesigns + runs optimized pipeline
npx tsx .greenagent/live.ts apply ./.greenagent/output/standard/xray-report.md --task "..."

# Compare before/after (no API calls)
npx tsx .greenagent/live.ts compare \
  ./.greenagent/output/standard/tracker-data.json \
  ./.greenagent/output/optimized/tracker-data.json

# Single prompt baseline
npx tsx .greenagent/live.ts single --task "..."

# Revert to original agent configs after apply
git checkout intellidesk/
```

---

## Demo Results (March 25, 2026)

| | Standard | Optimized (apply) |
|---|---|---|
| **Steps** | 55 | 30 |
| **Tokens** | 626,056 | 96,579 |
| **Cost** | $2.40 | $0.59 |
| **Time** | 560s | 234s |
| **Useful work** | 35% | 65% |

**4x cost reduction** from AI-generated architectural changes — not model swaps.

---

## Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Agent configs as md files | Entire file = system prompt | No parsing — like CLAUDE.md |
| AI classifies steps | No hardcoded categories | Classification based on behavior, not labels |
| AI generates pipelines | No hardcoded orchestration | Works for any number/type of agents |
| AI optimizes pipelines | No pre-built "optimized" function | Genuine optimization from diagnosis |
| Task as CLI parameter | `--task` flag, no default | Tool is fully generic, not IntelliDesk-specific |
| Two AI brains | analysis.md + greenagent.md | Diagnosis and architecture are separate concerns |
| Prompts as files | `.greenagent/prompts/` | Not hardcoded in TypeScript |
| Config centralized | `src/config.ts` | One place to tune models, limits, budgets |
| Commands as modules | `src/commands/` | Each command is self-contained |
| Zero frameworks | Raw Anthropic SDK | Framework-agnostic message |

---

## Talk Structure

1. **Part 1** (4 min): Callback to 2025 talk — 0.3Wh per prompt. "That was ONE prompt."
2. **Part 2** (2-3 min): Agent era stats — $8.5B market, 40% cancellation risk, inference = 60-70% of AI energy
3. **Part 3** (22-23 min): Live demo
   - Show the agent configs (md files = system prompts)
   - Run standard — watch the overhead pile up
   - Run apply — AI redesigns the pipeline in real time
   - Compare — side-by-side savings
4. **Part 4** (10 min): Quick wins + GreenAgent take-home, GitHub QR
5. **Part 5** (4 min): Q&A

**TIMING:** Standard takes ~9 min live. Pre-run before the talk and use saved data, or run live for dramatic effect.

---

## Key Quotes

- "The agent tax — tokens spent not on useful work, but on agents talking to each other"
- "I'm not against multi-agent AI. I'm against blind multi-agent AI"
- "You can't optimize what you can't see"
- "Same task, same output. The only difference is architecture. And it costs 4x more."
- "Sustainability and unit economics are the same problem — every wasted token is both CO₂ and money"

---

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.39.0",
  "dotenv": "^17.3.1",
  "tsx": "^4.19.0",
  "typescript": "^5.7.0",
  "@types/node": "^25.5.0"
}
```

## Pricing Reference

| Model | Input (per 1M) | Output (per 1M) |
|-------|---------------|----------------|
| `claude-sonnet-4-6` | $3.00 | $15.00 |
| `claude-haiku-4-5-20251001` | $1.00 | $5.00 |
