import { describe, expect, it } from 'vitest';
import {
  buildChatPrompt,
  buildSystemPrompt,
  escapeUserInput,
  truncateHistory,
} from '../utils/chat-prompt-builder';
import type { RetrievedContext, TutorConfig } from '../types';

const mockContext: RetrievedContext = {
  formulas: [
    {
      id: 'f-tvm-fv',
      name: 'Future Value (Single Sum)',
      subject: 'Quantitative Methods',
      formula: 'FV = PV * (1 + r)^n',
      variables: 'PV = Present Value, r = interest rate, n = periods',
      topic: 'Time Value of Money',
      keyTip: 'Compounding increases value exponentially',
      relevanceScore: 9,
    },
  ],
  questions: [
    {
      id: 'q-1',
      questionText: 'What is the future value of $1000 at 8% for 5 years?',
      subject: 'Quantitative Methods',
      topic: 'Time Value of Money',
      relevanceScore: 6,
    },
  ],
};

const emptyContext: RetrievedContext = {
  formulas: [],
  questions: [],
};

describe('chat-prompt-builder', () => {
  describe('buildSystemPrompt', () => {
    it('includes system persona', () => {
      const prompt = buildSystemPrompt(emptyContext);
      expect(prompt).toContain('CFA Buddy');
      expect(prompt).toContain('tutor');
    });

    it('includes retrieved formula context when available', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Future Value (Single Sum)');
      expect(prompt).toContain('FV = PV * (1 + r)^n');
      expect(prompt).toContain('Relevant Formulas');
    });

    it('includes retrieved question context when available', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Related Exam Questions');
      expect(prompt).toContain('future value of $1000');
    });

    it('does not include formula section when no formulas', () => {
      const prompt = buildSystemPrompt({ formulas: [], questions: mockContext.questions });
      expect(prompt).not.toContain('Relevant Formulas');
      expect(prompt).toContain('Related Exam Questions');
    });

    it('does not include question section when no questions', () => {
      const prompt = buildSystemPrompt({ formulas: mockContext.formulas, questions: [] });
      expect(prompt).toContain('Relevant Formulas');
      expect(prompt).not.toContain('Related Exam Questions');
    });

    it('includes citation instructions', () => {
      const prompt = buildSystemPrompt(emptyContext);
      expect(prompt).toContain('Citation');
    });

    it('uses systemPromptOverride when provided', () => {
      const config: TutorConfig = {
        maxHistoryLength: 20,
        contextWindowSize: 5,
        systemPromptOverride: 'You are a custom tutor.',
      };
      const prompt = buildSystemPrompt(mockContext, config);
      expect(prompt).toContain('You are a custom tutor.');
      expect(prompt).not.toContain('CFA Buddy');
    });

    it('includes key tips from formulas', () => {
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Compounding increases value exponentially');
    });
  });

  describe('truncateHistory', () => {
    it('returns all messages when under limit', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
      ];
      const result = truncateHistory(messages);
      expect(result).toEqual(messages);
    });

    it('truncates long history keeping most recent', () => {
      const messages = Array.from({ length: 30 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }));
      const config: TutorConfig = { maxHistoryLength: 10, contextWindowSize: 5 };
      const result = truncateHistory(messages, config);
      expect(result.length).toBe(10);
      expect(result[0].content).toBe('Message 20');
      expect(result[9].content).toBe('Message 29');
    });

    it('respects custom maxHistoryLength', () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }));
      const config: TutorConfig = { maxHistoryLength: 5, contextWindowSize: 5 };
      const result = truncateHistory(messages, config);
      expect(result.length).toBe(5);
    });
  });

  describe('escapeUserInput', () => {
    it('escapes triple backticks', () => {
      const input = 'Here is code ```python\nprint()```';
      const result = escapeUserInput(input);
      expect(result).not.toContain('```');
    });

    it('escapes markdown headings (## or more)', () => {
      const input = '## This is a heading\n### And this';
      const result = escapeUserInput(input);
      expect(result).toContain('\\##');
      expect(result).toContain('\\###');
    });

    it('does not modify normal text', () => {
      const input = 'What is the formula for present value?';
      const result = escapeUserInput(input);
      expect(result).toBe(input);
    });

    it('handles empty string', () => {
      expect(escapeUserInput('')).toBe('');
    });
  });

  describe('buildChatPrompt', () => {
    it('includes system message as first element', () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = buildChatPrompt(mockContext, messages);
      expect(result[0].role).toBe('system');
      expect(result[0].content).toContain('CFA Buddy');
    });

    it('includes user messages after system', () => {
      const messages = [
        { role: 'user' as const, content: 'What is NPV?' },
        { role: 'assistant' as const, content: 'NPV is...' },
        { role: 'user' as const, content: 'How do I calculate it?' },
      ];
      const result = buildChatPrompt(mockContext, messages);
      expect(result.length).toBe(4); // system + 3 messages
      expect(result[1].role).toBe('user');
      expect(result[2].role).toBe('assistant');
      expect(result[3].role).toBe('user');
    });

    it('escapes user input in the prompt', () => {
      const messages = [
        { role: 'user' as const, content: '```code here```' },
      ];
      const result = buildChatPrompt(emptyContext, messages);
      const userMsg = result.find((m) => m.role === 'user');
      expect(userMsg?.content).not.toContain('```');
    });

    it('does not escape assistant messages', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: '```formula here```' },
      ];
      const result = buildChatPrompt(emptyContext, messages);
      const assistantMsg = result.find((m) => m.role === 'assistant');
      expect(assistantMsg?.content).toContain('```formula here```');
    });

    it('truncates long history', () => {
      const messages = Array.from({ length: 30 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }));
      const config: TutorConfig = { maxHistoryLength: 5, contextWindowSize: 5 };
      const result = buildChatPrompt(emptyContext, messages, config);
      // system + 5 truncated messages
      expect(result.length).toBe(6);
    });
  });
});
