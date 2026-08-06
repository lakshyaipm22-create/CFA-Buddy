'use server';

/**
 * Server action to compute weekly stats and send the weekly progress report email.
 */

import type { ActionResult } from '@/shared/types/action-result';
import type { WeeklyReportData, EmailSendResult } from '../types';
import { sendEmail } from '../utils/email-client';
import { renderWeeklyReportEmail } from '../templates/weekly-report';

export interface WeeklyReportInput {
  email: string;
  userName: string;
  unsubscribeToken: string;
  questionsAnswered: number;
  questionsCorrect: number;
  streakDays: number;
  topTopics: string[];
  areasToImprove: string[];
}

function getWeekDateRange(): { weekStartDate: string; weekEndDate: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStartDate: monday.toISOString().split('T')[0],
    weekEndDate: sunday.toISOString().split('T')[0],
  };
}

export async function sendWeeklyReport(input: WeeklyReportInput): Promise<ActionResult<EmailSendResult>> {
  try {
    if (!input.email) {
      return { success: false, error: 'Email address is required' };
    }

    const { weekStartDate, weekEndDate } = getWeekDateRange();
    const accuracyPercent = input.questionsAnswered > 0
      ? Math.round((input.questionsCorrect / input.questionsAnswered) * 100)
      : 0;

    const reportData: WeeklyReportData = {
      userName: input.userName || 'CFA Candidate',
      email: input.email,
      questionsAnswered: input.questionsAnswered,
      accuracyPercent,
      streakDays: input.streakDays,
      topTopics: input.topTopics.slice(0, 5),
      areasToImprove: input.areasToImprove.slice(0, 5),
      weekStartDate,
      weekEndDate,
    };

    const html = renderWeeklyReportEmail(reportData);

    const result = await sendEmail({
      to: input.email,
      subject: `Your Weekly CFA Study Report (${weekStartDate})`,
      html,
      unsubscribeToken: input.unsubscribeToken,
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send weekly report';
    return { success: false, error: message };
  }
}
