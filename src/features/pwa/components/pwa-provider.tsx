'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../utils/register-sw';
import { cacheAllStudyData } from '../utils/offline-cache';
import { InstallPrompt } from './install-prompt';
import { OfflineIndicator } from './offline-indicator';

/**
 * PWA Provider
 *
 * Wraps the app to register the service worker and manage PWA state.
 * Renders the install prompt and offline indicator.
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = registerServiceWorker({
      onRegistered: () => {
        // Cache study data once SW is ready
        // Small delay to ensure SW controller is active
        setTimeout(() => {
          cacheAllStudyData();
        }, 1000);
      },
      onUpdateAvailable: () => {
        // Could show an update notification here in the future
      },
    });

    return cleanup;
  }, []);

  return (
    <>
      {children}
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}
