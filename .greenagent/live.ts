/**
 * GreenAgent — CLI entry point
 *
 * Usage:
 *   npx tsx .greenagent/live.ts single            — single prompt baseline
 *   npx tsx .greenagent/live.ts standard           — run agent pipeline
 *   npx tsx .greenagent/live.ts apply <report.md>  — AI optimizes + runs pipeline
 *   npx tsx .greenagent/live.ts compare <a> <b>    — side-by-side comparison
 *
 * Flags:
 *   --task "description"    — what to build (required for single/standard)
 *   --codebase ./path       — target codebase (default: auto-detected)
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  XRay, setToolContext,
  RESET, DIM,
  SONNET, HAIKU,
  runSinglePrompt, runStandard, runApply, runCompare,
  analyzeAndReport,
} from './src/index.js';

// ─────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────

const client = new Anthropic();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const PROMPTS_DIR = path.resolve(__dirname, 'prompts');

function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function resolveCodebase(): string {
  const flagPath = getFlag('codebase');
  if (flagPath) return path.resolve(flagPath);
  const intellideskPath = path.resolve(__dirname, '..', 'intellidesk');
  if (fs.existsSync(intellideskPath)) return intellideskPath;
  return path.resolve(__dirname, '..');
}

const CODEBASE_DIR = resolveCodebase();
setToolContext(CODEBASE_DIR, OUTPUT_DIR);

const TASK = getFlag('task') || '';

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

async function main() {
  const positional = process.argv.slice(2).filter(
    (a, i, arr) => !a.startsWith('--') && !(i > 0 && arr[i - 1].startsWith('--'))
  );
  const arg = positional[0];

  if (arg === 'compare') {
    runCompare(positional.slice(1));
    return;
  }

  if (arg === 'apply') {
    const reportPath = positional[1];
    if (!reportPath) {
      console.error('  Usage: npx tsx .greenagent/live.ts apply <path-to-xray-report.md>');
      process.exit(1);
    }
    XRay.header('GreenAgent X-Ray — Apply Fixes');
    await runApply(reportPath, TASK, CODEBASE_DIR, PROMPTS_DIR, HAIKU, SONNET, client);
    return;
  }

  XRay.header('GreenAgent X-Ray — Live Demo');
  console.log(`  Task: "${TASK}"`);
  console.log(`  Codebase: ${CODEBASE_DIR}`);
  console.log();

  if (!TASK && (arg === 'single' || arg === 'standard')) {
    console.error('  --task is required. Example:');
    console.error('  npx tsx .greenagent/live.ts standard --task "Add user authentication"');
    process.exit(1);
  }

  if (arg === 'single') {
    const { tracker } = await runSinglePrompt(TASK, client);
    await analyzeAndReport(tracker, 'Single Prompt', 'single', 'Single Prompt', client, SONNET);
    return;
  }

  if (arg === 'standard') {
    const { tracker } = await runStandard(TASK, CODEBASE_DIR, PROMPTS_DIR, HAIKU, SONNET, client);
    await analyzeAndReport(tracker, 'Standard Multi-Agent', 'standard', 'Standard Multi-Agent', client, SONNET);
    return;
  }

  // Default: show usage
  console.log('  Available commands:');
  console.log(`    npx tsx .greenagent/live.ts single      ${DIM}— single prompt baseline${RESET}`);
  console.log(`    npx tsx .greenagent/live.ts standard    ${DIM}— run agent pipeline from configs${RESET}`);
  console.log(`    npx tsx .greenagent/live.ts apply <report.md>  ${DIM}— AI optimizes + runs pipeline${RESET}`);
  console.log(`    npx tsx .greenagent/live.ts compare <a.json> <b.json>  ${DIM}— side-by-side comparison${RESET}`);
  console.log();
}

main().catch(console.error);
