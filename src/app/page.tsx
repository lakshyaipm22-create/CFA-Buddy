import Link from 'next/link';
import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BookOpen, Brain, Target, BarChart3, Calculator, Layers } from 'lucide-react';

export default async function LandingPage() {
  // If user is authenticated, redirect to dashboard
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) redirect('/dashboard');
    } catch { /* not logged in */ }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#002B5C]/20 via-transparent to-[#C5A258]/10" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
          <p className="text-sm font-medium tracking-wider uppercase" style={{ color: '#C5A258' }}>
            CFA Level I Preparation
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight md:text-6xl" style={{ color: 'var(--foreground)' }}>
            CFA Buddy
          </h1>
          <p className="mt-2 text-xl" style={{ color: 'var(--foreground-secondary)' }}>
            Your Personal CFA Operating System
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
            50 practice questions across all 10 subjects, SM-2 flashcards, formula center, spaced revision planner, and analytics — all offline, all free.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl px-8 py-3.5 text-base font-medium transition-all hover:opacity-90"
              style={{ background: '#002B5C', color: '#C5A258' }}
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border px-8 py-3.5 text-base font-medium transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Everything you need to pass CFA Level I
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<BookOpen />} title="Question Bank" desc="50 questions across all 10 subjects with confidence tracking and per-question timer." />
          <FeatureCard icon={<Brain />} title="SM-2 Flashcards" desc="Spaced repetition with ease factors. Cards appear when they're due, not before." />
          <FeatureCard icon={<Calculator />} title="Formula Center" desc="30 key CFA formulas with examples. Bookmark your most-needed formulas." />
          <FeatureCard icon={<Target />} title="Exam Plan" desc="Set your exam date. Get daily targets and pacing indicators." />
          <FeatureCard icon={<BarChart3 />} title="Progress Insights" desc="Predicted score, accuracy trends, strongest/weakest subjects." />
          <FeatureCard icon={<Layers />} title="Offline First" desc="Works 100% offline. All data in your browser. Export/import for backup." />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          CFA Buddy is not affiliated with CFA Institute. CFA&reg; is a trademark owned by CFA Institute.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border p-6 transition-all hover:shadow-md" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div style={{ color: '#C5A258' }}>{icon}</div>
      <h3 className="mt-3 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{desc}</p>
    </div>
  );
}
