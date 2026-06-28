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
