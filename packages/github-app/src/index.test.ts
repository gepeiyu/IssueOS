import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseCommand,
  isAllowedRepo,
  registerCommand,
  getRegisteredCommands,
  requireEnv,
  loadConfig,
  default as appFactory,
} from './index.js';

// ---- parseCommand ----

describe('parseCommand', () => {
  it('returns /spec for "/spec"', () => {
    expect(parseCommand('/spec')).toBe('/spec');
  });

  it('returns /plan for "/plan"', () => {
    expect(parseCommand('/plan')).toBe('/plan');
  });

  it('returns /task for "/task"', () => {
    expect(parseCommand('/task')).toBe('/task');
  });

  it('returns /review for "/review"', () => {
    expect(parseCommand('/review')).toBe('/review');
  });

  it('returns null for "help"', () => {
    expect(parseCommand('help')).toBeNull();
  });

  it('returns null for "/unknown"', () => {
    expect(parseCommand('/unknown')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCommand('')).toBeNull();
  });

  it('trims leading/trailing whitespace', () => {
    expect(parseCommand('  /spec  ')).toBe('/spec');
  });

  it('takes first word only', () => {
    expect(parseCommand('/spec some extra text')).toBe('/spec');
  });
});

// ---- isAllowedRepo ----

describe('isAllowedRepo', () => {
  beforeEach(() => {
    delete process.env.ALLOW_REPOS;
  });

  it('allows all repos when ALLOW_REPOS is "*"', () => {
    process.env.ALLOW_REPOS = '*';
    expect(isAllowedRepo('anyowner', 'anyrepo')).toBe(true);
  });

  it('allows listed repos only', () => {
    process.env.ALLOW_REPOS = 'owner1/repo1,owner2/repo2';
    expect(isAllowedRepo('owner1', 'repo1')).toBe(true);
    expect(isAllowedRepo('owner2', 'repo2')).toBe(true);
    expect(isAllowedRepo('owner1', 'repo2')).toBe(false);
    expect(isAllowedRepo('unknown', 'repo')).toBe(false);
  });

  it('rejects when ALLOW_REPOS is unset', () => {
    expect(isAllowedRepo('any', 'repo')).toBe(false);
  });

  it('rejects when ALLOW_REPOS is empty string', () => {
    process.env.ALLOW_REPOS = '';
    expect(isAllowedRepo('any', 'repo')).toBe(false);
  });

  it('handles wildcard alongside specific repos', () => {
    process.env.ALLOW_REPOS = 'specific/repo,*';
    expect(isAllowedRepo('specific', 'repo')).toBe(true);
    expect(isAllowedRepo('anything', 'else')).toBe(true);
  });
});

// ---- registerCommand / getRegisteredCommands ----

describe('command registry', () => {
  beforeEach(() => {
    getRegisteredCommands().clear();
  });

  it('registers and retrieves a command handler', () => {
    const handler = {
      command: '/spec' as const,
      async run() {
        return { reply: 'ok' };
      },
    };
    registerCommand(handler);
    expect(getRegisteredCommands().get('/spec')).toBe(handler);
  });

  it('overwrites existing handler for same command', async () => {
    const h1 = {
      command: '/plan' as const,
      async run() {
        return { reply: 'v1' };
      },
    };
    const h2 = {
      command: '/plan' as const,
      async run() {
        return { reply: 'v2' };
      },
    };
    registerCommand(h1);
    registerCommand(h2);
    const result = await getRegisteredCommands().get('/plan')!.run({} as any);
    expect(result.reply).toBe('v2');
  });
});

// ---- requireEnv / loadConfig ----

describe('requireEnv', () => {
  beforeEach(() => {
    delete process.env.APP_ID;
    delete process.env.PRIVATE_KEY;
    delete process.env.WEBHOOK_SECRET;
  });

  it('throws when APP_ID is missing', () => {
    process.env.PRIVATE_KEY = 'key';
    process.env.WEBHOOK_SECRET = 'secret';
    expect(() => requireEnv()).toThrow('APP_ID');
  });

  it('throws when PRIVATE_KEY is missing', () => {
    process.env.APP_ID = '123';
    process.env.WEBHOOK_SECRET = 'secret';
    expect(() => requireEnv()).toThrow('PRIVATE_KEY');
  });

  it('throws when WEBHOOK_SECRET is missing', () => {
    process.env.APP_ID = '123';
    process.env.PRIVATE_KEY = 'key';
    expect(() => requireEnv()).toThrow('WEBHOOK_SECRET');
  });

  it('passes when all required vars are set', () => {
    process.env.APP_ID = '123';
    process.env.PRIVATE_KEY = 'key';
    process.env.WEBHOOK_SECRET = 'secret';
    expect(() => requireEnv()).not.toThrow();
  });

  it('loadConfig returns parsed config', () => {
    process.env.APP_ID = '123';
    process.env.PRIVATE_KEY = 'private-key-content';
    process.env.WEBHOOK_SECRET = 'wh-secret';
    const config = loadConfig();
    expect(config).toEqual({
      appId: '123',
      privateKey: 'private-key-content',
      webhookSecret: 'wh-secret',
    });
  });
});

// ---- Probot integration ----

describe('Probot app factory', () => {
  beforeEach(() => {
    getRegisteredCommands().clear();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('registers placeholder handlers and calls app.on', () => {
    const on = vi.fn();
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const mockProbot = { on, log } as any;

    appFactory(mockProbot);

    expect(on).toHaveBeenCalledWith('issues.opened', expect.any(Function));
    expect(on).toHaveBeenCalledWith('issues.edited', expect.any(Function));
    expect(on).toHaveBeenCalledWith('issue_comment.created', expect.any(Function));

    expect(getRegisteredCommands().has('/spec')).toBe(true);
    expect(getRegisteredCommands().has('/plan')).toBe(true);
    expect(getRegisteredCommands().has('/task')).toBe(true);
    expect(getRegisteredCommands().has('/review')).toBe(true);
  });
});
