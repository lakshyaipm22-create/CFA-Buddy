import { FormulaCenter } from '@/features/formulas/components/formula-center';

export default function FormulasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Formula Center</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Key CFA Level I formulas organized by subject. Bookmark your most-needed formulas.
        </p>
      </div>
      <FormulaCenter />
    </div>
  );
}
