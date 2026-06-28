export interface TaskReplyItem {
  title: string;
  summary: string;
  dependsOn?: number[];
}

export interface FormatTaskOptions {
  taskId: string;
  planId: string;
  issueId: string;
  removedEdges?: { from: number; to: number }[];
}

export function formatTaskReply(tasks: TaskReplyItem[], opts: FormatTaskOptions): string {
  const mapped = tasks.map((t, i) => {
    const label = `T${i + 1}`;
    const deps = t.dependsOn?.length
      ? `(depends: ${t.dependsOn.map(d => `T${d + 1}`).join(', ')})`
      : '';
    return `- [ ] **${label}**: ${t.title} — ${t.summary} ${deps}`.trim();
  });

  const lines: string[] = [
    '> ✅ Tasks generated.',
    '',
    ...mapped,
    '',
  ];

  if (opts.removedEdges && opts.removedEdges.length > 0) {
    lines.push('> ⚠️ Detected and removed circular dependencies:');
    for (const e of opts.removedEdges) {
      lines.push(`>   - T${e.from} → T${e.to} removed`);
    }
    lines.push('');
  }

  lines.push(
    '---',
    '<details><summary>Provenance</summary>',
    '',
    `**Task ID:** ${opts.taskId}`,
    `**Plan ID:** ${opts.planId}`,
    `**Issue ID:** ${opts.issueId}`,
    `**Command:** \`/task\``,
    `**Generated at:** ${new Date().toISOString()}`,
    '</details>',
  );

  return lines.join('\n');
}
