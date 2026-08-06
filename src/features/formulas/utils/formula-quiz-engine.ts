import { formulaSeed, type FormulaEntry } from '../data/formula-seed';

export interface FormulaQuizConfig {
  subjects?: string[];
  difficulty?: ('core' | 'advanced')[];
  examFrequency?: ('high' | 'medium' | 'low')[];
  count: number;
}

export type FormulaRating = 'forgot' | 'struggled' | 'gotIt' | 'easy';

export interface FormulaQuizResult {
  formulaId: string;
  rating: FormulaRating;
  timestamp: string;
}

const STORAGE_KEY = 'cfa-buddy-formula-quiz-history';

/**
 * Get all historical quiz results from localStorage.
 */
export function getFormulaQuizHistory(): FormulaQuizResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FormulaQuizResult[];
  } catch {
    return [];
  }
}

/**
 * Save a single quiz result to localStorage history.
 * Maintains a rolling cap of 1000 most recent entries to prevent unbounded growth.
 */
export function saveFormulaQuizResult(formulaId: string, rating: FormulaRating): void {
  if (typeof window === 'undefined') return;
  const history = getFormulaQuizHistory();
  const entry: FormulaQuizResult = {
    formulaId,
    rating,
    timestamp: new Date().toISOString(),
  };
  history.push(entry);
  // Rolling cap: keep only the 1000 most recent entries
  const MAX_HISTORY_ENTRIES = 1000;
  const trimmed = history.length > MAX_HISTORY_ENTRIES
    ? history.slice(history.length - MAX_HISTORY_ENTRIES)
    : history;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Compute weakness scores for all formulas based on quiz history.
 * Returns a Map of formulaId -> weakness score (0-1, higher = weaker).
 * Recent ratings weigh more. 'forgot' and 'struggled' increase weakness.
 */
export function getFormulaWeakness(): Map<string, number> {
  const history = getFormulaQuizHistory();
  const weakness = new Map<string, number>();

  if (history.length === 0) return weakness;

  // Group results by formulaId
  const byFormula = new Map<string, FormulaQuizResult[]>();
  for (const result of history) {
    const existing = byFormula.get(result.formulaId);
    if (existing) {
      existing.push(result);
    } else {
      byFormula.set(result.formulaId, [result]);
    }
  }

  const ratingScore: Record<FormulaRating, number> = {
    forgot: 1.0,
    struggled: 0.7,
    gotIt: 0.2,
    easy: 0.0,
  };

  const now = Date.now();

  for (const [formulaId, results] of byFormula) {
    // Sort by timestamp descending (most recent first)
    const sorted = results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Take up to last 10 attempts, with recency weighting
    const maxResults = Math.min(sorted.length, 10);
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < maxResults; i++) {
      const result = sorted[i];
      const ageMs = now - new Date(result.timestamp).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      // Exponential decay: recent results matter more
      const recencyWeight = Math.exp(-ageDays / 14); // Half-life of ~14 days
      const score = ratingScore[result.rating];

      weightedSum += score * recencyWeight;
      totalWeight += recencyWeight;
    }

    weakness.set(formulaId, totalWeight > 0 ? weightedSum / totalWeight : 0);
  }

  return weakness;
}

/**
 * Select formulas for a quiz session based on config criteria.
 * Prioritizes high exam frequency and previously weak formulas.
 */
export function selectFormulaQuiz(config: FormulaQuizConfig): FormulaEntry[] {
  // Step 1: Filter by config criteria
  const candidates = formulaSeed.filter(f => {
    if (config.subjects && config.subjects.length > 0) {
      if (!config.subjects.includes(f.subject)) return false;
    }
    if (config.difficulty && config.difficulty.length > 0) {
      if (!config.difficulty.includes(f.difficulty)) return false;
    }
    if (config.examFrequency && config.examFrequency.length > 0) {
      if (!config.examFrequency.includes(f.examFrequency)) return false;
    }
    return true;
  });

  // If count is greater than candidates, return all shuffled
  if (config.count >= candidates.length) {
    return shuffleArray(candidates);
  }

  // Step 2: Score each candidate for prioritization
  const weakness = getFormulaWeakness();
  const frequencyBoost: Record<string, number> = {
    high: 0.3,
    medium: 0.15,
    low: 0.0,
  };

  const scored = candidates.map(f => {
    const weaknessScore = weakness.get(f.id) ?? 0.5; // Default 0.5 for unseen formulas
    const freqBoost = frequencyBoost[f.examFrequency] ?? 0;
    // Combined priority: weakness matters most, then frequency
    const priority = weaknessScore * 0.7 + freqBoost + Math.random() * 0.2;
    return { formula: f, priority };
  });

  // Step 3: Sort by priority descending and take top `count`
  scored.sort((a, b) => b.priority - a.priority);
  const selected = scored.slice(0, config.count).map(s => s.formula);

  // Step 4: Shuffle the selected formulas so order is not predictable
  return shuffleArray(selected);
}

/** Fisher-Yates shuffle */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
