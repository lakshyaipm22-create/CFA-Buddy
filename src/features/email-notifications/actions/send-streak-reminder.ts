'use server';

/**
 * Server action to check streak status and send a reminder if at risk.
 */

import type { ActionResult } from '@/shared/types/action-result';
import type { StreakReminderData, EmailSendResult } from '../types';
import { sendEmail } from '../utils/email-client';
import { renderStreakReminderEmail } from '../templates/streak-reminder';

export interface StreakReminderInput {
  email: string;
  userName: string;
  unsubscribeToken: string;
  currentStreak: number;
  topicsDue: string[];
}

export async function sendStreakReminder(input: StreakReminderInput): Promise<ActionResult<EmailSendResult>> {
  try {
    if (!input.email) {
      return { success: false, error: 'Email address is required' };
    }

    if (input.currentStreak <= 0) {
      return { success: false, error: 'No active streak to remind about' };
    }

    const reminderData: StreakReminderData = {
      userName: input.userName || 'CFA Candidate',
      email: input.email,
      currentStreak: input.currentStreak,
      topicsDue: input.topicsDue.slice(0, 5),
    };

    const html = renderStreakReminderEmail(reminderData);

    const result = await sendEmail({
      to: input.email,
      subject: `Your ${input.currentStreak}-day streak is at risk! - CFA Buddy`,
      html,
      unsubscribeToken: input.unsubscribeToken,
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send streak reminder';
    return { success: false, error: message };
  }
}
