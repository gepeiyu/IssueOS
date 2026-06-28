import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRegisteredCommands } from './index.js';
import { registerReviewCommand } from '@issueos/commands-review';

describe('Review command integration', () => {
  beforeEach(() => {
    getRegisteredCommands().clear();
    process.env.ANTHROPIC_API_KEY = 'sk-test';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should have /review handler registered after registerReviewCommand', () => {
    registerReviewCommand();
    const handler = getRegisteredCommands().get('/review');
    expect(handler).toBeDefined();
    expect(handler!.command).toBe('/review');
  });
});
