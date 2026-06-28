import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRegisteredCommands } from './index.js';
import { registerPlanCommand } from '@issueos/commands-plan';

describe('Plan command integration', () => {
  beforeEach(() => {
    getRegisteredCommands().clear();
    process.env.ANTHROPIC_API_KEY = 'sk-test';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should have /plan handler registered after registerPlanCommand', () => {
    registerPlanCommand();
    const planHandler = getRegisteredCommands().get('/plan');
    expect(planHandler).toBeDefined();
    expect(planHandler!.command).toBe('/plan');
  });
});
