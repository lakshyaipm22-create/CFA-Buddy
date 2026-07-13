'use client';

import { useId } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Tiny SVG sparkline chart with polyline and gradient fill.
 * Pure SVG, no external dependencies.
 */
export function Sparkline({
  data,
  width = 120,
  height = 40,
  color = 'var(--accent-primary)',
}: SparklineProps) {
  const reactId = useId();
  const gradientId = `sparkline-gradient-${reactId.replace(/:/g, '')}`;

  if (data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <text
          x={width / 2}
          y={height / 2 + 4}
          textAnchor="middle"
          fontSize="10"
          fill="var(--foreground-secondary)"
        >
          Not enough data
        </text>
      </svg>
    );
  }

  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const polylinePoints = points.join(' ');

  // Create fill path (area under the line)
  const fillPath = [
    `M ${padding},${padding + chartHeight}`,
    ...data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return `L ${x},${y}`;
    }),
    `L ${padding + chartWidth},${padding + chartHeight}`,
    'Z',
  ].join(' ');

  return (
    <svg
      width={width}
      height={height}
      className="shrink-0"
      role="img"
      aria-label="Sparkline trend chart"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      {data.length > 0 && (
        <circle
          cx={padding + chartWidth}
          cy={
            padding +
            chartHeight -
            ((data[data.length - 1] - min) / range) * chartHeight
          }
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}
