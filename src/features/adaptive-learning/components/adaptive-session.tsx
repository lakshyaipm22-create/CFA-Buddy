'use client';

import { useState, useCallback } from 'react';
import { Brain, ChevronRight, RotateCcw, BarChart3 } from 'lucide-react';
import type { Question } from '@/features/question-bank/types';
import type { AdaptiveState, AdaptiveRecommendation, AdaptiveResponse } from '../types';
import { loadAdaptiveState, recordResponse, createInitialState, resetAdaptiveState } from '../utils/adaptive-storage';
import { selectAdaptiveQuestion } from '../utils/adaptive-selector';
import { difficultyToNumeric, updateAbility } from '../utils/ability-estimator';
import { getMasteryLevel, getMasteryColor } from '../utils/topic-mastery';
import { MasteryOverview } from './mastery-overview';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';

type SessionPhase = 'idle' | 'active' | 'review' | 'summary';

interface SessionStats {
  questionsAnswered: number;
  correctCount: number;
  startTheta: number;
  currentTheta: number;
}

export function AdaptiveSession() {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [state, setState] = useState<AdaptiveState>(() => loadAdaptiveState());
  const [pool] = useState<Question[]>(() => loadAllQuestions());
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentRecommendation, setCurrentRecommendation] = useState<AdaptiveRecommendation | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState<SessionStats>({
    questionsAnswered: 0,
    correctCount: 0,
    startTheta: 0,
    currentTheta: 0,
  });

  const startSession = useCallback(() => {
    const currentState = loadAdaptiveState();
    setState(currentState);
    setStats({
      questionsAnswered: 0,
      correctCount: 0,
      startTheta: currentState.ability.theta,
      currentTheta: currentState.ability.theta,
    });
    setPhase('active');

    // Select first question
    const rec = selectAdaptiveQuestion(pool, currentState);
    if (rec) {
      setCurrentRecommendation(rec);
      const question = pool.find(q => q.id === rec.questionId);
      setCurrentQuestion(question ?? null);
    }
  }, [pool]);

  const handleAnswer = useCallback((answerLabel: string) => {
    if (!currentQuestion || showResult) return;
    setSelectedAnswer(answerLabel);
    setShowResult(true);
  }, [currentQuestion, showResult]);

  const handleNext = useCallback(() => {
    if (!currentQuestion || !selectedAnswer) return;

    const correct = currentQuestion.answerChoices.some(
      c => c.label === selectedAnswer && c.isCorrect
    );

    const topic = currentQuestion.topic ?? currentQuestion.subject;
    const difficulty = currentQuestion.difficulty;
    const thetaBefore = state.ability.theta;
    const numericDiff = difficultyToNumeric(difficulty);
    const thetaAfter = updateAbility(thetaBefore, numericDiff, correct);

    const response: AdaptiveResponse = {
      questionId: currentQuestion.id,
      topic,
      subject: currentQuestion.subject,
      difficulty,
      correct,
      thetaBefore,
      thetaAfter,
      timestamp: new Date().toISOString(),
    };

    const newState = recordResponse(state, response);
    setState(newState);

    const newStats = {
      questionsAnswered: stats.questionsAnswered + 1,
      correctCount: stats.correctCount + (correct ? 1 : 0),
      startTheta: stats.startTheta,
      currentTheta: newState.ability.theta,
    };
    setStats(newStats);

    // Select next question
    const rec = selectAdaptiveQuestion(pool, newState);
    if (rec) {
      setCurrentRecommendation(rec);
      const question = pool.find(q => q.id === rec.questionId);
      setCurrentQuestion(question ?? null);
    } else {
      setCurrentQuestion(null);
      setCurrentRecommendation(null);
    }

    setSelectedAnswer(null);
    setShowResult(false);
  }, [currentQuestion, selectedAnswer, state, pool, stats]);

  const endSession = useCallback(() => {
    setPhase('summary');
  }, []);

  const handleReset = useCallback(() => {
    resetAdaptiveState();
    const freshState = createInitialState();
    setState(freshState);
    setPhase('idle');
    setStats({ questionsAnswered: 0, correctCount: 0, startTheta: 0, currentTheta: 0 });
  }, []);

  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'rgba(0, 43, 92, 0.3)', border: '1px solid rgba(197, 162, 88, 0.2)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-6 w-6" style={{ color: '#C5A258' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Adaptive Practice
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
            The adaptive engine selects questions at your optimal difficulty frontier.
            It learns from your responses to identify knowledge gaps and targets them efficiently.
          </p>
          <div className="flex gap-3">
            <button
              onClick={startSession}
              disabled={pool.length === 0}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{
                backgroundColor: '#C5A258',
                color: '#0a0e14',
                opacity: pool.length === 0 ? 0.5 : 1,
              }}
            >
              Start Adaptive Session
            </button>
            {state.responseHistory.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset Progress
              </button>
            )}
          </div>
        </div>

        {/* Show mastery overview if there's history */}
        {state.responseHistory.length > 0 && (
          <MasteryOverview state={state} />
        )}
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div className="space-y-6">
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'rgba(0, 43, 92, 0.3)', border: '1px solid rgba(197, 162, 88, 0.2)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-6 w-6" style={{ color: '#C5A258' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Session Summary
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Questions</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {stats.questionsAnswered}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Accuracy</p>
              <p className="text-2xl font-bold" style={{ color: '#00843D' }}>
                {stats.questionsAnswered > 0
                  ? `${Math.round((stats.correctCount / stats.questionsAnswered) * 100)}%`
                  : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Theta Change</p>
              <p className="text-2xl font-bold" style={{
                color: stats.currentTheta >= stats.startTheta ? '#00843D' : '#ef4444'
              }}>
                {stats.currentTheta >= stats.startTheta ? '+' : ''}
                {(stats.currentTheta - stats.startTheta).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Level</p>
              <p className="text-2xl font-bold" style={{ color: getMasteryColor(stats.currentTheta) }}>
                {getMasteryLevel(stats.currentTheta)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setPhase('idle')}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            style={{ backgroundColor: '#C5A258', color: '#0a0e14' }}
          >
            Back to Overview
          </button>
        </div>

        <MasteryOverview state={state} />
      </div>
    );
  }

  // Active session
  return (
    <div className="space-y-4">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5" style={{ color: '#C5A258' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            Q{stats.questionsAnswered + 1} | Theta: {state.ability.theta.toFixed(2)}
          </span>
        </div>
        <button
          onClick={endSession}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: 'rgba(197, 162, 88, 0.1)',
            color: '#C5A258',
            border: '1px solid rgba(197, 162, 88, 0.3)',
          }}
        >
          End Session
        </button>
      </div>

      {/* Question Card */}
      {currentQuestion ? (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'rgba(0, 43, 92, 0.3)', border: '1px solid rgba(197, 162, 88, 0.2)' }}
        >
          {/* Recommendation context */}
          {currentRecommendation && (
            <div className="mb-4 flex items-center gap-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(197, 162, 88, 0.15)',
                  color: '#C5A258',
                }}
              >
                {currentRecommendation.targetDifficulty}
              </span>
              <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                {currentRecommendation.reason}
              </span>
            </div>
          )}

          {/* Question text */}
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--foreground)' }}>
            {currentQuestion.questionText}
          </p>

          {/* Answer choices */}
          <div className="space-y-2">
            {currentQuestion.answerChoices.map(choice => {
              const isSelected = selectedAnswer === choice.label;
              const isCorrectChoice = choice.isCorrect;
              let borderColor = 'rgba(197, 162, 88, 0.2)';
              let bgColor = 'rgba(0, 43, 92, 0.2)';

              if (showResult) {
                if (isCorrectChoice) {
                  borderColor = '#00843D';
                  bgColor = 'rgba(0, 132, 61, 0.1)';
                } else if (isSelected && !isCorrectChoice) {
                  borderColor = '#ef4444';
                  bgColor = 'rgba(239, 68, 68, 0.1)';
                }
              } else if (isSelected) {
                borderColor = '#C5A258';
                bgColor = 'rgba(197, 162, 88, 0.1)';
              }

              return (
                <button
                  key={choice.label}
                  onClick={() => handleAnswer(choice.label)}
                  disabled={showResult}
                  className="w-full text-left rounded-lg p-3 transition-all"
                  style={{
                    backgroundColor: bgColor,
                    border: `1px solid ${borderColor}`,
                    opacity: showResult && !isSelected && !isCorrectChoice ? 0.6 : 1,
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                    <strong>{choice.label}.</strong> {choice.text}
                  </span>
                  {showResult && isCorrectChoice && (
                    <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                      {choice.explanation}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          {showResult && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{ backgroundColor: '#C5A258', color: '#0a0e14' }}
              >
                Next Question
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: 'rgba(0, 43, 92, 0.3)', border: '1px solid rgba(197, 162, 88, 0.2)' }}
        >
          <p style={{ color: 'var(--foreground-secondary)' }}>
            No more questions available. End the session to see your results.
          </p>
          <button
            onClick={endSession}
            className="mt-4 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            style={{ backgroundColor: '#C5A258', color: '#0a0e14' }}
          >
            View Summary
          </button>
        </div>
      )}
    </div>
  );
}
