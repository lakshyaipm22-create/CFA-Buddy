/**
 * Weekly progress report email template.
 * Returns plain HTML string with inline styles for email compatibility.
 */

import type { WeeklyReportData } from '../types';

export function renderWeeklyReportEmail(data: WeeklyReportData): string {
  const topTopicsHtml = data.topTopics.length > 0
    ? data.topTopics.map(t => `<li style="padding: 4px 0; color: #00843D;">${escapeHtml(t)}</li>`).join('')
    : '<li style="padding: 4px 0; color: #6b7280;">No topics studied this week</li>';

  const areasToImproveHtml = data.areasToImprove.length > 0
    ? data.areasToImprove.map(t => `<li style="padding: 4px 0; color: #C5A258;">${escapeHtml(t)}</li>`).join('')
    : '<li style="padding: 4px 0; color: #6b7280;">Keep up the good work!</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Progress Report - CFA Buddy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #002B5C; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #C5A258; margin: 0; font-size: 24px;">CFA Buddy</h1>
      <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px;">Weekly Progress Report</p>
    </div>
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <p style="color: #1f2937; font-size: 16px; margin: 0 0 24px 0;">
        Hi ${escapeHtml(data.userName)}, here is your weekly study summary for ${escapeHtml(data.weekStartDate)} to ${escapeHtml(data.weekEndDate)}:
      </p>

      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 16px; background-color: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
              <div style="font-size: 28px; font-weight: bold; color: #002B5C;">${data.questionsAnswered}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Questions</div>
            </td>
            <td style="width: 8px;"></td>
            <td style="padding: 16px; background-color: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
              <div style="font-size: 28px; font-weight: bold; color: ${data.accuracyPercent >= 70 ? '#00843D' : '#C5A258'};">${data.accuracyPercent}%</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Accuracy</div>
            </td>
            <td style="width: 8px;"></td>
            <td style="padding: 16px; background-color: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
              <div style="font-size: 28px; font-weight: bold; color: #C5A258;">${data.streakDays}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Day Streak</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #002B5C; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Top Topics</h3>
        <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
          ${topTopicsHtml}
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #002B5C; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Areas to Improve</h3>
        <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
          ${areasToImproveHtml}
        </ul>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/practice" style="display: inline-block; padding: 12px 24px; background-color: #C5A258; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Continue Studying</a>
      </div>
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
