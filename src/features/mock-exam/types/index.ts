export interface SubjectWeighting {
  subject: string;
  minPercent: number;
  maxPercent: number;
  targetPercent: number; // midpoint used for selection
}

export interface MockExamConfig {
  totalQuestions: number;
  timeLimitMinutes: number;
  passingThreshold: number; // 0.70
  subjectWeightings: SubjectWeighting[];
}

export interface MockExamAnswer {
  questionId: string;
  selectedAnswer: string | null;
  flagged: boolean;
  timeSpentSeconds: number;
}

export interface SubjectScore {
  subject: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface MockExamResult {
  id: string;
  startedAt: string;
  completedAt: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number; // 0-1
  passed: boolean;
  timeUsedSeconds: number;
  timeLimitSeconds: number;
  subjectScores: SubjectScore[];
  answers: MockExamAnswer[];
  questionIds: string[];
}

export interface MockExamHistory {
  exams: MockExamResult[];
}

export interface ExamProgress {
  examId: string;
  startedAt: string;
  currentIndex: number;
  answers: MockExamAnswer[];
  questionIds: string[];
  timeRemainingSeconds: number;
}
