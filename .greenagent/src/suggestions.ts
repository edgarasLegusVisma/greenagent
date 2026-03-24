/**
 * GreenAgent Suggestion Engine
 *
 * Two modes:
 *   1. AI-powered (default): sends step data to Claude Sonnet for analysis
 *   2. Static fallback: hardcoded pattern matching if API call fails
 *
 * AI suggestions work for ANY workflow — no hardcoded agent names.
 * Static suggestions are tuned for the IntelliDesk demo as a safety net.
 */

import type { GreenTracker, Step } from './tracker.js';

export interface Suggestion {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  savingsEstimate: string;
}

export interface AISuggestionResult {
  suggestions: Suggestion[];
  analysisTokens: number;
  analysisCostUsd: number;
}

export function suggestionIcon(severity: string): string {
  return { high: '🔴', medium: '🟡', low: '🟢' }[severity] ?? '⚪';
}

// ---------------------------------------------------------------------------
// AI-powered suggestion generation
// ---------------------------------------------------------------------------

const ANALYSIS_SYSTEM_PROMPT =
  `You are analyzing a multi-agent AI workflow's X-Ray data — step-by-step telemetry ` +
  `showing how an LLM-powered system spent its tokens, time, and money.\n\n` +
  `Your job: identify specific, actionable optimizations. Be a senior engineer reviewing ` +
  `this workflow — reference actual step numbers, agent names (from the notes), exact ` +
  `token counts and costs. Suggest architectural changes (combine agents, reduce handoffs, ` +
  `add early exits), not just model swaps.\n\n` +
  `Rules:\n` +
  `- Each suggestion must reference specific steps or agent groups by name/number\n` +
  `- Include concrete estimated savings in tokens and dollars\n` +
  `- severity: "high" = saves >20% of total cost, "medium" = structural improvement, "low" = minor\n` +
  `- Limit to 4-8 suggestions, ordered by impact (highest first)\n` +
  `- Do NOT suggest things that are already optimized (e.g. if planning uses Haiku, don't suggest switching)\n\n` +
  `Respond with ONLY a JSON array of suggestion objects. No markdown, no prose, no code fences.\n` +
  `Each object: { "severity": "high"|"medium"|"low", "title": "...", "detail": "...", "savingsEstimate": "..." }`;

function buildAnalysisPayload(tracker: GreenTracker): string {
  const steps = tracker.steps.map(s => ({
    step: s.stepNumber,
    category: s.category,
    classification: s.classification,
    model: s.model,
    inputTokens: s.inputTokens,
    outputTokens: s.outputTokens,
    totalTokens: s.totalTokens,
    costUsd: +s.costUsd.toFixed(4),
    latencyS: s.latencyS,
    note: s.note,
  }));

  const summary = {
    totalSteps: tracker.steps.length,
    totalTokens: tracker.totalTokens,
    totalCostUsd: +tracker.totalCostUsd.toFixed(4),
    totalLatencyS: +tracker.totalLatencyS.toFixed(1),
    tokensByClassification: tracker.tokensByClassification(),
    costByClassification: Object.fromEntries(
      Object.entries(tracker.costByClassification()).map(([k, v]) => [k, +v.toFixed(4)])
    ),
  };

  return JSON.stringify({ summary, steps }, null, 0);
}

/**
 * Generate suggestions by sending step data to Claude for analysis.
 * Falls back to static suggestions if the API call fails.
 *
 * @param tracker  — the tracker with completed step data
 * @param client   — an Anthropic SDK client instance
 * @param model    — model to use for analysis (default: claude-sonnet-4-6)
 */
export async function generateAISuggestions(
  tracker: GreenTracker,
  client: any,
  model: string = 'claude-sonnet-4-6',
): Promise<AISuggestionResult> {
  const payload = buildAnalysisPayload(tracker);

  try {
    // Track the analysis call itself
    tracker.startStep('analysis', model);

    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            `Analyze this multi-agent workflow and suggest optimizations:\n\n${payload}`,
        },
      ],
    });

    const step = tracker.recordStep(response, 'AI-powered suggestion analysis');

    // Parse suggestions from response
    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    const parsed = JSON.parse(cleaned);
    const suggestions: Suggestion[] = (Array.isArray(parsed) ? parsed : []).map((s: any) => ({
      severity: ['high', 'medium', 'low'].includes(s.severity) ? s.severity : 'medium',
      title: String(s.title || ''),
      detail: String(s.detail || ''),
      savingsEstimate: String(s.savingsEstimate || ''),
    }));

    return {
      suggestions,
      analysisTokens: step.totalTokens,
      analysisCostUsd: step.costUsd,
    };
  } catch (err) {
    // Fallback to static suggestions
    console.error(`  ⚠️  AI suggestion analysis failed, using static fallback: ${(err as Error).message}`);
    return {
      suggestions: generateSuggestions(tracker),
      analysisTokens: 0,
      analysisCostUsd: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Agent group inference
//
// Steps sharing the same base note (with "(processing tool results)" stripped)
// belong to one agent run. Each step = one API round-trip.
// ---------------------------------------------------------------------------

interface AgentGroup {
  baseNote: string;
  category: string;
  steps: Step[];
  totalTokens: number;
  totalInputTokens: number;
  totalCost: number;
  toolRounds: number;   // number of API round-trips (= steps.length)
  peakInputTokens: number;
  model: string;
}

function inferAgentGroups(steps: Step[]): AgentGroup[] {
  const map = new Map<string, Step[]>();
  const order: string[] = [];

  for (const s of steps) {
    const base = s.note.replace(/\s*\(processing tool results\)$/, '').trim() || 'unknown';
    const key = `${s.category}::${base}`;
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key)!.push(s);
  }

  return order.map(key => {
    const gs = map.get(key)!;
    return {
      baseNote: gs[0].note.replace(/\s*\(processing tool results\)$/, '').trim(),
      category: gs[0].category,
      steps: gs,
      totalTokens:      gs.reduce((sum, s) => sum + s.totalTokens, 0),
      totalInputTokens: gs.reduce((sum, s) => sum + s.inputTokens, 0),
      totalCost:        gs.reduce((sum, s) => sum + s.costUsd, 0),
      toolRounds:       gs.length,
      peakInputTokens:  Math.max(...gs.map(s => s.inputTokens)),
      model:            gs[0].model,
    };
  });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function generateSuggestions(tracker: GreenTracker): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const steps = tracker.steps;
  if (steps.length === 0) return suggestions;

  const groups = inferAgentGroups(steps);

  // Classify group lists used by multiple detectors
  const planningGroups    = groups.filter(g => g.category === 'planning');
  const executionGroups   = groups.filter(g => g.category === 'execution');
  const reflectionGroups  = groups.filter(g => ['reflection', 'retry'].includes(g.category));
  const validationGroups  = groups.filter(g => g.category === 'validation');
  const coordinationGroups = groups.filter(g => g.category === 'coordination');

  // ------------------------------------------------------------------
  // 1. Planner over-exploration
  //    Signal: planning group used >6 tool rounds (explored far more
  //    than the 5-6 key pattern files needed to understand conventions).
  // ------------------------------------------------------------------
  for (const g of planningGroups) {
    if (g.toolRounds <= 6) continue;
    const excessRounds = g.toolRounds - 5;
    const savedTokens  = Math.round(g.totalTokens * (excessRounds / g.toolRounds));
    const savedCost    = (g.totalCost * (excessRounds / g.toolRounds)).toFixed(2);
    suggestions.push({
      severity: 'high',
      title: `Planner used ${g.toolRounds} tool rounds to explore the codebase (${g.totalTokens.toLocaleString()} tokens) — see intellidesk/agents/planner.md`,
      detail:
        `The planner called tools ${g.toolRounds} times before producing the plan. ` +
        `For a feature addition, reading 5–6 key pattern files is enough to understand ` +
        `conventions (one service, one interface, one controller, one DTO, one frontend component). ` +
        `Add \`maxToolRounds: 5\` to the planner configuration to cap exploration depth.`,
      savingsEstimate:
        `Limit planner to 5 tool rounds. ` +
        `Estimated savings: ~${savedTokens.toLocaleString()} tokens ($${savedCost})`,
    });
  }

  // ------------------------------------------------------------------
  // 2. Code Reader re-exploration after planning
  //    Signal: a large coordination group (>8 rounds) exists AND a
  //    planning group already mapped the codebase. The reader is
  //    re-reading what the planner already summarised (lossy handoff).
  // ------------------------------------------------------------------
  const readerGroups = coordinationGroups.filter(g => g.toolRounds > 8 && planningGroups.length > 0);
  for (const g of readerGroups) {
    suggestions.push({
      severity: 'high',
      title: `Code Reader re-read files the Planner already summarised (${g.totalTokens.toLocaleString()} tokens) — see intellidesk/agents/code-reader.md`,
      detail:
        `The Code Reader ran ${g.toolRounds} tool rounds to read files even though it received ` +
        `the Planner's output. This is a lossy handoff — the Planner's text summary doesn't ` +
        `contain actual file contents, so the Reader re-reads everything independently. ` +
        `Fix: have the Planner output a structured summary with key code excerpts, ` +
        `or combine both roles into one agent.`,
      savingsEstimate:
        `Combine Planner + Code Reader into one agent. ` +
        `Savings: ~${g.totalTokens.toLocaleString()} tokens ($${g.totalCost.toFixed(2)}) from eliminating re-exploration`,
    });
  }

  // ------------------------------------------------------------------
  // 3. Architect as a standalone agent
  //    Signal: a small coordination group (≤3 rounds, no tools) sits
  //    between a reader group and execution — a pure thinking step
  //    whose output could be folded into the implementer's system prompt.
  // ------------------------------------------------------------------
  const architectGroups = coordinationGroups.filter(g =>
    g.toolRounds <= 3 &&
    !readerGroups.includes(g) &&
    executionGroups.length > 0
  );
  for (const g of architectGroups) {
    suggestions.push({
      severity: 'medium',
      title: `Architect agent produced ${g.totalTokens.toLocaleString()} tokens of design that could be part of the implementation prompt — see intellidesk/agents/architect.md`,
      detail:
        `The Architect is a separate thinking step (${g.toolRounds} API round-trip${g.toolRounds > 1 ? 's' : ''}). ` +
        `Its output — class names, method signatures, file paths — is passed to the Backend Developer ` +
        `as input context. This design content could live in the Backend Developer's system prompt ` +
        `instead, eliminating a full agent round-trip and reducing total context passed downstream.`,
      savingsEstimate:
        `Remove Architect agent, add design instructions to the implementer system prompt. ` +
        `Savings: ${g.totalTokens.toLocaleString()} tokens + one API round-trip ($${g.totalCost.toFixed(2)})`,
    });
  }

  // ------------------------------------------------------------------
  // 4. Rewrite pass after code review
  //    Signal: an execution group with "fix" or "rewrite" in its note
  //    appears after a reflection group. Every review triggers a full
  //    rewrite regardless of review quality.
  // ------------------------------------------------------------------
  const firstReflectionIdx = groups.findIndex(g => reflectionGroups.includes(g));
  const rewriteGroups = executionGroups.filter(g => {
    const note = g.baseNote.toLowerCase();
    if (!note.includes('fix') && !note.includes('rewrite')) return false;
    return firstReflectionIdx !== -1 && groups.indexOf(g) > firstReflectionIdx;
  });
  for (const g of rewriteGroups) {
    suggestions.push({
      severity: 'medium',
      title: `Backend Developer (fixes) rewrote files after every review (${g.totalTokens.toLocaleString()} tokens) — see intellidesk/agents/backend-developer.md`,
      detail:
        `A second implementation pass (${g.toolRounds} rounds) runs unconditionally after review. ` +
        `If the first pass scores 7+/10 or the reviewer signals "APPROVED", a full rewrite ` +
        `adds cost without improving quality. Add an early-exit: skip the rewrite pass ` +
        `when the review score is ≥ 8/10.`,
      savingsEstimate:
        `Add early-exit condition on review score ≥ 8/10. ` +
        `Savings: ~${g.totalTokens.toLocaleString()} tokens ($${g.totalCost.toFixed(2)}) when quality is acceptable`,
    });
  }

  // ------------------------------------------------------------------
  // 5. Fragmented implementation (separate backend + frontend agents)
  //    Signal: 2+ distinct execution groups that are not rewrite passes.
  //    Both receive the full design context and write code following
  //    the same patterns — one Full-Stack Implementer could do both.
  // ------------------------------------------------------------------
  const distinctImplGroups = executionGroups.filter(g => !rewriteGroups.includes(g));
  if (distinctImplGroups.length >= 2) {
    const totalTokens = distinctImplGroups.reduce((s, g) => s + g.totalTokens, 0);
    const totalCost   = distinctImplGroups.reduce((s, g) => s + g.totalCost, 0);
    const labels      = distinctImplGroups.map(g => `"${g.baseNote.split(' ').slice(0, 3).join(' ')}..."`).join(' and ');
    suggestions.push({
      severity: 'medium',
      title: `${distinctImplGroups.length} separate implementation agents (${totalTokens.toLocaleString()} tokens combined) — see intellidesk/agents/backend-developer.md`,
      detail:
        `Implementation is split across ${distinctImplGroups.length} agents: ${labels}. ` +
        `Both agents receive the full design context and write code following the same patterns. ` +
        `Running them separately adds an agent handoff and duplicates the design context in ` +
        `each agent's input. A single Full-Stack Implementer can write all files in one pass.`,
      savingsEstimate:
        `Combine into one Full-Stack Implementer. ` +
        `Savings: one agent handoff + ~${Math.round(totalTokens * 0.15).toLocaleString()} tokens of duplicated context ($${(totalCost * 0.15).toFixed(2)})`,
    });
  }

  // ------------------------------------------------------------------
  // 6. Quality Gate redundant after Code Review
  //    Signal: a validation group exists and a reflection group already
  //    validated the implementation. The Quality Gate re-checks
  //    what the reviewer already confirmed.
  // ------------------------------------------------------------------
  for (const g of validationGroups) {
    if (firstReflectionIdx === -1) continue;
    if (groups.indexOf(g) <= firstReflectionIdx) continue;
    suggestions.push({
      severity: 'medium',
      title: `Quality Gate is redundant after Code Review (${g.totalTokens.toLocaleString()} tokens) — see intellidesk/agents/quality-gate.md`,
      detail:
        `The Code Reviewer (step ${reflectionGroups[0].steps[0].stepNumber}) already validated ` +
        `the implementation for correctness and consistency. The Quality Gate adds ` +
        `${g.toolRounds} more API round-trip${g.toolRounds > 1 ? 's' : ''} to confirm the same result. ` +
        `If the reviewer passes, the implementation is done — a second validator adds latency and cost with no new signal.`,
      savingsEstimate:
        `Remove Quality Gate agent. ` +
        `Savings: ${g.totalTokens.toLocaleString()} tokens + ${g.toolRounds} API round-trip${g.toolRounds > 1 ? 's' : ''} ($${g.totalCost.toFixed(2)})`,
    });
  }

  // ------------------------------------------------------------------
  // 7. Expensive model for cheap-category steps (consolidated per category)
  //    Planning, routing, coordination, validation steps don't need
  //    a frontier model — Haiku is 5-8x cheaper and fast enough.
  // ------------------------------------------------------------------
  const expensiveModels = ['opus', 'claude-opus'];
  const midModels       = ['sonnet', 'claude-sonnet', 'claude-3-5-sonnet'];
  const cheapCategories = new Set(['routing', 'planning', 'validation', 'coordination']);

  const expByCategory: Record<string, { count: number; totalCost: number; totalTokens: number; model: string }> = {};
  for (const s of steps) {
    const mk = (s.model || '').toLowerCase();
    const isExp = expensiveModels.some(e => mk.includes(e)) || midModels.some(m => mk.includes(m));
    if (isExp && cheapCategories.has(s.category)) {
      if (!expByCategory[s.category]) expByCategory[s.category] = { count: 0, totalCost: 0, totalTokens: 0, model: s.model };
      expByCategory[s.category].count++;
      expByCategory[s.category].totalCost   += s.costUsd;
      expByCategory[s.category].totalTokens += s.totalTokens;
    }
  }
  for (const [cat, data] of Object.entries(expByCategory)) {
    suggestions.push({
      severity: 'high',
      title: `Expensive model for ${data.count} '${cat}' step${data.count > 1 ? 's' : ''} — switch to Haiku`,
      detail:
        `${data.count} ${cat} step${data.count > 1 ? 's' : ''} used ${data.model} ` +
        `(${data.totalTokens.toLocaleString()} total tokens, $${data.totalCost.toFixed(4)}). ` +
        `These steps don't need a frontier model — they route, explore, or validate, not generate.`,
      savingsEstimate:
        `Switching all ${cat} steps to Haiku saves ~80-90% of their cost ($${(data.totalCost * 0.85).toFixed(2)}).`,
    });
  }

  // ------------------------------------------------------------------
  // 8. No budget guardrails
  // ------------------------------------------------------------------
  if (tracker.budgetLimitUsd === null && tracker.maxIterations === null) {
    suggestions.push({
      severity: 'low',
      title: 'No budget guardrails set',
      detail:
        'Running without a spend limit or iteration cap. ' +
        'A runaway agent loop (e.g. the planner exploring indefinitely) could burn through budget unchecked. ' +
        'In production this is a real risk.',
      savingsEstimate: 'Set budgetLimitUsd and maxIterations on GreenTracker to prevent surprises.',
    });
  }

  return suggestions;
}
