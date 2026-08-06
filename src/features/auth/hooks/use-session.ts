'use client';

import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
}

/**
 * Client-side hook for Supabase session state management.
 * Returns null session when Supabase is not configured, allowing
 * the app to gracefully degrade to localStorage-based features.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    isLoading: true,
    isConfigured: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (
        !supabaseUrl ||
        !supabaseAnonKey ||
        supabaseUrl.includes('placeholder') ||
        supabaseAnonKey.includes('placeholder') ||
        supabaseAnonKey === 'your-anon-key'
      ) {
        if (!cancelled) {
          setState({ session: null, isLoading: false, isConfigured: false });
        }
        return;
      }

      try {
        const { createClient } = await import('@/shared/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) {
          setState({ session, isLoading: false, isConfigured: true });
        }
      } catch {
        if (!cancelled) {
          setState({ session: null, isLoading: false, isConfigured: true });
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
