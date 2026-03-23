# CLAUDE.md — GreenAgent Talk Prep (Living Document)

Update this file whenever a decision is made, a task is completed, or the plan changes.

---

## Talk Info

- **Title:** "One Prompt Was Bad Enough: Sustainability in the Age of Multi-Agent AI"
- **Conference:** Visma AI Conference 2026, March 24–26 (remote, ~300 attendees)
- **Speaker:** Edgaras Legus, Visma Tech Lithuania
- **Format:** Live demo / minimal slides
- **Track:** AI-native Products
- **Duration:** 45 minutes total (including Q&A)
- **Note:** Only representative from Lithuania — high visibility

---

## Current Status

**Date:** March 23, 2026 — 1 day before talk. **Talk is tomorrow.**

### Done
- [x] GreenTracker core (`src/tracker.ts`) — tokens, cost, carbon, budget guardrails, toJSON/fromJSON
- [x] Carbon estimation (`src/carbon.ts`) — Google/IEA methodology, regional grids
- [x] Suggestion engine (`src/suggestions.ts`) — 6 pattern detectors, consolidated output (no per-step spam)
- [x] X-Ray visualizer (`src/xray.ts`) — terminal report, compare, stepLive, reportToMarkdown
- [x] README.md
- [x] Agent design docs (`docs/agents/`) — 9 files, filenames match agent names
- [x] **IntelliDesk codebase** — 72 files (48 backend .NET 8 + 24 frontend Angular 18)
- [x] **Real agent demo (`demo/live.ts`)** — tool_use + write_file, 3 approaches, all tested
- [x] **Live terminal UX** — agent headers with icons/names, live timers, tool logging, clickable output paths
- [x] **All 3 approaches tested with real API key and verified**
- [x] **Realistic orchestration** — agents pass TEXT output forward, no re-exploring, lossy handoffs
- [x] **Result persistence** — xray-report.md + tracker-data.json saved after each approach
- [x] **Apply command** — reads X-Ray suggestions, shows fixes, runs optimized
- [x] **Compare command** — loads saved tracker-data.json files, renders XRay.compare() offline
- [x] **Cleanup** — removed simulate.ts, renamed agent doc files to match agent names
- [x] **GitHub repo published** — https://github.com/edgarasLegusVisma/greenagent
- [x] **Node.js reinstalled** — v24.14.0 LTS (via winget), npx works
- [x] **Bug fix: suggestions duplication** — `src/suggestions.ts` now consolidates per-category (was firing once per step → 37+ spam suggestions; now 1 per category)
- [x] **Bug fix: Code Reader re-exploration** — `demo/live.ts` Code Reader now uses `READ_FILE_ONLY` (read_file only, no list_files). Planner output already has the directory tree.

### Verified Demo Results (March 22, 2026 run — pre-bug-fix baseline)

| | Single Prompt | Standard Multi-Agent | Optimized Multi-Agent |
|---|---|---|---|
| **Steps** | 6 | 40 | 15 |
| **Tokens** | 16,623 | 755,791 | 61,093 |
| **Cost** | $0.09 | $2.83 | $0.27 |
| **Time** | 51s | 609s (~10 min) | 156s (~2.5 min) |
| **Useful work** | 100% | 24% | ~70% |
| **Overhead** | 0% | 75% | ~20% |
| **Score** | 🌿 Excellent | 🔥 Needs Work | 🌱 Fair |
| **Model** | Sonnet | Sonnet (all agents) | Haiku + Sonnet |
| **Files** | 5 | 17 | 7 |

**Note:** March 23 run (post-fix, in `demo/output/standard/xray-report.md`) shows 63 steps / $2.80. Standard results may vary run-to-run (~$2.80–$3.00 range). Use saved tracker-data.json for compare command.

**Key demo numbers:**
- Standard is **10x more expensive** than optimized ($2.83 vs $0.27)
- Standard is **31x more expensive** than single prompt ($2.83 vs $0.09)
- Standard: **75% overhead, only 24% useful work** — from realistic architecture patterns
- Both approaches use Sonnet for execution — the waste comes from architecture, NOT model choice
- Standard has realistic orchestration: agents pass TEXT output between them, lossy handoffs
- The waste is structural: lossy handoffs, context accumulation, separate steps that could be combined

### Still Needed
- [ ] **Re-run all 3 approaches** to get fresh saved data after the Code Reader fix (steps will drop)
- [ ] 4–5 slides (title, callback, stats, takeaways, QR code)
- [ ] Push latest bug fixes to GitHub
- [ ] Dry run / rehearsal

---

## Project File Map

```
greenagent/
├── CLAUDE.md                ← this file (living plan, decisions, status)
├── CONTEXT.md               ← full background: previous talk, submission, design history
├── TALK_PLAN.md             ← detailed talk structure, script, quotes, X-Ray feature list
├── README.md                ← GitHub-ready documentation
├── package.json             ← deps: @anthropic-ai/sdk, dotenv, tsx, typescript, @types/node
├── tsconfig.json            ← ES2022, ESNext modules, strict (excludes intellidesk/ and output/)
├── .env                     ← ANTHROPIC_API_KEY (git-ignored)
├── .gitignore               ← node_modules, dist, .env
│
├── src/                     ← GreenAgent library
│   ├── index.ts             ← clean re-exports
│   ├── tracker.ts           ← GreenTracker: startStep(), recordStep(), guardrails, toJSON/fromJSON
│   ├── carbon.ts            ← estimateEnergyWh(), estimateCarbonMg(), makeRelatable()
│   ├── suggestions.ts       ← generateSuggestions(): 6 detectors, consolidated per-category (no per-step spam)
│   └── xray.ts              ← XRay.report(), XRay.compare(), XRay.stepLive(), XRay.reportToMarkdown()
│
├── demo/
│   ├── live.ts              ← THE CONFERENCE SCRIPT (needs ANTHROPIC_API_KEY)
│   ├── intellidesk/         ← target codebase that agents read and extend (72 files)
│   │   ├── backend/         ← .NET 8 Clean Architecture (48 files)
│   │   └── frontend/        ← Angular 18 (24 files)
│   └── output/              ← generated artifacts from each approach
│       ├── single/          ← code files + xray-report.md + tracker-data.json
│       ├── standard/        ← code files + xray-report.md + tracker-data.json
│       └── optimized/       ← code files + xray-report.md + tracker-data.json
│
└── docs/
    └── agents/              ← agent design docs (filenames match agent names)
        ├── planner.md           ← 🗺️ PLANNER
        ├── code-reader.md       ← 📖 CODE READER / PATTERN READER
        ├── architect.md         ← 🏗️ ARCHITECT (standard only)
        ├── backend-developer.md ← 💻 BACKEND DEVELOPER / ⚡ FULL-STACK IMPLEMENTER
        ├── code-reviewer.md     ← 🔍 CODE REVIEWER / REVIEWER
        ├── frontend-developer.md← 🎨 FRONTEND DEVELOPER (standard only)
        ├── quality-gate.md      ← ✅ QUALITY GATE (standard only)
        ├── orchestrator.md      ← pipeline design + data flow for both approaches
        └── runner.md            ← runAgent() tool_use loop engine
```

---

## The Demo — How It Works

### The Task
**"Add a KnowledgeBase feature to IntelliDesk — a service that suggests answers from resolved tickets."**

Agents read existing IntelliDesk code to understand patterns, then write new files:
- `IKnowledgeBaseService.cs` (interface)
- `KnowledgeBaseService.cs` (service implementation)
- `KnowledgeBaseSuggestionDto.cs` (DTO)
- `KnowledgeBaseController.cs` (API endpoint)
- `knowledge-base.component.ts` (Angular component)

### Tools
| Tool | What It Does | Used By |
|------|-------------|---------|
| `list_files` | Lists directory contents from IntelliDesk | 🗺️ Planner, 📖 Code Reader |
| `read_file` | Reads source files from IntelliDesk | 📖 Code Reader, 📖 Pattern Reader |
| `write_file` | Writes NEW files to `demo/output/` | Single prompt, 💻 Backend Dev, ⚡ Implementer, 🎨 Frontend Dev |

### Three Approaches

**Approach 1: Single Prompt** (Sonnet, write_file only)
- Direct API call — NOT runAgent(), no agent headers
- Live timer, writes same 5 files as agents — apples-to-apples
- **Verified: 6 steps, 16k tokens, $0.09, 51s, 🌿 Excellent**

**Approach 2: Standard Multi-Agent** (8 agents, ALL Sonnet)
This is NOT a strawman — this is how devs naturally build agents.
```
🗺️ PLANNER            → explore project structure
📖 CODE READER         → read relevant files (lossy handoff from Planner)
🏗️ ARCHITECT           → design feature from plan + code context
💻 BACKEND DEVELOPER   → write backend files (write_file only)
🔍 CODE REVIEWER       → review implementation text
🔄 BACKEND DEV (fixes) → apply review fixes (write_file only)
🎨 FRONTEND DEVELOPER  → write Angular component (write_file only)
✅ QUALITY GATE         → final pass/fail check
```
- **Verified: 40 steps, 756k tokens, $2.83, 609s, 🔥 Needs Work**
- Realistic orchestrator: agents pass text output forward, no re-exploring
- 75% overhead from architecture: lossy handoffs, context accumulation, unnecessary separation

**Approach 3: Optimized Multi-Agent** (5 agents, Haiku + Sonnet)
```
🗺️ PLANNER           → quick scan, pick 5-6 files by name (Haiku)
📖 PATTERN READER     → read key files, output SUMMARY (Haiku)
⚡ FULL-STACK IMPL    → write ALL files in one pass (Sonnet, write_file only)
🔍 REVIEWER           → one pass, APPROVED if 8+/10 (Sonnet)
🔧 FINAL FIXES        → skip if APPROVED (Sonnet, write_file only)
```
- **Verified: 15 steps, 61k tokens, $0.27, 156s, 🌱 Fair**
- Savings from ARCHITECTURE: fewer agents, combined steps, summarized context, early exit

### Result Persistence

Every approach saves two artifacts to `demo/output/{approach}/`:
- **`xray-report.md`** — full markdown report: summary, token/cost breakdown, step detail, suggestions, sustainability score
- **`tracker-data.json`** — serialized tracker data for offline comparison

---

## Demo Flow (Talk Script)

### The Ideal Talk Flow (4 commands)

```bash
# 1. Baseline — one prompt, no agents
npx tsx demo/live.ts single

# 2. Standard multi-agent — watch the overhead pile up
npx tsx demo/live.ts standard

# 3. Apply the X-Ray's suggestions — run the optimized version
npx tsx demo/live.ts apply ./demo/output/standard/xray-report.md

# 4. Compare all three side by side (no API calls — loads saved data)
npx tsx demo/live.ts compare ./demo/output/single/tracker-data.json ./demo/output/standard/tracker-data.json ./demo/output/optimized/tracker-data.json
```

### Talk Structure

1. **Part 1** (4 min): Callback to 2025 talk — 0.3Wh per prompt. "That was ONE prompt."
2. **Part 2** (2-3 min): Agent era stats — $8.5B market, 40% cancellation risk, inference = 60-70% of AI energy
3. **Part 3** (22-23 min): Live demo — the 4 commands above
   - 3a: Show the wrapper (2 min) — how simple GreenAgent is to add
   - 3b: Single prompt (3 min) — baseline, 🌿 Excellent, $0.09
   - 3c: Standard multi-agent (8 min) — watch overhead pile up, 40 steps, $2.83
   - 3d: Apply fixes + optimized (5 min) — same output, 15 steps, $0.27
   - 3e: Compare all three (4 min) — XRay.compare() from saved data, 10x savings
4. **Part 4** (10 min): Quick wins + GreenAgent take-home, GitHub QR
5. **Part 5** (4 min): Q&A

**TIMING WARNING:** Standard takes ~10 min live. Options:
- Run it live and let the audience watch the overhead pile up (dramatic)
- Pre-run standard before the talk, show saved xray-report.md
- Run single + apply live, use saved standard data for compare

---

## Key Architectural Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Matches Visma dev audience, differentiates from Python AI talks |
| LLM Provider | Anthropic Claude | Visma has Claude Code agreement |
| Models | Sonnet `claude-sonnet-4-6` ($3/$15), Haiku `claude-haiku-4-5-20251001` ($1/$5) | Standard uses Sonnet everywhere — waste is architectural |
| Frameworks | None (raw SDK) | Framework-agnostic message |
| Codebase | IntelliDesk (72 files, .NET + Angular) | Realistic helpdesk app |
| Agent tools | `list_files` + `read_file` for readers, `write_file` ONLY for implementers | Prevents agents from re-exploring |
| Orchestration | Text handoffs between agents (no shared memory) | Realistic AND the source of waste |
| Naming | "Standard" not "Naive" | NOT a strawman |
| Result persistence | xray-report.md + tracker-data.json | Enables apply + compare commands |

---

## Key Quotes (Memorize These)

- "The agent tax — tokens spent not on useful work, but on agents talking to each other"
- "I'm not against multi-agent AI. I'm against blind multi-agent AI"
- "You can't optimize what you can't see"
- "That's the difference between a dashboard and a diagnosis"
- "Sustainability and unit economics are the same problem — every wasted token is both CO₂ and money"
- "Same model, same task, same output. The only difference is architecture. And it costs 10x more."
- "75% of the standard approach's tokens were overhead — coordination, not code."

**Q&A — if asked "how did you build GreenAgent?":**
> "Yes, I used AI to help build GreenAgent. Yes, that burned tokens. But that's exactly the point — I'd rather burn tokens once building a tool that helps everyone burn fewer tokens from now on. That's sustainable investment, not sustainable abstinence."

---

## Run Commands

```bash
# Individual approaches (each saves xray-report.md + tracker-data.json):
npx tsx demo/live.ts single       # ~50s, ~$0.09
npx tsx demo/live.ts standard     # ~10 min, ~$2.83 ⚠️
npx tsx demo/live.ts optimized    # ~2.5 min, ~$0.27

# Apply suggestions from a saved X-Ray report → runs optimized:
npx tsx demo/live.ts apply ./demo/output/standard/xray-report.md

# Compare saved tracker data (no API calls):
npx tsx demo/live.ts compare ./demo/output/single/tracker-data.json ./demo/output/standard/tracker-data.json ./demo/output/optimized/tracker-data.json
```

---

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.39.0",
  "@types/node": "^25.5.0",
  "dotenv": "^17.3.1",
  "tsx": "^4.19.0",
  "typescript": "^5.7.0"
}
```

---

## Pricing Reference (March 2026)

| Model | Input (per 1M) | Output (per 1M) | Used In |
|-------|---------------|----------------|---------|
| `claude-sonnet-4-6` | $3.00 | $15.00 | Standard (all agents), Optimized (execution/review), Single prompt |
| `claude-haiku-4-5-20251001` | $1.00 | $5.00 | Optimized (planning/routing) |
