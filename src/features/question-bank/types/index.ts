export type Confidence = 'Guess' | 'ThinkSo' | 'Certain';

export type ErrorClassification =
  | 'DidntKnow'
  | 'ForgotFormula'
  | 'CalculationMistake'
  | 'MisreadQuestion'
  | 'Careless'
  | 'TimePressure'
  | 'Unclassified';

export type TestMode =
  | 'Topic'
  | 'Subject'
  | 'Mixed'
  | 'QuickTopic'
  | 'AdaptiveRetest'
  | 'Random'
  | 'WeakTopic'
  | 'Mock'
  | 'Adaptive';

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface AnswerChoice {
  label: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface Question {
  id: string;
  questionText: string;
  answerChoices: AnswerChoice[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  reading: string | null;
  topic: string | null;
  provider: string;
  questionSourceFile: string | null;
}

export interface QuestionAttempt {
  questionId: string;
  selectedAnswer: string;
  confidence: Confidence;
  timeSpentSeconds: number;
  correct: boolean;
  errorClassification?: ErrorClassification;
  timestamp: string;
}

export interface QuestionSession {
  id: string;
  mode: TestMode;
  config: SessionConfig;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  questionIds: string[];
  attempts: QuestionAttempt[];
  currentIndex: number;
  flaggedIds: string[];
  bookmarkedIds: string[];
  expiresAt: string;
}

export interface SessionConfig {
  questionCount: number;
  timeLimit: number | null; // minutes, null = untimed
  subject?: string;
  topic?: string;
  difficulty?: string;
  provider?: string;
}

export interface ConfidenceMatrix {
  mastered: number;     // Correct + Certain
  solid: number;        // Correct + ThinkSo
  luckyGuess: number;   // Correct + Guess
  misconception: number; // Incorrect + Certain
  weakArea: number;     // Incorrect + ThinkSo
  knowledgeGap: number; // Incorrect + Guess
}

export interface SessionSummary {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  confidenceMatrix: ConfidenceMatrix;
  byTopic: Record<string, { correct: number; total: number }>;
  timeDistribution: number[];
}
