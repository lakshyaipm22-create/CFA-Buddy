/**
 * Email client utility.
 * Uses Resend when RESEND_API_KEY is configured, otherwise logs to console.
 */

import { Resend } from 'resend';
import type { EmailConfig, SendEmailOptions, EmailSendResult } from '../types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'CFA Buddy <noreply@cfabuddy.com>';

function getEmailConfig(): EmailConfig {
  return {
    apiKey: process.env.RESEND_API_KEY || null,
    fromAddress: FROM_ADDRESS,
    replyToAddress: 'support@cfabuddy.com',
  };
}

/**
 * Generate the unsubscribe URL for a given token.
 */
export function getUnsubscribeUrl(token: string): string {
  return `${APP_URL}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Send an email using Resend or log to console if no API key is configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const config = getEmailConfig();

  const unsubscribeUrl = getUnsubscribeUrl(options.unsubscribeToken);
  const htmlWithUnsubscribe = `${options.html}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
      <p>You received this email because you opted in to CFA Buddy notifications.</p>
      <p><a href="${unsubscribeUrl}" style="color: #C5A258;">Unsubscribe from these emails</a></p>
    </div>`;

  if (config.apiKey) {
    const resend = new Resend(config.apiKey);

    const { data, error } = await resend.emails.send({
      from: config.fromAddress,
      to: options.to,
      subject: options.subject,
      html: htmlWithUnsubscribe,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
      },
    });

    if (error) {
      console.error('[Email] Failed to send via Resend:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return {
      sent: true,
      method: 'resend',
      messageId: data?.id,
    };
  }

  // Fallback: log to console
  console.log('[Email] No RESEND_API_KEY configured. Logging email to console:');
  console.log('[Email] To:', options.to);
  console.log('[Email] Subject:', options.subject);
  console.log('[Email] HTML length:', htmlWithUnsubscribe.length, 'chars');
  console.log('[Email] Unsubscribe URL:', unsubscribeUrl);
  console.log('[Email] --- End of email ---');

  return {
    sent: true,
    method: 'console',
  };
}
