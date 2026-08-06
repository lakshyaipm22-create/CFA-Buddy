'use client';

import { useState, useEffect } from 'react';
import { getLocalProfile } from '@/shared/lib/local-profile';
import type { LocalProfile } from '@/shared/lib/local-profile';

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  level: string;
}

interface UseUserResult {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  localProfile: LocalProfile;
}

/**
 * Client-side hook that checks Supabase session and returns user info.
 * Falls back to localStorage profile when Supabase is not configured.
 * Uses useState lazy initializer for localStorage reads (never useSyncExternalStore).
 */
export function useUser(): UseUserResult {
  const [localProfile] = useState<LocalProfile>(() => getLocalProfile());
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
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
          setIsConfigured(false);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsConfigured(true);
      }

      try {
        const { createClient } = await import('@/shared/lib/supabase/client');
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!cancelled) {
          if (authUser) {
            setUser({
              id: authUser.id,
              email: authUser.email || '',
              displayName: authUser.user_metadata?.display_name || '',
              level: authUser.user_metadata?.level || 'I',
            });
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isConfigured,
    localProfile,
  };
}
