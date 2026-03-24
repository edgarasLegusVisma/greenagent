/**
 * Output directory helpers — clean, list, print generated files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { RESET, BOLD, DIM, GREEN_FG, WHITE_FG } from './colors.js';
import { getOutputDir } from './tools.js';

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
