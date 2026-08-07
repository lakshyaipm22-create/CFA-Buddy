import { ChatInterface } from '@/features/ai-tutor/components/chat-interface';

export default function TutorPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          AI Tutor
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Ask questions about CFA Level I concepts and get contextual answers grounded in the curriculum.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
