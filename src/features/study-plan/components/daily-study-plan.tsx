'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, HelpCircle, Brain, Clock } from 'lucide-react';
import { useLocalStorageSessions } from '@/features/dashboard/hooks/use-local-storage-sessions';

interface Recommendation {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  minutes: number;
}

export function DailyStudyPlan() {
  const sessions = useLocalStorageSessions();

  const recommendations = useMemo<Recommendation[]>(() => {
    const completed = sessions.filter(s => s.status === 'completed');
    const recs: Recommendation[] = [];

    if (completed.length === 0) {
      // New user — guided start
      recs.push(
        { icon: <HelpCircle className="h-4 w-4" />, title: 'Take your first quiz', description: 'Start with 10 mixed questions to establish your baseline.', href: '/questions', minutes: 12 },
        { icon: <BookOpen className="h-4 w-4" />, title: 'Review Ethics Standards', description: 'Ethics has the highest weight (15%). Start here.', href: '/learn', minutes: 20 },
      );
      return recs;
    }

    // Analyze weakest topics based on accuracy
    const topicAccuracy: Record<string, { correct: number; total: number }> = {};
    for (const session of completed) {
      for (const attempt of session.attempts ?? []) {
        const topic = attempt.questionId?.split('-')[0] ?? 'unknown';
        if (!topicAccuracy[topic]) topicAccuracy[topic] = { correct: 0, total: 0 };
        topicAccuracy[topic].total++;
        if (attempt.correct) topicAccuracy[topic].correct++;
      }
    }

    const weakTopics = Object.entries(topicAccuracy)
      .map(([topic, { correct, total }]) => ({ topic, accuracy: total > 0 ? correct / total : 0, total }))
      .filter(t => t.total >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    // Generate recommendations based on weakness
    if (weakTopics.length > 0) {
      const weakest = weakTopics[0];
      recs.push({
        icon: <HelpCircle className="h-4 w-4" />,
        title: `Practice ${weakest.topic} questions`,
        description: `Your accuracy is ${Math.round(weakest.accuracy * 100)}%. Focus here to improve.`,
        href: '/questions',
        minutes: 15,
      });
    }

    // Check if user has flashcards due
    recs.push({
      icon: <Brain className="h-4 w-4" />,
      title: 'Review flashcards',
      description: 'Keep your retention high with daily spaced repetition.',
      href: '/flashcards',
      minutes: 8,
    });

    // Always recommend some studying
    recs.push({
      icon: <BookOpen className="h-4 w-4" />,
      title: 'Study key formulas',
      description: 'Review and practice the most common CFA formulas.',
      href: '/formulas',
      minutes: 10,
    });

    return recs.slice(0, 3);
  }, [sessions]);

  const totalMinutes = recommendations.reduce((sum, r) => sum + r.minutes, 0);

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Today&apos;s Study Plan</h3>
        </div>
        <div className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
          <Clock className="h-3 w-3" />
          {totalMinutes} min
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {recommendations.map((rec, idx) => (
          <Link
            key={idx}
            href={rec.href}
            className="flex items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-sm"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <div className="mt-0.5" style={{ color: 'var(--accent-secondary)' }}>{rec.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{rec.title}</p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-secondary)' }}>{rec.description}</p>
            </div>
            <span className="text-[10px] shrink-0" style={{ color: 'var(--foreground-secondary)' }}>{rec.minutes} min</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
