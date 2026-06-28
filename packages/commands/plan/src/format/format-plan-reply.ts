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
