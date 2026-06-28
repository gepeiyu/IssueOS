import { describe, it, expect, vi } from 'vitest';
import { handleTaskCommand } from './task-handler.js';
import type { CommandContext } from '@issueos/github-app';

function makeContext(overrides?: Partial<CommandContext>): CommandContext {
  return {
    octokit: {} as any,
    issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/task' },
    parseIssue: () => ({}) as any,
    repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([]) },
    issueId: 'issue-1',
    projectId: 'proj-1',
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  } as any;
}

describe('handleTaskCommand', () => {
  it('should reply with guidance when no Plan exists', async () => {
    const result = await handleTaskCommand(makeContext(), {} as any);
    expect(result.reply).toContain('/plan');
  });

  it('should generate and persist Tasks on success', async () => {
    const plan = { id: 'plan-1', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify([{ title: 'Task 1', summary: 'Do thing' }, { title: 'Task 2', summary: 'Do other' }]), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const mockLlm = { generate: vi.fn().mockResolvedValue({ tasks: [{ title: 'T1', summary: 'First task' }, { title: 'T2', summary: 'Second task', dependsOn: [0] }] }) };
    const ctx = makeContext({ repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([plan]) } });
    const result = await handleTaskCommand(ctx, mockLlm as any);

    expect(result.reply).toContain('✅');
    expect(ctx.repository.put).toHaveBeenCalled();
    const saved = (ctx.repository.put as any).mock.calls.find((c: any) => c[0]?.status === 'generated')?.[0];
    expect(saved).toBeDefined();
    expect(saved.status).toBe('generated');
    expect(saved.provenance.sourceCommand).toBe('/task');
    expect(saved.planId).toBe('plan-1');
  });

  it('should degrade on LLM failure', async () => {
    const plan = { id: 'plan-1', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify([{ title: 'T1', summary: 'S1' }, { title: 'T2', summary: 'S2' }]), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const mockLlm = { generate: vi.fn().mockRejectedValue(new Error('Timeout')) };
    const ctx = makeContext({ repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([plan]) } });
    const result = await handleTaskCommand(ctx, mockLlm as any);
    expect(result.reply).toContain('⚠️');
  });

  it('should degrade when Plan has too few items', async () => {
    const plan = { id: 'plan-1', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify([{ title: 'Only one', summary: 'Single' }]), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const ctx = makeContext({ repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([plan]) } });
    const result = await handleTaskCommand(ctx, {} as any);
    expect(result.reply).toContain('too few');
  });

  it('should supersede existing Tasks on re-generation', async () => {
    const plan = { id: 'plan-1', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify([{ title: 'T1', summary: 'S1' }, { title: 'T2', summary: 'S2' }]), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const oldTask = { id: 'old-1', projectId: 'proj-1', issueId: 'issue-1', planId: 'plan-1', status: 'generated', content: '[]', provenance: { sourceCommand: '/task' } };
    const mockLlm = { generate: vi.fn().mockResolvedValue({ tasks: [{ title: 'T1', summary: 'S1' }, { title: 'T2', summary: 'S2' }] }) };
    const putFn = vi.fn();
    const ctx = makeContext({ repository: { get: vi.fn(), put: putFn, query: vi.fn().mockReturnValue([plan, oldTask]) } });
    const result = await handleTaskCommand(ctx, mockLlm as any);
    expect(result.reply).toContain('✅');
    const superseded = putFn.mock.calls.find((c: any) => c[0]?.status === 'superseded')?.[0];
    expect(superseded).toBeDefined();
    expect(superseded.status).toBe('superseded');
  });

  it('should warn about cycle removal', async () => {
    const plan = { id: 'plan-1', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify([{ title: 'T1', summary: 'S1' }, { title: 'T2', summary: 'S2' }]), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const mockLlm = { generate: vi.fn().mockResolvedValue({ tasks: [{ title: 'T1', summary: 'First', dependsOn: [1] }, { title: 'T2', summary: 'Second', dependsOn: [0] }] }) };
    const ctx = makeContext({ repository: { get: vi.fn(), put: vi.fn(), query: vi.fn().mockReturnValue([plan]) } });
    const result = await handleTaskCommand(ctx, mockLlm as any);
    expect(result.reply).toContain('⚠️');
    expect(result.reply).toContain('circular');
  });

  it('should resolve Plan by explicit ID', async () => {
    const plan = { id: 'plan-xyz', projectId: 'proj-1', issueId: 'issue-1', status: 'generated', content: JSON.stringify([{ title: 'T1', summary: 'S1' }, { title: 'T2', summary: 'S2' }]), createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const mockLlm = { generate: vi.fn().mockResolvedValue({ tasks: [{ title: 'T1', summary: 'First' }] }) };
    const getFn = vi.fn().mockReturnValue(plan);
    const ctx = makeContext({
      issue: { owner: 'o', repo: 'r', issue_number: 1, body: '/task plan-xyz' },
      repository: { get: getFn, put: vi.fn(), query: vi.fn().mockReturnValue([plan]) },
    });
    const result = await handleTaskCommand(ctx, mockLlm as any);
    expect(getFn).toHaveBeenCalledWith('plan-xyz');
    expect(result.reply).toContain('✅');
  });
});
