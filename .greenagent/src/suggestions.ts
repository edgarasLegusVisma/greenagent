/**
 * GreenAgent Suggestion Engine — AI-powered workflow analysis
 *
 * Sends step telemetry to Claude Sonnet for specific, actionable
 * optimization suggestions. Works for ANY workflow — no hardcoded
 * agent names or pattern matching.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { GreenTracker, StepClassification } from './tracker.js';
import { ANALYSIS_MAX_TOKENS } from './config.js';

export interface Suggestion {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  savingsEstimate: string;
}

export interface AISuggestionResult {
  suggestions: Suggestion[];
  classifications: Record<number, StepClassification>;
  analysisTokens: number;
  analysisCostUsd: number;
}

export function suggestionIcon(severity: string): string {
  return { high: '🔴', medium: '🟡', low: '🟢' }[severity] ?? '⚪';
}

// ---------------------------------------------------------------------------
// AI-powered suggestion generation
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAnalysisPrompt(): string {
  const promptPath = path.resolve(__dirname, '..', 'prompts', 'analysis.md');
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Analysis prompt not found: ${promptPath}`);
  }
  return fs.readFileSync(promptPath, 'utf-8').trim();
}

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
      max_tokens: ANALYSIS_MAX_TOKENS,
      system: loadAnalysisPrompt(),
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

    // Handle both formats: { classifications, suggestions } or plain array
    const rawSuggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);
    const suggestions: Suggestion[] = rawSuggestions.map((s: any) => ({
      severity: ['high', 'medium', 'low'].includes(s.severity) ? s.severity : 'medium',
      title: String(s.title || ''),
      detail: String(s.detail || ''),
      savingsEstimate: String(s.savingsEstimate || ''),
    }));

    // Parse step classifications from AI
    const validClassifications = new Set(['useful_work', 'overhead', 'potential_waste']);
    const classifications: Record<number, StepClassification> = {};
    if (parsed.classifications && typeof parsed.classifications === 'object') {
      for (const [stepNum, cls] of Object.entries(parsed.classifications)) {
        if (validClassifications.has(cls as string)) {
          classifications[Number(stepNum)] = cls as StepClassification;
        }
      }
    }

    return {
      suggestions,
      classifications,
      analysisTokens: step.totalTokens,
      analysisCostUsd: step.costUsd,
    };
  } catch (err) {
    console.error(`  ⚠️  AI suggestion analysis failed: ${(err as Error).message}`);
    return {
      suggestions: [],
      classifications: {},
      analysisTokens: 0,
      analysisCostUsd: 0,
    };
  }
}
