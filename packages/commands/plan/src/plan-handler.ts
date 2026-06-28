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
