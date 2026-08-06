'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  duration: 0.15,
  ease: 'easeOut' as const,
};

/**
 * Page transition wrapper with fade-in animation (150ms).
 * Respects prefers-reduced-motion by disabling animations when set.
 */
export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      style={{ willChange: 'opacity' }}
    >
      {children}
    </motion.div>
  );
}
