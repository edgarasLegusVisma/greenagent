# 🌿 GreenAgent

**Make the invisible cost of multi-agent AI visible.**

A lightweight TypeScript wrapper that X-rays your LLM workflows — tracking tokens, cost, energy, and carbon per step. See exactly where your compute goes: useful work vs coordination overhead vs waste.

Built for the Visma AI Conference 2026 talk:  
*"One Prompt Was Bad Enough: Sustainability in the Age of Multi-Agent AI"*

## Quick Start

```bash
npm install
```

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { GreenTracker, XRay } from './src/index.js';

const client = new Anthropic();
const tracker = new GreenTracker({ budgetLimitUsd: 1.00, maxIterations: 10 });

// Wrap your LLM calls with categories
tracker.startStep('planning', 'claude-3-5-haiku-20241022');
const planResponse = await client.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 500,
  messages: [{ role: 'user', content: 'Plan the structure for a blog post about AI testing' }],
});
tracker.recordStep(planResponse, 'Planning with cheap model');

tracker.startStep('execution', 'claude-sonnet-4-20250514');
const writeResponse = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  messages: [{ role: 'user', content: 'Write a blog post about AI testing...' }],
});
tracker.recordStep(writeResponse, 'Writing with capable model');

// See the X-Ray
XRay.report(tracker);
```

## What It Tracks

For every LLM call in your workflow:

| Metric | How |
|--------|-----|
| **Tokens** (in/out) | From API response `usage` object |
| **Cost** (USD) | Based on model pricing |
| **Energy** (Wh) | Estimated from tokens × energy-per-token |
| **Carbon** (mg CO₂) | Energy × regional grid carbon intensity |
| **Latency** (seconds) | Wall clock time |
| **Classification** | Useful work / Overhead / Potential waste |

## How Is This Different From LangSmith / Langfuse / etc?

There are excellent observability tools out there. They'll tell you how many tokens each step used. But they won't tell you **WHY** those tokens were spent or **WHETHER** they needed to be spent at all.

GreenAgent combines three things nobody else has combined:

1. **Semantic classification** of each step's purpose (useful work vs overhead vs waste)
2. **Sustainability lens** (carbon + energy alongside cost — not just FinOps)
3. **Prescriptive suggestions** ("do THIS instead" with estimated savings)

The difference between a dashboard and a diagnosis.

## Step Categories

Tag each LLM call with what it's doing:

| Category | Classification | Examples |
|----------|---------------|----------|
| `execution` | ✅ Useful Work | Writing, coding, answering |
| `final_output` | ✅ Useful Work | Producing the deliverable |
| `planning` | ⚙️ Overhead | Task decomposition, strategy |
| `routing` | ⚙️ Overhead | Deciding which agent handles what |
| `coordination` | ⚙️ Overhead | Passing context between agents |
| `delegation` | ⚙️ Overhead | Assigning tasks to sub-agents |
| `reflection` | ⚠️ Potential Waste | Self-critique, review loops |
| `retry` | ⚠️ Potential Waste | Retrying failed steps |
| `validation` | ⚠️ Potential Waste | Quality checks |
| `loop` | ⚠️ Potential Waste | Iterative improvement cycles |

## Budget Guardrails

Prevent runaway agent loops:

```typescript
const tracker = new GreenTracker({
  budgetLimitUsd: 0.50,   // Kill if spend exceeds $0.50
  maxIterations: 15,       // Kill after 15 LLM calls
});

try {
  tracker.startStep('loop', 'sonnet');
  const response = await client.messages.create(...);
  tracker.recordStep(response);
} catch (e) {
  if (e instanceof BudgetExceededError) {
    console.log(`Guardrail triggered: ${e.message}`);
  }
}
```

## Comparing Approaches

```typescript
XRay.compare({
  'Single Prompt':     trackerSingle,
  'Multi-Agent':       trackerMulti,
  'Optimized':         trackerOptimized,
});
```

## Carbon Estimation

Based on:
- Google's AI Environmental Report (2025): ~0.3 Wh per typical prompt
- IEA regional carbon intensity data
- Datacenter PUE of ~1.2

Supports regional carbon grids: `eu_avg`, `nordics`, `lithuania`, `us_avg`, `uk`, `france`, `india`, `china`, and more.

```typescript
const tracker = new GreenTracker({ carbonRegion: 'lithuania' });  // 120 gCO₂/kWh
```

## Demo

Run the simulation (no API key needed):
```bash
npx tsx demo/simulate.ts
```

Run the live demo (requires ANTHROPIC_API_KEY):
```bash
npx tsx demo/live.ts
```

Run individual approaches:
```bash
npx tsx demo/live.ts single
npx tsx demo/live.ts naive
npx tsx demo/live.ts optimized
```

## Why This Exists

In 2025, we measured the carbon cost of a single AI prompt.  
In 2026, a single user action can trigger 20-50 LLM calls behind the scenes.

Multi-agent orchestration is powerful — but most teams have **zero visibility** into where their tokens actually go. GreenAgent makes the invisible visible.

**This isn't about using less AI. It's about using AI smarter.**

## License

MIT

## Author

Edgaras Legus — Visma Tech Lithuania
