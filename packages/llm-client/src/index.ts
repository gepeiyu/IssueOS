export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmConfig {
  provider: string;
  model?: string;
}

export interface LlmClient {
  generate(messages: LlmMessage[], schema?: Record<string, unknown>): Promise<Record<string, unknown>>;
}
