/**
 * Output directory helpers + shared analyze/save utilities.
 */

import * as fs from 'fs';
import * as path from 'path';
import { RESET, BOLD, DIM, CYAN_FG, GREEN_FG, WHITE_FG } from './colors.js';
import { getOutputDir } from './tools.js';
import { GreenTracker } from './tracker.js';
import { XRay } from './xray.js';
import { generateAISuggestions } from './suggestions.js';

export function cleanOutputDir(subdir: string): void {
  const dir = path.join(getOutputDir(), subdir);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

export function listOutputFiles(subdir: string): string[] {
  const dir = path.join(getOutputDir(), subdir);
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(path.relative(dir, full));
    }
  }
  walk(dir);
  return files;
}

export function printGeneratedFiles(subdir: string): void {
  const files = listOutputFiles(subdir);
  if (files.length === 0) return;
  const dir = path.join(getOutputDir(), subdir);
  console.log();
  console.log(`  ${WHITE_FG}${BOLD}📁 Generated files (${files.length}):${RESET}`);
  for (const f of files) {
    const absPath = path.join(dir, f);
    const lines = fs.readFileSync(absPath, 'utf-8').split('\n').length;
    console.log(`     ${GREEN_FG}→${RESET} ${absPath} ${DIM}(${lines} lines)${RESET}`);
  }
}

export async function analyzeAndReport(
  tracker: GreenTracker,
  title: string,
  subdir: string,
  label: string,
  client: any,
  model: string,
): Promise<void> {
  console.log(`\n  ${CYAN_FG}🔬 Running AI-powered suggestion analysis...${RESET}`);
  const result = await generateAISuggestions(tracker, client, model);
  tracker.setSuggestions(
    result.suggestions,
    { tokens: result.analysisTokens, costUsd: result.analysisCostUsd },
    result.classifications,
  );
  XRay.report(tracker, title);
  saveResults(subdir, label, tracker);
}

export function saveResults(subdir: string, label: string, tracker: GreenTracker): void {
  const dir = path.join(getOutputDir(), subdir);
  fs.mkdirSync(dir, { recursive: true });

  const reportPath = path.join(dir, 'xray-report.md');
  fs.writeFileSync(reportPath, XRay.reportToMarkdown(tracker, label), 'utf-8');

  const dataPath = path.join(dir, 'tracker-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(tracker.toJSON(label), null, 2), 'utf-8');

  console.log(`\n  ${GREEN_FG}📊 X-Ray report saved:${RESET}  ${reportPath}`);
  console.log(`  ${GREEN_FG}💾 Tracker data saved:${RESET}  ${dataPath}`);
}

/**
 * Read all agent md files from a directory.
 */
export function readAgentConfigs(agentDir: string): { filename: string; content: string }[] {
  const files = fs.readdirSync(agentDir)
    .filter(f => f.endsWith('.md') && !fs.statSync(path.join(agentDir, f)).isDirectory());
  return files.map(f => ({
    filename: f,
    content: fs.readFileSync(path.join(agentDir, f), 'utf-8').trim(),
  }));
}

/**
 * Load a prompt file, throw if missing.
 */
export function loadPrompt(promptPath: string): string {
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt not found: ${promptPath}`);
  }
  return fs.readFileSync(promptPath, 'utf-8').trim();
}
