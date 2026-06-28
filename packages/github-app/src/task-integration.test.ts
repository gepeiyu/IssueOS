import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRegisteredCommands } from './index.js';
import { registerTaskCommand } from '@issueos/commands-task';

describe('Task command integration', () => {
  beforeEach(() => {
    getRegisteredCommands().clear();
    process.env.ANTHROPIC_API_KEY = 'sk-test';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should have /task handler registered after registerTaskCommand', () => {
    registerTaskCommand();
    const handler = getRegisteredCommands().get('/task');
    expect(handler).toBeDefined();
    expect(handler!.command).toBe('/task');
  });
});
