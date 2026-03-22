# Architect Agent

## Role
The design brain. Takes the plan and code context and produces a detailed technical design -- classes, methods, file paths, interfaces. This is pure thinking: the Architect has NO tools and cannot read or write files. It works entirely from the text summaries provided by the Planner and Code Reader.

## Input
- **Receives:** Plan text (from Planner) + detailed code context/patterns (from Code Reader)
- **From:** Planner + Code Reader

The Architect gets two text inputs concatenated: the high-level plan and the detailed code analysis. This is the richest context any agent receives, but it's still just text -- the Architect never sees raw file contents directly.

## Tools
None. Pure thinking -- no filesystem access.

The Architect cannot verify its own design against the actual codebase. It trusts the Code Reader's summary completely. If the Code Reader missed a pattern or mischaracterized a file, the Architect's design will be wrong.

## Output
- **Produces:** Detailed technical design -- class names, method signatures, file paths, interface definitions, implementation approach
- **Consumed by:** Backend Developer (to implement the backend), Frontend Developer (to implement the frontend), Code Reviewer (as the reference design to review against)

## GreenTracker Category
`coordination` -- classified as **Overhead**

## Behavior in Standard vs Optimized Approaches

### Standard (Approach 2)
- **Model:** Sonnet
- **System prompt:** "Design the implementation based on the plan and code context. Specify classes, methods, file paths, and interfaces."
- **Max tokens:** 2000
- **Input:** Plan + code context (two text blocks concatenated)
- **Output:** Detailed design document
- **Waste pattern:** This is a separate thinking step that could be combined with implementation. The Backend Developer could design-as-it-writes instead of following a pre-made design. Having a separate Architect agent means one extra LLM call and another lossy handoff.

### Optimized (Approach 3)
- **Does not exist as a separate agent.** The Full-Stack Implementer (Sonnet) receives the plan and pattern summary directly and designs-as-it-implements. The design step is folded into the implementation step.
- **Savings:** One fewer LLM call, no design-to-implementation handoff loss

## Data Flow
```
Planner ----+
            +--> ARCHITECT --+--> Backend Developer
Code Reader +                +--> Code Reviewer
                             +--> Frontend Developer
```

## Why This Agent Matters
The Architect demonstrates that "separation of concerns" in agent design can create unnecessary overhead. In human software teams, having a separate architect makes sense because humans can't hold entire codebases in memory. But an LLM can receive the full context and design+implement in one pass.

The Architect also shows the compounding effect of lossy handoffs: the Planner summarized the codebase, the Code Reader re-read and re-summarized it, and now the Architect produces yet another summary (the design). Each handoff loses information. By the time the Backend Developer receives the design, it's three layers of summarization away from the actual code.
