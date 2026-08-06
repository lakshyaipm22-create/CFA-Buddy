'use client';

import { useState, useEffect, useCallback } from 'react';
import { dismissInstallPrompt, isInstallDismissed, isAppInstalled } from '../utils/register-sw';
import type { BeforeInstallPromptEvent } from '../types';

/**
 * Install Prompt Banner
 *
 * Shows an install banner when the beforeinstallprompt event fires.
 * Dismissable by the user - persists dismissal to localStorage.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (isAppInstalled() || isInstallDismissed()) {
      return;
    }

    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    dismissInstallPrompt();
    setShowBanner(false);
    setDeferredPrompt(null);
  }, []);

  if (!showBanner) return null;

  return (
    <div
      role="banner"
      aria-label="Install CFA Buddy"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-[#C5A258]/30 bg-[#0a0e14] p-4 shadow-lg md:left-auto md:right-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#002B5C]">
          <svg
            className="h-5 w-5 text-[#C5A258]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Install CFA Buddy</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Install for offline access to questions and flashcards
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        onClick={handleInstall}
        className="mt-3 w-full rounded-lg bg-[#C5A258] px-4 py-2 text-sm font-medium text-[#0a0e14] transition-colors hover:bg-[#C5A258]/90"
      >
        Install App
      </button>
    </div>
  );
}
