# Agent Runner

## Role
The engine that powers every agent. Handles the Anthropic `tool_use` loop and integrates with GreenTracker. Every agent in both the Standard and Optimized pipelines is executed via the same `runAgent()` function -- there is no agent-specific execution logic.

## What It Does

```typescript
async function runAgent(tracker: GreenTracker, options: AgentOptions): Promise<string>
```

Takes a tracker and agent configuration, runs the LLM call (with optional tool use), tracks every API round-trip, and returns the final text output.

**Important:** The runner is used by ALL agents via `runAgent()`. Each agent gets its own message context -- agents do not share conversation history. The orchestrator is responsible for passing text output from one agent as input to the next. The runner only knows about a single agent's conversation.

## The Tool-Use Loop

```
+-----------------------------------------------------+
| 1. tracker.startStep(category, model)                |
| 2. client.messages.create({ system, messages })      |
| 3. tracker.recordStep(response, note)                |
| 4. XRay.stepLive(step) -- show to audience           |
|                                                      |
| if stop_reason === 'tool_use':                       |
|   5. Execute each tool against real filesystem       |
|   6. Build tool_result messages                      |
|   7. Append to conversation --> go to step 1         |
|                                                      |
| if stop_reason === 'end_turn':                       |
|   5. Return final text                               |
+-----------------------------------------------------+
```

## Key Design: Every Round-Trip Is Tracked

When an agent calls `read_file` three times, the runner makes 2+ API calls:
- Call 1: Claude decides which files to read --> `tool_use` response
- Call 2: Claude receives file contents, decides to read more or produce output

**Each of these calls is a separate GreenTracker step.** This is critical for the demo -- it shows that a single "Reader Agent" can generate multiple tracked steps, revealing the true cost of tool-using agents.

## Which Agents Use Which Tools

The runner accepts any tool configuration, but in practice:

| Agent | Tools | Notes |
|-------|-------|-------|
| Planner | `list_files`, `read_file` | Can read the codebase |
| Code Reader | `list_files`, `read_file` | Can read the codebase |
| Architect | none | Pure thinking, 1 API call |
| Backend Developer | `write_file` | Write-only, no reading |
| Frontend Developer | `write_file` | Write-only, no reading |
| Code Reviewer | none | Pure text evaluation, 1 API call |
| Quality Gate | none | Pure text evaluation, 1 API call |

Agents without tools always make exactly 1 API call and return. Agents with tools may make multiple round-trips (each tracked separately).

## AgentOptions Interface

```typescript
interface AgentOptions {
  category: string;     // planning, coordination, execution, reflection, routing, validation
  model: string;        // 'claude-sonnet-4-20250514' or 'claude-3-5-haiku-20241022'
  system: string;       // System prompt defining the agent's role
  userMessage: string;  // The actual task/input for this agent
  tools?: Tool[];       // Optional -- list_files, read_file, write_file
  maxTokens?: number;   // Controls output length (default: 4096)
  note: string;         // Shown in XRay.stepLive() output
}
```

## Safety

- **MAX_TOOL_ROUNDS = 15** -- prevents infinite tool-use loops
- Agents without tools make exactly 1 API call and return
- Tool execution errors are returned to the model as text (it can handle them gracefully)

## How the Runner Fits in the Pipeline

```
Orchestrator
  |
  +--> runAgent(planner)       --> returns plan text
  +--> runAgent(codeReader)    --> returns code context
  +--> runAgent(architect)     --> returns design
  +--> runAgent(backendDev)    --> returns impl summary
  +--> runAgent(reviewer)      --> returns review
  +--> runAgent(backendDev)    --> returns fix summary
  +--> runAgent(frontendDev)   --> returns frontend summary
  +--> runAgent(qualityGate)   --> returns pass/fail
```

Each call is independent -- the runner has no awareness of the pipeline. It runs one agent, returns its text output, and the orchestrator decides what to do next.

## Why This Design

The runner is deliberately simple -- one function, ~40 lines. No agent classes, no state machines, no event systems. This is intentional:

1. **Readable:** During the talk, if shown, the audience understands it in 30 seconds
2. **Transparent:** Every API call is visible in the X-Ray
3. **Framework-agnostic:** The pattern works the same whether you build on CrewAI, LangGraph, or raw SDK calls
