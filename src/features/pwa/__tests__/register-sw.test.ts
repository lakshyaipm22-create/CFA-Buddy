import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  registerServiceWorker,
  isInstallDismissed,
  dismissInstallPrompt,
  isAppInstalled,
} from '../utils/register-sw';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock navigator.serviceWorker
const mockRegistration = {
  installing: null,
  waiting: null,
  active: { postMessage: vi.fn() },
  addEventListener: vi.fn(),
  update: vi.fn(),
};

const mockServiceWorker = {
  register: vi.fn().mockResolvedValue(mockRegistration),
  controller: { postMessage: vi.fn() },
  addEventListener: vi.fn(),
};

Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
    onLine: true,
  },
  writable: true,
  configurable: true,
});

// Mock window
const addEventListenerSpy = vi.fn();
const removeEventListenerSpy = vi.fn();
const matchMediaMock = vi.fn().mockReturnValue({ matches: false });

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: addEventListenerSpy,
    removeEventListener: removeEventListenerSpy,
    matchMedia: matchMediaMock,
    location: { reload: vi.fn() },
    localStorage: localStorageMock,
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'document', {
  value: {
    readyState: 'complete',
  },
  writable: true,
  configurable: true,
});

describe('register-sw', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerServiceWorker', () => {
    it('registers the service worker when navigator.serviceWorker is available', async () => {
      const onRegistered = vi.fn();
      registerServiceWorker({ onRegistered });

      // Wait for async registration
      await vi.waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
          scope: '/',
        });
      });
    });

    it('calls onRegistered callback after successful registration', async () => {
      const onRegistered = vi.fn();
      registerServiceWorker({ onRegistered });

      await vi.waitFor(() => {
        expect(onRegistered).toHaveBeenCalledWith(mockRegistration);
      });
    });

    it('calls onError callback when registration fails', async () => {
      const error = new Error('Registration failed');
      mockServiceWorker.register.mockRejectedValueOnce(error);

      const onError = vi.fn();
      registerServiceWorker({ onError });

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('sets up online/offline event listeners', () => {
      registerServiceWorker({ onOnline: vi.fn(), onOffline: vi.fn() });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });

    it('returns a cleanup function that removes event listeners', () => {
      const cleanup = registerServiceWorker({});
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });

    it('invokes onOffline callback when offline event fires', () => {
      const onOffline = vi.fn();
      registerServiceWorker({ onOffline });

      // Find the offline handler registered on window
      const offlineCall = addEventListenerSpy.mock.calls.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (call: any) => call[0] === 'offline'
      );
      expect(offlineCall).toBeDefined();

      // Invoke the handler
      offlineCall![1]();
      expect(onOffline).toHaveBeenCalled();
    });

    it('invokes onOnline callback when online event fires', () => {
      const onOnline = vi.fn();
      registerServiceWorker({ onOnline });

      const onlineCall = addEventListenerSpy.mock.calls.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (call: any) => call[0] === 'online'
      );
      expect(onlineCall).toBeDefined();

      onlineCall![1]();
      expect(onOnline).toHaveBeenCalled();
    });
  });

  describe('isInstallDismissed', () => {
    it('returns false when no dismissal stored', () => {
      expect(isInstallDismissed()).toBe(false);
    });

    it('returns true when recently dismissed', () => {
      localStorageMock.setItem(
        'cfa-buddy-pwa-install-dismissed',
        String(Date.now())
      );
      expect(isInstallDismissed()).toBe(true);
    });

    it('returns false when dismissed more than 7 days ago', () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorageMock.setItem(
        'cfa-buddy-pwa-install-dismissed',
        String(eightDaysAgo)
      );
      expect(isInstallDismissed()).toBe(false);
    });
  });

  describe('dismissInstallPrompt', () => {
    it('stores the current timestamp in localStorage', () => {
      const before = Date.now();
      dismissInstallPrompt();
      const after = Date.now();

      const stored = parseInt(
        localStorageMock.getItem('cfa-buddy-pwa-install-dismissed')!,
        10
      );
      expect(stored).toBeGreaterThanOrEqual(before);
      expect(stored).toBeLessThanOrEqual(after);
    });
  });

  describe('isAppInstalled', () => {
    it('returns false when not in standalone mode', () => {
      matchMediaMock.mockReturnValue({ matches: false });
      expect(isAppInstalled()).toBe(false);
    });

    it('returns true when in standalone display mode', () => {
      matchMediaMock.mockReturnValue({ matches: true });
      expect(isAppInstalled()).toBe(true);
    });
  });
});
