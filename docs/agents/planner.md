# Planner Agent

## Role
First agent in the pipeline. Examines the project structure and creates a plan for the task -- which files exist, which are most relevant, and what approach to take. This is the only agent (alongside Code Reader) that can actually look at the codebase.

## Input
- **Receives:** Task description (the original user request)
- **From:** Orchestrator (entry point -- no upstream agent)

## Tools
| Tool | Purpose |
|------|---------|
| `list_files` | Discover what files exist in the codebase |
| `read_file` | Quick scan of key files to inform the plan |

The Planner is one of only two agents with read tools. All downstream agents work from the text output the Planner produces, not from the filesystem directly.

## Output
- **Produces:** Plan text -- which files to modify, what changes to make, architectural approach
- **Consumed by:** Code Reader (to know which files to read in depth) and Architect (to understand the task scope)

## GreenTracker Category
`planning` -- classified as **Overhead**

## Behavior in Standard vs Optimized Approaches

### Standard (Approach 2)
- **Model:** Sonnet (overkill -- listing files doesn't need a frontier model)
- **System prompt:** Verbose. Asks for a comprehensive plan covering every file.
- **Max tokens:** 1000
- **Output:** Detailed plan with instructions for every file
- **Waste pattern:** Expensive model for a simple directory listing task. The plan text becomes the foundation for ALL downstream agents, but Sonnet-level reasoning isn't needed here.

### Optimized (Approach 3)
- **Model:** Haiku (cheap -- perfect for a quick file scan)
- **System prompt:** Concise. List files and pick the 2-3 most important ones.
- **Max tokens:** 400
- **Tool rounds:** 2-3 (quick scan, not exhaustive)
- **Output:** Brief list with one-line descriptions
- **Efficiency:** 80-90% cheaper than Standard, same useful output

## Data Flow
```
                              +---> Code Reader
[task description] --> PLANNER |
                              +---> Architect
```

## Why This Agent Matters
Every multi-agent system needs to know what it's working with before it starts. The Planner is legitimate overhead -- but the question is: does it need Sonnet to list 5 files and write a paragraph? That's the insight.

Critically, the Planner's text output is the ONLY thing downstream agents receive about the codebase structure. If the plan is vague, every agent after it works blind. This is the first lossy handoff in the pipeline -- and the reason the Code Reader agent exists at all.
