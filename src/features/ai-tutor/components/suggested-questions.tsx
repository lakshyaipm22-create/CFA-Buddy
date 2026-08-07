'use client';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const STARTER_QUESTIONS = [
  'Explain modified duration like I\'m 5',
  'What is the DuPont analysis and how does it work?',
  'What is convexity and why does it matter?',
  'How does LIFO vs FIFO affect taxes and ratios?',
  'What\'s the difference between NPV and IRR?',
  'Explain the difference between systematic and unsystematic risk',
  'How do I calculate weighted average cost of capital (WACC)?',
  'What is the Fisher Effect?',
  'Explain the Central Limit Theorem for CFA',
];

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
        Try asking about a CFA topic:
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STARTER_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            className="rounded-lg border p-3 text-left text-sm transition-colors hover:border-[#C5A258]/50 hover:bg-[#C5A258]/5"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--foreground)',
            }}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
