import { SessionConfigurator } from '@/features/question-bank/components/session-configurator';
import { QuestionAnalytics } from '@/features/question-bank/components/question-analytics';

export default function QuestionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Question Bank</h1>
        <p className="mt-1 text-zinc-400">
          Configure and start a practice session.
        </p>
      </div>
      <SessionConfigurator />
      <QuestionAnalytics />
    </div>
  );
}
