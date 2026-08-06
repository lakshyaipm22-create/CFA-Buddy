/**
 * Service Worker Registration Utility
 *
 * Handles registering the service worker, detecting updates,
 * and managing the install prompt event.
 */

const SW_PATH = '/sw.js';
const INSTALL_DISMISSED_KEY = 'cfa-buddy-pwa-install-dismissed';

export interface SwRegistrationCallbacks {
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Registers the service worker and sets up update detection.
 * Returns a cleanup function.
 */
export function registerServiceWorker(
  callbacks: SwRegistrationCallbacks = {}
): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  let registration: ServiceWorkerRegistration | null = null;

  const register = async () => {
    try {
      registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/',
      });

      callbacks.onRegistered?.(registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration?.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New version available
            callbacks.onUpdateAvailable?.(registration!);
          }
        });
      });
    } catch (error) {
      callbacks.onError?.(
        error instanceof Error ? error : new Error('SW registration failed')
      );
    }
  };

  // Register on load
  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }

  // Online/offline detection
  const handleOnline = () => callbacks.onOnline?.();
  const handleOffline = () => callbacks.onOffline?.();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Triggers the service worker to skip waiting and activate immediately.
 */
export function activateUpdate(): void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) {
    return;
  }
  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  window.location.reload();
}

/**
 * Checks if the install prompt has been dismissed by the user.
 */
export function isInstallDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (!dismissed) return false;
    // Allow re-prompting after 7 days
    const dismissedAt = parseInt(dismissed, 10);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < sevenDays;
  } catch {
    return false;
  }
}

/**
 * Marks the install prompt as dismissed.
 */
export function dismissInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Checks if the app is running in standalone (installed) mode.
 */
export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)
  );
}
