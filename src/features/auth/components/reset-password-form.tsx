'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resetPassword } from '../actions';
import type { AuthActionResult } from '../types';

const initialState: AuthActionResult = { success: false };

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: AuthActionResult, formData: FormData) => {
      return await resetPassword(formData);
    },
    initialState
  );

  if (state.success) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="text-sm text-zinc-400">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
        <Link
          href="/sign-in"
          className="inline-block text-sm text-blue-400 hover:text-blue-300"
        >
          &larr; Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Reset password</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {state.error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        )}

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

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        <Link href="/sign-in" className="text-blue-400 hover:text-blue-300">
          &larr; Back to sign in
        </Link>
      </p>
    </div>
  );
}
