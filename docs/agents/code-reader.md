# Code Reader Agent

## Role
Reads source files from disk and produces detailed code context -- patterns, structure, existing conventions. This agent exists because the Planner's text summary doesn't contain actual file contents. It bridges the gap between "knowing what files exist" and "knowing what's in them."

## Input
- **Receives:** Plan text (from Planner)
- **From:** Planner (lossy handoff -- only gets the plan summary, not the Planner's full tool results)

This is a key waste pattern: the Code Reader re-reads files that the Planner already scanned, because the orchestrator only passes text summaries between agents. The Planner's `read_file` results are lost in the handoff.

## Tools
| Tool | Purpose |
|------|---------|
| `list_files` | Discover files (if Planner's plan doesn't list them all) |
| `read_file` | Read actual file contents from disk |

The Code Reader is one of only two agents with read tools (alongside the Planner). All agents after this point work from the Code Reader's text output.

## Output
- **Produces:** Detailed code context -- file contents, patterns found, naming conventions, existing architecture
- **Consumed by:** Architect (to inform the design), Backend Developer (to know what code exists), Frontend Developer (to understand the codebase)

## GreenTracker Category
`coordination` -- classified as **Overhead**

## Behavior in Standard vs Optimized Approaches

### Standard (Approach 2)
- **Model:** Sonnet (wasteful -- reading files is a mechanical task)
- **System prompt:** "Read ALL files -- do not skip any."
- **Max tokens:** 2000
- **Input:** Full plan text (context bloat from Planner)
- **Output:** Contents and summaries of ALL 5 source files
- **Waste patterns:**
  - Sonnet used for a task that's basically `cat *.ts`
  - Reads every file, including trivial ones (e.g., `index.ts` with 7 lines of re-exports)
  - Multiple tool_use round-trips, each tracked as a separate step
  - Exists entirely because text handoffs lose file content from the Planner

### Optimized (Approach 2: PATTERN READER)
- **Model:** Haiku (cheap -- perfect for mechanical file reading)
- **System prompt:** "Read only the files specified in the plan. Output a summary of patterns and conventions."
- **Max tokens:** 500
- **Tool rounds:** Reads 5-6 files, outputs a SUMMARY (not raw content)
- **Input:** Just the brief plan (no bloat)
- **Output:** Pattern summary -- naming conventions, architecture style, key interfaces
- **Efficiency:** Cheaper model, focused output that's actually useful to downstream agents

## Data Flow
```
               +---> Architect
Planner --> CODE READER --+---> Backend Developer
               +---> Frontend Developer
```

## Why This Agent Matters
The Code Reader demonstrates a fundamental problem with text-based agent handoffs: **information loss forces re-work.** The Planner already read files to make its plan, but those file contents are lost when only the plan text is passed forward. So a second agent must re-read the same files.

This is realistic -- most multi-agent frameworks pass text between agents, not tool results. But it means every file gets read at least twice: once by the Planner (to plan) and once by the Code Reader (to provide context). In the Optimized approach, the Pattern Reader at least outputs a focused summary instead of dumping raw file contents.
