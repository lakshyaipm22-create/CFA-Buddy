'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUp } from '../actions';
import type { AuthActionResult } from '../types';

const initialState: AuthActionResult = { success: false };

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: AuthActionResult, formData: FormData) => {
      return await signUp(formData);
    },
    initialState
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-400">Start your CFA preparation journey</p>
      </div>

      <form action={formAction} className="space-y-4">
        {state.error && !state.fieldErrors && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-zinc-300">
            Display Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Your name"
          />
          {state.fieldErrors?.displayName && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.displayName[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="you@example.com"
          />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 digit"
          />
          {state.fieldErrors?.password && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="level" className="block text-sm font-medium text-zinc-300">
            CFA Level
          </label>
          <select
            id="level"
            name="level"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="I">Level I</option>
            <option value="II">Level II</option>
            <option value="III">Level III</option>
          </select>
          {state.fieldErrors?.level && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.level[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-blue-400 hover:text-blue-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
