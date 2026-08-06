/**
 * Streak reminder email template.
 * Returns plain HTML string with inline styles for email compatibility.
 */

import type { StreakReminderData } from '../types';

export function renderStreakReminderEmail(data: StreakReminderData): string {
  const topicsDueHtml = data.topicsDue.length > 0
    ? data.topicsDue.map(t => `<li style="padding: 4px 0; color: #002B5C;">${escapeHtml(t)}</li>`).join('')
    : '<li style="padding: 4px 0; color: #6b7280;">Any topic of your choice</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Streak Reminder - CFA Buddy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #002B5C; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #C5A258; margin: 0; font-size: 24px;">CFA Buddy</h1>
      <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px;">Streak Reminder</p>
    </div>
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 8px;">&#128293;</div>
        <h2 style="color: #002B5C; margin: 0; font-size: 20px;">Your ${data.currentStreak}-day streak is at risk!</h2>
      </div>

      <p style="color: #1f2937; font-size: 16px; margin: 0 0 24px 0; text-align: center;">
        Hi ${escapeHtml(data.userName)}, practice today to keep your streak going. Answer at least 10 questions to maintain it!
      </p>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="color: #002B5C; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Suggested Topics</h3>
        <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
          ${topicsDueHtml}
        </ul>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/practice" style="display: inline-block; padding: 12px 24px; background-color: #00843D; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Practice Now</a>
      </div>

      <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 24px;">
        Tip: Consistent daily practice, even just 10 questions, builds long-term retention.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
