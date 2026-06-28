# Plan Command — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement `/plan` command: Spec → structured Plan with ordered task list, persisted to Repository.

**Architecture:** New `@issueos/commands-plan` package following same pattern as `@issueos/commands-spec`. Reuses existing `@issueos/llm-client` (LlmClient interface, Anthropic implementation). No new LLM package.

**Tech Stack:** Node 22 ESM, TypeScript 5.7, `@anthropic-ai/sdk`, Vitest, `@issueos/domain` (Spec, Plan types), `@issueos/storage` (Repository), `@issueos/github-app` (CommandHandler interface), `@issueos/llm-client` (LlmClient, createLlmClient).

## Global Constraints

- TypeScript 5.7, Node `>=22`, ESM (`"type": "module"`), no `require()`
- npm workspaces via `packages/*`
- Package naming: `@issueos/commands-plan`
- Reuse `@issueos/llm-client` (no new LLM abstraction)
- Tests must never hit real LLM API — mock Anthropic SDK
- PlanItem interface: `{ title: string; summary: string; dependsOn?: number[] }`
- PlanSchema (LLM tool use): `{ tasks: PlanItem[] }` with minItems:3, maxItems:8
- Commit after every task with conventional commit format

---

### Task 1: Scaffold + handler

**Files:**
- Create: `packages/commands/plan/package.json`
- Create: `packages/commands/plan/tsconfig.json`
- Create: `packages/commands/plan/src/index.ts`
- Create: `packages/commands/plan/src/plan-handler.ts`
- Create: `packages/commands/plan/src/prompts/build-plan-prompt.ts`
- Create: `packages/commands/plan/src/format/format-plan-reply.ts`
- Create: `packages/commands/plan/src/index.test.ts`

**Interfaces:**
- Consumes: `@issueos/domain` (Spec, Plan types: `{ id, projectId, issueId, specId, status, content, provenance, supersededBy?, createdAt, updatedAt }`, `newId`, `makeProvenance`, `SourceCommand`), `@issueos/storage` (Repository `{ get, put, query }`), `@issueos/github-app` (CommandContext, HandlerResult, registerCommand), `@issueos/llm-client` (LlmClient, createLlmClient, LlmMessage)
- Produces: `registerPlanCommand()` function

- [ ] **Create packages/commands/plan/package.json**

```json
{
  "name": "@issueos/commands-plan",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": { "build": "tsc -p tsconfig.json", "typecheck": "tsc -p tsconfig.json --noEmit" },
  "dependencies": {
    "@issueos/domain": "*",
    "@issueos/llm-client": "*",
    "@issueos/storage": "*",
    "@issueos/github-app": "*"
  },
  "devDependencies": { "@types/node": "^22.10.0", "typescript": "^5.7.3" }
}
```

- [ ] **Create packages/commands/plan/tsconfig.json**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "./dist", "rootDir": "./src" }, "include": ["src"] }
```

- [ ] **Create packages/commands/plan/src/prompts/build-plan-prompt.ts**

```ts
import type { LlmMessage } from '@issueos/llm-client';

export function buildPlanPrompt(specBody: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a technical planner. Given a Spec, generate an ordered implementation plan.',
        '',
        'Output using the `generate_output` tool with this JSON schema:',
        '- `tasks`: array of task objects',
        '  - `title`: task title (verb-noun, e.g. "Design database schema")',
        '  - `summary`: 1-2 sentence description of what to do and why',
        '  - `dependsOn`: array of task indices this task depends on (0-indexed, optional)',
        '',
        'Rules:',
        '- Generate 3-8 tasks total',
        '- Order tasks logically (foundation first, then features)',
        '- Each task must be actionable by a single developer',
        '- Only use dependsOn for hard prerequisites',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Generate an implementation plan from this Spec:\n\n${specBody}`,
    },
  ];
}
```

- [ ] **Create packages/commands/plan/src/format/format-plan-reply.ts**

```ts
export interface PlanReplyTask {
  title: string;
  summary: string;
  dependsOn?: number[];
}

export interface FormatPlanOptions {
  planId: string;
  specId: string;
  issueId: string;
}

export function formatPlanReply(tasks: PlanReplyTask[], opts: FormatPlanOptions): string {
  const rows = tasks.map((t, i) => {
    const deps = t.dependsOn?.length ? t.dependsOn.map(d => `#${d + 1}`).join(', ') : '—';
    return `| ${i + 1} | ${t.title} | ${t.summary} | ${deps} |`;
  });

  return [
    '> ✅ Plan generated.',
    '',
    '| # | Task | Description | Dependencies |',
    '|---|------|-------------|--------------|',
    ...rows,
    '',
    '---',
    '<details><summary>Provenance</summary>',
    '',
    `**Plan ID:** ${opts.planId}`,
    `**Spec ID:** ${opts.specId}`,
    `**Issue ID:** ${opts.issueId}`,
    `**Command:** \`/plan\``,
    `**Generated at:** ${new Date().toISOString()}`,
    '</details>',
  ].join('\n');
}
```

- [ ] **Create packages/commands/plan/src/plan-handler.ts**

```ts
import type { CommandContext, HandlerResult } from '@issueos/github-app';
import type { LlmClient } from '@issueos/llm-client';
import { newId, makeProvenance } from '@issueos/domain';
import { buildPlanPrompt } from './prompts/build-plan-prompt.js';
import { formatPlanReply } from './format/format-plan-reply.js';
import type { PlanReplyTask } from './format/format-plan-reply.js';

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'number' } },
        },
        required: ['title', 'summary'],
      },
      minItems: 3,
      maxItems: 8,
    },
  },
  required: ['tasks'],
};

export async function handlePlanCommand(
  ctx: CommandContext,
  llmClient: LlmClient,
): Promise<HandlerResult> {
  const { issue, repository, issueId, projectId, logger } = ctx;

  // Parse optional specId from comment body: `/plan <spec-id>`
  const bodyParts = issue.body.split(/\s+/);
  const specIdHint = bodyParts.length > 1 ? bodyParts[1].trim() : null;

  // Find Spec: explicit id or latest non-superseded for this Issue
  let spec: any;
  if (specIdHint) {
    spec = repository.get(specIdHint);
    if (!spec) {
      return { reply: '> Spec not found. Please provide a valid Spec ID, or run `/plan` without arguments to auto-resolve.' };
    }
  } else {
    const specs = repository.query(projectId)
      .filter((s: any) => s.issueId === issueId && s.status !== 'superseded')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (specs.length === 0) {
      return { reply: '> No Spec found for this Issue. Please run `/spec` first to generate a Spec.' };
    }
    spec = specs[0];
  }

  if (spec.status === 'superseded') {
    return { reply: '> The Spec for this Issue has been superseded. Please run `/spec` to generate a new one, then `/plan` again.' };
  }

  let specData: any;
  try { specData = JSON.parse(spec.content); } catch { specData = {}; }

  if (!specData.goal || !specData.scope?.length || !specData.acceptance_criteria?.length) {
    const missing: string[] = [];
    if (!specData.goal) missing.push('goal');
    if (!specData.scope?.length) missing.push('scope');
    if (!specData.acceptance_criteria?.length) missing.push('acceptance_criteria');
    return { reply: `> The Spec is missing required fields: ${missing.join(', ')}. Please update the Spec and retry.` };
  }

  try {
    const prompt = buildPlanPrompt(spec.content);
    const raw = await llmClient.generate(prompt, PLAN_SCHEMA);
    const planData = raw as { tasks: PlanReplyTask[] };

    if (!planData.tasks?.length || planData.tasks.length < 3) {
      throw new Error('LLM output has too few tasks');
    }

    // Supersede existing Plans for this Spec
    const existingPlans = repository.query(projectId)
      .filter((p: any) => p.specId === spec.id && p.status !== 'superseded');
    for (const oldPlan of existingPlans) {
      oldPlan.status = 'superseded';
      oldPlan.supersededBy = newId();
      repository.put(oldPlan);
    }

    const planId = newId();
    const plan = {
      id: planId,
      projectId,
      issueId,
      specId: spec.id,
      status: 'generated',
      content: JSON.stringify(planData.tasks),
      provenance: makeProvenance('/plan' as any, spec.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repository.put(plan);

    const reply = formatPlanReply(planData.tasks, { planId, specId: spec.id, issueId });
    return { reply, persist: plan };
  } catch (err: any) {
    logger.error({ err }, 'Plan generation failed');
    return { reply: '> ⚠️ Plan generation failed. Please ensure the Spec has sufficient detail and retry `/plan`.' };
  }
}
```

- [ ] **Create packages/commands/plan/src/index.ts**

```ts
import { registerCommand } from '@issueos/github-app';
import { createLlmClient } from '@issueos/llm-client';
import { handlePlanCommand } from './plan-handler.js';

export function registerPlanCommand(): void {
  const llmClient = createLlmClient();
  registerCommand({ command: '/plan', async run(ctx) { return handlePlanCommand(ctx, llmClient); } });
}
```

- [ ] **Write tests in index.test.ts**

```ts
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
    await handlePlanCommand(ctx, mockLlm as any);
    expect(putFn).toHaveBeenCalled();
    const superseded = putFn.mock.calls[0][0];
    expect(superseded.status).toBe('superseded');
  });
});
```

- [ ] **Run install, build, tests**

```bash
npm install
npx vitest run packages/commands-plan --reporter=verbose
npm run typecheck
```

Expected: build passes, 4 tests pass.

- [ ] **Commit**

```bash
git add packages/commands/plan/ package-lock.json
git commit -m "feat(plan-command): scaffold and handler with LLM integration"
```

---

### Task 2: Integration — register in github-app

**Files:**
- Modify: `packages/github-app/src/index.ts`
- Modify: `packages/github-app/package.json`
- Create: `packages/github-app/src/plan-integration.test.ts`

- [ ] **Add import and registerPlanCommand in github-app/src/index.ts**

```ts
import { registerPlanCommand } from '@issueos/commands-plan';

export default function (app: Probot) {
  registerSpecCommand();
  registerPlanCommand();
  // ... rest unchanged
}
```

- [ ] **Add dependency to packages/github-app/package.json**

```json
"dependencies": {
  ...,
  "@issueos/commands-plan": "*"
}
```

- [ ] **Create plan-integration.test.ts**

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Plan command integration', () => {
  beforeEach(() => { vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test'); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('should have /plan handler registered after registerPlanCommand', async () => {
    await import('@issueos/commands-plan');
    const { getRegisteredCommands } = await import('./index.js');
    expect(getRegisteredCommands().get('/plan')).toBeDefined();
  });
});
```

- [ ] **Run all tests**

```bash
npm test
npm run typecheck
```

Expected: all 69+ tests pass.

- [ ] **Commit**

```bash
git add packages/github-app/
git commit -m "feat(plan-command): integrate plan handler into github-app router"
```

---

### Task 3: Docs update

**Files:**
- Modify: `README.md`

- [ ] **Add `/plan` usage to README**

```markdown
### `/plan` — Generate implementation plan

Comment `/plan` on an Issue with a Spec to generate an ordered task list (3-8 tasks).

Usage: `/plan` (auto-resolves latest Spec for the Issue) or `/plan <spec-id>`

Requires: `ANTHROPIC_API_KEY` env var.
```

- [ ] **Commit**

```bash
git add README.md
git commit -m "docs(plan-command): add /plan usage to README"
```
