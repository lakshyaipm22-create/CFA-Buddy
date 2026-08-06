'use client';

import { useState, useCallback, useTransition } from 'react';
import { CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { approveQuestion, rejectQuestion, bulkApprove } from '../actions/verify';
import type { Question } from '../types';

interface QuestionWithVerification extends Question {
  verificationStatus: string;
}

interface QuestionReviewTableProps {
  initialQuestions: QuestionWithVerification[];
  subjects: string[];
  topics: string[];
  providers: string[];
}

const PAGE_SIZE = 10;

export function QuestionReviewTable({
  initialQuestions,
  subjects,
  topics,
  providers,
}: QuestionReviewTableProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filtered questions
  const filtered = questions.filter((q) => {
    if (selectedSubject && q.subject !== selectedSubject) return false;
    if (selectedTopic && q.topic !== selectedTopic) return false;
    if (selectedProvider && q.provider !== selectedProvider) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleApprove = useCallback((questionId: string) => {
    startTransition(async () => {
      const result = await approveQuestion({ questionId });
      if (result.success) {
        setQuestions((prev) =>
          prev.filter((q) => q.id !== questionId)
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      }
    });
  }, []);

  const handleReject = useCallback((questionId: string) => {
    startTransition(async () => {
      const result = await rejectQuestion({ questionId });
      if (result.success) {
        setQuestions((prev) =>
          prev.filter((q) => q.id !== questionId)
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      }
    });
  }, []);

  const handleBulkApprove = useCallback(() => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const result = await bulkApprove({ questionIds: [...selectedIds] });
      if (result.success) {
        setQuestions((prev) =>
          prev.filter((q) => !selectedIds.has(q.id))
        );
        setSelectedIds(new Set());
      }
    });
  }, [selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((q) => q.id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800"
            style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-secondary)' }}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: '#00843D' }}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approve {selectedIds.size} selected
            </button>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          {filtered.length} pending question{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <select
            value={selectedSubject}
            onChange={(e) => { setSelectedSubject(e.target.value); setPage(0); }}
            className="rounded border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={selectedTopic}
            onChange={(e) => { setSelectedTopic(e.target.value); setPage(0); }}
            className="rounded border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
          >
            <option value="">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={selectedProvider}
            onChange={(e) => { setSelectedProvider(e.target.value); setPage(0); }}
            className="rounded border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--card-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--card-bg)' }}>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={paginated.length > 0 && selectedIds.size === paginated.length}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--foreground-secondary)' }}>Question</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--foreground-secondary)' }}>Subject</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--foreground-secondary)' }}>Difficulty</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--foreground-secondary)' }}>Provider</th>
              <th className="w-32 px-3 py-2 text-right font-medium" style={{ color: 'var(--foreground-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center" style={{ color: 'var(--foreground-secondary)' }}>
                  No pending questions to review
                </td>
              </tr>
            ) : (
              paginated.map((q) => (
                <tr
                  key={q.id}
                  className="border-t transition-colors hover:bg-zinc-900/50"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="max-w-xs truncate px-3 py-2" style={{ color: 'var(--foreground)' }}>
                    <div className="space-y-1">
                      <p className="truncate font-medium">{q.questionText}</p>
                      <div className="flex gap-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                        <span>Correct: {q.answerChoices.find((c) => c.isCorrect)?.label ?? 'N/A'}</span>
                        <span>{q.answerChoices.length} choices</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--foreground-secondary)' }}>
                    {q.subject}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: q.difficulty === 'Easy' ? '#00843D22' : q.difficulty === 'Hard' ? '#dc262622' : '#C5A25822',
                        color: q.difficulty === 'Easy' ? '#00843D' : q.difficulty === 'Hard' ? '#dc2626' : '#C5A258',
                      }}
                    >
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--foreground-secondary)' }}>
                    {q.provider}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleApprove(q.id)}
                        disabled={isPending}
                        className="rounded p-1.5 transition-colors hover:bg-green-900/30 disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </button>
                      <button
                        onClick={() => handleReject(q.id)}
                        disabled={isPending}
                        className="rounded p-1.5 transition-colors hover:bg-red-900/30 disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded p-1.5 transition-colors hover:bg-zinc-800 disabled:opacity-30"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded p-1.5 transition-colors hover:bg-zinc-800 disabled:opacity-30"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
