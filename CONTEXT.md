# Conversation Context — GreenAgent Talk Preparation

## Background

Edgaras Legus (Visma Tech Lithuania) is preparing a talk for the **Visma AI Conference 2026** (March 24–26, remote, ~300 attendees). He is the only representative from Lithuania, making this high visibility.

## Previous Talk (2025)

Edgaras gave a successful talk called **"The Carbon Cost of a Click: Powering AI in a Warming World"** at an internal Visma event (Aha Halloween 2025). It covered:

- Google's 2025 AI Environmental Report (0.3 Wh per Gemini prompt, 0.03g CO₂, 0.26 mL water)
- Visma's 9 sustainability guidelines with practical before/after coding examples
- A custom VS Code extension (carbon footprint tracker for GitHub Copilot) as a live demo
- IEA carbon intensity data, EPA emissions factors, academic research on LLM energy consumption

The talk received strong positive feedback and established Edgaras's credibility on AI sustainability within Visma. The methodology and carbon estimation approach from this talk is reused in GreenAgent.

## How We Got to the Current Plan

### Submission Phase
1. Started by exploring which conference track to submit to — initially considered AI-native Products (Product Managers audience)
2. Brainstormed 7 title options combining sustainability + multi-agent orchestration
3. Edgaras chose: **"One Prompt Was Bad Enough: Sustainability in the Age of Multi-Agent AI"**
4. Drafted the submission form. Edgaras wanted the abstract shorter and less committal about specific demo details
5. Final abstract (~140 words) keeps it open-ended about what exactly will be demoed
6. Submitted under **AI-native Products** track, though the talk will be broadly accessible (devs, leads, PMs)

### Final Submission Text
- **Track:** AI-native Products
- **Format:** Live Demo / Hands-on walkthrough
- **Abstract:** Focuses on making invisible costs of multi-agent orchestration visible, without over-promising specific comparisons
- **Previous experience:** Yes, internally within Visma (the Carbon Cost talk)

### Talk Design Phase
1. Initially planned a standard "landscape + demo + tips" structure
2. Pivoted when we realized "multi-agent uses more tokens than single agent" is too obvious for 300 AI enthusiasts
3. Landed on the **"agent tax"** concept — showing WHERE waste happens inside a workflow, not just that it exists
4. Edgaras wanted to give the audience something they can **actually use**, not just watch
5. Explored ideas: sustainability rules files for Claude Code/Cursor, a CLI wrapper, a tracking tool
6. Converged on **GreenAgent** — a custom-built Python wrapper that:
   - X-rays any LLM workflow (tokens, cost, carbon per step)
   - Classifies steps as useful work / overhead / waste
   - Generates optimization suggestions
   - Includes budget guardrails
   - Works as both the demo visualization AND the take-home tool

### Key Design Decisions
- **LLM provider:** Anthropic (Claude) — Edgaras's preference and Visma has a Claude Code agreement
- **Visualizer:** Rich terminal output (hacker vibe, simplest to build, devs love it)
- **Demo approach:** GreenAgent itself IS the demo — the X-Ray is the star, the task is just the vehicle
- **One orchestration demo, not multiple:** Cleaner narrative, more time for depth. GreenAgent is framework-agnostic and that's mentioned verbally
- **Part 2 shortened to 2-3 min:** Audience already knows we're in the agent era, no need to over-explain
- **Extra time goes to Part 3 (demo):** 22-23 min for the live demo, can pause on suggestions, maybe live-tweak and re-run

## Competitive Landscape Research (done March 21, 2026)

### What exists:
- **Token observability tools** (crowded): LangSmith, Langfuse, Arize Phoenix, Portkey, Braintrust, Traceloop, Helicone — track tokens, cost, latency per call, visualize multi-step workflows. Enterprise/production focused.
- **Carbon-per-token estimation**: Antarctica.io's "One-Token Model," CodeCarbon, Google's per-prompt environmental data (2025), academic papers benchmarking 30+ models.
- **Token efficiency in MAS**: "Stop Wasting Your Tokens" paper (Oct 2025) — SupervisorAgent reduces tokens by ~30%. "Codified Prompting" — 72% token reduction via code-style prompts. GreenPT — green routing to cleaner regions.

### GreenAgent's unique position (the gap nobody fills):
Three things combined that nobody else has:
1. **Semantic classification** of each step's purpose (useful work / overhead / waste)
2. **Sustainability lens** (carbon + energy, not just FinOps)
3. **Prescriptive suggestions** ("do THIS instead" with estimated savings)

Existing tools = dashboards for ops teams. GreenAgent = diagnostic tool for developers making architecture decisions.

### Key positioning quote (to use in the talk):
"There are excellent observability tools out there — LangSmith, Langfuse, and others. They'll tell you how many tokens each step used. But they won't tell you WHY those tokens were spent or WHETHER they needed to be spent at all. GreenAgent adds a layer on top: it classifies every call by purpose — was this useful work, coordination overhead, or potential waste? — and then tells you what to do about it. That's the difference between a dashboard and a diagnosis."

### "Burning tokens" quote (for Q&A):
"Yes, I used AI to help build GreenAgent. Yes, that burned tokens. But that's exactly the point — I'd rather burn tokens once building a tool that helps everyone burn fewer tokens from now on. That's sustainable investment, not sustainable abstinence."

## Language Decision: TypeScript (decided March 21, 2026)

**Chose TypeScript over Python because:**
1. Edgaras built his 2025 VS Code extension in TypeScript — continuity
2. Most Visma devs are .NET/TypeScript, not Python data scientists
3. Reinforces message: "this is for everyday developers, not AI researchers"
4. 99% of AI conference demos use Python — TypeScript differentiates
5. Stronger statement: "you don't need a Python ML framework to do this"
6. Anthropic TypeScript SDK (`@anthropic-ai/sdk`) returns same `usage` object

**We are NOT using CrewAI/LangGraph in the demo** — raw API calls only. This makes the demo framework-agnostic and shows exactly what happens. CrewAI/LangGraph are only mentioned verbally.

**Presentation setup:** Windows, VS Code terminal (handles ANSI colors well), ANTHROPIC_API_KEY env var.

## What's Built

All code is in the `greenagent-ts/` project (TypeScript):

- `src/tracker.ts` — Core wrapper with step tracking, budget guardrails, cost calculation
- `src/carbon.ts` — Carbon/energy/water estimation using Google/IEA methodology
- `src/suggestions.ts` — Pattern detection engine (6 types of suggestions)
- `src/xray.ts` — Rich terminal visualizer with colored bars, comparisons, scoring
- `src/index.ts` — Clean exports
- `demo/simulate.ts` — Full simulation of all 3 approaches (no API key needed)
- `demo/live.ts` — **REAL Anthropic API demo** with all 3 approaches + comparison (the actual conference script)
- `README.md` — GitHub-ready documentation with TypeScript examples
- `package.json` — Dependencies: `@anthropic-ai/sdk`, `tsx`, `typescript`

**Run commands:**
- `npx tsx demo/simulate.ts` — test without API key
- `npx tsx demo/live.ts` — full live demo
- `npx tsx demo/live.ts single|naive|optimized` — individual approaches

## What's Still Needed

1. **Test live demo on Windows** — Edgaras needs to run `npx tsx demo/live.ts` with his API key in VS Code terminal
2. **4-5 slides** — title, callback to talk 1, landscape stats, takeaways, QR code
3. **GitHub repo** — publish GreenAgent for the audience
4. **Budget guardrail crash demo** — show a runaway loop getting killed live (could be a separate small script)
5. **Rehearsal** — full dry run end to end
6. **(Optional) Python port** — for people who want to use it with Python AI frameworks

## Edgaras's Preferences and Context

- Mid-level developer — doesn't claim to know everything, honest and relatable
- Comfortable in English with Lithuanian technical vocabulary (mixes both)
- Prefers practical, hands-on content over theoretical slides
- Previous AI HUB presentations (#6-#9) were 25-30 min internal talks
- Active in .NET internship program, Competence Committee, internal AI learning events
- Has experience with Claude API setup, Claude Code CLI, Cursor, GitHub Copilot
- Organized "AI YOLO Jams" internally — progressive learning events for developers
- Visma has enterprise agreements with both Cursor and Claude Code

## Conference Context

- **Theme:** "Zero hype, pure value"
- **Preferred formats:** Live demos, fireside chats, panel debates over slide-heavy presentations
- **Remote only** — terminal output needs to be readable on screen share
- **Sessions are ~50 min including Q&A**
- **All sessions recorded**

## Potential Future Expansion

- CrewAI and LangGraph specific wrapper examples for the repo
- Web UI version of the X-Ray (for non-terminal users)
- Integration as a CI/CD step (carbon budget per pipeline)
- Community contributions after open-sourcing
