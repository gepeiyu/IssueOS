import { describe, it, expect, vi } from 'vitest';
import { handleSpecCommand } from './spec-handler.js';
import type { CommandContext } from '@issueos/github-app';

function makeMockContext(overrides?: Partial<CommandContext>): CommandContext {
  return {
    octokit: { rest: { issues: { createComment: vi.fn() } } },
    issue: { owner: 'test', repo: 'test', issue_number: 1, body: 'Test issue body' },
    parseIssue: (() => ({ ok: true, issue: { goal: '', scope: [], acceptance: [] }, prompts: [] })) as any,
    repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([]) },
    issueId: 'issue-1',
    projectId: 'proj-1',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  } as any;
}

describe('handleSpecCommand', () => {
  it('should generate and persist Spec on success', async () => {
    const mockLlm = {
      generate: vi.fn().mockResolvedValue({
        goal: 'Implement login',
        scope: ['Add auth'],
        acceptance_criteria: ['User can log in'],
      }),
    };
    const ctx = makeMockContext();

    const result = await handleSpecCommand(ctx, mockLlm as any);

    expect(result.reply).toContain('✅');
    expect(result.reply).toContain('Implement login');
    expect(ctx.repository.put).toHaveBeenCalled();
    const saved = (ctx.repository.put as any).mock.calls[0][0];
    expect(saved.status).toBe('generated');
    expect(saved.provenance.sourceCommand).toBe('/spec');
  });

  it('should degrade gracefully on LLM failure', async () => {
    const mockLlm = {
      generate: vi.fn().mockRejectedValue(new Error('Timeout')),
    };
    const ctx = makeMockContext({
      parseIssue: (() => ({ ok: true, issue: { goal: 'partial', scope: [], acceptance: [] }, prompts: [] })) as any,
    });

    const result = await handleSpecCommand(ctx, mockLlm as any);

    expect(result.reply).toContain('⚠️');
    expect(result.reply).toContain('partial');
    expect(ctx.repository.put).not.toHaveBeenCalled();
  });

  it('should supersede existing Specs on re-generation', async () => {
    const existingSpec = {
      id: 'old-1',
      projectId: 'proj-1',
      issueId: 'issue-1',
      status: 'generated',
      provenance: { sourceCommand: '/spec' },
      content: '{}',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const mockLlm = {
      generate: vi.fn().mockResolvedValue({
        goal: 'v2',
        scope: ['v2'],
        acceptance_criteria: ['v2'],
      }),
    };
    const putFn = vi.fn();
    const ctx = makeMockContext({
      repository: {
        get: vi.fn(),
        put: putFn,
        query: vi.fn().mockReturnValue([{ ...existingSpec }]),
      },
    });

    await handleSpecCommand(ctx, mockLlm as any);

    expect(putFn).toHaveBeenCalledTimes(2);
    const superseded = putFn.mock.calls[0][0];
    expect(superseded.status).toBe('superseded');
    expect(superseded.supersededBy).toBeDefined();
  });
});
