/**
 * Types for email notification system.
 */

export interface EmailConfig {
  apiKey: string | null;
  fromAddress: string;
  replyToAddress: string;
}

export interface WeeklyReportData {
  userName: string;
  email: string;
  questionsAnswered: number;
  accuracyPercent: number;
  streakDays: number;
  topTopics: string[];
  areasToImprove: string[];
  weekStartDate: string;
  weekEndDate: string;
}

export interface StreakReminderData {
  userName: string;
  email: string;
  currentStreak: number;
  topicsDue: string[];
}

export interface EmailPreferences {
  email: string;
  weeklyReportEnabled: boolean;
  streakReminderEnabled: boolean;
  unsubscribeToken: string;
  updatedAt: string;
}

export interface UnsubscribeToken {
  token: string;
  email: string;
  createdAt: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  unsubscribeToken: string;
}

export interface EmailSendResult {
  sent: boolean;
  method: 'resend' | 'console';
  messageId?: string;
}
