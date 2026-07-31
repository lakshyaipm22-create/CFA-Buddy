'use client';

import { useState } from 'react';
import { Brain, Check } from 'lucide-react';
import type { Question } from '@/features/question-bank/types';
import type { Flashcard } from '../types';
import { addFlashcard, getFlashcards } from '../utils/storage';

interface BatchFlashcardCreatorProps {
  incorrectQuestions: Question[];
}

export function BatchFlashcardCreator({ incorrectQuestions }: BatchFlashcardCreatorProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(incorrectQuestions.map(q => q.id)));
  const [created, setCreated] = useState(false);

  if (incorrectQuestions.length === 0 || created) {
    if (created) {
      return (
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <Check className="mx-auto h-6 w-6 text-[#00843D]" />
          <p className="mt-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Flashcards created!
          </p>
        </div>
      );
    }
    return null;
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const createFlashcards = () => {
    const existing = getFlashcards();
    const existingIds = new Set(existing.map(f => f.id));

    for (const q of incorrectQuestions) {
      if (!selected.has(q.id)) continue;
      const cardId = `fc-${q.id}`;
      if (existingIds.has(cardId)) continue;

      const correct = q.answerChoices.find(c => c.isCorrect);
      const card: Flashcard = {
        id: cardId,
        front: q.questionText,
        back: correct ? `${correct.label}. ${correct.text}\n\n${correct.explanation}` : 'See explanation',
        subject: q.subject,
        topic: q.topic,
        state: 'new',
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date().toISOString(),
        lastReview: null,
        createdAt: new Date().toISOString(),
      };
      addFlashcard(card);
    }
    setCreated(true);
  };

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Create Flashcards from Mistakes
          </h3>
        </div>
        <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          {selected.size} of {incorrectQuestions.length} selected
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {incorrectQuestions.map(q => (
          <label
            key={q.id}
            className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors"
            style={{
              borderColor: selected.has(q.id) ? 'var(--accent-secondary)' : 'var(--card-border)',
              background: selected.has(q.id) ? 'rgba(197, 162, 88, 0.05)' : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(q.id)}
              onChange={() => toggleSelect(q.id)}
              className="mt-0.5 rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>{q.questionText}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>{q.subject}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={createFlashcards}
        disabled={selected.size === 0}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
      >
        Create {selected.size} Flashcard{selected.size !== 1 ? 's' : ''}
      </button>
    </div>
  );
}
