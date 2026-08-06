import type { AIProviderConfig, ExplainRequest } from '../types';
import { buildExplanationPrompt } from './build-prompt';

/**
 * Calls the OpenAI chat completions API with streaming.
 * Returns a ReadableStream of text chunks.
 */
async function streamOpenAI(
  config: AIProviderConfig,
  request: ExplainRequest
): Promise<ReadableStream<Uint8Array>> {
  const { system, user } = buildExplanationPrompt(request);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('OpenAI API returned no response body');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Calls the Anthropic messages API with streaming.
 * Returns a ReadableStream of text chunks.
 */
async function streamAnthropic(
  config: AIProviderConfig,
  request: ExplainRequest
): Promise<ReadableStream<Uint8Array>> {
  const { system, user } = buildExplanationPrompt(request);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      system,
      messages: [{ role: 'user', content: user }],
      stream: true,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Anthropic API returned no response body');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Streams an AI explanation based on the configured provider.
 */
export async function streamExplanation(
  config: AIProviderConfig,
  request: ExplainRequest
): Promise<ReadableStream<Uint8Array>> {
  if (config.provider === 'anthropic') {
    return streamAnthropic(config, request);
  }
  return streamOpenAI(config, request);
}
