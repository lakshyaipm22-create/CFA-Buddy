'use server';

import { z } from 'zod';
import type { ActionResult } from '@/shared/types/action-result';

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_EXPIRY_DAYS = 7;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const saveSessionStateSchema = z.object({
  sessionId: z.string().min(1),
  currentQuestionIndex: z.number().int().min(0),
  answers: z.record(z.string(), z.string()),
  timeRemainingSeconds: z.number().int().min(0).nullable(),
  questionIds: z.array(z.string().min(1)),
  mode: z.string().min(1),
  config: z.object({
    questionCount: z.number().int().min(1),
    timeLimit: z.number().int().nullable(),
    subject: z.string().optional(),
    topic: z.string().optional(),
  }),
});

const resumeSessionSchema = z.object({
  sessionId: z.string().min(1),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PersistedSessionState {
  sessionId: string;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  timeRemainingSeconds: number | null;
  questionIds: string[];
  mode: string;
  config: {
    questionCount: number;
    timeLimit: number | null;
    subject?: string;
    topic?: string;
  };
  savedAt: string;
  expiresAt: string;
}

interface ExpireResult {
  expired: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExpiryDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_EXPIRY_DAYS);
  return date.toISOString();
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Save the current state of a quiz session for later resumption.
 * Stores answers, current question index, and time remaining.
 * This action validates the input server-side and returns the session state
 * for the client to persist in localStorage (with 7-day expiry).
 */
export async function saveSessionState(
  input: z.infer<typeof saveSessionStateSchema>
): Promise<ActionResult<PersistedSessionState>> {
  const validated = saveSessionStateSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const now = new Date().toISOString();
  const expiresAt = getExpiryDate();

  const sessionState: PersistedSessionState = {
    sessionId: validated.data.sessionId,
    currentQuestionIndex: validated.data.currentQuestionIndex,
    answers: validated.data.answers,
    timeRemainingSeconds: validated.data.timeRemainingSeconds,
    questionIds: validated.data.questionIds,
    mode: validated.data.mode,
    config: validated.data.config,
    savedAt: now,
    expiresAt,
  };

  return { success: true, data: sessionState };
}

/**
 * Resume a previously saved session.
 * Validates the session ID and returns null (client checks localStorage).
 */
export async function resumeSession(
  input: z.infer<typeof resumeSessionSchema>
): Promise<ActionResult<PersistedSessionState | null>> {
  const validated = resumeSessionSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  // Session data is stored client-side in localStorage.
  // This action exists for future DB integration and input validation.
  return { success: true, data: null };
}

/**
 * Expire and clean up sessions older than 7 days.
 * Currently a no-op server-side; the client handles localStorage expiry.
 * This action exists for future DB integration.
 */
export async function expireOldSessions(): Promise<ActionResult<ExpireResult>> {
  // Session expiry is handled client-side via localStorage.
  // When a DB model is added, this action will clean up expired records.
  return { success: true, data: { expired: 0 } };
}
