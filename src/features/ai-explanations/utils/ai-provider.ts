import type { AIProvider, AIProviderConfig } from '../types';

/**
 * Resolves the AI provider configuration from environment variables.
 * Returns null if no API key is configured.
 */
export function getAIProviderConfig(): AIProviderConfig | null {
  const provider = (process.env.AI_PROVIDER ?? 'openai') as AIProvider;

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    return {
      provider: 'anthropic',
      apiKey,
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
    };
  }

  // Default to OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    provider: 'openai',
    apiKey,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  };
}

/**
 * Check if any AI provider is configured with an API key.
 */
export function isAIConfigured(): boolean {
  return getAIProviderConfig() !== null;
}
