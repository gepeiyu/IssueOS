import { describe, it, expect } from 'vitest';
import {
  SPEC_STATUSES,
  PLAN_STATUSES,
  TASK_STATUSES,
  REVIEW_STATUSES,
  SOURCE_COMMANDS,
  REVIEW_TARGET_TYPES,
  makeProvenance,
  newId,
  type Plan,
  type Task,
  type Spec,
  type Review,
} from './index.js';

describe('status enums', () => {
  it('exposes Spec 状态枚举快照', () => {
    expect(SPEC_STATUSES).toEqual(['draft', 'generated', 'reviewed', 'superseded']);
  });

  it('exposes Plan 状态枚举快照', () => {
    expect(PLAN_STATUSES).toEqual(['draft', 'generated', 'reviewed', 'superseded']);
  });

  it('exposes Task 状态枚举快照', () => {
    expect(TASK_STATUSES).toEqual(['draft', 'generated', 'started', 'done', 'superseded', 'failed']);
  });

  it('exposes Review 状态枚举快照', () => {
    expect(REVIEW_STATUSES).toEqual(['draft', 'generated', 'accepted', 'rejected', 'superseded']);
  });

  it('exposes来源命令与评审目标类型枚举', () => {
    expect(SOURCE_COMMANDS).toEqual(['/spec', '/plan', '/task', '/review']);
    expect(REVIEW_TARGET_TYPES).toEqual(['spec', 'plan', 'task', 'issue']);
  });
});

describe('makeProvenance', () => {
  it('只设置 sourceCommand 时不含 upstreamId', () => {
    expect(makeProvenance('/spec')).toEqual({ sourceCommand: '/spec' });
  });

  it('传入 upstreamId 时写入字段', () => {
    expect(makeProvenance('/plan', 'spec-001')).toEqual({
      sourceCommand: '/plan',
      upstreamId: 'spec-001',
    });
  });
});

describe('newId', () => {
  it('返回唯一字符串', () => {
    const a = newId();
    const b = newId();
    expect(typeof a).toBe('string');
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe('对象形状', () => {
  it('构造带 specId 的 Plan 并通过类型校验', () => {
    const spec: Spec = {
      id: 'spec-1',
      projectId: 'proj-1',
      issueId: 'issue-1',
      status: 'reviewed',
      content: 'spec body',
      createdAt: '2026-06-28T00:00:00Z',
      updatedAt: '2026-06-28T00:00:00Z',
      provenance: makeProvenance('/spec', 'issue-1'),
    };

    const plan: Plan = {
      id: 'plan-1',
      projectId: 'proj-1',
      specId: spec.id,
      status: 'generated',
      content: 'plan body',
      createdAt: '2026-06-28T00:00:00Z',
      updatedAt: '2026-06-28T00:00:00Z',
      provenance: makeProvenance('/plan', spec.id),
    };

    expect(plan.specId).toBe('spec-1');
    expect(plan.provenance.sourceCommand).toBe('/plan');
    expect(plan.provenance.upstreamId).toBe('spec-1');
  });

  it('构造带 dependsOn 的 Task 并通过类型校验', () => {
    const taskAlpha: Task = {
      id: 'task-1',
      projectId: 'proj-1',
      planId: 'plan-1',
      status: 'done',
      title: '搭建骨架',
      dependsOn: [],
      createdAt: '2026-06-28T00:00:00Z',
      updatedAt: '2026-06-28T00:00:00Z',
      provenance: makeProvenance('/task', 'plan-1'),
    };

    const taskBeta: Task = {
      id: 'task-2',
      projectId: 'proj-1',
      planId: 'plan-1',
      status: 'started',
      title: '实现对象模型',
      dependsOn: [taskAlpha.id],
      createdAt: '2026-06-28T00:00:00Z',
      updatedAt: '2026-06-28T00:00:00Z',
      provenance: makeProvenance('/task', 'plan-1'),
    };

    expect(taskBeta.dependsOn).toEqual(['task-1']);
  });

  it('构造带 targetType / targetId 的 Review 并通过类型校验', () => {
    const review: Review = {
      id: 'review-1',
      projectId: 'proj-1',
      targetType: 'plan',
      targetId: 'plan-1',
      status: 'accepted',
      verdict: 'approve',
      comments: 'LGTM',
      createdAt: '2026-06-28T00:00:00Z',
      updatedAt: '2026-06-28T00:00:00Z',
      provenance: makeProvenance('/review', 'plan-1'),
    };

    expect(review.targetType).toBe('plan');
    expect(review.targetId).toBe('plan-1');
    expect(review.provenance.upstreamId).toBe('plan-1');
  });
});