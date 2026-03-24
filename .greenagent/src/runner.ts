/**
 * Agent runner — the tool_use loop engine that powers all agents.
 */

import type { GreenTracker } from './tracker.js';
import { XRay } from './xray.js';
import { executeTool } from './tools.js';
import { RESET, BOLD, DIM, MAGENTA_FG, GRAY_FG, YELLOW_FG } from './colors.js';
import { MAX_TOOL_ROUNDS } from './config.js';

export interface AgentOptions {
  agentName: string;
  agentIcon: string;
  category: string;
  model: string;
  system: string;
  userMessage: string;
  tools?: any[];
  maxTokens?: number;
  maxToolRounds?: number;
  note: string;
}

export async function runAgent(
  tracker: GreenTracker,
  options: AgentOptions,
  client: any,
): Promise<string> {
  const { agentName, agentIcon, category, model, system, maxTokens = 4096, note } = options;
  const maxRounds = options.maxToolRounds ?? MAX_TOOL_ROUNDS;
  const messages: any[] = [{ role: 'user', content: options.userMessage }];

  // Print agent header
  const modelShort = model.includes('haiku') ? 'Haiku' :
                     model.includes('opus') ? 'Opus' : 'Sonnet';
  console.log();
  console.log(
    `  ${MAGENTA_FG}${BOLD}┌─ ${agentIcon} ${agentName}${RESET} ${DIM}(${modelShort})${RESET}`,
  );
  console.log(`  ${MAGENTA_FG}│${RESET}  ${DIM}${note}${RESET}`);

  let finalText = '';

  for (let round = 1; round <= maxRounds; round++) {
    // Show live timer while waiting for API response
    const thinkLabel =
      round === 1 ? 'Thinking' : 'Processing tool results';
    const thinkStart = Date.now();
    const timer = setInterval(() => {
      const elapsed = ((Date.now() - thinkStart) / 1000).toFixed(1);
      process.stdout.write(
        `\r  ${MAGENTA_FG}│${RESET}  ${GRAY_FG}⏳ ${thinkLabel}... (${elapsed}s)${RESET}`,
      );
    }, 200);

    tracker.startStep(category, model);

    const params: any = {
      model,
      max_tokens: maxTokens,
      system,
      messages,
    };
    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
    }

    const response = await client.messages.create(params);
    clearInterval(timer);
    const step = tracker.recordStep(
      response,
      round === 1 ? note : `${note} (processing tool results)`,
    );

    // Clear timer line, print step result
    process.stdout.write(`\r\x1b[K  ${MAGENTA_FG}│${RESET}  `);
    XRay.stepLive(step);

    const textBlocks = response.content.filter((b: any) => b.type === 'text');
    if (textBlocks.length > 0) {
      finalText = textBlocks.map((b: any) => b.text).join('\n');
    }

    if (response.stop_reason !== 'tool_use') {
      break;
    }

    // Execute tools — activity logged inside executeTool()
    const toolBlocks = response.content.filter(
      (b: any) => b.type === 'tool_use',
    );
    console.log(
      `  ${MAGENTA_FG}│${RESET}  ${YELLOW_FG}🔧 Calling ${toolBlocks.length} tool${toolBlocks.length > 1 ? 's' : ''}...${RESET}`,
    );
    const toolResults = toolBlocks.map((t: any) => ({
      type: 'tool_result' as const,
      tool_use_id: t.id,
      content: executeTool(t.name, t.input as Record<string, any>),
    }));

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  // Print agent footer
  console.log(`  ${MAGENTA_FG}${BOLD}└─ Done${RESET}`);

  return finalText;
}
