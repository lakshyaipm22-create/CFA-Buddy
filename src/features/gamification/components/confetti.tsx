'use client';

import { useMemo } from 'react';

interface ConfettiProps {
  show: boolean;
}

const COLORS = ['#C5A258', '#002B5C', '#00843D', '#FFD700', '#FF6B6B', '#4ECDC4'];
const PARTICLE_COUNT = 50;

/**
 * Deterministic pseudo-random number generator (seeded).
 * Used to generate consistent particle positions per index.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

interface ParticleStyle {
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  isCircle: boolean;
}

function generateParticles(): ParticleStyle[] {
  return Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
    left: seededRandom(i * 7 + 1) * 100,
    delay: seededRandom(i * 13 + 2) * 0.5,
    duration: 2 + seededRandom(i * 19 + 3) * 1.5,
    size: 6 + seededRandom(i * 23 + 4) * 6,
    rotation: seededRandom(i * 29 + 5) * 360,
    isCircle: seededRandom(i * 31 + 6) > 0.5,
  }));
}

export function Confetti({ show }: ConfettiProps) {
  const particles = useMemo(() => generateParticles(), []);

  if (!show) return null;

  return (
    <div className="confetti-container pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p, i) => {
        const color = COLORS[i % COLORS.length];

        return (
          <span
            key={i}
            className="confetti-particle absolute"
            style={{
              left: `${p.left}%`,
              top: '-10px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: color,
              borderRadius: p.isCircle ? '50%' : '2px',
              transform: `rotate(${p.rotation}deg)`,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        .confetti-container {
          animation: confetti-hide 3s forwards;
        }
        @keyframes confetti-hide {
          0%,
          99% {
            visibility: visible;
          }
          100% {
            visibility: hidden;
          }
        }
      `}</style>
    </div>
  );
}
