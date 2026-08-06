import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sendWeeklyReport } from '@/features/email-notifications/actions/send-weekly-report';

const sendWeeklySchema = z.object({
  email: z.string().email(),
  userName: z.string().min(1).default('CFA Candidate'),
  unsubscribeToken: z.string().min(1),
  questionsAnswered: z.number().min(0),
  questionsCorrect: z.number().min(0),
  streakDays: z.number().min(0),
  topTopics: z.array(z.string()).default([]),
  areasToImprove: z.array(z.string()).default([]),
});

/**
 * POST /api/email/send-weekly
 * Triggers a weekly progress report email.
 * Designed to be called by a cron job or manually.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization via a simple secret header (optional)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const parsed = sendWeeklySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await sendWeeklyReport(parsed.data);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      method: result.data.method,
      messageId: result.data.messageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
