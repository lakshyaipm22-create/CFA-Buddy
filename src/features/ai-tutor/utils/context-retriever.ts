import { formulaSeed } from '@/features/formulas/data/formula-seed';
import { sampleQuestions } from '@/features/question-bank/data/sample-questions';
import type { FormulaContext, QuestionContext, RetrievedContext } from '../types';

const MAX_RESULTS = 5;

/**
 * Tokenizes a query string into lowercase keywords for matching.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Calculates a relevance score based on keyword matches across fields.
 * Each matching keyword in a high-priority field (name, topic) counts more.
 */
function scoreFormula(
  keywords: string[],
  fields: { name: string; topic: string; variables: string; keyTip: string; subject: string }
): number {
  let score = 0;
  const nameLower = fields.name.toLowerCase();
  const topicLower = fields.topic.toLowerCase();
  const variablesLower = fields.variables.toLowerCase();
  const keyTipLower = fields.keyTip.toLowerCase();
  const subjectLower = fields.subject.toLowerCase();

  for (const kw of keywords) {
    if (nameLower.includes(kw)) score += 3;
    if (topicLower.includes(kw)) score += 3;
    if (subjectLower.includes(kw)) score += 2;
    if (variablesLower.includes(kw)) score += 1;
    if (keyTipLower.includes(kw)) score += 1;
  }

  return score;
}

/**
 * Calculates a relevance score for a question based on keyword matches.
 */
function scoreQuestion(
  keywords: string[],
  fields: { questionText: string; topic: string; subject: string }
): number {
  let score = 0;
  const textLower = fields.questionText.toLowerCase();
  const topicLower = fields.topic.toLowerCase();
  const subjectLower = fields.subject.toLowerCase();

  for (const kw of keywords) {
    if (topicLower.includes(kw)) score += 3;
    if (subjectLower.includes(kw)) score += 2;
    if (textLower.includes(kw)) score += 1;
  }

  return score;
}

/**
 * Finds the top-5 most relevant formulas for a given query.
 * Uses keyword matching on name, topic, variables, keyTip, and subject fields.
 */
export function findRelevantFormulas(query: string): FormulaContext[] {
  const keywords = tokenize(query);
  if (keywords.length === 0) return [];

  const scored = formulaSeed
    .map((f) => ({
      id: f.id,
      name: f.name,
      subject: f.subject,
      formula: f.formula,
      variables: f.variables,
      topic: f.topic,
      keyTip: f.keyTip,
      relevanceScore: scoreFormula(keywords, {
        name: f.name,
        topic: f.topic,
        variables: f.variables,
        keyTip: f.keyTip ?? '',
        subject: f.subject,
      }),
    }))
    .filter((f) => f.relevanceScore > 0);

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scored.slice(0, MAX_RESULTS);
}

/**
 * Finds the top-5 most relevant questions for a given query.
 * Uses keyword matching on questionText, topic, and subject fields.
 */
export function findRelevantQuestions(query: string): QuestionContext[] {
  const keywords = tokenize(query);
  if (keywords.length === 0) return [];

  const scored = sampleQuestions
    .map((q) => ({
      id: q.id,
      questionText: q.questionText,
      subject: q.subject,
      topic: q.topic,
      relevanceScore: scoreQuestion(keywords, {
        questionText: q.questionText,
        topic: q.topic ?? '',
        subject: q.subject,
      }),
    }))
    .filter((q) => q.relevanceScore > 0);

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scored.slice(0, MAX_RESULTS);
}

/**
 * Builds the full RAG context by finding relevant formulas and questions.
 * Returns structured context ready for inclusion in the AI prompt.
 */
export function buildContext(query: string): RetrievedContext {
  const formulas = findRelevantFormulas(query);
  const questions = findRelevantQuestions(query);
  return { formulas, questions };
}
