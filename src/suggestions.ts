/**
 * GreenAgent Suggestion Engine
 *
 * Analyzes tracked workflow data and generates actionable optimization tips.
 */

import type { GreenTracker } from './tracker.js';

export interface Suggestion {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  savingsEstimate: string;
}

export function suggestionIcon(severity: string): string {
  return { high: '🔴', medium: '🟡', low: '🟢' }[severity] ?? '⚪';
}

export function generateSuggestions(tracker: GreenTracker): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const steps = tracker.steps;
  if (steps.length === 0) return suggestions;

  // ------------------------------------------------------------------
  // 1. Expensive model used for simple tasks
  // ------------------------------------------------------------------
  const expensiveModels = ['opus', 'claude-opus'];
  const midModels = ['sonnet', 'claude-sonnet', 'claude-3-5-sonnet'];
  const cheapCategories = new Set(['routing', 'planning', 'validation', 'coordination']);

  for (const s of steps) {
    const modelKey = (s.model || '').toLowerCase();
    const isExpensive = expensiveModels.some(e => modelKey.includes(e)) ||
                        midModels.some(m => modelKey.includes(m));
    if (isExpensive && cheapCategories.has(s.category)) {
      suggestions.push({
        severity: 'high',
        title: `Expensive model on '${s.category}' step (Step ${s.stepNumber})`,
        detail: `Used ${s.model} for ${s.category} (${s.totalTokens.toLocaleString()} tokens, $${s.costUsd.toFixed(4)}). This step likely doesn't need a frontier model.`,
        savingsEstimate: 'Switching to Haiku for this step could save ~80-90% of its cost.',
      });
    }
  }

  // ------------------------------------------------------------------
  // 2. High overhead ratio
  // ------------------------------------------------------------------
  const tokenBreakdown = tracker.tokensByClassification();
  const total = Object.values(tokenBreakdown).reduce((a, b) => a + b, 0);

  if (total > 0) {
    const overhead = tokenBreakdown.overhead || 0;
    const waste = tokenBreakdown.potential_waste || 0;
    const nonUseful = overhead + waste;
    const ratio = nonUseful / total;

    if (ratio > 0.6) {
      suggestions.push({
        severity: 'high',
        title: `Only ${((1 - ratio) * 100).toFixed(0)}% of tokens went to useful work`,
        detail: `${overhead.toLocaleString()} tokens on overhead + ${waste.toLocaleString()} tokens on potential waste vs ${(tokenBreakdown.useful_work || 0).toLocaleString()} on useful work. Most of your compute is coordination, not output.`,
        savingsEstimate: 'Reducing coordination steps or combining agents could cut total tokens by 40-60%.',
      });
    } else if (ratio > 0.4) {
      suggestions.push({
        severity: 'medium',
        title: `${(ratio * 100).toFixed(0)}% of tokens went to non-useful work`,
        detail: `Overhead: ${overhead.toLocaleString()} tokens, potential waste: ${waste.toLocaleString()} tokens. There's room to streamline.`,
        savingsEstimate: 'Could reduce total tokens by 20-30%.',
      });
    }
  }

  // ------------------------------------------------------------------
  // 3. Reflection/retry loops
  // ------------------------------------------------------------------
  const reflectionSteps = steps.filter(s =>
    ['reflection', 'retry', 'loop'].includes(s.category)
  );

  if (reflectionSteps.length >= 3) {
    const totalReflectionTokens = reflectionSteps.reduce((sum, s) => sum + s.totalTokens, 0);
    const totalReflectionCost = reflectionSteps.reduce((sum, s) => sum + s.costUsd, 0);
    const savingsPct = ((reflectionSteps.length - 2) / reflectionSteps.length * 100).toFixed(0);
    suggestions.push({
      severity: 'high',
      title: `${reflectionSteps.length} reflection/retry loops detected`,
      detail: `Spent ${totalReflectionTokens.toLocaleString()} tokens ($${totalReflectionCost.toFixed(4)}) on reflection steps. After 1-2 iterations, improvements typically plateau. Consider an early-exit condition.`,
      savingsEstimate: `Adding an early exit after 2 iterations could save ~${savingsPct}% of reflection cost.`,
    });
  } else if (reflectionSteps.length >= 2) {
    suggestions.push({
      severity: 'low',
      title: `${reflectionSteps.length} reflection loops — monitor for growth`,
      detail: 'Currently manageable, but add exit conditions before scaling.',
      savingsEstimate: 'Preventive — avoids future runaway costs.',
    });
  }

  // ------------------------------------------------------------------
  // 4. Large input token counts (context bloat)
  // ------------------------------------------------------------------
  for (const s of steps) {
    if (s.inputTokens > 4000 && cheapCategories.has(s.category)) {
      suggestions.push({
        severity: 'medium',
        title: `Heavy context in '${s.category}' step (Step ${s.stepNumber})`,
        detail: `${s.inputTokens.toLocaleString()} input tokens for a ${s.category} step. Are you passing full conversation history where a summary would do?`,
        savingsEstimate: 'Summarizing context before passing to coordination steps could reduce input tokens by 50-70%.',
      });
    }
  }

  // ------------------------------------------------------------------
  // 5. Single prompt might have been enough
  // ------------------------------------------------------------------
  if (steps.length >= 4) {
    const usefulSteps = steps.filter(s => s.classification === 'useful_work');
    if (usefulSteps.length <= 1) {
      const savingsPct = ((steps.length - 1) / steps.length * 100).toFixed(0);
      suggestions.push({
        severity: 'medium',
        title: 'Consider: could one well-crafted prompt do this?',
        detail: `Your workflow used ${steps.length} LLM calls but only ${usefulSteps.length} produced the actual output. A single detailed prompt might achieve similar quality.`,
        savingsEstimate: `Collapsing to a single call could save ~${savingsPct}% of total cost.`,
      });
    }
  }

  // ------------------------------------------------------------------
  // 6. No guardrails
  // ------------------------------------------------------------------
  if (tracker.budgetLimitUsd === null && tracker.maxIterations === null) {
    suggestions.push({
      severity: 'low',
      title: 'No budget guardrails set',
      detail: 'Running without spend limits or iteration caps. In production, a runaway agent loop could burn through your budget unchecked.',
      savingsEstimate: 'Set budgetLimitUsd and maxIterations to prevent surprises.',
    });
  }

  return suggestions;
}
