import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/email/unsubscribe?token=<token>
 * Handles email unsubscribe requests.
 * Validates the token and returns a confirmation page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(renderHtmlResponse(
      'Invalid Link',
      'This unsubscribe link is missing a required token. Please use the link from your email.',
      false
    ), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // In a production setup, we would validate the token against a database.
  // For localStorage-based preferences, the token acts as a simple verification.
  // The client-side preferences will be updated when the user visits the app next.
  // For now, we accept all valid-looking tokens (UUID format or similar).
  const isValidFormat = token.length >= 8;

  if (!isValidFormat) {
    return new NextResponse(renderHtmlResponse(
      'Invalid Token',
      'This unsubscribe link contains an invalid token. Please check your email for a valid link.',
      false
    ), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Return success page with a script that updates localStorage if available
  return new NextResponse(renderHtmlResponse(
    'Unsubscribed Successfully',
    'You have been unsubscribed from CFA Buddy email notifications. You can re-enable notifications at any time from your settings.',
    true,
    token
  ), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderHtmlResponse(title: string, message: string, success: boolean, token?: string): string {
  const localStorageScript = success && token ? `
    <script>
      try {
        var key = 'cfa-buddy-email-prefs';
        var raw = localStorage.getItem(key);
        if (raw) {
          var prefs = JSON.parse(raw);
          if (prefs.unsubscribeToken === '${token.replace(/'/g, "\\'")}') {
            prefs.weeklyReportEnabled = false;
            prefs.streakReminderEnabled = false;
            prefs.updatedAt = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(prefs));
          }
        }
      } catch (e) {}
    </script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - CFA Buddy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
  <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px; text-align: center;">
    <div style="background-color: #1a1f2e; padding: 40px; border-radius: 12px; border: 1px solid #2a3040;">
      <h1 style="color: ${success ? '#00843D' : '#ef4444'}; margin: 0 0 16px 0; font-size: 24px;">${title}</h1>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">${message}</p>
      <a href="/" style="display: inline-block; padding: 12px 24px; background-color: #C5A258; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to CFA Buddy</a>
    </div>
  </div>
  ${localStorageScript}
</body>
</html>`;
}
