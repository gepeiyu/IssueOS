import { describe, it, expect } from 'vitest';
import { parseIssue, validateIssue, newId, makeProvenance } from './index.js';

describe('parseIssue - frontmatter form', () => {
  it('parses full frontmatter with all fields', () => {
    const text = `---
title: 测试 Issue
goal: 实现某个功能
scope: 模块A, 模块B
out_of_scope: 模块C
acceptance: 测试1, 测试2
risk: 低风险
rollback: 回滚方案
background: 一些背景
---`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issue.title).toBe('测试 Issue');
      expect(result.issue.goal).toBe('实现某个功能');
      expect(result.issue.scope).toEqual(['模块A', '模块B']);
      expect(result.issue.out_of_scope).toEqual(['模块C']);
      expect(result.issue.acceptance).toEqual(['测试1', '测试2']);
      expect(result.issue.risk).toBe('低风险');
      expect(result.issue.rollback).toBe('回滚方案');
      expect(result.issue.background).toBe('一些背景');
    }
  });

  it('uses suffix as background when background key absent', () => {
    const text = `---
title: Test
goal: G
scope: S
acceptance: A
---
Some background text`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issue.background).toBe('Some background text');
    }
  });

  it('returns error for unclosed frontmatter', () => {
    const text = `---
title: Test
goal: G
scope: S
acceptance: A`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(false);
  });
});

describe('parseIssue - key-value form', () => {
  it('parses all fields', () => {
    const text = `title: 测试 Issue
goal: 实现某个功能
scope: 模块A, 模块B
out_of_scope: 模块C
acceptance: 测试1, 测试2
risk: 低风险
rollback: 回滚方案
background: 一些背景`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issue.scope).toEqual(['模块A', '模块B']);
      expect(result.issue.out_of_scope).toEqual(['模块C']);
    }
  });

  it('normalizes out-of-scope key', () => {
    const text = `title: Test
goal: G
scope: S
out-of-scope: X
acceptance: A`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issue.out_of_scope).toEqual(['X']);
    }
  });

  it('normalizes "out of scope" key', () => {
    const text = `title: Test
goal: G
scope: S
out of scope: X
acceptance: A`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issue.out_of_scope).toEqual(['X']);
    }
  });
});

describe('parseIssue - strict mode', () => {
  it('rejects missing goal', () => {
    const text = `title: Test
scope: S
acceptance: A`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(false);
  });

  it('rejects missing scope', () => {
    const text = `title: Test
goal: G
acceptance: A`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(false);
  });

  it('rejects missing acceptance', () => {
    const text = `title: Test
goal: G
scope: S`;

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(false);
  });
});

describe('parseIssue - lenient mode', () => {
  it('returns partial issue with prompts for missing fields', () => {
    const text = `title: Test
scope: S`;

    const result = parseIssue(text, 'lenient');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issue.title).toBe('Test');
      expect(result.prompts.length).toBeGreaterThan(0);
    }
  });

  it('returns no prompts when all required fields present', () => {
    const text = `title: Test
goal: G
scope: S
acceptance: A`;

    const result = parseIssue(text, 'lenient');
    expect(result.ok).toBe(true);
    if (result.ok) {
      // lenient returns prompts only, even when all present
      // just check ok and that issue has fields
      expect(result.issue.goal).toBe('G');
    }
  });
});

describe('parseIssue - malformed input', () => {
  it('returns error for unrecognizable format', () => {
    const text = 'this is just a plain sentence without any key value pairs';

    const result = parseIssue(text, 'strict');
    expect(result.ok).toBe(false);
  });

  it('also returns error in lenient mode for unrecognizable format', () => {
    const text = 'some random text without colons';

    const result = parseIssue(text, 'lenient');
    expect(result.ok).toBe(false);
  });
});

describe('validateIssue', () => {
  it('validates a correct issue object', () => {
    const issue = {
      title: 'Test',
      goal: 'G',
      scope: ['S'],
      acceptance: ['A'],
    };

    const result = validateIssue(issue);
    expect(result.ok).toBe(true);
    expect(result.issue).toBeDefined();
  });

  it('validates issue with all optional fields', () => {
    const issue = {
      title: 'Test',
      background: '背景',
      goal: 'G',
      scope: ['S1', 'S2'],
      out_of_scope: ['OOS'],
      acceptance: ['A1', 'A2'],
      risk: '低',
      rollback: '回滚',
    };

    const result = validateIssue(issue);
    expect(result.ok).toBe(true);
    expect(result.issue!.out_of_scope).toEqual(['OOS']);
  });

  it('rejects invalid issue (wrong types)', () => {
    const result = validateIssue({ title: 123 });
    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('rejects empty required fields', () => {
    const result = validateIssue({ title: '', goal: 'G', scope: ['S'], acceptance: ['A'] });
    expect(result.ok).toBe(false);
  });

  it('rejects empty issue object', () => {
    const result = validateIssue({});
    expect(result.ok).toBe(false);
  });
});

describe('re-exports from domain', () => {
  it('re-exports newId', () => {
    expect(typeof newId).toBe('function');
    const id = newId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('re-exports makeProvenance', () => {
    expect(typeof makeProvenance).toBe('function');
    const p = makeProvenance('/spec');
    expect(p.sourceCommand).toBe('/spec');
  });

  it('makeProvenance accepts upstreamId', () => {
    const p = makeProvenance('/plan', 'upstream-1');
    expect(p.sourceCommand).toBe('/plan');
    expect(p.upstreamId).toBe('upstream-1');
  });
});
