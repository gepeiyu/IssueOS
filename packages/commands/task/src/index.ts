import { registerCommand } from '@issueos/github-app';
import { createLlmClient } from '@issueos/llm-client';
import { handleTaskCommand } from './task-handler.js';

export function registerTaskCommand(): void {
  const llmClient = createLlmClient();
  registerCommand({ command: '/task', async run(ctx) { return handleTaskCommand(ctx, llmClient); } });
}
