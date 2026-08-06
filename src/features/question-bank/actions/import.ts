'use server';

import crypto from 'crypto';
import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';
import { isDatabaseAvailable } from '@/shared/lib/data-layer';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const answerChoiceSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean(),
  explanation: z.string(),
});

const importQuestionSchema = z.object({
  questionText: z.string().min(1),
  answerChoices: z.array(answerChoiceSchema).min(2).max(6),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
  subject: z.string().min(1),
  reading: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  provider: z.string().min(1),
  questionSourceFile: z.string().nullable().optional(),
});

const bulkImportSchema = z.object({
  questions: z.array(importQuestionSchema).min(1).max(1000),
  topicId: z.string().min(1),
  providerId: z.string().min(1),
  overwrite: z.boolean().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ─── Action ──────────────────────────────────────────────────────────────────

/**
 * Bulk import parsed questions into the questions table.
 * Requires a database connection. Without DB, returns an error.
 */
export async function bulkImportQuestions(
  input: z.infer<typeof bulkImportSchema>
): Promise<ActionResult<ImportResult>> {
  const validated = bulkImportSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  if (!isDatabaseAvailable()) {
    return {
      success: false,
      error: 'Database is not available. Bulk import requires a database connection.',
    };
  }

  const { prisma } = await import('@/shared/lib/prisma/client');
  const { questions, topicId, providerId, overwrite } = validated.data;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Validate that topic and provider exist
  try {
    const [topic, provider] = await Promise.all([
      prisma.topic.findUnique({ where: { id: topicId } }),
      prisma.contentProvider.findUnique({ where: { id: providerId } }),
    ]);

    if (!topic) {
      return { success: false, error: `Topic not found: ${topicId}` };
    }
    if (!provider) {
      return { success: false, error: `Provider not found: ${providerId}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error';
    return { success: false, error: `Validation failed: ${message}` };
  }

  // Process questions in batches of 50 for better performance
  const BATCH_SIZE = 50;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);

    for (const q of batch) {
      try {
        // Generate a stable ID based on content to enable idempotent imports
        const contentHash = generateStableId(q.questionText, q.answerChoices);

        if (!overwrite) {
          // Check for existing question with same content hash
          const existing = await prisma.question.findFirst({
            where: {
              id: contentHash,
              topicId,
              providerId,
            },
          });
          if (existing) {
            skipped++;
            continue;
          }
        }

        await prisma.question.upsert({
          where: { id: contentHash },
          update: {
            questionText: q.questionText,
            answerChoices: q.answerChoices,
            difficulty: q.difficulty,
            questionSourceFile: q.questionSourceFile ?? null,
          },
          create: {
            id: contentHash,
            topicId,
            providerId,
            questionText: q.questionText,
            answerChoices: q.answerChoices,
            difficulty: q.difficulty,
            questionSourceFile: q.questionSourceFile ?? null,
            verificationStatus: 'imported',
          },
        });
        imported++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(
          `Question "${q.questionText.slice(0, 50)}...": ${message}`
        );
        skipped++;
      }
    }
  }

  return {
    success: true,
    data: { imported, skipped, errors },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a stable, deterministic ID for a question based on its content.
 * Uses SHA-256 truncated to 16 hex characters (64 bits) for collision resistance.
 * This enables idempotent imports - importing the same question twice does not duplicate it.
 */
function generateStableId(
  questionText: string,
  answerChoices: Array<{ label: string; text: string }>
): string {
  const text = questionText.trim().toLowerCase();
  const provider = answerChoices.map(c => `${c.label}:${c.text.trim().toLowerCase()}`).join('|');
  const topic = text.slice(0, 200);
  const hash = crypto.createHash('sha256').update(text + provider + topic).digest('hex').slice(0, 16);
  return `imp-${hash}`;
}
