/**
 * GreenAgent Suggestion Engine — AI-powered workflow analysis
 *
 * Sends step telemetry to Claude Sonnet for specific, actionable
 * optimization suggestions. Works for ANY workflow — no hardcoded
 * agent names or pattern matching.
 */

import type { GreenTracker } from './tracker.js';

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
 * Returns empty suggestions if the API call fails.
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
    console.error(`  ⚠️  AI suggestion analysis failed: ${(err as Error).message}`);
    return {
      suggestions: [],
      analysisTokens: 0,
      analysisCostUsd: 0,
    };
  }
}
