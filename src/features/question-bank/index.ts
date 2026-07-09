export type {
  Question,
  QuestionAttempt,
  QuestionSession,
  SessionConfig,
  SessionSummary,
  ConfidenceMatrix,
  Confidence,
  ErrorClassification,
  TestMode,
  SessionStatus,
  AnswerChoice,
} from './types';
export { selectQuestions } from './utils/question-selector';
export { buildConfidenceMatrix, buildSessionSummary, classifyAttempt } from './utils/confidence-matrix';
export { getSessions, saveSession, getSession, getResumableSession, cleanupExpiredSessions } from './utils/session-storage';
