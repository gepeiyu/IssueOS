import type { LlmMessage } from '@issueos/llm-client';

export function buildPlanPrompt(specBody: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a technical planner. Given a Spec, generate an ordered implementation plan.',
        '',
        'Output using the `generate_output` tool with this JSON schema:',
        '- `tasks`: array of task objects',
        '  - `title`: task title (verb-noun, e.g. "Design database schema")',
        '  - `summary`: 1-2 sentence description of what to do and why',
        '  - `dependsOn`: array of task indices this task depends on (0-indexed, optional)',
        '',
        'Rules:',
        '- Generate 3-8 tasks total',
        '- Order tasks logically (foundation first, then features)',
        '- Each task must be actionable by a single developer',
        '- Only use dependsOn for hard prerequisites',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Generate an implementation plan from this Spec:\n\n${specBody}`,
    },
  ];
}
