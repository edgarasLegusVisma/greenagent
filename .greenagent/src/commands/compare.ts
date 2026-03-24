/**
 * Compare command — loads saved tracker data and renders side-by-side comparison.
 */

import * as fs from 'fs';
import { GreenTracker } from '../tracker.js';
import { XRay } from '../xray.js';
import { RESET, DIM } from '../colors.js';

export function runCompare(paths: string[]): void {
  if (paths.length < 2) {
    console.error('  Usage: npx tsx .greenagent/live.ts compare <path1.json> <path2.json> [path3.json]');
    process.exit(1);
  }

  const trackers: Record<string, GreenTracker> = {};
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.error(`  Error: File not found: ${p}`);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const { tracker, label } = GreenTracker.fromJSON(data);
    trackers[label] = tracker;
    console.log(`  ${DIM}Loaded: ${label} (${tracker.steps.length} steps, $${tracker.totalCostUsd.toFixed(4)})${RESET}`);
  }

  console.log();
  XRay.compare(trackers, '🔬 Side-by-Side Comparison');
}
