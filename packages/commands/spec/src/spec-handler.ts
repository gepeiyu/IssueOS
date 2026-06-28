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

function extractPreParsed(preParsed: ReturnType<CommandContext['parseIssue']>) {
  if (!preParsed.ok) return { goal: undefined, scope: undefined, acceptance: undefined };
  return {
    goal: (preParsed.issue as any).goal,
    scope: (preParsed.issue as any).scope,
    acceptance: (preParsed.issue as any).acceptance,
  };
}

export async function handleSpecCommand(
  ctx: CommandContext,
  llmClient: LlmClient,
): Promise<HandlerResult> {
  const { issue, parseIssue, repository, issueId, projectId, logger } = ctx;

  const preParsed = extractPreParsed(parseIssue(issue.body, 'lenient'));

  try {
    const prompt = buildSpecPrompt(issue.body);
    const raw = await llmClient.generate(prompt, SPEC_SCHEMA);

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

    const newSpecId = newId();

    const existingSpecs = repository.query(projectId)
      .filter((s: any) => s.issueId === issueId && s.status !== 'superseded');
    for (const oldSpec of existingSpecs) {
      oldSpec.status = 'superseded' as const;
      oldSpec.supersededBy = newSpecId;
      repository.put(oldSpec);
    }

    const spec = {
      id: newSpecId,
      projectId,
      issueId,
      status: 'generated' as const,
      content: JSON.stringify(specData),
      provenance: makeProvenance('/spec' as const, issueId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repository.put(spec);

    const reply = formatSpecReply(specData, { specId: spec.id, issueId });
    return { reply, persist: spec };
  } catch (err: any) {
    logger.error({ err }, 'Spec generation failed, falling back');

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
