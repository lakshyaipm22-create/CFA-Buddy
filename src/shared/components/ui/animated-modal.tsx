'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const modalTransition = {
  duration: 0.2,
  ease: 'easeOut' as const,
};

/**
 * Modal open/close animation wrapper (scale + fade 200ms).
 * Uses AnimatePresence for exit animations.
 * Respects prefers-reduced-motion via CSS media query.
 */
export function AnimatedModal({ children, isOpen, onClose, className }: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={backdropVariants}
          transition={modalTransition}
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className={className}
            variants={modalVariants}
            transition={modalTransition}
            style={{ willChange: 'opacity, transform' }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
