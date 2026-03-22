# Orchestrator

## Role
Not a single agent -- it's the pipeline logic that chains agents together. In `demo/live.ts`, the orchestrator is the approach function itself (`runStandardMultiAgent()` or `runOptimizedMultiAgent()`). Each agent is invoked via `runAgent()`, receives TEXT OUTPUT from previous agents as input, and produces TEXT OUTPUT for the next agents.

## Core Design Principle: Text Handoffs

Agents do NOT re-explore the codebase from scratch. The orchestrator passes the **text output** of one agent as the **input** to the next. This is both realistic (most multi-agent frameworks work this way) AND the source of waste:

- **Lossy handoffs:** When the Planner reads files and produces a plan, only the plan text is passed forward. The actual file contents are lost. This forces the Code Reader to re-read the same files.
- **Context accumulation:** Each agent receives text from multiple upstream agents. By the time the Quality Gate runs, it's receiving design + fix summary + frontend summary -- multiple layers of summarization away from the actual code.
- **No shared memory:** Agents cannot access each other's tool results. The Backend Developer cannot see the files the Code Reader read -- it only sees the Code Reader's text summary of those files.

This is how real multi-agent systems work. The waste is structural, not accidental.

## Standard Pipeline (8 agent invocations, 7 unique agents)

```
Agent 1: PLANNER
  Input:    task description
  Tools:    list_files, read_file
  Output:   plan text
  Category: planning
  Model:    Sonnet
  |
  |--- plan text ----+---> Agent 2
  |                  +---> Agent 3
  v
Agent 2: CODE READER
  Input:    plan text (from Planner -- lossy handoff, only gets summary)
  Tools:    list_files, read_file
  Output:   detailed code context / patterns
  Category: coordination
  Model:    Sonnet
  WASTE:    exists because Planner's text summary doesn't contain file contents
  |
  |--- code context --+--> Agent 3
  |                   +--> Agent 4
  |                   +--> Agent 7
  v
Agent 3: ARCHITECT
  Input:    plan (from Planner) + codeContext (from Code Reader)
  Tools:    none (pure thinking)
  Output:   detailed design (classes, methods, file paths)
  Category: coordination
  Model:    Sonnet
  WASTE:    separate thinking step that could be combined with implementation
  |
  |--- design --------+--> Agent 4
  |                   +--> Agent 5
  |                   +--> Agent 7
  |                   +--> Agent 8
  v
Agent 4: BACKEND DEVELOPER
  Input:    design (from Architect) + codeContext (from Code Reader)
  Tools:    write_file ONLY (no re-reading)
  Output:   implementation summary
  Category: execution
  Model:    Sonnet
  |
  |--- implementation summary --> Agent 5
  v
Agent 5: CODE REVIEWER
  Input:    design (from Architect) + backendWork (from Backend Dev)
  Tools:    none (reviews text summaries)
  Output:   review feedback
  Category: reflection
  Model:    Sonnet
  |
  |--- review feedback --> Agent 6
  v
Agent 6: BACKEND DEVELOPER (fixes)
  Input:    review (from Reviewer) + backendWork (from Backend Dev, Agent 4)
  Tools:    write_file ONLY
  Output:   fix summary
  Category: execution
  Model:    Sonnet
  WASTE:    second implementation pass
  |
  |--- fix summary --> Agent 8
  v
Agent 7: FRONTEND DEVELOPER
  Input:    design (from Architect) + codeContext (from Code Reader)
  Tools:    write_file ONLY
  Output:   frontend summary
  Category: execution
  Model:    Sonnet
  WASTE:    separate from backend, could be one agent
  |
  |--- frontend summary --> Agent 8
  v
Agent 8: QUALITY GATE
  Input:    design (from Architect) + fixes (from Backend Dev) + frontendWork (from Frontend Dev)
  Tools:    none
  Output:   pass/fail
  Category: validation
  WASTE:    redundant after review
```

### Standard Pipeline -- What Gets Passed

```typescript
async function runStandardMultiAgent(): Promise<GreenTracker> {
  const tracker = new GreenTracker({ carbonRegion: 'eu_avg' });

  // Agent 1: Planner (has read tools)
  const plan = await runAgent(tracker, { ...plannerConfig });

  // Agent 2: Code Reader (has read tools -- re-reads because plan is lossy)
  const codeContext = await runAgent(tracker, { ...readerConfig, input: plan });

  // Agent 3: Architect (no tools -- pure thinking from text)
  const design = await runAgent(tracker, { ...architectConfig, input: plan + codeContext });

  // Agent 4: Backend Developer (write_file only)
  const backendWork = await runAgent(tracker, { ...backendConfig, input: design + codeContext });

  // Agent 5: Code Reviewer (no tools -- reviews text summaries)
  const review = await runAgent(tracker, { ...reviewerConfig, input: design + backendWork });

  // Agent 6: Backend Developer again (write_file only -- fixes)
  const fixes = await runAgent(tracker, { ...backendConfig, input: review + backendWork });

  // Agent 7: Frontend Developer (write_file only)
  const frontendWork = await runAgent(tracker, { ...frontendConfig, input: design + codeContext });

  // Agent 8: Quality Gate (no tools)
  const result = await runAgent(tracker, { ...qualityConfig, input: design + fixes + frontendWork });

  return tracker;
}
```

Note: every `runAgent()` call creates a fresh message context for that agent. Agents do not share conversation history -- they only see what the orchestrator explicitly passes as input.

## Optimized Pipeline (5 agents)

```
Agent 1: PLANNER
  Input:    task description
  Tools:    list_files (quick scan)
  Output:   brief plan
  Category: planning
  Model:    Haiku
  Tool rounds: 2-3
  |
  v
Agent 2: PATTERN READER
  Input:    plan (from Planner)
  Tools:    read_file
  Output:   pattern SUMMARY (not raw contents)
  Category: coordination
  Model:    Haiku
  Reads:    5-6 files, outputs focused summary
  |
  v
Agent 3: FULL-STACK IMPLEMENTER
  Input:    plan + patterns (from Planner + Pattern Reader)
  Tools:    write_file ONLY
  Output:   implementation summary (all files, one pass)
  Category: execution
  Model:    Sonnet
  Key:      designs-as-it-implements, no separate Architect step
  |
  v
Agent 4: REVIEWER
  Input:    implementation summary (from Implementer)
  Tools:    none
  Output:   score + issues, or APPROVED (if score >= 8)
  Category: reflection
  Model:    Sonnet
  Key:      one pass with early exit
  |
  v (only if NOT approved)
Agent 5: FINAL FIXES
  Input:    review feedback + implementation summary
  Tools:    write_file ONLY
  Output:   fixed implementation summary
  Category: execution
  Model:    Sonnet
  Key:      SKIPPED entirely if Reviewer says APPROVED
```

### Optimized Pipeline -- What Gets Passed

```typescript
async function runOptimizedMultiAgent(): Promise<GreenTracker> {
  const tracker = new GreenTracker({
    carbonRegion: 'eu_avg',
    budgetLimitUsd: 0.50,
    maxIterations: 15,
  });

  // Agent 1: Planner (Haiku -- cheap quick scan)
  const plan = await runAgent(tracker, { model: 'haiku', ...plannerConfig });

  // Agent 2: Pattern Reader (Haiku -- reads files, outputs summary)
  const patterns = await runAgent(tracker, { model: 'haiku', ...readerConfig, input: plan });

  // Agent 3: Full-Stack Implementer (Sonnet -- designs and writes in one pass)
  const impl = await runAgent(tracker, { model: 'sonnet', ...implConfig, input: plan + patterns });

  // Agent 4: Reviewer (Sonnet -- one pass, early exit)
  const review = await runAgent(tracker, { model: 'sonnet', ...reviewerConfig, input: impl });

  // Agent 5: Final Fixes (Sonnet -- skipped if APPROVED)
  if (!review.includes('APPROVED')) {
    await runAgent(tracker, { model: 'sonnet', ...fixConfig, input: review + impl });
  }

  return tracker;
}
```

## Key Differences Between Standard and Optimized

| Aspect | Standard | Optimized |
|--------|----------|-----------|
| Agent count | 8 invocations (7 unique agents) | 5 (or 4 with early exit) |
| Models | All Sonnet | Haiku for overhead, Sonnet for real work |
| Read agents | 2 (Planner + Code Reader) | 2 (Planner + Pattern Reader) |
| Write agents | 3 (Backend x2 + Frontend) | 1-2 (Implementer + maybe Fixes) |
| No-tool agents | 3 (Architect + Reviewer + Quality Gate) | 1 (Reviewer) |
| Early exit | None | APPROVED skips Agent 5 |
| Budget guards | None | $0.50 limit, 15 max iterations |
| Context passing | Accumulating (design + context + summaries) | Minimal (only what's needed) |

## Why This Matters for the Talk

The orchestrator pattern is intentionally simple -- no framework, just function calls. This makes two points:

1. **Most "multi-agent" systems are just this.** Sequential function calls with different system prompts. The complexity is in the number of steps and the context passing, not in the framework.

2. **The framework isn't the problem.** Whether you use CrewAI, LangGraph, or raw API calls, the waste patterns are the same: wrong model, too many steps, context bloat, reflection loops. GreenAgent measures the workflow regardless of how it's orchestrated.

3. **Text handoffs are realistic AND wasteful.** Passing text summaries between agents is how every framework works. But it means information is lost at every handoff, forcing re-reading and re-processing. The Optimized approach doesn't eliminate handoffs -- it reduces the number of them and ensures each agent gets only what it needs.

*"It doesn't matter if you're using CrewAI, LangGraph, or plain API calls. The agent tax is the same. GreenAgent wraps the LLM calls, not the framework."*
