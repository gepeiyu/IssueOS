import { registerCommand } from '@issueos/github-app';
import { createLlmClient } from '@issueos/llm-client';
import { handleSpecCommand } from './spec-handler.js';

export function registerSpecCommand(): void {
  const llmClient = createLlmClient();

  registerCommand({
    command: '/spec',
    async run(ctx) {
      return handleSpecCommand(ctx, llmClient);
    },
  });
}
