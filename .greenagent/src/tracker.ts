/**
 * GreenAgent Tracker — wraps LLM API calls and tracks tokens, cost, carbon, and latency.
 *
 * Usage:
 *   import { GreenTracker } from './tracker';
 *
 *   const tracker = new GreenTracker({ budgetLimitUsd: 1.00 });
 *
 *   tracker.startStep('planning', 'claude-haiku-4-5-20251001');
 *   const response = await client.messages.create(...);
 *   tracker.recordStep(response, 'Planning with cheap model');
 *
 *   tracker.report();
 */

import { estimateEnergyWh, estimateCarbonMg } from './carbon.js';
import type { Suggestion } from './suggestions.js';

// ---------------------------------------------------------------------------
// Anthropic pricing (USD per 1M tokens) — March 2026
// ---------------------------------------------------------------------------
const PRICING: Record<string, { input: number; output: number }> = {
  // Claude 4.6
  'claude-opus-4-6':              { input: 5.00,  output: 25.00 },
  'claude-sonnet-4-6':            { input: 3.00,  output: 15.00 },
  // Claude 4.5
  'claude-haiku-4-5-20251001':    { input: 1.00,  output: 5.00 },
  // Older models (keep for compatibility)
  'claude-sonnet-4-20250514':     { input: 3.00,  output: 15.00 },
  'claude-opus-4-20250514':       { input: 5.00,  output: 25.00 },
  'claude-3-5-sonnet-20241022':   { input: 3.00,  output: 15.00 },
  'claude-3-5-haiku-20241022':    { input: 1.00,  output: 5.00 },
  // Aliases
  'haiku':  { input: 1.00,  output: 5.00 },
  'sonnet': { input: 3.00,  output: 15.00 },
  'opus':   { input: 5.00,  output: 25.00 },
};

// Step classifications — assigned by AI analysis after the workflow completes.
// Before analysis, steps are 'unclassified'. The AI sees actual behavior
// (token counts, context growth, what each step produced) and classifies
// based on what happened, not what the category label says.

export type StepClassification = 'useful_work' | 'overhead' | 'potential_waste' | 'analysis' | 'unclassified';

export interface Step {
  category: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  energyWh: number;
  carbonMg: number;
  latencyS: number;
  stepNumber: number;
  note: string;
  totalTokens: number;
  classification: StepClassification;
}

export interface TrackerOptions {
  budgetLimitUsd?: number;
  maxIterations?: number;
  carbonRegion?: string;
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export class GreenTracker {
  budgetLimitUsd: number | null;
  maxIterations: number | null;
  carbonRegion: string;
  steps: Step[] = [];

  private _activeCategory = '';
  private _activeModel = '';
  private _activeStart = 0;
  private _stepCounter = 0;
  private _killed = false;
  private _killReason = '';
  private _overrideSuggestions: Suggestion[] | null = null;
  private _analysisMeta: { tokens: number; costUsd: number } | null = null;

  constructor(options: TrackerOptions = {}) {
    this.budgetLimitUsd = options.budgetLimitUsd ?? null;
    this.maxIterations = options.maxIterations ?? null;
    this.carbonRegion = options.carbonRegion ?? 'eu_avg';
  }

  /**
   * Start tracking a step. Call this before your LLM API call.
   */
  startStep(category: string, model: string = 'sonnet'): void {
    if (this._killed) {
      throw new BudgetExceededError(this._killReason);
    }
    this._activeCategory = category;
    this._activeModel = model;
    this._activeStart = performance.now();
    this._stepCounter++;
  }

  /**
   * Record metrics from an Anthropic API response.
   */
  recordStep(response: any, note: string = ''): Step {
    const latency = (performance.now() - this._activeStart) / 1000;
    const usage = response.usage;
    const inputTokens = usage.input_tokens;
    const outputTokens = usage.output_tokens;

    const model = response.model || this._activeModel;
    const costUsd = this._calculateCost(model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;
    const energyWh = estimateEnergyWh(totalTokens);
    const carbonMg = estimateCarbonMg(energyWh, this.carbonRegion);

    const step: Step = {
      category: this._activeCategory,
      model,
      inputTokens,
      outputTokens,
      costUsd,
      energyWh,
      carbonMg,
      latencyS: Math.round(latency * 10) / 10,
      stepNumber: this._stepCounter,
      note,
      totalTokens,
      classification: this._classify(this._activeCategory),
    };

    this.steps.push(step);
    this._checkGuardrails();
    return step;
  }

  /**
   * Record metrics manually (when you can't pass the response object).
   */
  recordManual(inputTokens: number, outputTokens: number, model?: string, note: string = ''): Step {
    const latency = this._activeStart ? (performance.now() - this._activeStart) / 1000 : 0;
    const m = model || this._activeModel;
    const costUsd = this._calculateCost(m, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;
    const energyWh = estimateEnergyWh(totalTokens);
    const carbonMg = estimateCarbonMg(energyWh, this.carbonRegion);

    const step: Step = {
      category: this._activeCategory || 'unknown',
      model: m,
      inputTokens,
      outputTokens,
      costUsd,
      energyWh,
      carbonMg,
      latencyS: Math.round(latency * 10) / 10,
      stepNumber: this._stepCounter,
      note,
      totalTokens,
      classification: this._classify(this._activeCategory),
    };

    this.steps.push(step);
    this._checkGuardrails();
    return step;
  }

  // ------------------------------------------------------------------
  // Aggregation
  // ------------------------------------------------------------------

  get totalTokens(): number {
    return this.steps.reduce((sum, s) => sum + s.totalTokens, 0);
  }

  get totalInputTokens(): number {
    return this.steps.reduce((sum, s) => sum + s.inputTokens, 0);
  }

  get totalOutputTokens(): number {
    return this.steps.reduce((sum, s) => sum + s.outputTokens, 0);
  }

  get totalCostUsd(): number {
    return this.steps.reduce((sum, s) => sum + s.costUsd, 0);
  }

  get totalEnergyWh(): number {
    return this.steps.reduce((sum, s) => sum + s.energyWh, 0);
  }

  get totalCarbonMg(): number {
    return this.steps.reduce((sum, s) => sum + s.carbonMg, 0);
  }

  get totalLatencyS(): number {
    return this.steps.reduce((sum, s) => sum + s.latencyS, 0);
  }

  tokensByClassification(): Record<StepClassification, number> {
    const result: Record<StepClassification, number> = {
      useful_work: 0, overhead: 0, potential_waste: 0, analysis: 0, unclassified: 0,
    };
    for (const s of this.steps) {
      result[s.classification] += s.totalTokens;
    }
    return result;
  }

  costByClassification(): Record<StepClassification, number> {
    const result: Record<StepClassification, number> = {
      useful_work: 0, overhead: 0, potential_waste: 0, analysis: 0, unclassified: 0,
    };
    for (const s of this.steps) {
      result[s.classification] += s.costUsd;
    }
    return result;
  }

  tokensByCategory(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const s of this.steps) {
      result[s.category] = (result[s.category] || 0) + s.totalTokens;
    }
    return result;
  }

  getSuggestions(): Suggestion[] {
    return this._overrideSuggestions ?? [];
  }

  /**
   * Inject AI-generated suggestions and optional step reclassifications.
   */
  setSuggestions(
    suggestions: Suggestion[],
    meta?: { tokens: number; costUsd: number },
    classifications?: Record<number, StepClassification>,
  ): void {
    this._overrideSuggestions = suggestions;
    this._analysisMeta = meta ?? null;

    if (classifications && Object.keys(classifications).length > 0) {
      for (const step of this.steps) {
        const cls = classifications[step.stepNumber];
        if (cls) step.classification = cls;
      }
    } else {
      // Fallback: basic category-based classification when AI didn't provide one.
      // Not as accurate as AI classification, but better than 100% "Unclassified".
      this._applyFallbackClassifications();
    }
  }

  get analysisMeta(): { tokens: number; costUsd: number } | null {
    return this._analysisMeta;
  }

  reset(): void {
    this.steps = [];
    this._stepCounter = 0;
    this._killed = false;
    this._killReason = '';
  }

  toJSON(label: string = 'unknown'): object {
    return {
      label,
      carbonRegion: this.carbonRegion,
      budgetLimitUsd: this.budgetLimitUsd,
      maxIterations: this.maxIterations,
      summary: {
        steps: this.steps.length,
        totalTokens: this.totalTokens,
        totalInputTokens: this.totalInputTokens,
        totalOutputTokens: this.totalOutputTokens,
        totalCostUsd: this.totalCostUsd,
        totalEnergyWh: this.totalEnergyWh,
        totalCarbonMg: this.totalCarbonMg,
        totalLatencyS: this.totalLatencyS,
        tokensByClassification: this.tokensByClassification(),
        costByClassification: this.costByClassification(),
      },
      steps: this.steps,
      suggestions: this.getSuggestions(),
    };
  }

  static fromJSON(data: any): { tracker: GreenTracker; label: string } {
    const tracker = new GreenTracker({
      carbonRegion: data.carbonRegion,
      budgetLimitUsd: data.budgetLimitUsd,
      maxIterations: data.maxIterations,
    });
    tracker.steps = data.steps || [];
    return { tracker, label: data.label || 'unknown' };
  }

  // ------------------------------------------------------------------
  // Internal
  // ------------------------------------------------------------------

  private _classify(category: string): StepClassification {
    // The analysis step is always meta — classified immediately.
    // All other steps start as 'unclassified' until the AI analysis
    // sees actual behavior and reclassifies them.
    if (category === 'analysis') return 'analysis';
    return 'unclassified';
  }

  private _applyFallbackClassifications(): void {
    // Basic heuristic when AI classification is unavailable.
    // Uses the category label as a rough guide — not as accurate as AI
    // but far better than showing 100% "Unclassified" in the report.
    const categoryMap: Record<string, StepClassification> = {
      execution: 'useful_work',
      final_output: 'useful_work',
      planning: 'overhead',
      routing: 'overhead',
      coordination: 'overhead',
      delegation: 'overhead',
      reflection: 'potential_waste',
      retry: 'potential_waste',
      validation: 'potential_waste',
      loop: 'potential_waste',
    };
    for (const step of this.steps) {
      if (step.classification === 'unclassified') {
        step.classification = categoryMap[step.category] ?? 'unclassified';
      }
    }
  }

  private _calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[model] || PRICING['sonnet'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  private _checkGuardrails(): void {
    if (this.budgetLimitUsd !== null && this.totalCostUsd > this.budgetLimitUsd) {
      this._killed = true;
      this._killReason = `Budget exceeded: $${this.totalCostUsd.toFixed(4)} > $${this.budgetLimitUsd.toFixed(4)} limit`;
      throw new BudgetExceededError(this._killReason);
    }

    if (this.maxIterations !== null && this.steps.length >= this.maxIterations) {
      this._killed = true;
      this._killReason = `Max iterations reached: ${this.steps.length} >= ${this.maxIterations} limit`;
      throw new BudgetExceededError(this._killReason);
    }
  }
}
