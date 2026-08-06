import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock resend module
vi.mock('resend', () => {
  class MockResend {
    emails = {
      send: vi.fn().mockResolvedValue({ data: { id: 'mock-id-123' }, error: null }),
    };
  }
  return { Resend: MockResend };
});

describe('email-client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('logs to console when RESEND_API_KEY is not set', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { sendEmail } = await import('../utils/email-client');
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
      unsubscribeToken: 'test-token-123',
    });

    expect(result.sent).toBe(true);
    expect(result.method).toBe('console');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No RESEND_API_KEY configured')
    );

    consoleSpy.mockRestore();
  });

  it('uses Resend client when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 're_test_key_123';

    const { sendEmail } = await import('../utils/email-client');
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
      unsubscribeToken: 'test-token-123',
    });

    expect(result.sent).toBe(true);
    expect(result.method).toBe('resend');
    expect(result.messageId).toBe('mock-id-123');
  });

  it('generates correct unsubscribe URL', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://cfabuddy.com';

    const { getUnsubscribeUrl } = await import('../utils/email-client');
    const url = getUnsubscribeUrl('my-token-abc');

    expect(url).toBe('https://cfabuddy.com/api/email/unsubscribe?token=my-token-abc');
  });

  it('uses default localhost URL when NEXT_PUBLIC_APP_URL is not set', async () => {
    const { getUnsubscribeUrl } = await import('../utils/email-client');
    const url = getUnsubscribeUrl('my-token');

    expect(url).toBe('http://localhost:3000/api/email/unsubscribe?token=my-token');
  });

  it('appends unsubscribe footer to email HTML', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { sendEmail } = await import('../utils/email-client');
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Body</p>',
      unsubscribeToken: 'token-xyz',
    });

    // The console log should include the unsubscribe link info
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Email] Unsubscribe URL:',
      expect.stringContaining('token-xyz')
    );

    consoleSpy.mockRestore();
  });
});

describe('preferences', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      length: 0,
      key: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns default preferences when nothing stored', async () => {
    const { getEmailPreferences } = await import('../utils/preferences');
    const prefs = getEmailPreferences();

    expect(prefs.email).toBe('');
    expect(prefs.weeklyReportEnabled).toBe(false);
    expect(prefs.streakReminderEnabled).toBe(false);
    expect(prefs.unsubscribeToken).toBeTruthy();
    expect(prefs.updatedAt).toBeTruthy();
  });

  it('saves and retrieves preferences', async () => {
    const { getEmailPreferences, saveEmailPreferences } = await import('../utils/preferences');

    saveEmailPreferences({
      email: 'test@example.com',
      weeklyReportEnabled: true,
      streakReminderEnabled: false,
      unsubscribeToken: 'my-token',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    const retrieved = getEmailPreferences();
    expect(retrieved.email).toBe('test@example.com');
    expect(retrieved.weeklyReportEnabled).toBe(true);
    expect(retrieved.streakReminderEnabled).toBe(false);
    expect(retrieved.unsubscribeToken).toBe('my-token');
  });

  it('updates specific fields without losing others', async () => {
    const { saveEmailPreferences, updateEmailPreferences, getEmailPreferences } = await import('../utils/preferences');

    saveEmailPreferences({
      email: 'original@example.com',
      weeklyReportEnabled: false,
      streakReminderEnabled: false,
      unsubscribeToken: 'keep-this-token',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    updateEmailPreferences({ weeklyReportEnabled: true });

    const prefs = getEmailPreferences();
    expect(prefs.email).toBe('original@example.com');
    expect(prefs.weeklyReportEnabled).toBe(true);
    expect(prefs.unsubscribeToken).toBe('keep-this-token');
  });

  it('unsubscribes from all notifications', async () => {
    const { saveEmailPreferences, unsubscribeAll, getEmailPreferences } = await import('../utils/preferences');

    saveEmailPreferences({
      email: 'test@example.com',
      weeklyReportEnabled: true,
      streakReminderEnabled: true,
      unsubscribeToken: 'token-123',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    unsubscribeAll();

    const prefs = getEmailPreferences();
    expect(prefs.weeklyReportEnabled).toBe(false);
    expect(prefs.streakReminderEnabled).toBe(false);
    expect(prefs.email).toBe('test@example.com'); // email preserved
  });

  it('validates unsubscribe tokens', async () => {
    const { saveEmailPreferences, validateUnsubscribeToken } = await import('../utils/preferences');

    saveEmailPreferences({
      email: 'test@example.com',
      weeklyReportEnabled: true,
      streakReminderEnabled: true,
      unsubscribeToken: 'valid-token-abc',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    expect(validateUnsubscribeToken('valid-token-abc')).toBe(true);
    expect(validateUnsubscribeToken('wrong-token')).toBe(false);
    expect(validateUnsubscribeToken('')).toBe(false);
  });
});

describe('templates', () => {
  it('renders weekly report email with data', async () => {
    const { renderWeeklyReportEmail } = await import('../templates/weekly-report');

    const html = renderWeeklyReportEmail({
      userName: 'John',
      email: 'john@example.com',
      questionsAnswered: 42,
      accuracyPercent: 78,
      streakDays: 7,
      topTopics: ['Ethics', 'Fixed Income'],
      areasToImprove: ['Derivatives'],
      weekStartDate: '2025-01-06',
      weekEndDate: '2025-01-12',
    });

    expect(html).toContain('John');
    expect(html).toContain('42');
    expect(html).toContain('78%');
    expect(html).toContain('7');
    expect(html).toContain('Ethics');
    expect(html).toContain('Fixed Income');
    expect(html).toContain('Derivatives');
    expect(html).toContain('Weekly Progress Report');
  });

  it('renders streak reminder email with data', async () => {
    const { renderStreakReminderEmail } = await import('../templates/streak-reminder');

    const html = renderStreakReminderEmail({
      userName: 'Jane',
      email: 'jane@example.com',
      currentStreak: 14,
      topicsDue: ['Equity', 'Portfolio Management'],
    });

    expect(html).toContain('Jane');
    expect(html).toContain('14-day streak');
    expect(html).toContain('Equity');
    expect(html).toContain('Portfolio Management');
    expect(html).toContain('Streak Reminder');
  });

  it('escapes HTML in user-provided data', async () => {
    const { renderWeeklyReportEmail } = await import('../templates/weekly-report');

    const html = renderWeeklyReportEmail({
      userName: '<script>alert("xss")</script>',
      email: 'test@example.com',
      questionsAnswered: 10,
      accuracyPercent: 50,
      streakDays: 1,
      topTopics: ['Topic<br>'],
      areasToImprove: [],
      weekStartDate: '2025-01-06',
      weekEndDate: '2025-01-12',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Topic&lt;br&gt;');
  });
});

describe('send-weekly-report action', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
  });

  it('returns error when email is missing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendWeeklyReport } = await import('../actions/send-weekly-report');

    const result = await sendWeeklyReport({
      email: '',
      userName: 'Test',
      unsubscribeToken: 'token',
      questionsAnswered: 10,
      questionsCorrect: 8,
      streakDays: 5,
      topTopics: [],
      areasToImprove: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Email address is required');
    }
  });

  it('sends weekly report successfully', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendWeeklyReport } = await import('../actions/send-weekly-report');

    const result = await sendWeeklyReport({
      email: 'test@example.com',
      userName: 'Test User',
      unsubscribeToken: 'token-123',
      questionsAnswered: 25,
      questionsCorrect: 20,
      streakDays: 3,
      topTopics: ['Ethics'],
      areasToImprove: ['Derivatives'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.method).toBe('console');
    }
  });
});

describe('send-streak-reminder action', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
  });

  it('returns error when email is missing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendStreakReminder } = await import('../actions/send-streak-reminder');

    const result = await sendStreakReminder({
      email: '',
      userName: 'Test',
      unsubscribeToken: 'token',
      currentStreak: 5,
      topicsDue: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Email address is required');
    }
  });

  it('returns error when no active streak', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendStreakReminder } = await import('../actions/send-streak-reminder');

    const result = await sendStreakReminder({
      email: 'test@example.com',
      userName: 'Test',
      unsubscribeToken: 'token',
      currentStreak: 0,
      topicsDue: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No active streak');
    }
  });

  it('sends streak reminder successfully', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendStreakReminder } = await import('../actions/send-streak-reminder');

    const result = await sendStreakReminder({
      email: 'test@example.com',
      userName: 'Test User',
      unsubscribeToken: 'token-456',
      currentStreak: 7,
      topicsDue: ['Ethics', 'Quant'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.method).toBe('console');
    }
  });
});
