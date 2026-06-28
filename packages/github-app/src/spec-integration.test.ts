import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRegisteredCommands } from './index.js';
import { registerSpecCommand } from '@issueos/commands-spec';

describe('Spec command integration', () => {
  beforeEach(() => {
    getRegisteredCommands().clear();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should have /spec handler registered after registerSpecCommand', () => {
    registerSpecCommand();

    const specHandler = getRegisteredCommands().get('/spec');
    expect(specHandler).toBeDefined();
    expect(specHandler!.command).toBe('/spec');
  });
});
