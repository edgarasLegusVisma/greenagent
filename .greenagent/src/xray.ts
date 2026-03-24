/**
 * GreenAgent X-Ray — Rich terminal visualization of LLM workflow sustainability.
 * This is what 300 people will see on screen during the talk.
 */

import { makeRelatable } from './carbon.js';
import { suggestionIcon } from './suggestions.js';
import type { GreenTracker, Step, StepClassification } from './tracker.js';

// ANSI color codes
const RESET   = '\x1b[0m';
const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';

const GREEN   = '\x1b[38;5;82m';
const YELLOW  = '\x1b[38;5;220m';
const RED     = '\x1b[38;5;196m';
const CYAN    = '\x1b[38;5;87m';
const WHITE   = '\x1b[38;5;255m';
const GRAY    = '\x1b[38;5;245m';

const BAR_GREEN  = '\x1b[48;5;82m';
const BAR_YELLOW = '\x1b[48;5;220m';
const BAR_RED    = '\x1b[48;5;196m';
const BAR_GRAY   = '\x1b[48;5;240m';

const CLASS_COLORS: Record<StepClassification, string> = {
  useful_work:     GREEN,
  overhead:        YELLOW,
  potential_waste:  RED,
  other:           GRAY,
};

const CLASS_BAR_COLORS: Record<StepClassification, string> = {
  useful_work:     BAR_GREEN,
  overhead:        BAR_YELLOW,
  potential_waste:  BAR_RED,
  other:           BAR_GRAY,
};

const CLASS_LABELS: Record<StepClassification, string> = {
  useful_work:     'Useful Work',
  overhead:        'Overhead',
  potential_waste:  'Potential Waste',
  other:           'Other',
};

const STEP_ICONS: Record<StepClassification, string> = {
  useful_work:    '✅',
  overhead:       '⚙️ ',
  potential_waste: '⚠️ ',
  other:          '◽',
};

function bar(value: number, maxValue: number, width: number = 40, color: string = BAR_GREEN): string {
  if (maxValue === 0) return '';
  const filled = Math.min(Math.round((value / maxValue) * width), width);
  return `${color}${' '.repeat(filled)}${RESET}${BAR_GRAY}${' '.repeat(width - filled)}${RESET}`;
}

function pct(value: number, total: number): string {
  if (total === 0) return '  0%';
  return `${Math.round((value / total) * 100).toString().padStart(3)}%`;
}

const W = 70;
const SEP = `  ${GRAY}${'─'.repeat(W - 4)}${RESET}`;

export class XRay {

  static header(title: string = 'GreenAgent X-Ray'): void {
    console.log();
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);
    console.log(`${CYAN}${BOLD}  🌿 ${title}${RESET}`);
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);
    console.log();
  }

  /**
   * Print a single step as it happens (call after each recordStep).
   */
  static stepLive(step: Step): void {
    const color = CLASS_COLORS[step.classification];
    const icon = STEP_ICONS[step.classification];
    console.log(
      `  ${icon} ${BOLD}Step ${step.stepNumber}${RESET} ` +
      `${DIM}[${step.category}]${RESET}  ` +
      `${color}${step.totalTokens.toLocaleString()} tokens${RESET}  ` +
      `${GRAY}$${step.costUsd.toFixed(4)}${RESET}  ` +
      `${GRAY}${step.latencyS.toFixed(1)}s${RESET}  ` +
      `${DIM}${step.model}${RESET}`
    );
  }

  /**
   * Print the full X-Ray report.
   */
  static report(tracker: GreenTracker, title: string = 'Workflow X-Ray Report'): void {
    const steps = tracker.steps;

    // Header
    console.log();
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);
    console.log(`${CYAN}${BOLD}  🌿 ${title}${RESET}`);
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);

    // Summary
    console.log();
    console.log(`  ${BOLD}📊 Summary${RESET}`);
    console.log(SEP);
    console.log(`  Steps:         ${WHITE}${steps.length}${RESET}`);
    console.log(`  Total tokens:  ${WHITE}${tracker.totalTokens.toLocaleString()}${RESET}  ${DIM}(${tracker.totalInputTokens.toLocaleString()} in / ${tracker.totalOutputTokens.toLocaleString()} out)${RESET}`);
    console.log(`  Total cost:    ${WHITE}$${tracker.totalCostUsd.toFixed(4)}${RESET}`);
    console.log(`  Total energy:  ${WHITE}${tracker.totalEnergyWh.toFixed(4)} Wh${RESET}`);
    console.log(`  Total carbon:  ${WHITE}${tracker.totalCarbonMg.toFixed(2)} mg CO₂${RESET}`);
    console.log(`  Total time:    ${WHITE}${tracker.totalLatencyS.toFixed(1)}s${RESET}`);

    // Relatable comparisons
    const comparisons = makeRelatable(tracker.totalEnergyWh, tracker.totalCarbonMg);
    if (comparisons.length > 0) {
      console.log();
      console.log(`  ${BOLD}🌍 In perspective${RESET}`);
      console.log(SEP);
      for (const c of comparisons) {
        console.log(`  ${DIM}${c}${RESET}`);
      }
    }

    // Token Breakdown by Classification
    console.log();
    console.log(`  ${BOLD}🔬 Token Breakdown${RESET}`);
    console.log(SEP);

    const tokenCls = tracker.tokensByClassification();
    const totalTokens = Object.values(tokenCls).reduce((a, b) => a + b, 0);
    const maxTokens = Math.max(...Object.values(tokenCls)) || 1;

    for (const cls of ['useful_work', 'overhead', 'potential_waste', 'other'] as StepClassification[]) {
      const tokens = tokenCls[cls] || 0;
      if (tokens === 0) continue;
      const color = CLASS_COLORS[cls];
      const barColor = CLASS_BAR_COLORS[cls];
      const label = CLASS_LABELS[cls];
      console.log(
        `  ${color}${label.padEnd(16)}${RESET} ` +
        `${bar(tokens, maxTokens, 30, barColor)} ` +
        `${color}${tokens.toLocaleString().padStart(7)}${RESET} ` +
        `${DIM}${pct(tokens, totalTokens)}${RESET}`
      );
    }

    // Cost Breakdown by Classification
    console.log();
    console.log(`  ${BOLD}💰 Cost Breakdown${RESET}`);
    console.log(SEP);

    const costCls = tracker.costByClassification();
    const totalCost = Object.values(costCls).reduce((a, b) => a + b, 0);
    const maxCost = Math.max(...Object.values(costCls)) || 1;

    for (const cls of ['useful_work', 'overhead', 'potential_waste', 'other'] as StepClassification[]) {
      const cost = costCls[cls] || 0;
      if (cost === 0) continue;
      const color = CLASS_COLORS[cls];
      const barColor = CLASS_BAR_COLORS[cls];
      const label = CLASS_LABELS[cls];
      console.log(
        `  ${color}${label.padEnd(16)}${RESET} ` +
        `${bar(cost, maxCost, 30, barColor)} ` +
        `${color}$${cost.toFixed(4).padStart(7)}${RESET} ` +
        `${DIM}${pct(cost, totalCost)}${RESET}`
      );
    }

    // Step Detail
    console.log();
    console.log(`  ${BOLD}📋 Step Detail${RESET}`);
    console.log(SEP);

    for (const s of steps) {
      const color = CLASS_COLORS[s.classification];
      const icon = STEP_ICONS[s.classification];
      console.log(
        `  ${icon} ${BOLD}Step ${s.stepNumber}${RESET} ` +
        `${color}${s.category.padEnd(14)}${RESET} ` +
        `${WHITE}${s.totalTokens.toLocaleString().padStart(6)} tok${RESET}  ` +
        `$${s.costUsd.toFixed(4)}  ` +
        `${s.latencyS.toFixed(1)}s  ` +
        `${DIM}${s.model}${RESET}`
      );
      if (s.note) {
        console.log(`     ${GRAY}↳ ${s.note}${RESET}`);
      }
    }

    // Suggestions
    const suggestions = tracker.getSuggestions();
    if (suggestions.length > 0) {
      console.log();
      console.log(`  ${BOLD}💡 Optimization Suggestions${RESET}`);
      console.log(SEP);

      for (const sg of suggestions) {
        const sevColor = { high: RED, medium: YELLOW, low: GREEN }[sg.severity] ?? GRAY;
        console.log();
        console.log(`  ${suggestionIcon(sg.severity)} ${sevColor}${BOLD}${sg.title}${RESET}`);
        console.log(`     ${GRAY}${sg.detail}${RESET}`);
        console.log(`     ${GREEN}→ ${sg.savingsEstimate}${RESET}`);
      }

      const meta = tracker.analysisMeta;
      if (meta && meta.tokens > 0) {
        console.log();
        console.log(`  ${DIM}💡 Suggestions generated by AI analysis (${meta.tokens.toLocaleString()} tokens, $${meta.costUsd.toFixed(2)})${RESET}`);
      }
    }

    // Footer — Sustainability Score
    console.log();
    console.log(SEP);

    const usefulRatio = totalTokens > 0 ? (tokenCls.useful_work || 0) / totalTokens : 0;
    const usefulCostRatio = totalCost > 0 ? (costCls.useful_work || 0) / totalCost : 0;
    const highSev = suggestions.filter(s => s.severity === 'high').length;

    let scoreLabel: string;
    if (usefulRatio > 0.7 && highSev === 0) {
      scoreLabel = `${GREEN}${BOLD}🌿 Excellent${RESET}`;
    } else if (usefulRatio > 0.5 && highSev <= 1) {
      scoreLabel = `${YELLOW}${BOLD}🌱 Fair${RESET}`;
    } else {
      scoreLabel = `${RED}${BOLD}🔥 Needs Work${RESET}`;
    }

    console.log(`  Sustainability Score: ${scoreLabel}`);
    console.log(`  ${DIM}Useful work: ${Math.round(usefulRatio * 100)}% by tokens | ${Math.round(usefulCostRatio * 100)}% by cost | High-severity issues: ${highSev}${RESET}`);
    console.log();
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);
    console.log(`  ${DIM}Generated by GreenAgent v0.1.0 — github.com/edgaraslegus/greenagent${RESET}`);
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);
    console.log();
  }

  /**
   * Compare multiple tracker runs side by side.
   */
  static compare(trackers: Record<string, GreenTracker>, title: string = '🔬 Side-by-Side Comparison'): void {
    console.log();
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);
    console.log(`${CYAN}${BOLD}  🌿 ${title}${RESET}`);
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);
    console.log();

    const entries = Object.entries(trackers);
    const maxTokens = Math.max(...entries.map(([, t]) => t.totalTokens)) || 1;
    const maxCost = Math.max(...entries.map(([, t]) => t.totalCostUsd)) || 1;

    // Summary table
    console.log(`  ${BOLD}${'Approach'.padEnd(22)} ${'Tokens'.padStart(10)} ${'Cost'.padStart(10)} ${'Energy'.padStart(10)} ${'CO₂'.padStart(10)} ${'Steps'.padStart(6)} ${'Time'.padStart(7)}${RESET}`);
    console.log(SEP);

    for (const [label, t] of entries) {
      const useful = t.tokensByClassification().useful_work || 0;
      const usefulPct = t.totalTokens > 0 ? (useful / t.totalTokens * 100) : 0;
      const color = usefulPct > 70 ? GREEN : usefulPct > 40 ? YELLOW : RED;

      console.log(
        `  ${color}${label.padEnd(22)}${RESET} ` +
        `${t.totalTokens.toLocaleString().padStart(9)} ` +
        `$${t.totalCostUsd.toFixed(4).padStart(8)} ` +
        `${t.totalEnergyWh.toFixed(4).padStart(8)}Wh ` +
        `${t.totalCarbonMg.toFixed(1).padStart(7)}mg ` +
        `${t.steps.length.toString().padStart(5)} ` +
        `${t.totalLatencyS.toFixed(1).padStart(6)}s`
      );
    }

    // Token bars
    console.log();
    console.log(`  ${BOLD}Token usage:${RESET}`);
    for (const [label, t] of entries) {
      console.log(`  ${label.padEnd(22)} ${bar(t.totalTokens, maxTokens, 40, BAR_GREEN)} ${t.totalTokens.toLocaleString()}`);
    }

    // Cost bars
    console.log();
    console.log(`  ${BOLD}Cost:${RESET}`);
    for (const [label, t] of entries) {
      console.log(`  ${label.padEnd(22)} ${bar(t.totalCostUsd, maxCost, 40, BAR_YELLOW)} $${t.totalCostUsd.toFixed(4)}`);
    }

    // Savings
    if (entries.length >= 2) {
      const values = entries.map(([, t]) => t);
      const labels = entries.map(([l]) => l);
      const worstIdx = values.reduce((mi, t, i) => t.totalCostUsd > values[mi].totalCostUsd ? i : mi, 0);
      const bestIdx = values.reduce((mi, t, i) => t.totalCostUsd < values[mi].totalCostUsd ? i : mi, 0);
      const worst = values[worstIdx];
      const best = values[bestIdx];

      if (worst.totalCostUsd > 0) {
        const savingsPct = ((worst.totalCostUsd - best.totalCostUsd) / worst.totalCostUsd * 100);
        const tokenSavings = worst.totalTokens - best.totalTokens;
        const carbonSavings = worst.totalCarbonMg - best.totalCarbonMg;

        console.log();
        console.log(`  ${BOLD}📉 Savings: ${labels[bestIdx]} vs ${labels[worstIdx]}${RESET}`);
        console.log(SEP);
        console.log(`  ${GREEN}Tokens saved:  ${tokenSavings.toLocaleString().padStart(10)}${RESET}`);
        console.log(`  ${GREEN}Cost saved:    $${(worst.totalCostUsd - best.totalCostUsd).toFixed(4).padStart(9)} (${savingsPct.toFixed(0)}%)${RESET}`);
        console.log(`  ${GREEN}Carbon saved:  ${carbonSavings.toFixed(1).padStart(10)} mg CO₂${RESET}`);
      }
    }

    console.log();
    console.log(`${CYAN}${BOLD}${'═'.repeat(W)}${RESET}`);
    console.log();
  }

  /**
   * Generate a plain-text markdown X-Ray report (no ANSI codes).
   */
  static reportToMarkdown(tracker: GreenTracker, title: string = 'X-Ray Report'): string {
    const steps = tracker.steps;
    const lines: string[] = [];

    lines.push(`# ${title}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Steps | ${steps.length} |`);
    lines.push(`| Total tokens | ${tracker.totalTokens.toLocaleString()} (${tracker.totalInputTokens.toLocaleString()} in / ${tracker.totalOutputTokens.toLocaleString()} out) |`);
    lines.push(`| Total cost | $${tracker.totalCostUsd.toFixed(4)} |`);
    lines.push(`| Total energy | ${tracker.totalEnergyWh.toFixed(4)} Wh |`);
    lines.push(`| Total carbon | ${tracker.totalCarbonMg.toFixed(2)} mg CO₂ |`);
    lines.push(`| Total time | ${tracker.totalLatencyS.toFixed(1)}s |`);
    lines.push('');

    // Token Breakdown
    const tokenCls = tracker.tokensByClassification();
    const totalTokens = Object.values(tokenCls).reduce((a, b) => a + b, 0);

    lines.push('## Token Breakdown');
    lines.push('');
    lines.push(`| Classification | Tokens | % |`);
    lines.push(`|----------------|--------|---|`);
    for (const cls of ['useful_work', 'overhead', 'potential_waste', 'other'] as const) {
      const t = tokenCls[cls] || 0;
      if (t === 0) continue;
      const p = totalTokens > 0 ? Math.round((t / totalTokens) * 100) : 0;
      lines.push(`| ${CLASS_LABELS[cls]} | ${t.toLocaleString()} | ${p}% |`);
    }
    lines.push('');

    // Cost Breakdown
    const costCls = tracker.costByClassification();
    const totalCost = Object.values(costCls).reduce((a, b) => a + b, 0);

    lines.push('## Cost Breakdown');
    lines.push('');
    lines.push(`| Classification | Cost | % |`);
    lines.push(`|----------------|------|---|`);
    for (const cls of ['useful_work', 'overhead', 'potential_waste', 'other'] as const) {
      const c = costCls[cls] || 0;
      if (c === 0) continue;
      const p = totalCost > 0 ? Math.round((c / totalCost) * 100) : 0;
      lines.push(`| ${CLASS_LABELS[cls]} | $${c.toFixed(4)} | ${p}% |`);
    }
    lines.push('');

    // Step Detail
    lines.push('## Step Detail');
    lines.push('');
    lines.push(`| Step | Category | Tokens | Cost | Time | Model | Note |`);
    lines.push(`|------|----------|--------|------|------|-------|------|`);
    for (const s of steps) {
      const icon = { useful_work: '✅', overhead: '⚙️', potential_waste: '⚠️', other: '◽' }[s.classification];
      lines.push(`| ${icon} ${s.stepNumber} | ${s.category} | ${s.totalTokens.toLocaleString()} | $${s.costUsd.toFixed(4)} | ${s.latencyS.toFixed(1)}s | ${s.model} | ${s.note} |`);
    }
    lines.push('');

    // Suggestions
    const suggestions = tracker.getSuggestions();
    if (suggestions.length > 0) {
      lines.push('## Optimization Suggestions');
      lines.push('');
      for (const sg of suggestions) {
        const icon = { high: '🔴', medium: '🟡', low: '🟢' }[sg.severity] ?? '⚪';
        lines.push(`### ${icon} [${sg.severity.toUpperCase()}] ${sg.title}`);
        lines.push('');
        lines.push(sg.detail);
        lines.push('');
        lines.push(`**Savings estimate:** ${sg.savingsEstimate}`);
        lines.push('');
      }

      const meta = tracker.analysisMeta;
      if (meta && meta.tokens > 0) {
        lines.push(`*Suggestions generated by AI analysis (${meta.tokens.toLocaleString()} tokens, $${meta.costUsd.toFixed(2)})*`);
        lines.push('');
      }
    }

    // Sustainability Score
    const usefulRatio = totalTokens > 0 ? (tokenCls.useful_work || 0) / totalTokens : 0;
    const usefulCostRatio = totalCost > 0 ? (costCls.useful_work || 0) / totalCost : 0;
    const highSev = suggestions.filter(s => s.severity === 'high').length;
    let score: string;
    if (usefulRatio > 0.7 && highSev === 0) score = '🌿 Excellent';
    else if (usefulRatio > 0.5 && highSev <= 1) score = '🌱 Fair';
    else score = '🔥 Needs Work';

    lines.push('## Sustainability Score');
    lines.push('');
    lines.push(`**${score}** (Useful work: ${Math.round(usefulRatio * 100)}% by tokens | ${Math.round(usefulCostRatio * 100)}% by cost | High-severity issues: ${highSev})`);
    lines.push('');

    return lines.join('\n');
  }
}
