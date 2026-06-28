# Spec Command — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `/spec` command: natural-language Issue → structured Spec via Claude, persisted to Repository.

**Architecture:** Two new npm workspace packages: `@issueos/llm-client` (LlmClient interface + Anthropic implementation) and `@issueos/commands-spec` (handler, prompt builder, output formatter, degradation). The github-app package registers the handler. Prompts live in `packages/commands/spec/prompts/`.

**Tech Stack:** Node 22 ESM, TypeScript 5.7, `@anthropic-ai/sdk`, Vitest, `@issueos/domain` (Spec type), `@issueos/storage` (Repository), `@issueos/issue-dsl` (parseIssue), `@issueos/github-app` (CommandHandler interface).

## Global Constraints

- TypeScript 5.7, Node `>=22`, ESM (`"type": "module"`), no `require()`
- npm workspaces via `packages/*`
- Package naming: `@issueos/llm-client`, `@issueos/commands-spec`
- `@anthropic-ai/sdk` is the LLM SDK; env `ANTHROPIC_API_KEY` required
- `LlmClient` interface supports provider swap via env `LLM_PROVIDER` (default `anthropic`)
- Tests must never hit real LLM API — mock Anthropic SDK
- Zod for JSON schema validation
- No streaming in MVP (reserve `generateStream` on interface)
- Commit after every task with conventional commit format

---

### Task 1: Bootstrap packages + types

**Files:**
- Create: `packages/llm-client/package.json`
- Create: `packages/llm-client/tsconfig.json`
- Create: `packages/llm-client/src/index.ts`
- Create: `packages/llm-client/src/index.test.ts`
- Create: `packages/commands/spec/package.json`
- Create: `packages/commands/spec/tsconfig.json`
- Create: `packages/commands/spec/src/index.ts`
- Create: `packages/commands/spec/src/index.test.ts`
- Modify: `package.json` (workspaces already covers `packages/*`)

**Interfaces:**
- Consumes: `@issueos/domain` (Spec, Provenance, SourceCommand, newId, makeProvenance), `@issueos/storage` (Repository), `@issueos/issue-dsl` (parseIssue), `@issueos/github-app` (CommandHandler, CommandContext, HandlerResult, registerCommand)
- Produces: `@issueos/llm-client` (LlmClient interface, LlmMessage, LlmConfig, AnthropicLlmClient), `@issueos/commands-spec` (SpecCommandHandler)

- [ ] **Create packages/llm-client/package.json**

```json
{
  "name": "@issueos/llm-client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@issueos/domain": "*",
    "@anthropic-ai/sdk": "^0.30.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Create packages/llm-client/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Create packages/commands/spec/package.json**

```json
{
  "name": "@issueos/commands-spec",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@issueos/domain": "*",
    "@issueos/llm-client": "*",
    "@issueos/storage": "*",
    "@issueos/issue-dsl": "*",
    "@issueos/github-app": "*"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Create packages/commands/spec/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Create packages/llm-client/src/index.ts** — placeholder exports

```ts
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmConfig {
  provider: string;
  model?: string;
}

export interface LlmClient {
  generate(messages: LlmMessage[], schema?: Record<string, unknown>): Promise<Record<string, unknown>>;
}
```

- [ ] **Create packages/llm-client/src/index.test.ts**

```ts
import { describe, it } from 'vitest';

describe('LlmClient', () => {
  it('placeholder', () => { /* will be filled in Task 2 */ });
});
```

- [ ] **Create packages/commands/spec/src/index.ts**

```ts
export function registerSpecCommand(): void {
  // placeholder — will register with github-app in Task 4
}
```

- [ ] **Create packages/commands/spec/src/index.test.ts**

```ts
import { describe, it } from 'vitest';

describe('SpecCommand', () => {
  it('placeholder', () => { /* will be filled in Task 3 */ });
});
```

- [ ] **Install dependencies**

Run: `npm install`

- [ ] **Build to verify no errors**

Run: `npm run build`
Expected: both new packages compile without errors.

- [ ] **Run typecheck**

Run: `npm run typecheck`
Expected: all packages pass typecheck.

- [ ] **Commit**

```bash
git add packages/llm-client/ packages/commands/spec/ package.json package-lock.json
git commit -m "feat(spec-command): scaffold llm-client and commands-spec packages"
```

---

### Task 2: LlmClient interface + Anthropic implementation

**Files:**
- Modify: `packages/llm-client/src/index.ts`
- Modify: `packages/llm-client/src/index.test.ts`
- Create: `packages/llm-client/src/vitest.setup.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: env vars (`ANTHROPIC_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`)
- Produces: `LlmClient.generate()` returns parsed JSON matching schema; `AnthropicLlmClient` uses `@anthropic-ai/sdk` message API with tool use

- [ ] **Write failing test: fake LLM returns structured JSON**

```ts
import { describe, it, expect, vi } from 'vitest';

describe('AnthropicLlmClient', () => {
  it('should return structured JSON on successful generation', async () => {
    const fakeCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'generate_spec',
          input: { goal: 'Test goal', scope: ['test'] },
        },
      ],
    });

    const client = new (await import('./index.js')).AnthropicLlmClient({
      apiKey: 'sk-test',
    });
    (client as any).client = { messages: { create: fakeCreate } };

    const result = await client.generate(
      [{ role: 'user', content: 'test' }],
      { type: 'object', properties: { goal: { type: 'string' }, scope: { type: 'array', items: { type: 'string' } } } }
    );

    expect(result).toEqual({ goal: 'Test goal', scope: ['test'] });
    expect(fakeCreate).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Run test to verify it fails**

Run: `npx vitest run packages/llm-client --reporter=verbose 2>&1`
Expected: FAIL with type error (AnthropicLlmClient not exported)

- [ ] **Write minimal implementation: LlmClient interface**

```ts
import { z } from 'zod';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
}

export interface LlmClient {
  generate(
    messages: LlmMessage[],
    schema?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}

export function createLlmClient(config?: LlmConfig): LlmClient {
  const provider = config?.provider ?? process.env.LLM_PROVIDER ?? 'anthropic';
  if (provider === 'anthropic') {
    return new AnthropicLlmClient({
      apiKey: config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
      model: config?.model ?? process.env.LLM_MODEL ?? 'claude-sonnet-4-20250514',
    });
  }
  throw new Error(`Unsupported LLM provider: ${provider}`);
}
```

- [ ] **Write AnthropicLlmClient implementation**

```ts
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicLlmClient implements LlmClient {
  private client: Anthropic;
  private model: string;

  constructor(opts: { apiKey: string; model?: string }) {
    if (!opts.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? 'claude-sonnet-4-20250514';
  }

  async generate(
    messages: LlmMessage[],
    schema?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const nonSystem = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const tools = schema
      ? [
          {
            name: 'generate_output',
            description: 'Generate structured output matching the schema',
            input_schema: schema as any,
          },
        ]
      : undefined;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemMsg,
      messages: nonSystem,
      tools: tools as any,
    });

    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'generate_output') {
        return block.input as Record<string, unknown>;
      }
    }

    throw new Error('LLM did not return a tool_use block');
  }
}
```

- [ ] **Create vitest.setup.ts** (mock for Anthropic SDK)

```ts
import { vi } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});
```

- [ ] **Update vitest.config.ts** to include the setup

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
    setupFiles: ['packages/llm-client/src/vitest.setup.ts'],
  },
});
```

- [ ] **Run test to verify it passes**

Run: `npx vitest run packages/llm-client --reporter=verbose`
Expected: PASS

- [ ] **Write test: missing API key throws**

```ts
it('should throw if API key is missing', () => {
  expect(() => new AnthropicLlmClient({ apiKey: '' })).toThrow('ANTHROPIC_API_KEY');
});
```

- [ ] **Write test: createLlmClient factory**

```ts
it('createLlmClient returns AnthropicLlmClient by default', () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test';
  const client = createLlmClient();
  expect(client).toBeInstanceOf(AnthropicLlmClient);
});
```

- [ ] **Run all llm-client tests**

Run: `npx vitest run packages/llm-client`
Expected: 3+ tests passing

- [ ] **Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Commit**

```bash
git add packages/llm-client/ vitest.config.ts
git commit -m "feat(spec-command): LlmClient interface + Anthropic implementation"
```

---

### Task 3: Spec command handler

**Files:**
- Create: `packages/commands/spec/src/spec-handler.ts`
- Create: `packages/commands/spec/src/prompts/build-spec-prompt.ts`
- Create: `packages/commands/spec/src/format/format-spec-reply.ts`
- Modify: `packages/commands/spec/src/index.ts`
- Modify: `packages/commands/spec/src/index.test.ts`

**Interfaces:**
- Consumes: `CommandContext` (octokit, issue, parseIssue, repository, issueId, projectId, logger), `LlmClient` (generate), `parseIssue` (for lenient fallback), `newId`, `makeProvenance`, `Spec` type
- Produces: `HandlerResult` with reply markdown, persisted Spec in repository

- [ ] **Create spec-handler.ts**

```ts
import type { CommandContext, HandlerResult } from '@issueos/github-app';
import type { LlmClient } from '@issueos/llm-client';
import { newId, makeProvenance } from '@issueos/domain';
import { buildSpecPrompt } from './prompts/build-spec-prompt.js';
import { formatSpecReply } from './format/format-spec-reply.js';

const SPEC_SCHEMA = {
  type: 'object',
  properties: {
    background: { type: 'string' },
    goal: { type: 'string' },
    scope: { type: 'array', items: { type: 'string' } },
    out_of_scope: { type: 'array', items: { type: 'string' } },
    acceptance_criteria: { type: 'array', items: { type: 'string' } },
    risk: { type: 'string' },
    rollback: { type: 'string' },
  },
  required: ['goal', 'scope', 'acceptance_criteria'],
};

export async function handleSpecCommand(
  ctx: CommandContext,
  llmClient: LlmClient,
): Promise<HandlerResult> {
  const { issue, parseIssue, repository, issueId, projectId, logger } = ctx;

  // 1. Lenient parse for fallback context
  const preParsed = parseIssue(issue.body, 'lenient');

  try {
    // 2. Build prompt and call LLM
    const prompt = buildSpecPrompt(issue.body);
    const raw = await llmClient.generate(prompt, SPEC_SCHEMA);

    // 3. Validate required fields
    const specData = raw as {
      background?: string;
      goal: string;
      scope: string[];
      out_of_scope?: string[];
      acceptance_criteria: string[];
      risk?: string;
      rollback?: string;
    };

    if (!specData.goal || !specData.scope?.length || !specData.acceptance_criteria?.length) {
      throw new Error('LLM output missing required fields');
    }

    // 4. Supersede any existing Spec for this Issue
    const existingSpecs = repository.query(projectId)
      .filter((s: any) => s.issueId === issueId && s.status !== 'superseded');
    for (const oldSpec of existingSpecs) {
      oldSpec.status = 'superseded' as const;
      oldSpec.supersededBy = newId;
      repository.put(oldSpec);
    }

    // 5. Persist new Spec
    const spec = {
      id: newId(),
      projectId,
      issueId,
      status: 'generated' as const,
      content: JSON.stringify(specData),
      provenance: makeProvenance('/spec' as const, issueId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repository.put(spec);

    // 6. Format reply
    const reply = formatSpecReply(specData, { specId: spec.id, issueId });
    return { reply, persist: spec };
  } catch (err: any) {
    logger.error({ err }, 'Spec generation failed, falling back');

    // Degradation: respond with lenient parse results
    const missingFields: string[] = [];
    if (!preParsed.goal) missingFields.push('goal');
    if (!preParsed.scope?.length) missingFields.push('scope');
    if (!preParsed.acceptance?.length) missingFields.push('acceptance_criteria');

    const reply = [
      '> ⚠️ `Spec` generation failed.',
      '',
      '**Pre-parsed fields from Issue:**',
      ...(preParsed.goal ? [`- **Goal:** ${preParsed.goal}`] : ['- **Goal:** 未识别']),
      ...(preParsed.scope?.length ? [`- **Scope:** ${preParsed.scope.join(', ')}`] : ['- **Scope:** 未识别']),
      ...(preParsed.acceptance?.length ? [`- **Acceptance:** ${preParsed.acceptance.join(', ')}`] : ['- **Acceptance:** 未识别']),
      '',
      missingFields.length > 0
        ? `**请补充以下字段后重试 \`/spec\`：** ${missingFields.join(', ')}`
        : '**请检查 Issue 描述是否充分，然后重试 `/spec`。**',
    ].join('\n');

    return { reply };
  }
}
```

- [ ] **Create prompts/build-spec-prompt.ts**

```ts
import type { LlmMessage } from '@issueos/llm-client';

export function buildSpecPrompt(issueBody: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a product spec writer. Given a GitHub Issue, extract structured specification fields.',
        '',
        'Output using the `generate_output` tool with these fields:',
        '- `background`: what led to this issue (1-3 sentences)',
        '- `goal`: what success looks like (1 sentence)',
        '- `scope`: list of in-scope items',
        '- `out_of_scope`: list of explicitly out-of-scope items',
        '- `acceptance_criteria`: list of measurable acceptance criteria',
        '- `risk`: potential risks (1-2 sentences, optional)',
        '- `rollback`: rollback strategy (1-2 sentences, optional)',
        '',
        'If the Issue is missing information, leave fields empty but still output the JSON structure.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Generate a structured Spec from this Issue:\n\n${issueBody}`,
    },
  ];
}
```

- [ ] **Create format/format-spec-reply.ts**

```ts
export interface SpecData {
  background?: string;
  goal: string;
  scope: string[];
  out_of_scope?: string[];
  acceptance_criteria: string[];
  risk?: string;
  rollback?: string;
}

export interface FormatOptions {
  specId: string;
  issueId: string;
}

export function formatSpecReply(spec: SpecData, opts: FormatOptions): string {
  const sections: string[] = [
    '> ✅ `Spec` generated successfully.',
    '',
    '## Background',
    spec.background || '*未提供*',
    '',
    '## Goal',
    spec.goal,
    '',
    '## Scope',
    ...spec.scope.map(s => `- ${s}`),
    '',
    ...(spec.out_of_scope?.length
      ? ['## Out of Scope', ...spec.out_of_scope.map(s => `- ${s}`), '']
      : []),
    '## Acceptance Criteria',
    ...spec.acceptance_criteria.map(a => `- [ ] ${a}`),
    '',
    ...(spec.risk ? ['## Risk', spec.risk, ''] : []),
    ...(spec.rollback ? ['## Rollback', spec.rollback, ''] : []),
    '---',
    `<details><summary>Provenance</summary>`,
    '',
    `**Spec ID:** ${opts.specId}`,
    `**Issue ID:** ${opts.issueId}`,
    `**Command:** \`/spec\``,
    `**Generated at:** ${new Date().toISOString()}`,
    `</details>`,
  ];

  return sections.join('\n');
}
```

- [ ] **Write tests for spec handler**

```ts
import { describe, it, expect, vi } from 'vitest';
import { handleSpecCommand } from './spec-handler.js';
import type { CommandContext } from '@issueos/github-app';

function makeMockContext(overrides?: Partial<CommandContext>): CommandContext {
  return {
    octokit: { rest: { issues: { createComment: vi.fn() } } },
    issue: { owner: 'test', repo: 'test', issue_number: 1, body: 'Test issue body' },
    parseIssue: () => ({ goal: '', scope: [], acceptance: [] }),
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
      parseIssue: () => ({ goal: 'partial', scope: [], acceptance: [] }),
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
```

- [ ] **Update packages/commands/spec/src/index.ts**

```ts
import { registerCommand } from '@issueos/github-app';
import { createLlmClient } from '@issueos/llm-client';
import { handleSpecCommand } from './spec-handler.js';

export function registerSpecCommand(): void {
  const llmClient = createLlmClient();

  registerCommand({
    command: '/spec',
    async run(ctx) {
      return handleSpecCommand(ctx, llmClient);
    },
  });
}
```

- [ ] **Run tests**

Run: `npx vitest run packages/commands-spec --reporter=verbose`
Expected: 3 tests passing

- [ ] **Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Commit**

```bash
git add packages/commands/spec/
git commit -m "feat(spec-command): spec handler with LLM integration and graceful degradation"
```

---

### Task 4: Integration — register spec command in github-app

**Files:**
- Modify: `packages/github-app/src/index.ts`

**Interfaces:**
- Consumes: `registerSpecCommand()` from `@issueos/commands-spec`

- [ ] **Register spec command in github-app/src/index.ts**

Replace the placeholder `/spec` comment/path, add the import and call:

```ts
import { registerSpecCommand } from '@issueos/commands-spec';

// ... after existing imports

registerSpecCommand();
```

The actual edit in `packages/github-app/src/index.ts`:

```ts
import { registerSpecCommand } from '@issueos/commands-spec';

export default function (app: Probot) {
  // Register real command handlers before placeholder fallback
  registerSpecCommand();

  for (const cmd of ALL_COMMANDS) {
    // ... existing fallback logic unchanged
  }
  // ... rest unchanged
}
```

- [ ] **Also remove the placeholders.ts export** — ensure spec command won't fall through to placeholder. The current code already handles this: `if (!handlers.has(cmd))` so after `registerSpecCommand()` the `/spec` map entry is populated.

- [ ] **Create integration test**

Create `packages/github-app/src/spec-integration.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerCommand } from './index.js';

describe('Spec command integration', () => {
  beforeEach(() => {
    // clear registered handlers
  });

  it('should have /spec handler registered after registerSpecCommand', async () => {
    // Dynamically import to trigger registration
    await import('@issueos/commands-spec');

    const { getRegisteredCommands } = await import('./index.js');
    const handlers = getRegisteredCommands();
    const specHandler = handlers.get('/spec');
    expect(specHandler).toBeDefined();
    expect(specHandler!.command).toBe('/spec');
  });
});
```

- [ ] **Run all tests**

Run: `npm test`
Expected: all tests pass (including llm-client, commands-spec, github-app integration)

- [ ] **Run build and typecheck**

Run: `npm run build && npm run typecheck`
Expected: BUILD SUCCESS, TYPE CHECK PASS

- [ ] **Commit**

```bash
git add packages/github-app/src/
git commit -m "feat(spec-command): integrate spec handler into github-app router"
```

---

### Task 5: Update AGENTS.md + README

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`

**Changes:**

Add to AGENTS.md env table:

```markdown
| `ANTHROPIC_API_KEY` | 是 | Anthropic API key（`/spec` 命令用） |
| `LLM_PROVIDER` | 否 | LLM 提供方（默认 `anthropic`） |
| `LLM_MODEL` | 否 | Claude 模型名（默认 `claude-sonnet-4-20250514`） |
```

Add spec-command to the .env.example or AGENTS.md command docs.

- [ ] **Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs(spec-command): env vars and /spec usage in docs"
```
