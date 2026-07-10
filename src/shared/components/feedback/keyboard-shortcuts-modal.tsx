'use client';

import { useEffect, useRef } from 'react';
import { useShortcutHelpModal } from '@/shared/hooks/use-keyboard-shortcuts';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: ['?'], description: 'Show shortcuts' },
      { keys: ['/', '\u2318K'], description: 'Search' },
      { keys: ['Esc'], description: 'Close / Back' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['j'], description: 'Navigate list down' },
      { keys: ['k'], description: 'Navigate list up' },
      { keys: ['Enter'], description: 'Open item' },
      { keys: ['g', 'd'], description: 'Go to Dashboard' },
      { keys: ['g', 'q'], description: 'Go to Questions' },
      { keys: ['g', 'l'], description: 'Go to Learn' },
      { keys: ['g', 'r'], description: 'Go to Resources' },
      { keys: ['g', 'm'], description: 'Go to Mistakes' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['b'], description: 'Bookmark' },
      { keys: ['n'], description: 'New note' },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold"
      style={{
        background: 'var(--background-secondary, #f3f4f6)',
        border: '1px solid var(--border-primary, #e5e7eb)',
        color: 'var(--text-primary, #1f2937)',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal() {
  const { isOpen, close } = useShortcutHelpModal();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, close]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      close();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        transition: 'opacity 200ms ease-in-out',
      }}
      aria-hidden={!isOpen}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--background, #ffffff)',
          border: '1px solid var(--border-primary, #e5e7eb)',
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 200ms ease-in-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: '#002B5C',
            borderBottom: '3px solid #C5A258',
          }}
        >
          <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={close}
            className="text-white/70 hover:text-white transition-colors p-1 rounded"
            aria-label="Close shortcuts modal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {shortcutCategories.map((category) => (
              <div key={category.title}>
                <h3
                  className="text-xs font-bold uppercase tracking-wider mb-3"
                  style={{ color: '#C5A258' }}
                >
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span
                        className="text-sm"
                        style={{ color: 'var(--text-secondary, #4b5563)' }}
                      >
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && (
                              <span
                                className="text-xs mx-0.5"
                                style={{ color: 'var(--text-muted, #9ca3af)' }}
                              >
                                {shortcut.keys.length === 2 && category.title === 'Navigation' && shortcut.keys[0] === 'g'
                                  ? 'then'
                                  : 'or'}
                              </span>
                            )}
                            <Kbd>{key}</Kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 text-center"
          style={{
            borderTop: '1px solid var(--border-primary, #e5e7eb)',
            background: 'var(--background-secondary, #f9fafb)',
          }}
        >
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted, #9ca3af)' }}
          >
            Press <Kbd>?</Kbd> to toggle this menu
          </span>
        </div>
      </div>
    </div>
  );
}
