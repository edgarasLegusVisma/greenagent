# Frontend Developer Agent

## Role
Implements the frontend code changes. Receives the architectural design and code context, then writes frontend files to disk. Like the Backend Developer, this agent has write-only access and cannot re-read files. It works from the same design and code context but focuses on frontend concerns.

In the Standard pipeline, the Frontend Developer runs as Agent 7, in parallel conceptually (but sequentially in practice) with the Backend Developer's fix pass.

## Input
- **Receives:** Detailed design (from Architect) + code context/patterns (from Code Reader)
- **From:** Architect + Code Reader

The Frontend Developer gets the same design document as the Backend Developer but applies it to frontend files. It has no awareness of what the Backend Developer actually wrote -- it works from the shared design, not from the Backend Developer's output.

## Tools
| Tool | Purpose |
|------|---------|
| `write_file` | Write frontend implementation files to disk |

Write-only. Cannot read existing files or verify its output against the codebase.

## Output
- **Produces:** Frontend implementation summary (what files were written, what they contain)
- **Consumed by:** Quality Gate

## GreenTracker Category
`execution` -- classified as **Useful Work**

## Behavior in Standard vs Optimized Approaches

### Standard (Approach 2)
- **Model:** Sonnet
- **System prompt:** "Implement the frontend according to the design. Write all necessary frontend files."
- **Max tokens:** 2000
- **Input:** Design + code context
- **Output:** Frontend implementation summary
- **Waste patterns:**
  - Separate agent from Backend Developer -- could be one Full-Stack agent
  - No coordination with Backend Developer's actual output (works from shared design, not from what was actually implemented)
  - Gets the full code context again, even though most of it is backend-relevant

### Optimized (Approach 3)
- **Does not exist as a separate agent.** The Full-Stack Implementer writes both backend and frontend files in one pass.
- **Savings:** One fewer LLM call, no backend/frontend coordination gap

## Data Flow
```
Standard:
  Architect ---+
               +--> FRONTEND DEV --> frontend summary --> Quality Gate
  Code Reader -+
```

## Why This Agent Matters
The Frontend Developer demonstrates the waste of unnecessary agent specialization. In the Standard approach, backend and frontend are split into separate agents that:

1. **Cannot coordinate:** The Frontend Developer doesn't know what the Backend Developer actually wrote. They both work from the Architect's design, but if the Backend Developer deviated from the design, the frontend won't match.

2. **Duplicate context:** Both agents receive the same code context from the Code Reader. That's the same input tokens paid twice.

3. **Sequential overhead:** Even though backend and frontend work is conceptually parallel, in a sequential orchestrator they run one after another, doubling the wall-clock time.

The Optimized approach eliminates this by having one Full-Stack Implementer that writes all files in a single pass, ensuring backend and frontend are consistent.
