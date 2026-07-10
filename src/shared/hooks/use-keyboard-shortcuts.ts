'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Shared state for help modal (module-level so multiple hook consumers share state)
let helpModalListeners: Array<(open: boolean) => void> = [];
let helpModalOpen = false;

function setHelpModalOpen(open: boolean) {
  helpModalOpen = open;
  helpModalListeners.forEach((listener) => listener(open));
}

export function useShortcutHelpModal() {
  const [isOpen, setIsOpen] = useState(helpModalOpen);

  useEffect(() => {
    const listener = (open: boolean) => setIsOpen(open);
    helpModalListeners.push(listener);
    return () => {
      helpModalListeners = helpModalListeners.filter((l) => l !== listener);
    };
  }, []);

  const open = useCallback(() => setHelpModalOpen(true), []);
  const close = useCallback(() => setHelpModalOpen(false), []);

  return { isOpen, open, close };
}

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let gPrefixActive = false;
    let gPrefixTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Handle "g then X" sequences
      if (gPrefixActive) {
        gPrefixActive = false;
        if (gPrefixTimeout) {
          clearTimeout(gPrefixTimeout);
          gPrefixTimeout = null;
        }
        switch (e.key) {
          case 'd':
            e.preventDefault();
            router.push('/dashboard');
            return;
          case 'q':
            e.preventDefault();
            router.push('/questions');
            return;
          case 'l':
            e.preventDefault();
            router.push('/learn');
            return;
          case 'r':
            e.preventDefault();
            router.push('/resources');
            return;
          case 'm':
            e.preventDefault();
            router.push('/mistakes');
            return;
        }
        // If it wasn't a valid "g then X" combo, fall through to normal handling
      }

      // Start "g" prefix sequence
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPrefixActive = true;
        gPrefixTimeout = setTimeout(() => {
          gPrefixActive = false;
        }, 1000);
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setHelpModalOpen(!helpModalOpen);
          document.dispatchEvent(new CustomEvent('shortcut-show-help'));
          break;
        case '/':
          e.preventDefault();
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          break;
        case 'j':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('list-nav-down'));
          break;
        case 'k':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('list-nav-up'));
          break;
        case 'b':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('shortcut-bookmark'));
          break;
        case 'n':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('shortcut-new-note'));
          break;
        case 'Enter':
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('shortcut-open-item'));
          break;
        case 'Escape':
          e.preventDefault();
          if (helpModalOpen) {
            setHelpModalOpen(false);
          }
          document.dispatchEvent(new CustomEvent('shortcut-close'));
          // If no modal is open, navigate back
          if (!helpModalOpen) {
            router.back();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (gPrefixTimeout) {
        clearTimeout(gPrefixTimeout);
      }
    };
  }, [router]);
}
