'use client';

import { useMemo } from 'react';
import {
  TrendingUp, AlertTriangle, Brain, Zap, ShieldAlert,
} from 'lucide-react';
import type { AnalyticsSession, SmartInsight } from '../types';
import { generateSmartInsights } from '../utils/insights-engine';

interface SmartInsightsProps {
  sessions: AnalyticsSession[];
}

const INSIGHT_CONFIG: Record<SmartInsight['type'], {
  icon: typeof TrendingUp;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}> = {
  success: {
    icon: TrendingUp,
    borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)',
    bgColor: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
    iconColor: 'var(--accent-success)',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'color-mix(in srgb, var(--accent-secondary) 40%, transparent)',
    bgColor: 'color-mix(in srgb, var(--accent-secondary) 8%, transparent)',
    iconColor: 'var(--accent-secondary)',
  },
  info: {
    icon: Brain,
    borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)',
    bgColor: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
    iconColor: 'var(--accent-primary)',
  },
  danger: {
    icon: ShieldAlert,
    borderColor: 'color-mix(in srgb, #ef4444 40%, transparent)',
    bgColor: 'color-mix(in srgb, #ef4444 8%, transparent)',
    iconColor: '#ef4444',
  },
};

export function SmartInsights({ sessions }: SmartInsightsProps) {
  const insights = useMemo(() => {
    return generateSmartInsights(sessions);
  }, [sessions]);

  if (insights.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed p-12 text-center"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <Brain
          className="mx-auto h-12 w-12 opacity-30"
          style={{ color: 'var(--foreground-secondary)' }}
        />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Insights Coming Soon
        </h3>
        <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: 'var(--foreground-secondary)' }}>
          Complete at least 3 practice sessions to unlock personalized insights and recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5" style={{ color: 'var(--accent-secondary)' }} />
        <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
          Smart Insights
        </h3>
        <span
          className="text-xs rounded-full px-2 py-0.5"
          style={{
            background: 'color-mix(in srgb, var(--accent-secondary) 15%, transparent)',
            color: 'var(--accent-secondary)',
          }}
        >
          {insights.length} insights
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: SmartInsight }) {
  const config = INSIGHT_CONFIG[insight.type];
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl border p-4 transition-all hover:scale-[1.01]"
      style={{
        borderColor: config.borderColor,
        background: config.bgColor,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 rounded-lg p-2"
          style={{
            background: `color-mix(in srgb, ${config.iconColor} 15%, transparent)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: config.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--foreground)' }}
            >
              {insight.title}
            </h4>
            {insight.metric && (
              <span
                className="text-sm font-bold shrink-0"
                style={{ color: config.iconColor }}
              >
                {insight.metric}
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
            {insight.description}
          </p>
        </div>
      </div>
    </div>
  );
}
