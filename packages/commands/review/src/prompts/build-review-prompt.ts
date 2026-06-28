import type { LlmMessage } from '@issueos/llm-client';

export function buildReviewPrompt(targetContent: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a code review assistant. Review the provided diff across 5 dimensions.',
        '',
        'Output using the `generate_review` tool with this JSON schema:',
        '- `dimensions`: array of dimension objects',
        '  - `name`: one of "tests", "code_quality", "security", "performance", "architecture"',
        '  - `score`: 0-100 (higher is better)',
        '  - `findings`: array of specific findings (string)',
        '  - `suggestions`: array of improvement suggestions (string)',
        '  - `unassessed`: true if you cannot evaluate this dimension',
        '',
        'Dimension criteria:',
        '- **tests**: Are tests present? Are they meaningful? Edge cases?',
        '- **code_quality**: Readability? Naming? Duplication? Error handling?',
        '- **security**: Secrets? Injection? Auth? Input validation?',
        '- **performance**: N+1 queries? Mem leaks? Payload size?',
        '- **architecture**: Separation of concerns? Coupling? Patterns?',
        '',
        'Score guide: 90-100 = excellent, 70-89 = good, 50-69 = needs work, <50 = concerning',
        'If content is not a code diff, assess informational completeness instead.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Review this diff:\n\n${targetContent}`,
    },
  ];
}
