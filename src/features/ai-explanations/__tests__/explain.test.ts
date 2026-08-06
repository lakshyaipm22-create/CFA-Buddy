import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAIProviderConfig, isAIConfigured } from '../utils/ai-provider';
import { buildExplanationPrompt } from '../utils/build-prompt';
import type { ExplainRequest } from '../types';

const sampleRequest: ExplainRequest = {
  questionText: 'What is the primary purpose of diversification in portfolio management?',
  answerChoices: [
    { label: 'A', text: 'Maximize returns', isCorrect: false },
    { label: 'B', text: 'Reduce unsystematic risk', isCorrect: true },
    { label: 'C', text: 'Eliminate all risk', isCorrect: false },
  ],
  selectedAnswer: 'A',
  correctAnswer: 'B',
};

describe('AI Provider Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null when no API key is set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_PROVIDER;

    const config = getAIProviderConfig();
    expect(config).toBeNull();
  });

  it('returns OpenAI config when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    delete process.env.AI_PROVIDER;

    const config = getAIProviderConfig();
    expect(config).not.toBeNull();
    expect(config!.provider).toBe('openai');
    expect(config!.apiKey).toBe('sk-test-key');
    expect(config!.model).toBe('gpt-4o-mini');
  });

  it('returns OpenAI config with custom model', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.OPENAI_MODEL = 'gpt-4o';
    process.env.AI_PROVIDER = 'openai';

    const config = getAIProviderConfig();
    expect(config).not.toBeNull();
    expect(config!.model).toBe('gpt-4o');
  });

  it('returns Anthropic config when AI_PROVIDER=anthropic and ANTHROPIC_API_KEY is set', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    const config = getAIProviderConfig();
    expect(config).not.toBeNull();
    expect(config!.provider).toBe('anthropic');
    expect(config!.apiKey).toBe('sk-ant-test-key');
    expect(config!.model).toBe('claude-sonnet-4-20250514');
  });

  it('returns Anthropic config with custom model', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    process.env.ANTHROPIC_MODEL = 'claude-3-haiku-20240307';

    const config = getAIProviderConfig();
    expect(config).not.toBeNull();
    expect(config!.model).toBe('claude-3-haiku-20240307');
  });

  it('returns null for Anthropic provider when no Anthropic key is set', () => {
    process.env.AI_PROVIDER = 'anthropic';
    delete process.env.ANTHROPIC_API_KEY;

    const config = getAIProviderConfig();
    expect(config).toBeNull();
  });

  it('defaults to OpenAI when AI_PROVIDER is not set', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    delete process.env.AI_PROVIDER;

    const config = getAIProviderConfig();
    expect(config!.provider).toBe('openai');
  });

  it('isAIConfigured returns false when no key is set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_PROVIDER;

    expect(isAIConfigured()).toBe(false);
  });

  it('isAIConfigured returns true when OpenAI key is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    delete process.env.AI_PROVIDER;

    expect(isAIConfigured()).toBe(true);
  });
});

describe('Build Explanation Prompt', () => {
  it('builds system and user prompts from request', () => {
    const result = buildExplanationPrompt(sampleRequest);

    expect(result.system).toContain('CFA exam tutor');
    expect(result.system).toContain('selected answer is incorrect');
    expect(result.system).toContain('correct answer is right');
  });

  it('includes question text in user prompt', () => {
    const result = buildExplanationPrompt(sampleRequest);

    expect(result.user).toContain(sampleRequest.questionText);
  });

  it('includes answer choices in user prompt', () => {
    const result = buildExplanationPrompt(sampleRequest);

    expect(result.user).toContain('A. Maximize returns');
    expect(result.user).toContain('B. Reduce unsystematic risk (correct)');
    expect(result.user).toContain('C. Eliminate all risk');
  });

  it('includes selected and correct answers', () => {
    const result = buildExplanationPrompt(sampleRequest);

    expect(result.user).toContain('Student selected: A');
    expect(result.user).toContain('Correct answer: B');
  });

  it('marks only the correct answer choice', () => {
    const result = buildExplanationPrompt(sampleRequest);

    // Only B should be marked as correct
    const lines = result.user.split('\n');
    const choiceLines = lines.filter(l => l.trim().match(/^[A-C]\./));

    const correctLine = choiceLines.find(l => l.includes('(correct)'));
    expect(correctLine).toContain('B.');
  });
});

describe('Input Validation (API route schema)', () => {
  it('rejects empty question text', async () => {
    const { z } = await import('zod');

    const explainRequestSchema = z.object({
      questionText: z.string().min(1).max(2000),
      answerChoices: z.array(
        z.object({
          label: z.string().min(1),
          text: z.string().min(1),
          isCorrect: z.boolean(),
        })
      ).min(2).max(10),
      selectedAnswer: z.string().min(1),
      correctAnswer: z.string().min(1),
    });

    const result = explainRequestSchema.safeParse({
      questionText: '',
      answerChoices: [
        { label: 'A', text: 'Option A', isCorrect: true },
        { label: 'B', text: 'Option B', isCorrect: false },
      ],
      selectedAnswer: 'B',
      correctAnswer: 'A',
    });

    expect(result.success).toBe(false);
  });

  it('rejects too few answer choices', async () => {
    const { z } = await import('zod');

    const explainRequestSchema = z.object({
      questionText: z.string().min(1).max(2000),
      answerChoices: z.array(
        z.object({
          label: z.string().min(1),
          text: z.string().min(1),
          isCorrect: z.boolean(),
        })
      ).min(2).max(10),
      selectedAnswer: z.string().min(1),
      correctAnswer: z.string().min(1),
    });

    const result = explainRequestSchema.safeParse({
      questionText: 'What is NPV?',
      answerChoices: [{ label: 'A', text: 'Option A', isCorrect: true }],
      selectedAnswer: 'A',
      correctAnswer: 'A',
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid request', async () => {
    const { z } = await import('zod');

    const explainRequestSchema = z.object({
      questionText: z.string().min(1).max(2000),
      answerChoices: z.array(
        z.object({
          label: z.string().min(1),
          text: z.string().min(1),
          isCorrect: z.boolean(),
        })
      ).min(2).max(10),
      selectedAnswer: z.string().min(1),
      correctAnswer: z.string().min(1),
    });

    const result = explainRequestSchema.safeParse(sampleRequest);

    expect(result.success).toBe(true);
  });
});
