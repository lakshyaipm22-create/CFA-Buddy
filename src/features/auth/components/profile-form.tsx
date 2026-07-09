'use client';

import { useActionState } from 'react';
import { updateProfile } from '../actions';
import type { AuthActionResult } from '../types';

const initialState: AuthActionResult = { success: false };

interface ProfileFormProps {
  defaultDisplayName: string;
  defaultLevel: string;
  email: string;
}

export function ProfileForm({ defaultDisplayName, defaultLevel, email }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: AuthActionResult, formData: FormData) => {
      return await updateProfile(formData);
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.success && (
        <div className="rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-sm text-green-300">
          Profile updated successfully.
        </div>
      )}
      {state.error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-300">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-500"
        />
        <p className="mt-1 text-xs text-zinc-500">Email cannot be changed</p>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-zinc-300">
          Display Name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          defaultValue={defaultDisplayName}
          required
          className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {state.fieldErrors?.displayName && (
          <p className="mt-1 text-xs text-red-400">{state.fieldErrors.displayName[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="level" className="block text-sm font-medium text-zinc-300">
          CFA Level
        </label>
        <select
          id="level"
          name="level"
          defaultValue={defaultLevel}
          className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="I">Level I</option>
          <option value="II">Level II</option>
          <option value="III">Level III</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}
