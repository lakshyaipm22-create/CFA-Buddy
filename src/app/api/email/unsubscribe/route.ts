import { NextResponse, type NextRequest } from 'next/server';

/** UUID v4 regex for strict token validation */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/email/unsubscribe?token=<token>
 * Handles email unsubscribe requests.
 * Validates the token strictly (UUID format) before rendering.
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

  // Strict UUID format validation to prevent XSS via token interpolation
  if (!UUID_REGEX.test(token)) {
    return new NextResponse(renderHtmlResponse(
      'Invalid Token',
      'This unsubscribe link contains an invalid token. Please check your email for a valid link.',
      false
    ), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Return success page with a script that updates localStorage if available.
  // The token is validated as UUID above, so it only contains hex digits and hyphens.
  // We respond identically regardless of whether the token matches a real user
  // (since preferences live in localStorage, there is no server-side lookup).
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
  // Use a data attribute and JSON.stringify for safe token embedding.
  // The token is already validated as UUID (hex + hyphens only), but we still use
  // proper encoding as defense-in-depth against any future relaxation of validation.
  const safeToken = token ? JSON.stringify(token) : '""';
  const localStorageScript = success && token ? `
    <script>
      try {
        var tokenEl = document.getElementById('unsub-data');
        var t = tokenEl ? tokenEl.getAttribute('data-token') : null;
        if (t) {
          var key = 'cfa-buddy-email-prefs';
          var raw = localStorage.getItem(key);
          if (raw) {
            var prefs = JSON.parse(raw);
            if (prefs.unsubscribeToken === t) {
              prefs.weeklyReportEnabled = false;
              prefs.streakReminderEnabled = false;
              prefs.updatedAt = new Date().toISOString();
              localStorage.setItem(key, JSON.stringify(prefs));
            }
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
  ${success && token ? `<span id="unsub-data" data-token=${safeToken} hidden></span>` : ''}
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
