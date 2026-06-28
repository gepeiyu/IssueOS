import { describe, it, expect, vi } from 'vitest';
import { AnthropicLlmClient, createLlmClient } from './index.js';

describe('AnthropicLlmClient', () => {
  it('should return structured JSON on successful generation', async () => {
    const fakeCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'generate_output',
          input: { goal: 'Test goal', scope: ['test'] },
        },
      ],
    });

    const client = new AnthropicLlmClient({
      apiKey: 'sk-test',
    });
    (client as any).client = { messages: { create: fakeCreate } };

    const result = await client.generate(
      [{ role: 'user', content: 'test' }],
      { type: 'object', properties: { goal: { type: 'string' }, scope: { type: 'array', items: { type: 'string' } } } }
    );

    expect(result).toEqual({ goal: 'Test goal', scope: ['test'] });
    expect(fakeCreate).toHaveBeenCalledTimes(1);
  });

  it('should throw if API key is missing', () => {
    expect(() => new AnthropicLlmClient({ apiKey: '' })).toThrow('ANTHROPIC_API_KEY');
  });

  it('createLlmClient returns AnthropicLlmClient by default', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const client = createLlmClient();
    expect(client).toBeInstanceOf(AnthropicLlmClient);
  });
});
