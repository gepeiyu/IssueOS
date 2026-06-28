import { registerCommand } from '@issueos/github-app';
import { createLlmClient } from '@issueos/llm-client';
import { handleReviewCommand } from './review-handler.js';

export function registerReviewCommand(): void {
  const llmClient = createLlmClient();
  registerCommand({ command: '/review', async run(ctx) { return handleReviewCommand(ctx, llmClient); } });
}
