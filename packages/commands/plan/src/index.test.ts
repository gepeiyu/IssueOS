import { describe, it, expect, vi } from 'vitest';
import { handlePlanCommand } from './plan-handler.js';
import type { CommandContext } from '@issueos/github-app';

function makeContext(overrides?: Partial<CommandContext>): CommandContext {
  return {
    octokit: {} as any,
    issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/plan' },
    parseIssue: () => ({}) as any,
    repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([]) },
    issueId: 'issue-1',
    projectId: 'proj-1',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  } as any;
}

describe('handlePlanCommand', () => {
  it('should reply with guidance when no Spec exists', async () => {
    const result = await handlePlanCommand(makeContext(), {} as any);
    expect(result.reply).toContain('/spec');
  });

  it('should generate and persist Plan on success', async () => {
    const spec = { id: 'spec-1', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify({ goal: 'x', scope: ['x'], acceptance_criteria: ['x'] }), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const mockLlm = { generate: vi.fn().mockResolvedValue({ tasks: [{ title: 'Task 1', summary: 'Do thing' }, { title: 'Task 2', summary: 'Do other' }, { title: 'Task 3', summary: 'Test' }] }) };
    const ctx = makeContext({ repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([spec]) } });
    const result = await handlePlanCommand(ctx, mockLlm as any);

    expect(result.reply).toContain('✅');
    expect(ctx.repository.put).toHaveBeenCalled();
    const saved = (ctx.repository.put as any).mock.calls[0][0];
    expect(saved.status).toBe('generated');
    expect(saved.provenance.sourceCommand).toBe('/plan');
    expect(saved.specId).toBe('spec-1');
  });

  it('should degrade on LLM failure', async () => {
    const spec = { id: 'spec-1', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify({ goal: 'x', scope: ['x'], acceptance_criteria: ['x'] }), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const mockLlm = { generate: vi.fn().mockRejectedValue(new Error('Timeout')) };
    const ctx = makeContext({ repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([spec]) } });
    const result = await handlePlanCommand(ctx, mockLlm as any);
    expect(result.reply).toContain('⚠️');
    expect(ctx.repository.put).not.toHaveBeenCalled();
  });

  it('should supersede existing Plans on re-generation', async () => {
    const spec = { id: 'spec-1', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify({ goal: 'x', scope: ['x'], acceptance_criteria: ['x'] }), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const oldPlan = { id: 'old-1', projectId: 'proj-1', issueId: 'issue-1', specId: 'spec-1', status: 'generated', content: '[]', provenance: { sourceCommand: '/plan' } };
    const mockLlm = { generate: vi.fn().mockResolvedValue({ tasks: [{ title: 'T1', summary: 'S1' }, { title: 'T2', summary: 'S2' }, { title: 'T3', summary: 'S3' }] }) };
    const putFn = vi.fn();
    const ctx = makeContext({ repository: { get: vi.fn(), put: putFn, query: vi.fn().mockReturnValue([spec, oldPlan]) } });
    const result = await handlePlanCommand(ctx, mockLlm as any);
    expect(putFn).toHaveBeenCalled();
    const superseded = putFn.mock.calls[0][0];
    expect(superseded.status).toBe('superseded');
    const newPlan = putFn.mock.calls[1][0];
    expect(superseded.supersededBy).toBe(newPlan.id);
    expect(result.reply).toContain('✅');
  });
});
