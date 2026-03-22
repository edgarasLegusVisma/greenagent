# Code Reviewer Agent

## Role
Reviews the implementation work from the Backend Developer. Evaluates whether the code meets the design specification. Has NO tools -- it reviews based on text summaries only, never sees actual files on disk.

## Input
- **Receives:** Detailed design (from Architect) + implementation summary (from Backend Developer)
- **From:** Architect + Backend Developer

The Reviewer gets the design (what should have been built) and the implementation summary (what was built). It compares these two text descriptions. It never reads the actual written files -- it trusts the Backend Developer's self-reported summary.

## Tools
None. Pure text evaluation.

This is a key limitation: the Reviewer cannot verify that the files on disk match what the Backend Developer claims to have written. It reviews text against text, not code against specification.

## Output
- **Produces:** Review feedback -- issues found, suggestions, approval/rejection
- **Consumed by:** Backend Developer (Agent 6 -- for fixes)

## GreenTracker Category
`reflection` -- classified as **Potential Waste**

## Behavior in Standard vs Optimized Approaches

### Standard (Approach 2)
- **Model:** Sonnet
- **System prompt:** "Review the implementation against the design. Identify issues, missing pieces, and improvements."
- **Max tokens:** 1000
- **Input:** Design + implementation summary
- **Output:** Detailed critique with specific issues
- **Waste pattern:** The review always triggers a fix pass (Agent 6), even if the implementation is good. No early-exit mechanism. And the Reviewer works from text summaries -- it has never seen the actual code.

### Optimized (Approach 3)
- **Model:** Sonnet (appropriate -- reviewing requires judgment)
- **System prompt:** "Rate this implementation 1-10 and list only critical issues. If quality is 8 or higher, say APPROVED."
- **Max tokens:** 300
- **Input:** Implementation output only (trusts the Implementer)
- **Output:** Quick quality score + critical issues, or APPROVED
- **Early exit:** If APPROVED, the Final Fixes agent (Agent 5) is skipped entirely
- **One pass only** -- no second review

## Data Flow
```
Standard:
  Architect ---+
               +--> CODE REVIEWER --> review feedback --> Backend Dev (fixes)
  Backend Dev -+

Optimized:
  Implementer --> REVIEWER --> APPROVED? --> skip Final Fixes
                           --> issues?   --> Final Fixes
```

## Why This Agent Matters
The Code Reviewer is the poster child for reflection loops -- a major source of waste in multi-agent systems. In the Standard approach, the review always triggers a fix pass, adding another LLM call and another write pass.

The deeper issue: the Reviewer works from text summaries, not actual code. It's reviewing a description of what was written, not the code itself. This means it can only catch logical inconsistencies in the description, not actual bugs in the implementation.

In the Optimized approach, the Reviewer has an early-exit condition: if quality is 8+, say APPROVED and skip the fix step. Research shows that after 1-2 review iterations, quality improvements plateau. The early exit captures this insight.
