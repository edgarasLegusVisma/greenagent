# Quality Gate Agent

## Role
Final checkpoint in the Standard pipeline. Receives the design, the fix summary from the Backend Developer, and the frontend summary, then makes a pass/fail decision. Has NO tools -- it evaluates based on text summaries only.

## Input
- **Receives:** Detailed design (from Architect) + fix summary (from Backend Developer, post-review) + frontend summary (from Frontend Developer)
- **From:** Architect + Backend Developer (Agent 6) + Frontend Developer

The Quality Gate gets three text inputs: what was supposed to be built (design), what the backend looks like after fixes, and what the frontend looks like. It compares these to determine if the task is complete.

## Tools
None. Pure evaluation.

The Quality Gate cannot verify that files actually exist on disk or that they contain what the summaries claim. It's validating text descriptions against text descriptions.

## Output
- **Produces:** Pass/fail assessment with reasoning
- **Consumed by:** Orchestrator (end of pipeline)

## GreenTracker Category
`validation` -- classified as **Potential Waste**

## Behavior in Standard vs Optimized Approaches

### Standard (Approach 2)
- **Model:** Sonnet (overkill for a yes/no check)
- **System prompt:** "Verify that the implementation meets the design requirements. Pass or fail."
- **Max tokens:** 500
- **Input:** Design + fix summary + frontend summary
- **Output:** Pass/fail assessment with reasoning
- **Waste pattern:** After a Code Review that already triggered fixes, a Quality Gate adds minimal value. It's checking text summaries that have already been reviewed. This step exists because someone thought "more checks = more quality" without measuring the marginal value.

### Optimized (Approach 3)
- **Does not exist.** The single Reviewer pass with early-exit (APPROVED if score >= 8) is sufficient.
- **Savings:** One fewer LLM call, ~$0.01 saved
- The Reviewer's structured output (score + issues) provides the same pass/fail signal without a dedicated agent.

## Data Flow
```
Standard:
  Architect ------+
                  |
  Backend Dev ----+--> QUALITY GATE --> pass/fail (end of pipeline)
  (fixes)         |
                  |
  Frontend Dev ---+

Optimized:
  (does not exist -- Reviewer provides pass/fail via APPROVED signal)
```

## Why This Agent Matters
The Quality Gate is redundant after a review-and-fix cycle. It validates text summaries against other text summaries -- the same information the Code Reviewer already evaluated. It's a safety blanket, not a quality improvement.

In the talk, this is the moment to ask: "After a Planner, a Code Reader, an Architect, a Backend Developer, a Code Reviewer, a fix pass, and a Frontend Developer -- does an eighth agent checking text summaries add any value? That's the agent tax: complexity that feels productive but measures as waste."
