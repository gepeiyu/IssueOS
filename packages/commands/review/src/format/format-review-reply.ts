import type { DimensionResult } from '../risk.js';
import type { ReviewTarget } from '../diff.js';

export interface FormatReviewOptions {
  reviewId: string;
  target: ReviewTarget;
  riskLabel: string;
  riskScore: number;
  truncated: boolean;
}

export function formatReviewReply(
  dimensions: DimensionResult[],
  opts: FormatReviewOptions,
): string {
  const { reviewId, target, riskLabel, riskScore, truncated } = opts;

  const lines: string[] = [
    `> ✅ Review complete (target: ${target.type} ${target.id})`,
    '',
    `## Risk Score: ${riskScore}/100 (${riskLabel})`,
    '',
    '| Dimension | Score | Status |',
    '|-----------|-------|--------|',
  ];

  for (const dim of dimensions) {
    const status = dim.unassessed ? '❌ N/A' : dim.score >= 70 ? '✅' : dim.score >= 50 ? '⚠️' : '❌';
    lines.push(`| ${dim.name} | ${dim.unassessed ? 'N/A' : `${dim.score}/100`} | ${status} |`);
  }

  lines.push('', '---', '### Details');

  for (const dim of dimensions) {
    if (dim.unassessed) {
      lines.push('', `**${dim.name}** — Not assessed`);
      continue;
    }
    lines.push('', `**${dim.name}** (${dim.score}/100)`);
    if (dim.findings?.length) {
      for (const f of dim.findings) lines.push(`- ${f}`);
    }
    if (dim.suggestions?.length) {
      lines.push('', 'Suggestions:');
      for (const s of dim.suggestions) lines.push(`- 💡 ${s}`);
    }
  }

  if (truncated) {
    lines.push('', '> ⚠️ The diff was large and may not have been fully evaluated.');
  }

  lines.push(
    '',
    '---',
    '> **Disclaimer**: This review is AI-assisted and may miss issues. Does not replace human code review.',
    '',
    '<details><summary>Provenance</summary>',
    '',
    `**Review ID:** ${reviewId}`,
    `**Target:** ${target.type} #${target.id}`,
    `**Command:** \`/review\``,
    `**Generated at:** ${new Date().toISOString()}`,
    '</details>',
  );

  return lines.join('\n');
}
