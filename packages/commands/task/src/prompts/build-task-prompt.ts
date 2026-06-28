import type { LlmMessage } from '@issueos/llm-client';

export function buildTaskPrompt(planBody: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a technical task decomposer. Given an implementation Plan, break each Plan item into 1-3 concrete, actionable tasks with dependency relationships.',
        '',
        'Output using the `generate_output` tool with this JSON schema:',
        '- `tasks`: array of task objects',
        '  - `title`: task title (verb-noun, e.g. "Create UserService class")',
        '  - `summary`: 1 sentence description of what to do',
        '  - `dependsOn`: array of task indices this task depends on (0-indexed, optional)',
        '',
        'Rules:',
        '- Generate 3-20 tasks total',
        '- Each task must be independently assignable',
        '- Use dependsOn only for hard prerequisites (must-finish-before)',
        '- Avoid circular dependencies',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Decompose this Plan into a task DAG:\n\n${planBody}`,
    },
  ];
}
