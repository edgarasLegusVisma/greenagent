# One Prompt Was Bad Enough: Sustainability in the Age of Multi-Agent AI

## Talk Details
- **Speaker:** Edgaras Legus (Visma Tech Lithuania)
- **Conference:** Visma AI Conference 2026
- **Dates:** March 24–26, 2026 (Remote Only)
- **Track:** AI-native Products
- **Theme:** "Zero hype, pure value"
- **Duration:** 45 minutes total
- **Audience:** ~300 people, developers, technical leads, product managers, AI enthusiasts across Visma
- **Format:** Live Demo / Hands-on walkthrough (minimal slides, mostly terminal)
- **Note:** Only representative from Lithuania — high visibility

---

## The Core Insight

The **"agent tax"** — the tokens spent not on useful work, but on agents *talking to each other*. Coordination overhead. The system prompts repeated for every agent, the context passed back and forth, the planning steps, the reflection loops. In a typical multi-agent workflow, a significant portion of tokens goes to orchestration, not to solving the actual problem.

This is the "making the invisible visible" angle — not just "more agents = more cost" (obvious), but **showing exactly WHERE the waste happens inside the workflow**. That's something most people have never actually seen broken down.

---

## What Exists vs What We're Doing (as of March 2026)

### What already exists:

**1. Token tracking / observability tools (crowded space):**
- LangSmith, Langfuse, Arize Phoenix, Portkey, Braintrust, Traceloop, Helicone
- These track tokens, cost, latency per LLM call and visualize multi-step agent workflows
- Enterprise-grade, production-focused dashboards

**2. Carbon-per-token estimation:**
- "One-Token Model" by Antarctica.io — maps tokens to energy and CO₂
- CodeCarbon — tracks carbon for local compute
- Google's per-prompt environmental data (2025)
- Multiple academic papers benchmarking energy/carbon across 30+ models

**3. Token efficiency research in multi-agent systems:**
- "Stop Wasting Your Tokens" (October 2025) — "SupervisorAgent" meta-agent that reduces token consumption by ~30% through real-time interventions
- "Codified Prompting" — achieved 72% token reduction using code-style prompts instead of natural language
- GreenPT — green routing framework that shifts workloads to cleaner regions

### What NOBODY is doing (our gap — GreenAgent's unique position):

Existing tools tell you "Step 3 used 4,500 tokens and cost $0.02."
GreenAgent tells you "Step 3 was a reflection loop, that's potential waste, you used Sonnet where Haiku would do, and your output stopped improving after iteration 2 — here's how to fix it."

**GreenAgent combines three things nobody else has combined:**

1. **Semantic classification** of each step's PURPOSE (not just tracing, but categorizing useful work vs overhead vs waste)
2. **Sustainability lens** (carbon + energy alongside cost — not just FinOps)
3. **Prescriptive suggestions** (not just dashboards, but "do THIS instead" with estimated savings)

Existing tools are built for ops teams monitoring production systems. GreenAgent is built for **developers making architecture decisions** — it's a design-time diagnostic tool, not just a monitoring dashboard.

**Key positioning line for the talk:**
> "There are excellent observability tools out there — LangSmith, Langfuse, and others. They'll tell you how many tokens each step used. But they won't tell you WHY those tokens were spent or WHETHER they needed to be spent at all. GreenAgent adds a layer on top: it classifies every call by purpose — was this useful work, coordination overhead, or potential waste? — and then tells you what to do about it. That's the difference between a dashboard and a diagnosis."

---

## Talk Structure

### Part 1: "One prompt was bad enough" (4 min)

**Goal:** Quick callback, establish credibility, set up the sequel.

**Content:**
- "Last year I showed you the carbon cost of a single AI prompt"
- One slide with key numbers from Google's 2025 study: ~0.3 Wh per typical prompt, ~0.03g CO₂
- "That was one prompt. In 2026, a single user action can trigger 20, 30, even 50+ LLM calls behind the scenes"
- "Today I'm going to make that invisible cost visible — again"

**Slides:** 1 slide (title + key number from last year)

---

### Part 2: "We're all building agents — here's what nobody's measuring" (2-3 min)

**Goal:** Brief landscape context, transition to the problem. Keep it short — the audience already knows we're in the agent era.

**Content (brief, not deep):**
- 2026 is the year of multi-agent orchestration — frameworks everywhere (CrewAI, LangGraph, AutoGen, OpenAI Agents SDK, Claude SDK)
- The cautionary data:
  - Deloitte projects autonomous AI agent market at ~$8.5B by 2026
  - Over 40% of agentic AI projects could be cancelled by 2027 due to unanticipated cost, complexity, or unexpected risks
  - Inference now accounts for 60-70% of total AI energy consumption (flipped from training-dominated)
- The fun cautionary tale: agents getting stuck in a compliment loop, burning $500 in API credits over a weekend
- "Most teams have zero visibility into where their tokens actually go"

**Slides:** 1 slide (2-3 key stats)

---

### Part 3: "The Agent X-Ray" — Live Demo (22-23 min)

**Goal:** The centerpiece. Show GreenAgent wrapping a multi-agent workflow and revealing exactly where tokens, cost, and carbon go. The tool that reveals the problem IS the tool the audience takes home.

**Demo task:** "Write a technical summary about sustainable AI practices" (relatable, easy to explain in 30 seconds)

**Demo flow:**

#### 3a. Show the wrapper (2 min)
- Quick look at the code — how simple it is to add GreenAgent
- 3-4 lines wrapping existing LLM calls
- Explain the categories: ✅ useful work, ⚙️ overhead, ⚠️ potential waste

#### 3b. Approach 1: Single well-crafted prompt (3 min)
- Run it live
- X-Ray shows: 1 step, ~2000 tokens, all green (100% useful work)
- Sustainability score: 🌿 Excellent
- "This is our baseline"

#### 3c. Approach 2: Naive multi-agent (8 min)
- Run the same task with a multi-agent setup: planning agent → coordinator → research agent → review agent → writer → review again → final revision → validation
- Watch the terminal light up step by step — live step indicators showing ⚙️ and ⚠️ piling up
- X-Ray report reveals:
  - 8 steps, ~40,000 tokens
  - Only 43% useful work, 10% overhead, 47% potential waste
  - Cost: ~$0.20 (10x the single prompt)
  - Sustainability score: 🔥 Needs Work
- **Pause on the suggestions** — this is where the value is:
  - 🔴 "Used Sonnet for planning — Haiku would save 80%"
  - 🔴 "Used Sonnet for coordination — doesn't need a frontier model"
  - 🟡 "57% of tokens went to non-useful work"
  - 🟡 "Heavy context in validation step — 7800 input tokens for a simple check"
- "This is what most teams are running. And they have no idea."

#### 3d. Approach 3: Optimized multi-agent with GreenAgent (5 min)
- Same task, but applying the suggestions:
  - Planning and routing use Haiku (cheap model for simple tasks)
  - One focused review instead of two
  - No unnecessary validation step
  - Budget guardrails set ($0.10 limit, 10 max iterations)
- X-Ray report:
  - 5 steps, ~11,600 tokens
  - 59% useful work, 14% overhead, 27% waste
  - Cost: ~$0.07
  - Sustainability score: 🌱 Fair
- "Same quality output, fraction of the cost and carbon"

#### 3e. Side-by-side comparison (4 min)
- Run `XRay.compare()` — the three approaches in one table
- Visual bars showing token usage and cost side by side
- Savings: 66% cost reduction from naive to optimized, 71% carbon reduction
- "In perspective" comparisons: naive approach = 104% of a smartphone charge, optimized = 30%
- Let this sink in for the audience

---

### Part 4: "Take this home" (10 min)

**Goal:** Transform from a talk into something actionable. The audience leaves with a tool they can install tonight.

**Content:**

#### 4a. Quick wins — what you can do Monday (4 min)
- **Right-size your architecture** — not everything needs multi-agent. If one good prompt gets you 90% of the result, the extra 10% from multi-agent costs you 5-10x. Ask yourself: is it worth it?
- **Model routing** — use cheap models (Haiku) for routing, planning, classification, validation. Reserve expensive models (Sonnet, Opus) for the steps that need quality
- **Watch for loops** — set max iterations, add early-exit conditions. If the output stops improving after iteration 2, stop
- **Measure before you scale** — add observability from day one. You can't optimize what you can't see
- **Sustainability = unit economics** — every wasted token is both CO₂ and money. Frame it as engineering quality, not activism

#### 4b. GreenAgent — take it home (6 min)
- **Position GreenAgent against existing tools** (important for credibility with 300 AI enthusiasts):
  > "There are excellent observability tools out there — LangSmith, Langfuse, and others. They'll tell you how many tokens each step used. But they won't tell you WHY those tokens were spent or WHETHER they needed to be spent at all. GreenAgent adds a layer on top: it classifies every call by purpose — was this useful work, coordination overhead, or potential waste? — and then tells you what to do about it. That's the difference between a dashboard and a diagnosis."
- Show the GitHub repo
- Demo how easy it is to add to existing code:
  ```typescript
  import { GreenTracker, XRay } from './src/index.js';
  
  const tracker = new GreenTracker({ budgetLimitUsd: 0.50 });
  
  tracker.startStep('execution', 'claude-sonnet-4-20250514');
  const response = await client.messages.create(...);
  tracker.recordStep(response);
  
  XRay.report(tracker);
  ```
- Show the budget guardrail in action — demo a runaway loop getting killed
- "It's framework-agnostic — works with CrewAI, LangGraph, raw API calls, whatever you're using. You just wrap your LLM calls"
- QR code to GitHub repo on screen
- "pip install it tonight, wrap your Monday workflow, see your own X-Ray"

---

### Part 5: Q&A (4 min)

---

## What's in the X-Ray (Full Feature List)

### Per Step (live, as each LLM call happens):
- Category icon: ✅ useful work, ⚙️ overhead, ⚠️ potential waste
- Step number and category label
- Token count (colored by classification)
- Cost in USD
- Latency in seconds
- Model used
- Optional note explaining what the step does

### Full Report (after workflow completes):

**📊 Summary:**
- Total steps, tokens (in/out), cost, energy (Wh), carbon (mg CO₂), time

**🌍 In Perspective (relatable comparisons):**
- "≈ X Google searches"
- "≈ X% of a smartphone charge"
- "≈ driving X meters"
- "≈ X emails worth of CO₂"

**🔬 Token Breakdown (colored bars):**
- Green bar: Useful Work (execution, final_output)
- Yellow bar: Overhead (planning, routing, coordination, delegation)
- Red bar: Potential Waste (reflection, retry, validation, loop)
- Shows absolute token count + percentage

**💰 Cost Breakdown (colored bars):**
- Same classification, showing dollar amounts

**📋 Step Detail (table):**
- Every LLM call listed with icon, category, tokens, cost, latency, model, note

**💡 Optimization Suggestions (severity-ranked):**
- 🔴 High: Expensive model on cheap task, low useful-work ratio, excessive reflection loops
- 🟡 Medium: Context bloat, single prompt might suffice
- 🟢 Low: Missing guardrails, reflection loops to monitor
- Each suggestion includes: what was detected, why it matters, and how to fix it with estimated savings

**Sustainability Score:**
- 🌿 Excellent (>70% useful work, no high-severity issues)
- 🌱 Fair (>50% useful work, ≤1 high-severity issue)
- 🔥 Needs Work (everything else)

### Comparison Mode (side-by-side):
- Table with all approaches: tokens, cost, energy, carbon, steps, time
- Visual bars comparing token usage
- Visual bars comparing cost
- Savings calculation: tokens saved, cost saved (%), carbon saved

---

## What's Built

| Component | File | Status |
|-----------|------|--------|
| Core tracker with budget guardrails | `src/tracker.ts` | ✅ Done |
| Carbon estimation (Google/IEA methodology) | `src/carbon.ts` | ✅ Done |
| Optimization suggestion engine | `src/suggestions.ts` | ✅ Done |
| Rich terminal X-Ray visualizer | `src/xray.ts` | ✅ Done |
| Simulation demo (no API key needed) | `demo/simulate.ts` | ✅ Done |
| **Live demo with real Anthropic API calls** | **`demo/live.ts`** | **✅ Done** |
| README for GitHub | `README.md` | ✅ Done |

**Language:** TypeScript (intentional choice — matches Visma dev audience, differentiates from 99% of AI conference demos that use Python, reinforces "this is for everyday developers not AI researchers" message. Edgaras also built his 2025 VS Code extension in TypeScript.)

**Run commands:**
- Simulation (no API key): `npx tsx demo/simulate.ts`
- Live demo (needs ANTHROPIC_API_KEY): `npx tsx demo/live.ts`
- Individual approaches: `npx tsx demo/live.ts single|naive|optimized`

## What's Still Needed

| Task | Priority | Estimated Time |
|------|----------|----------------|
| ~~Real Anthropic API demo scripts (3 approaches)~~ | ~~High~~ | ✅ Done (`demo/live.ts`) |
| Test live demo with real API key on Windows/VS Code | High | 1 hour |
| 4-5 slides (title, callback, stats, QR code) | Medium | 1 evening |
| GitHub repo setup and publish | Medium | 1 hour |
| Budget guardrail crash demo | Medium | 1 hour |
| Dry run / rehearsal | High | 1 day |
| (Optional) Python port for the repo | Low | After talk |

## Slides Needed (4-5 max)

1. **Title slide** — "One Prompt Was Bad Enough: Sustainability in the Age of Multi-Agent AI" + name + Visma Tech Lithuania
2. **Callback slide** — Key number from last year's talk (~0.3 Wh per prompt) + "That was ONE prompt"
3. **Landscape slide** — 2-3 key stats ($8.5B market, 40% cancellation risk, inference = 60-70% of energy)
4. **Takeaway slide** — The quick wins checklist (right-size, model routing, watch loops, measure first)
5. **QR code slide** — GitHub repo link + "pip install greenagent" + "See your own X-Ray"

Everything else is live terminal. Minimal slides, maximum demo. Zero hype, pure value.

---

## Key Talking Points / Quotes to Remember

- "The agent tax — the tokens spent not on useful work, but on agents talking to each other"
- "I'm not against multi-agent AI. I'm against blind multi-agent AI"
- "You can't optimize what you can't see"
- "Sustainability and unit economics are the same problem — every wasted token is both CO₂ and money"
- "I showed you the problem, and now I'm giving you the tool. Same tool. GreenAgent."
- "pip install it tonight, wrap your Monday workflow, see your own X-Ray"
- "The difference between a dashboard and a diagnosis"
- "There are excellent observability tools out there — LangSmith, Langfuse, and others. They'll tell you how many tokens each step used. But they won't tell you WHY those tokens were spent or WHETHER they needed to be spent at all."

**For Q&A — if someone asks "how did you build GreenAgent?":**
> "Yes, I used AI to help build GreenAgent. Yes, that burned tokens. But that's exactly the point — I'd rather burn tokens once building a tool that helps everyone burn fewer tokens from now on. That's sustainable investment, not sustainable abstinence."
