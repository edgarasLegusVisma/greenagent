/**
 * Single prompt approach — one LLM call writes all files.
 */

import { GreenTracker } from '../tracker.js';
import { XRay } from '../xray.js';
import { READ_TOOLS, WRITE_TOOLS, setCurrentSubdir, executeTool } from '../tools.js';
import { RESET, GRAY_FG } from '../colors.js';
import { SONNET, DEFAULT_CARBON_REGION, SINGLE_PROMPT_MAX_ROUNDS } from '../config.js';
import { cleanOutputDir, listOutputFiles, printGeneratedFiles } from '../helpers.js';
import type { DemoResult } from '../pipeline.js';

export async function runSinglePrompt(
  task: string,
  isCustomTask: boolean,
  client: any,
): Promise<DemoResult> {
  console.log(`\n  ${'='.repeat(60)}`);
  console.log('  🔵 APPROACH 1: Single Well-Crafted Prompt');
  console.log(`  ${'='.repeat(60)}`);
  console.log();

  setCurrentSubdir('single');
  cleanOutputDir('single');
  const tracker = new GreenTracker({ carbonRegion: DEFAULT_CARBON_REGION });

  const userContent = isCustomTask
    ? `${task}\n\nExplore the codebase to understand existing patterns and architecture, then implement the feature. Use write_file for each new file.`
    : `${task}\n\nContext: IntelliDesk is a customer support platform built with .NET 8 backend (Clean Architecture with API/Application/Domain/Infrastructure layers) and Angular 18 frontend (standalone components). It uses dependency injection, async/await, and has existing AI services like SmartReplyService that use Claude API via a ClaudeApiClient wrapper.\n\nUse write_file for each new file.`;

  const systemPrompt = isCustomTask
    ? 'You are a senior developer. Generate production-quality code following the existing codebase patterns. Use write_file for each file.'
    : 'You are a senior .NET/Angular developer. Generate production-quality code following the existing codebase patterns. Use write_file for each file.';

  const messages: any[] = [{ role: 'user', content: userContent }];

  for (let round = 1; round <= SINGLE_PROMPT_MAX_ROUNDS; round++) {
    const thinkStart = Date.now();
    const timer = setInterval(() => {
      const elapsed = ((Date.now() - thinkStart) / 1000).toFixed(1);
      process.stdout.write(
        `\r  ${GRAY_FG}⏳ Generating code... (${elapsed}s)${RESET}`,
      );
    }, 200);

    tracker.startStep('execution', SONNET);

    const response = await client.messages.create({
      model: SONNET,
      max_tokens: 8192,
      system: systemPrompt,
      messages,
      tools: [...READ_TOOLS, ...WRITE_TOOLS],
    });

    clearInterval(timer);
    const step = tracker.recordStep(
      response,
      round === 1 ? 'Single prompt generation' : 'Single prompt (continuation)',
    );
    process.stdout.write(`\r\x1b[K`);
    XRay.stepLive(step);

    if (response.stop_reason !== 'tool_use') break;

    const toolBlocks = response.content.filter((b: any) => b.type === 'tool_use');
    const toolResults = toolBlocks.map((t: any) => ({
      type: 'tool_result' as const,
      tool_use_id: t.id,
      content: executeTool(t.name, t.input as Record<string, any>),
    }));

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  printGeneratedFiles('single');
  const files = listOutputFiles('single');
  const output = `Files generated (${files.length}):\n${files.map((f) => `  - ${f}`).join('\n')}`;
  return { tracker, output };
}
