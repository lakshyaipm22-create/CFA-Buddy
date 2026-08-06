'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, ChevronLeft, ChevronRight, BookOpen, Download } from 'lucide-react';
import { getAttemptById, saveAttempt } from '../utils/attempt-storage';
import { getNotes, saveNote, deleteNote } from '@/shared/annotations';
import { corporateIssuersQuestions } from '../data/corporate-issuers';
import { ExplainButton } from '@/features/ai-explanations/components/explain-button';
import type { PracticeAttempt } from '../types/attempt';
import type { Question, ErrorClassification } from '../types';

interface AttemptReviewProps {
  attemptId: string;
}

type FilterMode = 'all' | 'incorrect' | 'bookmarked' | 'noted';

const ERROR_CLASSIFICATION_OPTIONS: { value: ErrorClassification; label: string }[] = [
  { value: 'DidntKnow', label: "Didn't Know" },
  { value: 'ForgotFormula', label: 'Forgot Formula' },
  { value: 'CalculationMistake', label: 'Calculation Mistake' },
  { value: 'MisreadQuestion', label: 'Misread Question' },
  { value: 'Careless', label: 'Careless' },
  { value: 'TimePressure', label: 'Time Pressure' },
];

/**
 * Generate a text export of all notes with question context.
 */
export function generateNotesExport(
  attempt: PracticeAttempt,
  questions: Question[],
  notes: Record<string, string>
): string {
  const lines: string[] = [];
  lines.push(`Notes Export - ${attempt.subjectName} (Attempt #${attempt.attemptNumber})`);
  lines.push(`Date: ${new Date(attempt.completedAt).toLocaleDateString()}`);
  lines.push('='.repeat(60));
  lines.push('');

  let noteCount = 0;
  for (const mod of attempt.moduleResults) {
    for (const qa of mod.questionAttempts) {
      const note = notes[qa.questionId];
      if (!note) continue;

      noteCount++;
      const question = questions.find(q => q.id === qa.questionId);
      lines.push(`[${noteCount}] ${question?.questionText ?? 'Question ID: ' + qa.questionId}`);
      lines.push(`    Module: ${mod.moduleName}`);
      lines.push(`    Result: ${qa.correct ? 'Correct' : 'Incorrect'} | Confidence: ${qa.confidence}`);
      if (qa.errorClassification) {
        lines.push(`    Error Type: ${qa.errorClassification}`);
      }
      lines.push(`    Note: ${note}`);
      lines.push('');
    }
  }

  if (noteCount === 0) {
    lines.push('No notes found for this attempt.');
  } else {
    lines.push(`Total notes: ${noteCount}`);
  }

  return lines.join('\n');
}

export function AttemptReview({ attemptId }: AttemptReviewProps) {
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(() => getAttemptById(attemptId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>(() => getNotes());
  const [editingNote, setEditingNote] = useState<string>('');
  const [noteExpanded, setNoteExpanded] = useState(false);

  const allQuestionAttempts = useMemo(() => {
    if (!attempt) return [];
    return attempt.moduleResults.flatMap(m => m.questionAttempts);
  }, [attempt]);

  const filteredAttempts = useMemo(() => {
    switch (filter) {
      case 'incorrect':
        return allQuestionAttempts.filter(qa => !qa.correct);
      case 'bookmarked':
        return allQuestionAttempts.filter(qa => attempt?.bookmarkedIds.includes(qa.questionId));
      case 'noted':
        return allQuestionAttempts.filter(qa => !!questionNotes[qa.questionId]);
      default:
        return allQuestionAttempts;
    }
  }, [allQuestionAttempts, filter, attempt, questionNotes]);

  const currentAttemptQ = filteredAttempts[currentIndex];
  const currentQuestion: Question | undefined = currentAttemptQ
    ? corporateIssuersQuestions.find(q => q.id === currentAttemptQ.questionId)
    : undefined;

  const isBookmarked = currentAttemptQ
    ? attempt?.bookmarkedIds.includes(currentAttemptQ.questionId) ?? false
    : false;

  const currentNote = currentAttemptQ ? (questionNotes[currentAttemptQ.questionId] ?? '') : '';

  // Sync note editing state when navigating
  const syncNoteState = useCallback((questionId: string) => {
    const notes = getNotes();
    setQuestionNotes(notes);
    setEditingNote(notes[questionId] ?? '');
    setNoteExpanded(!!notes[questionId]);
  }, []);

  const toggleBookmark = useCallback(() => {
    if (!attempt || !currentAttemptQ) return;
    const qid = currentAttemptQ.questionId;
    const updated = { ...attempt };
    if (updated.bookmarkedIds.includes(qid)) {
      updated.bookmarkedIds = updated.bookmarkedIds.filter(id => id !== qid);
    } else {
      updated.bookmarkedIds = [...updated.bookmarkedIds, qid];
    }
    saveAttempt(updated);
    setAttempt(updated);
  }, [attempt, currentAttemptQ]);

  const handleClassificationChange = useCallback((classification: ErrorClassification | '') => {
    if (!attempt || !currentAttemptQ) return;

    const updated: PracticeAttempt = {
      ...attempt,
      moduleResults: attempt.moduleResults.map(m => ({
        ...m,
        questionAttempts: m.questionAttempts.map(qa =>
          qa.questionId === currentAttemptQ.questionId
            ? { ...qa, errorClassification: classification || undefined }
            : qa
        ),
      })),
    };

    saveAttempt(updated);
    setAttempt(updated);
  }, [attempt, currentAttemptQ]);

  const handleSaveNote = useCallback(() => {
    if (!currentAttemptQ) return;
    const trimmed = editingNote.trim();
    if (trimmed) {
      saveNote(currentAttemptQ.questionId, trimmed);
    } else {
      deleteNote(currentAttemptQ.questionId);
    }
    setQuestionNotes(getNotes());
  }, [currentAttemptQ, editingNote]);

  const handleDeleteNote = useCallback(() => {
    if (!currentAttemptQ) return;
    deleteNote(currentAttemptQ.questionId);
    setEditingNote('');
    setQuestionNotes(getNotes());
    setNoteExpanded(false);
  }, [currentAttemptQ]);

  const handleExportNotes = useCallback(() => {
    if (!attempt) return;
    const notes = getNotes();
    const exportText = generateNotesExport(attempt, corporateIssuersQuestions, notes);

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${attempt.subjectName.replace(/\s+/g, '-').toLowerCase()}-attempt${attempt.attemptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [attempt]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < filteredAttempts.length) {
      setCurrentIndex(index);
      const qa = filteredAttempts[index];
      if (qa) {
        syncNoteState(qa.questionId);
      }
    }
  }, [filteredAttempts, syncNoteState]);

  const handleFilterChange = useCallback((newFilter: FilterMode) => {
    setFilter(newFilter);
    setCurrentIndex(0);
  }, []);

  // Sync note editing state when navigating (adjust state during render when questionId changes)
  const [prevQuestionId, setPrevQuestionId] = useState<string | undefined>(currentAttemptQ?.questionId);
  if (currentAttemptQ && currentAttemptQ.questionId !== prevQuestionId) {
    setPrevQuestionId(currentAttemptQ.questionId);
    const noteForQuestion = questionNotes[currentAttemptQ.questionId] ?? '';
    setEditingNote(noteForQuestion);
    setNoteExpanded(!!noteForQuestion);
  }

  if (!attempt) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Attempt not found.</p>
      </div>
    );
  }

  if (filteredAttempts.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <Link
          href={`/questions/attempts/${attemptId}`}
          className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex h-[300px] items-center justify-center">
          <p style={{ color: 'var(--foreground-secondary)' }}>
            No questions match the current filter.
          </p>
        </div>
      </div>
    );
  }

  const notedCount = allQuestionAttempts.filter(qa => !!questionNotes[qa.questionId]).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-12 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/questions/attempts/${attemptId}`}
          className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportNotes}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--foreground-secondary)',
              border: '1px solid var(--card-border)',
            }}
            title="Export all notes"
          >
            <Download className="h-3.5 w-3.5" />
            Export Notes
          </button>
          <span className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            {currentIndex + 1} of {filteredAttempts.length}
          </span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'incorrect', 'bookmarked', 'noted'] as FilterMode[]).map(f => {
          const isActive = filter === f;
          const label = f === 'all'
            ? 'All'
            : f === 'incorrect'
              ? 'Incorrect Only'
              : f === 'bookmarked'
                ? 'Bookmarked Only'
                : 'With Notes';
          const count = f === 'all'
            ? allQuestionAttempts.length
            : f === 'incorrect'
              ? allQuestionAttempts.filter(qa => !qa.correct).length
              : f === 'bookmarked'
                ? attempt.bookmarkedIds.length
                : notedCount;

          return (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--card-bg)',
                color: isActive ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
                border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--card-border)'}`,
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Question Number Pills */}
      <div className="flex flex-wrap gap-1.5">
        {filteredAttempts.map((qa, idx) => {
          const isActive = idx === currentIndex;
          const hasNote = !!questionNotes[qa.questionId];
          const bgColor = isActive
            ? 'var(--accent-primary)'
            : qa.correct
              ? 'rgba(0, 132, 61, 0.15)'
              : 'rgba(239, 68, 68, 0.15)';
          const txtColor = isActive
            ? 'var(--accent-secondary)'
            : qa.correct
              ? 'var(--accent-success)'
              : '#ef4444';

          return (
            <button
              key={`${qa.questionId}-${idx}`}
              onClick={() => goToQuestion(idx)}
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: bgColor, color: txtColor }}
            >
              {idx + 1}
              {hasNote && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      {currentQuestion && currentAttemptQ && (
        <div
          className="rounded-2xl p-5 md:p-6"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          {/* Question Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: currentAttemptQ.correct ? 'rgba(0, 132, 61, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: currentAttemptQ.correct ? 'var(--accent-success)' : '#ef4444',
                }}
              >
                {currentAttemptQ.correct ? 'Correct' : 'Incorrect'}
              </span>
              {currentQuestion.topic && (
                <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {currentQuestion.topic}
                </span>
              )}
              {currentNote && (
                <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary)' }} />
              )}
            </div>
            <button
              onClick={toggleBookmark}
              className="rounded-lg p-2 transition-all hover:opacity-80"
              style={{
                backgroundColor: isBookmarked ? 'rgba(197, 162, 88, 0.15)' : 'transparent',
              }}
              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Star
                className="h-5 w-5"
                style={{
                  color: isBookmarked ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
                  fill: isBookmarked ? 'var(--accent-secondary)' : 'none',
                }}
              />
            </button>
          </div>

          {/* Question Text */}
          <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
            {currentQuestion.questionText}
          </p>

          {/* Answer Choices */}
          <div className="space-y-3">
            {currentQuestion.answerChoices.map(choice => {
              const isSelected = choice.label === currentAttemptQ.selectedAnswer;
              const isCorrect = choice.isCorrect;

              let borderColor = 'var(--card-border)';
              let bgColor = 'transparent';

              if (isCorrect) {
                borderColor = 'var(--accent-success)';
                bgColor = 'rgba(0, 132, 61, 0.08)';
              } else if (isSelected && !isCorrect) {
                borderColor = '#ef4444';
                bgColor = 'rgba(239, 68, 68, 0.08)';
              }

              return (
                <div
                  key={choice.label}
                  className="rounded-lg px-4 py-3 text-sm transition-all"
                  style={{
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bgColor,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                      {choice.label}.
                    </span>
                    <span style={{ color: 'var(--foreground)' }}>{choice.text}</span>
                    {isCorrect && (
                      <span className="ml-auto text-sm" style={{ color: 'var(--accent-success)' }}>&#10003;</span>
                    )}
                    {isSelected && !isCorrect && (
                      <span className="ml-auto text-sm" style={{ color: '#ef4444' }}>&#10007;</span>
                    )}
                  </div>
                  {/* Explanation always visible in review mode */}
                  <p
                    className="mt-2 text-xs leading-relaxed"
                    style={{ color: 'var(--foreground-secondary)', opacity: 0.9 }}
                  >
                    {choice.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Error Classification (only for incorrect answers) */}
          {!currentAttemptQ.correct && (
            <>
              {/* AI Explain Button */}
              <div className="mt-5">
                <ExplainButton
                  questionText={currentQuestion.questionText}
                  answerChoices={currentQuestion.answerChoices.map(c => ({
                    label: c.label,
                    text: c.text,
                    isCorrect: c.isCorrect,
                  }))}
                  selectedAnswer={currentAttemptQ.selectedAnswer}
                  correctAnswer={
                    currentQuestion.answerChoices.find(c => c.isCorrect)?.label ?? ''
                  }
                />
              </div>

              <div className="mt-5 rounded-lg p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  Why did you get this wrong?
                </label>
                <select
                  value={currentAttemptQ.errorClassification ?? ''}
                  onChange={(e) => handleClassificationChange(e.target.value as ErrorClassification | '')}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <option value="">Select error type...</option>
                  {ERROR_CLASSIFICATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Notes Section */}
          <div className="mt-5">
            <button
              onClick={() => setNoteExpanded(!noteExpanded)}
              className="inline-flex items-center gap-2 text-xs font-medium transition-all hover:opacity-80"
              style={{ color: 'var(--accent-primary)' }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {noteExpanded ? 'Hide Notes' : currentNote ? 'Edit Note' : 'Add Note'}
            </button>

            {noteExpanded && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={editingNote}
                  onChange={(e) => setEditingNote(e.target.value)}
                  onBlur={handleSaveNote}
                  placeholder="Add your notes about this question..."
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none transition-all focus:ring-1"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--card-border)',
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    {editingNote.length}/500
                  </span>
                  <div className="flex gap-2">
                    {currentNote && (
                      <button
                        onClick={handleDeleteNote}
                        className="rounded px-2 py-1 text-xs font-medium transition-all hover:opacity-80"
                        style={{ color: '#ef4444' }}
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={handleSaveNote}
                      className="rounded px-3 py-1 text-xs font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goToQuestion(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          onClick={() => goToQuestion(currentIndex + 1)}
          disabled={currentIndex >= filteredAttempts.length - 1}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
