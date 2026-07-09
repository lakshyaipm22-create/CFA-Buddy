import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('env schema', () => {
  it('should validate correct environment variables', () => {
    const envSchema = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
      DATABASE_URL: z.string().min(1),
      NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
      CONTENT_BASE_PATH: z.string().default('./content'),
    });

    const validEnv = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      CONTENT_BASE_PATH: './content',
    };

    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it('should reject invalid environment variables', () => {
    const envSchema = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
      DATABASE_URL: z.string().min(1),
      NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
      CONTENT_BASE_PATH: z.string().default('./content'),
    });

    const invalidEnv = {
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      DATABASE_URL: '',
    };

    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);
  });
});
