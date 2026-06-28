import { registerCommand } from '@issueos/github-app';
import { createLlmClient } from '@issueos/llm-client';
import { handlePlanCommand } from './plan-handler.js';

export function registerPlanCommand(): void {
  const llmClient = createLlmClient();
  registerCommand({ command: '/plan', async run(ctx) { return handlePlanCommand(ctx, llmClient); } });
}
