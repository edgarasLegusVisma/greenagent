# Backend Developer Agent

## Role
Implements the backend code changes. Receives the architectural design and code context, then writes files to disk. This agent has write-only access -- it cannot re-read files to verify its own output. It trusts the design from the Architect and the code context from the Code Reader.

Called twice in the Standard pipeline: once for initial implementation (Agent 4) and once for fixes after review (Agent 6).

## Input

### First invocation (Agent 4 -- initial implementation)
- **Receives:** Detailed design (from Architect) + code context/patterns (from Code Reader)
- **From:** Architect + Code Reader

### Second invocation (Agent 6 -- fixes)
- **Receives:** Review feedback (from Code Reviewer) + its own previous implementation summary
- **From:** Code Reviewer + Backend Developer (self, previous run)

## Tools
| Tool | Purpose |
|------|---------|
| `write_file` | Write implementation files to disk |

Write-only. The Backend Developer cannot `read_file` or `list_files`. It works entirely from the text context it receives. If the design says "modify `UserService.ts`", the Backend Developer writes the entire file based on the code patterns described in the Code Reader's output -- it cannot check what's currently on disk.

## Output
- **First invocation:** Implementation summary (what files were written, what they contain) -- consumed by Code Reviewer
- **Second invocation:** Fix summary (what was changed based on review) -- consumed by Quality Gate

## GreenTracker Category
`execution` -- classified as **Useful Work**

## Behavior in Standard vs Optimized Approaches

### Standard (Approach 2)
- **Model:** Sonnet
- **Invoked twice:** Once for initial implementation, once for fixes after review
- **System prompt:** "Implement the backend according to the design. Write all necessary files."
- **Max tokens:** 2000
- **Waste patterns:**
  - Called twice (initial + fixes) -- the second pass is a waste pattern
  - Cannot read files, so must trust the Code Reader's summary entirely
  - Separate from Frontend Developer -- could be one agent doing all implementation

### Optimized (Approach 3: FULL-STACK IMPLEMENTER)
- **Model:** Sonnet (appropriate -- this is the real work)
- **Combined with Frontend Developer** into a single Full-Stack Implementer
- **System prompt:** "Implement all changes in one pass. Write all backend and frontend files."
- **Tools:** `write_file` only
- **Invoked once** -- writes all files in a single pass
- **Efficiency:** One agent, one pass, no backend/frontend split overhead

## Data Flow
```
Standard (first invocation):
  Architect ---+
               +--> BACKEND DEV --> implementation summary --> Code Reviewer
  Code Reader -+

Standard (second invocation -- fixes):
  Code Reviewer --+
                  +--> BACKEND DEV (fixes) --> fix summary --> Quality Gate
  Backend Dev ----+
  (prev output)
```

## Why This Agent Matters
The Backend Developer shows two waste patterns:

1. **Write-without-read:** It writes files based on text summaries, not actual file contents. In a real system, this means the implementation might not match the current state of the codebase -- a risk created by the text-handoff architecture.

2. **Double invocation:** Being called twice (implement, then fix) is a pattern that the Optimized approach eliminates. The Full-Stack Implementer writes all files in one pass, and the Reviewer's early-exit condition (`APPROVED` if score >= 8) means the fix step is often skipped entirely.
