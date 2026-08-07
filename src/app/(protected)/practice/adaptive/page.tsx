'use client';

import { Suspense } from 'react';
import { Brain } from 'lucide-react';
import { AdaptiveSession } from '@/features/adaptive-learning/components/adaptive-session';

function AdaptivePageContent() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6" style={{ color: '#C5A258' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Adaptive Learning
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          IRT-powered practice that adapts to your ability level in real-time.
          Questions are selected to maximize learning at your knowledge frontier.
        </p>
      </div>

      <AdaptiveSession />
    </div>
  );
}

export default function AdaptivePracticePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--accent-primary)' }}
        />
      </div>
    }>
      <AdaptivePageContent />
    </Suspense>
  );
}
