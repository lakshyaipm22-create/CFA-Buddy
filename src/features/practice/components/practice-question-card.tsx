'use client';

import { useState } from 'react';
import { StickyNote, Check } from 'lucide-react';
import type { Question, AnswerChoice } from '@/features/question-bank/types';
import { getNote, saveNote } from '../utils/annotations-storage';

interface PracticeQuestionCardProps {
  question: Question;
  showAnswer: boolean;
  onReveal: () => void;
}

export function PracticeQuestionCard({
  question,
  showAnswer,
  onReveal,
}: PracticeQuestionCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(() => getNote(question.id));
  const [savedNote, setSavedNote] = useState(() => getNote(question.id));

  const handleSaveNote = () => {
    saveNote(question.id, noteText);
    setSavedNote(noteText);
    setNoteOpen(false);
  };

  const correctAnswer = question.answerChoices.find(c => c.isCorrect);

  return (
    <div
      className="rounded-xl border p-5 sm:p-6"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
      }}
    >
      {/* Subject & Difficulty badge */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: 'var(--nav-hover-bg)',
            color: 'var(--accent-primary)',
          }}
        >
          {question.subject}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: 'var(--nav-hover-bg)',
            color: 'var(--foreground-secondary)',
          }}
        >
          {question.difficulty}
        </span>
        {question.topic && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            {question.topic}
          </span>
        )}
      </div>

      {/* Question text */}
      <p
        className="mb-5 text-base leading-relaxed sm:text-lg"
        style={{ color: 'var(--foreground)' }}
      >
        {question.questionText}
      </p>

      {/* Answer choices */}
      <div className="mb-5 space-y-2.5">
        {question.answerChoices.map((choice: AnswerChoice) => {
          let borderStyle = '1px solid var(--card-border)';
          let bgStyle = 'transparent';

          if (showAnswer) {
            if (choice.isCorrect) {
              borderStyle = '1px solid #00843D';
              bgStyle = 'rgba(0, 132, 61, 0.1)';
            } else {
              borderStyle = '1px solid var(--card-border)';
              bgStyle = 'rgba(255, 255, 255, 0.02)';
            }
          }

          return (
            <div
              key={choice.label}
              className="flex items-start gap-3 rounded-lg px-4 py-3 transition-all"
              style={{ border: borderStyle, backgroundColor: bgStyle }}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor: showAnswer && choice.isCorrect
                    ? '#00843D'
                    : 'var(--nav-hover-bg)',
                  color: showAnswer && choice.isCorrect
                    ? '#fff'
                    : 'var(--foreground-secondary)',
                }}
              >
                {choice.label}
              </span>
              <span
                className="text-sm leading-relaxed"
                style={{
                  color: showAnswer && choice.isCorrect
                    ? '#00843D'
                    : 'var(--foreground)',
                }}
              >
                {choice.text}
              </span>
              {showAnswer && choice.isCorrect && (
                <Check className="ml-auto h-4 w-4 shrink-0 text-[#00843D]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation (only when answer revealed) */}
      {showAnswer && correctAnswer && (
        <div
          className="mb-4 rounded-lg border px-4 py-3"
          style={{
            borderColor: 'rgba(0, 132, 61, 0.3)',
            backgroundColor: 'rgba(0, 132, 61, 0.05)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[#00843D]">
            Explanation
          </p>
          <p
            className="mt-1 text-sm leading-relaxed"
            style={{ color: 'var(--foreground)' }}
          >
            {correctAnswer.explanation}
          </p>
        </div>
      )}

      {/* Reveal button */}
      {!showAnswer && (
        <button
          onClick={onReveal}
          className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
          }}
        >
          Reveal Answer
        </button>
      )}

      {/* Annotation section */}
      <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
        {savedNote && !noteOpen && (
          <div
            className="mb-2 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--nav-hover-bg)',
              color: 'var(--foreground-secondary)',
            }}
          >
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-secondary)' }} />
            <span className="flex-1">{savedNote}</span>
          </div>
        )}

        {noteOpen ? (
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
              placeholder="Add a personal note for this question (max 500 chars)..."
              maxLength={500}
              rows={3}
              className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{
                borderColor: 'var(--card-border)',
                color: 'var(--foreground)',
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveNote}
                className="rounded-md px-3 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                }}
              >
                Save Note
              </button>
              <button
                onClick={() => {
                  setNoteOpen(false);
                  setNoteText(savedNote);
                }}
                className="rounded-md px-3 py-1.5 text-xs"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                Cancel
              </button>
              <span className="ml-auto text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                {noteText.length}/500
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setNoteOpen(true)}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            <StickyNote className="h-3.5 w-3.5" />
            {savedNote ? 'Edit Note' : 'Add Note'}
          </button>
        )}
      </div>
    </div>
  );
}
