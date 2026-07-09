'use client';

export function ImportDashboard() {

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-6">
        <h3 className="text-sm font-medium text-zinc-300">How to Import Questions</h3>
        <div className="mt-3 space-y-2 text-xs text-zinc-400">
          <p>Run the import CLI from your terminal:</p>
          <pre className="mt-2 rounded bg-[#1a2332] p-3 text-[11px] text-[#C5A258]">
{`# Single file (questions only)
npm run import:questions -- --file="content/question-banks/level1/Schweser QB 2024 with Answers/Quantitative Method/Reading 1 Rates and Returns.pdf" --subject="Quantitative Methods" --provider="schweser"

# With paired answer file
npm run import:questions -- --file="questions.pdf" --answers="answers.pdf" --subject="FSA" --provider="schweser"

# Specify provider
npm run import:questions -- --file="path.pdf" --provider="uworld" --subject="Economics"`}
          </pre>
          <p className="mt-3">Imported questions will be saved to <code className="rounded bg-[#1a2332] px-1 py-0.5">content/metadata/imported-questions/</code></p>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-6">
        <h3 className="text-sm font-medium text-zinc-300">Import Status</h3>
        <p className="mt-2 text-xs text-zinc-500">
          The Question Import Pipeline extracts questions from your PDF question banks.
          After import, questions become available in the Question Bank for practice sessions.
        </p>
        <div className="mt-4 rounded bg-[#1a2332] p-4 text-center">
          <p className="text-sm text-zinc-400">
            Use the CLI to import questions. A web-based import interface will be added in a future update.
          </p>
        </div>
      </div>

      {/* Future: Upload/verification UI */}
      <div className="rounded-lg border border-dashed border-[#1a2332] p-8 text-center">
        <p className="text-sm text-zinc-500">
          Web-based verification UI coming in Phase 2.
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          For now, review imported questions in content/metadata/imported-questions/*.json
        </p>
      </div>
    </div>
  );
}
