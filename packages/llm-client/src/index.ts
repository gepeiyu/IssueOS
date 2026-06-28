import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
}

export interface LlmClient {
  generate(
    messages: LlmMessage[],
    schema?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}

export function createLlmClient(config?: LlmConfig): LlmClient {
  const provider = config?.provider ?? process.env.LLM_PROVIDER ?? 'anthropic';
  if (provider === 'anthropic') {
    return new AnthropicLlmClient({
      apiKey: config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
      model: config?.model ?? process.env.LLM_MODEL ?? 'claude-sonnet-4-20250514',
    });
  }
  throw new Error(`Unsupported LLM provider: ${provider}`);
}

export class AnthropicLlmClient implements LlmClient {
  private client: Anthropic;
  private model: string;

  constructor(opts: { apiKey: string; model?: string }) {
    if (!opts.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? 'claude-sonnet-4-20250514';
  }

  async generate(
    messages: LlmMessage[],
    schema?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const nonSystem = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const tools = schema
      ? [
          {
            name: 'generate_output',
            description: 'Generate structured output matching the schema',
            input_schema: schema as any,
          },
        ]
      : undefined;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemMsg,
      messages: nonSystem,
      tools: tools as any,
    });

    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'generate_output') {
        return block.input as Record<string, unknown>;
      }
    }

    throw new Error('LLM did not return a tool_use block');
  }
}
