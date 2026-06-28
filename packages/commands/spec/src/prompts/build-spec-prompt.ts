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
