import { createServerSupabaseClient } from '@/shared/lib/supabase/server';
import { redirect } from 'next/navigation';
import { signOut } from '@/features/auth/actions';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const displayName = user.user_metadata?.display_name || 'CFA Student';
  const level = user.user_metadata?.level || 'I';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-zinc-400">
          Welcome back, {displayName}. CFA Level {level}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">Exam Readiness</p>
          <p className="mt-2 text-3xl font-bold text-white">&mdash;</p>
          <p className="mt-1 text-xs text-zinc-500">Complete 10+ questions to see</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">Study Streak</p>
          <p className="mt-2 text-3xl font-bold text-white">0 days</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">Questions Solved</p>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </div>
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
