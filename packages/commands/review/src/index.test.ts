import { describe, it, expect, vi } from 'vitest';
import { handleReviewCommand } from './review-handler.js';
import type { CommandContext } from '@issueos/github-app';

function makeContext(overrides?: Partial<CommandContext>): CommandContext {
  return {
    octokit: {} as any,
    issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/review' },
    parseIssue: () => ({}) as any,
    repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([]) },
    issueId: 'issue-1',
    projectId: 'proj-1',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  } as any;
}

describe('handleReviewCommand', () => {
  it('should reply with guidance when no target specified', async () => {
    const result = await handleReviewCommand(makeContext(), {} as any);
    expect(result.reply).toContain('/review <pr-number>');
  });

  it('should generate and persist Review on PR success', async () => {
    const mockOctokit = {
      rest: {
        issues: { get: vi.fn().mockRejectedValue(new Error('no issue')) },
        pulls: {
          get: vi.fn().mockResolvedValue({ data: { number: 42, head: { sha: 'abc123' } } }),
          listFiles: vi.fn().mockResolvedValue({ data: [{ filename: 'src/main.ts', status: 'modified', patch: '+console.log("hi")' }] }),
        },
      },
    };
    const mockLlm = {
      generate: vi.fn().mockResolvedValue({
        dimensions: [
          { name: 'tests', score: 80, findings: ['No tests found'] },
          { name: 'code_quality', score: 85 },
          { name: 'security', score: 90 },
          { name: 'performance', score: 95 },
          { name: 'architecture', score: 75, findings: ['Tight coupling'], suggestions: ['Use DI'] },
        ],
      }),
    };
    const ctx = makeContext({
      issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/review 42' },
      octokit: mockOctokit,
    });
    const result = await handleReviewCommand(ctx, mockLlm as any);

    expect(result.reply).toContain('✅');
    expect(result.reply).toContain('Risk Score');
    expect(result.reply).toContain('architecture');
    expect(ctx.repository.put).toHaveBeenCalled();
    const saved = (ctx.repository.put as any).mock.calls.find((c: any) => c[0]?.status === 'generated')?.[0];
    expect(saved).toBeDefined();
    expect(saved.provenance.sourceCommand).toBe('/review');
    expect(saved.targetType).toBe('pr');
    expect(saved.riskScore).toBeDefined();
    expect(saved.riskLabel).toBeDefined();
  });

  it('should review spec/plan/task by ID', async () => {
    const spec = { id: 'spec-abc', projectId: 'proj-1', issueId: 'issue-1', content: JSON.stringify({ goal: 'x' }) };
    const mockLlm = {
      generate: vi.fn().mockResolvedValue({
        dimensions: [
          { name: 'tests', score: 70 },
          { name: 'code_quality', score: 70 },
          { name: 'security', score: 70 },
          { name: 'performance', score: 70 },
          { name: 'architecture', score: 70 },
        ],
      }),
    };
    const ctx = makeContext({
      issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/review spec-abc' },
      repository: { get: vi.fn().mockReturnValue(spec), put: vi.fn(), query: vi.fn().mockReturnValue([]) },
    });
    const result = await handleReviewCommand(ctx, mockLlm as any);
    expect(result.reply).toContain('✅');
    expect(result.reply).toContain('spec');
  });

  it('should degrade on PR fetch failure', async () => {
    const mockOctokit = {
      rest: {
        issues: { get: vi.fn().mockRejectedValue(new Error('no issue')) },
        pulls: {
          get: vi.fn().mockRejectedValue(new Error('PR not found')),
        },
      },
    };
    const ctx = makeContext({
      issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/review 999' },
      octokit: mockOctokit,
    });
    const result = await handleReviewCommand(ctx, {} as any);
    expect(result.reply).toContain('Could not fetch');
  });

  it('should degrade on LLM failure', async () => {
    const mockOctokit = {
      rest: {
        issues: { get: vi.fn().mockRejectedValue(new Error('no issue')) },
        pulls: {
          get: vi.fn().mockResolvedValue({ data: { number: 42, head: { sha: 'abc' } } }),
          listFiles: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
    };
    const mockLlm = { generate: vi.fn().mockRejectedValue(new Error('Timeout')) };
    const ctx = makeContext({
      issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/review 42' },
      octokit: mockOctokit,
    });
    const result = await handleReviewCommand(ctx, mockLlm as any);
    expect(result.reply).toContain('⚠️');
  });

  it('should supersede existing Reviews on re-review', async () => {
    const mockOctokit = {
      rest: {
        issues: { get: vi.fn().mockRejectedValue(new Error('no issue')) },
        pulls: {
          get: vi.fn().mockResolvedValue({ data: { number: 42, head: { sha: 'abc' } } }),
          listFiles: vi.fn().mockResolvedValue({ data: [{ filename: 'x.ts', status: 'modified', patch: '+a' }] }),
        },
      },
    };
    const mockLlm = {
      generate: vi.fn().mockResolvedValue({
        dimensions: [
          { name: 'tests', score: 80 },
          { name: 'code_quality', score: 80 },
          { name: 'security', score: 80 },
          { name: 'performance', score: 80 },
          { name: 'architecture', score: 80 },
        ],
      }),
    };
    const oldReview = { id: 'old-1', projectId: 'proj-1', targetType: 'pr', targetId: '42', status: 'generated' };
    const putFn = vi.fn();
    const ctx = makeContext({
      issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/review 42' },
      octokit: mockOctokit,
      repository: { get: vi.fn(), put: putFn, query: vi.fn().mockReturnValue([oldReview]) },
    });
    const result = await handleReviewCommand(ctx, mockLlm as any);
    expect(result.reply).toContain('✅');
    const superseded = putFn.mock.calls.find((c: any) => c[0]?.status === 'superseded')?.[0];
    expect(superseded).toBeDefined();
    expect(superseded.status).toBe('superseded');
  });
});
