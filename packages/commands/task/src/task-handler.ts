import type { CommandContext, HandlerResult } from '@issueos/github-app';
import type { LlmClient } from '@issueos/llm-client';
import { newId, makeProvenance } from '@issueos/domain';
import { buildTaskPrompt } from './prompts/build-task-prompt.js';
import { formatTaskReply } from './format/format-task-reply.js';
import type { TaskReplyItem } from './format/format-task-reply.js';
import { removeCycles } from './cycle.js';

const TASK_SCHEMA = {
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
      minItems: 1,
      maxItems: 20,
    },
  },
  required: ['tasks'],
};

export async function handleTaskCommand(
  ctx: CommandContext,
  llmClient: LlmClient,
): Promise<HandlerResult> {
  const { issue, repository, issueId, projectId, logger } = ctx;

  const bodyParts = issue.body.split(/\s+/);
  const planIdHint = bodyParts.length > 1 ? bodyParts[1].trim() : null;

  let plan: any;
  if (planIdHint) {
    plan = repository.get(planIdHint);
    if (!plan) {
      return { reply: '> Plan not found. Please provide a valid Plan ID, or run `/task` without arguments to auto-resolve.' };
    }
  } else {
    const plans = repository.query(projectId)
      .filter((p: any) => p.issueId === issueId && p.status !== 'superseded')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (plans.length === 0) {
      return { reply: '> No Plan found for this Issue. Please run `/plan` first to generate a Plan.' };
    }
    plan = plans[0];
  }

  let planData: any;
  try { planData = JSON.parse(plan.content); } catch { planData = []; }

  if (!Array.isArray(planData) || planData.length < 2) {
    return { reply: '> The Plan has too few items to decompose into tasks. Please ensure the Plan has at least 2 items and retry `/task`.' };
  }

  try {
    const prompt = buildTaskPrompt(plan.content);
    const raw = await llmClient.generate(prompt, TASK_SCHEMA);
    const taskData = raw as { tasks: TaskReplyItem[] };

    if (!taskData.tasks?.length) {
      throw new Error('LLM output has no tasks');
    }

    const nodes = taskData.tasks.map((t, i) => ({
      id: i,
      dependsOn: t.dependsOn ?? [],
    }));

    const cycleResult = removeCycles(nodes);

    const taskId = newId();

    const existingTasks = repository.query(projectId)
      .filter((t: any) => t.planId === plan.id && t.status !== 'superseded');
    for (const oldTask of existingTasks) {
      oldTask.status = 'superseded' as const;
      oldTask.supersededBy = taskId;
      repository.put(oldTask);
    }

    const taskItem = {
      id: taskId,
      projectId,
      issueId,
      planId: plan.id,
      status: 'generated' as const,
      title: 'Task Group from /task',
      content: JSON.stringify(taskData.tasks),
      dependsOn: [] as string[],
      provenance: makeProvenance('/task' as const, plan.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repository.put(taskItem);

    const reply = formatTaskReply(taskData.tasks, {
      taskId,
      planId: plan.id,
      issueId,
      removedEdges: cycleResult.removedEdges.length > 0 ? cycleResult.removedEdges : undefined,
    });
    return { reply, persist: taskItem };
  } catch (err: any) {
    logger.error({ err }, 'Task generation failed');
    return { reply: '> ⚠️ Task generation failed. Please ensure the Plan has sufficient detail and retry `/task`.' };
  }
}
