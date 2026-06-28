import type { CommandContext, HandlerResult } from '@issueos/github-app';
import type { LlmClient } from '@issueos/llm-client';
import { newId, makeProvenance } from '@issueos/domain';
import { buildReviewPrompt } from './prompts/build-review-prompt.js';
import { formatReviewReply } from './format/format-review-reply.js';
import { resolveTarget, chunkDiff } from './diff.js';
import { computeRisk } from './risk.js';
import type { DimensionResult } from './risk.js';

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    dimensions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', enum: ['tests', 'code_quality', 'security', 'performance', 'architecture'] },
          score: { type: 'number', minimum: 0, maximum: 100 },
          findings: { type: 'array', items: { type: 'string' } },
          suggestions: { type: 'array', items: { type: 'string' } },
          unassessed: { type: 'boolean' },
        },
        required: ['name', 'score'],
      },
    },
  },
  required: ['dimensions'],
};

export async function handleReviewCommand(
  ctx: CommandContext,
  llmClient: LlmClient,
): Promise<HandlerResult> {
  const { issue, octokit, repository, issueId, projectId, logger } = ctx;

  const resolution = await resolveTarget(
    issue.body,
    octokit,
    repository,
    issue.owner,
    issue.repo,
  );

  if (resolution.error || !resolution.target) {
    return { reply: resolution.error ?? '> Unknown error resolving target.' };
  }

  const target = resolution.target;
  const { body: cleanDiff, truncated } = chunkDiff(target.content);

  try {
    const prompt = buildReviewPrompt(cleanDiff);
    const raw = await llmClient.generate(prompt, REVIEW_SCHEMA);
    const reviewData = raw as { dimensions: DimensionResult[] };

    if (!reviewData.dimensions?.length) {
      throw new Error('LLM output has no dimensions');
    }

    const risk = computeRisk(reviewData.dimensions);
    const reviewId = newId();

    const existingReviews = repository.query(projectId)
      .filter((r: any) => r.targetType === target.type && r.targetId === target.id && r.status !== 'superseded');
    for (const oldReview of existingReviews) {
      oldReview.status = 'superseded' as const;
      oldReview.supersededBy = reviewId;
      repository.put(oldReview);
    }

    const review = {
      id: reviewId,
      projectId,
      issueId,
      targetType: target.type,
      targetId: target.id,
      status: 'generated' as const,
      content: JSON.stringify(reviewData.dimensions),
      riskScore: risk.riskScore,
      riskLabel: risk.riskLabel,
      provenance: makeProvenance('/review' as const, target.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repository.put(review);

    const reply = formatReviewReply(reviewData.dimensions, {
      reviewId,
      target,
      riskLabel: risk.riskLabel,
      riskScore: risk.riskScore,
      truncated,
    });

    return { reply, persist: review };
  } catch (err: any) {
    logger.error({ err }, 'Review generation failed');
    return { reply: '> ⚠️ Review generation failed. The diff may be too large or the target unsuitable. Retry `/review`.' };
  }
}
