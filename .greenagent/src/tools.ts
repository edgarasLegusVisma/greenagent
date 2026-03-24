/**
 * Tool definitions and execution for GreenAgent agents.
 */

import * as fs from 'fs';
import * as path from 'path';
import { RESET, DIM, CYAN_FG, GREEN_FG } from './colors.js';

// ── Tool schemas ──────────────────────────────────────────────────

export const READ_TOOLS = [
  {
    name: 'list_files',
    description:
      'List files and subdirectories in a directory. Returns entries ' +
      'prefixed with [DIR] or [FILE].',
    input_schema: {
      type: 'object' as const,
      properties: {
        directory: {
          type: 'string',
          description:
            'Directory path relative to project root (e.g. "backend/IntelliDesk.API/Controllers"). Use "." for root.',
        },
      },
    },
  },
  {
    name: 'read_file',
    description: 'Read the full contents of a source file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'File path relative to project root (e.g. "backend/IntelliDesk.API/Program.cs")',
        },
      },
      required: ['path'],
    },
  },
];

export const WRITE_TOOLS = [
  {
    name: 'write_file',
    description:
      'Write a new file to the project. Creates directories if needed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description:
            'File path relative to project root (e.g. "backend/IntelliDesk.Application/Services/KnowledgeBaseService.cs")',
        },
        content: {
          type: 'string',
          description: 'The full file content to write.',
        },
      },
      required: ['path', 'content'],
    },
  },
];

export const READ_FILE_ONLY = [READ_TOOLS[1]]; // read_file only (no directory listing)
export const ALL_TOOLS = [...READ_TOOLS, ...WRITE_TOOLS];

// ── Tool context ──────────────────────────────────────────────────

let _codebaseDir = '';
let _outputDir = '';
let _currentSubdir = '';

export function setToolContext(codebaseDir: string, outputDir: string): void {
  _codebaseDir = codebaseDir;
  _outputDir = outputDir;
}

export function setCurrentSubdir(subdir: string): void {
  _currentSubdir = subdir;
}

export function getOutputDir(): string {
  return _outputDir;
}

// ── Tool execution ────────────────────────────────────────────────

export function executeTool(name: string, input: Record<string, any>): string {
  if (name === 'list_files') {
    const relDir = input.directory || '.';
    console.log(`     ${DIM}📂 list_files → ${relDir}/${RESET}`);
    const dir = path.join(_codebaseDir, relDir);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory()).length;
      const files = entries.filter((e) => !e.isDirectory()).length;
      console.log(`        ${DIM}${dirs} dirs, ${files} files${RESET}`);
      return entries
        .map((e) =>
          e.isDirectory() ? `[DIR]  ${e.name}/` : `[FILE] ${e.name}`,
        )
        .join('\n');
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  if (name === 'read_file') {
    const filePath = path.join(_codebaseDir, input.path);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      console.log(
        `     ${CYAN_FG}📖 read_file → ${input.path}${RESET} ${DIM}(${lines} lines)${RESET}`,
      );
      return content;
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  if (name === 'write_file') {
    const filePath = path.join(_outputDir, _currentSubdir, input.path);
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, input.content, 'utf-8');
      const lines = input.content.split('\n').length;
      console.log(
        `     ${GREEN_FG}✏️  write_file → ${input.path}${RESET} ${DIM}(${lines} lines)${RESET}`,
      );
      return `File written successfully: ${input.path}`;
    } catch (e: any) {
      return `Error writing file: ${e.message}`;
    }
  }

  return `Unknown tool: ${name}`;
}
