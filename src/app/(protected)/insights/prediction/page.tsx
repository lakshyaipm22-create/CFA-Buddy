'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PredictionDashboard } from '@/features/performance-prediction/components/prediction-dashboard';

export default function PredictionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/insights"
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: '#C5A258' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Insights
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Pass Probability Prediction
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Multi-factor analysis of your exam readiness with personalized study recommendations.
        </p>
      </div>

      <PredictionDashboard />
    </div>
  );
}
