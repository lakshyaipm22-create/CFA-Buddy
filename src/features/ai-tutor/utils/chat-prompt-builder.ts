import type { RetrievedContext, TutorConfig } from '../types';

const DEFAULT_CONFIG: TutorConfig = {
  maxHistoryLength: 20,
  contextWindowSize: 5,
};

/**
 * Formats retrieved formula context into a readable string for the AI prompt.
 */
function formatFormulaContext(context: RetrievedContext): string {
  if (context.formulas.length === 0) return '';

  const lines = context.formulas.map(
    (f) =>
      `- ${f.name} (${f.subject} / ${f.topic}): ${f.formula}\n  Variables: ${f.variables}${f.keyTip ? `\n  Key Tip: ${f.keyTip}` : ''}`
  );

  return `\n## Relevant Formulas\n${lines.join('\n')}`;
}

/**
 * Formats retrieved question context into a readable string for the AI prompt.
 */
function formatQuestionContext(context: RetrievedContext): string {
  if (context.questions.length === 0) return '';

  const lines = context.questions.map(
    (q) =>
      `- [${q.subject}${q.topic ? ` / ${q.topic}` : ''}]: ${q.questionText.slice(0, 120)}${q.questionText.length > 120 ? '...' : ''}`
  );

  return `\n## Related Exam Questions\n${lines.join('\n')}`;
}

/**
 * Escapes special characters in user input to prevent prompt injection.
 */
export function escapeUserInput(input: string): string {
  return input
    .replace(/```/g, '\\`\\`\\`')
    .replace(/#{2,}/g, (match) => '\\' + match);
}

/**
 * Builds the system prompt for the AI tutor including:
 * - CFA tutor persona
 * - Retrieved RAG context (formulas and questions)
 * - Instructions for citing sources
 */
export function buildSystemPrompt(
  context: RetrievedContext,
  config: TutorConfig = DEFAULT_CONFIG
): string {
  const formulaSection = formatFormulaContext(context);
  const questionSection = formatQuestionContext(context);
  const contextSection =
    formulaSection || questionSection
      ? `\n# Retrieved Curriculum Context\nUse the following verified CFA curriculum content to ground your answers:${formulaSection}${questionSection}\n`
      : '';

  const systemPrompt = config.systemPromptOverride ?? `You are CFA Buddy, an expert CFA Level I tutor. Your role is to help students understand CFA curriculum concepts clearly and effectively.

# Guidelines
- Explain concepts in plain, accessible language
- Use analogies and real-world examples when helpful
- Always reference specific formulas when relevant to the question
- If you use information from the provided context, mention the formula name or topic
- Break down complex topics into digestible steps
- Correct misconceptions gently and explain why the common mistake happens
- Keep responses focused and exam-relevant
- When discussing formulas, show the formula, define each variable, and provide a brief example
- If you are unsure about something, say so rather than guessing
- Encourage the student and provide exam tips where appropriate

# Citation Instructions
When your answer draws on specific formulas or questions from the context below, reference them by name so the student can look them up.`;

  return `${systemPrompt}${contextSection}`;
}

/**
 * Truncates conversation history to fit within context limits.
 * Keeps the most recent messages up to maxHistoryLength.
 */
export function truncateHistory(
  messages: { role: 'user' | 'assistant'; content: string }[],
  config: TutorConfig = DEFAULT_CONFIG
): { role: 'user' | 'assistant'; content: string }[] {
  if (messages.length <= config.maxHistoryLength) {
    return messages;
  }
  return messages.slice(-config.maxHistoryLength);
}

/**
 * Builds the complete prompt messages array for the AI provider.
 * Includes system prompt with RAG context and truncated conversation history.
 */
export function buildChatPrompt(
  context: RetrievedContext,
  messages: { role: 'user' | 'assistant'; content: string }[],
  config: TutorConfig = DEFAULT_CONFIG
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const systemPrompt = buildSystemPrompt(context, config);
  const truncated = truncateHistory(messages, config);

  return [
    { role: 'system' as const, content: systemPrompt },
    ...truncated.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.role === 'user' ? escapeUserInput(m.content) : m.content,
    })),
  ];
}
