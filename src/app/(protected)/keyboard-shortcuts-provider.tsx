'use client';

import { useKeyboardShortcuts } from '@/shared/hooks/use-keyboard-shortcuts';
import { KeyboardShortcutsModal } from '@/shared/components/feedback/keyboard-shortcuts-modal';

export function KeyboardShortcutsProvider() {
  useKeyboardShortcuts();

  return <KeyboardShortcutsModal />;
}
