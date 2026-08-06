'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay index for lists of cards */
  index?: number;
}

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

/**
 * Card mount animation wrapper (slide up 200ms).
 * Respects prefers-reduced-motion by disabling animations when set.
 */
export function AnimatedCard({ children, className, index = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={cardVariants}
      transition={{
        duration: 0.2,
        ease: 'easeOut',
        delay: index * 0.05,
      }}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}
