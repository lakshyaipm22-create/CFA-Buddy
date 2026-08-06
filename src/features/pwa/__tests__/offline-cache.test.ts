import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheQuestionData, cacheFlashcardData, cacheAllStudyData } from '../utils/offline-cache';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock navigator.serviceWorker
const postMessageMock = vi.fn();
const mockServiceWorker = {
  controller: { postMessage: postMessageMock },
};

Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
    onLine: true,
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
  configurable: true,
});

describe('offline-cache', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('cacheQuestionData', () => {
    it('sends question data to service worker when available', () => {
      const questions = [{ id: '1', text: 'What is NPV?' }];
      localStorageMock.setItem('cfa-buddy-questions', JSON.stringify(questions));

      cacheQuestionData();

      expect(postMessageMock).toHaveBeenCalledWith({
        type: 'CACHE_QUESTION_DATA',
        payload: questions,
      });
    });

    it('does nothing when no question data in localStorage', () => {
      cacheQuestionData();
      expect(postMessageMock).not.toHaveBeenCalled();
    });

    it('does not throw when localStorage read fails', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => cacheQuestionData()).not.toThrow();
    });
  });

  describe('cacheFlashcardData', () => {
    it('sends flashcard data to service worker when available', () => {
      const flashcards = [{ id: '1', front: 'NPV', back: 'Net Present Value' }];
      localStorageMock.setItem('cfa-buddy-flashcards', JSON.stringify(flashcards));

      cacheFlashcardData();

      expect(postMessageMock).toHaveBeenCalledWith({
        type: 'CACHE_FLASHCARD_DATA',
        payload: flashcards,
      });
    });

    it('does nothing when no flashcard data in localStorage', () => {
      cacheFlashcardData();
      expect(postMessageMock).not.toHaveBeenCalled();
    });
  });

  describe('cacheAllStudyData', () => {
    it('caches both question and flashcard data', () => {
      const questions = [{ id: '1', text: 'Q1' }];
      const flashcards = [{ id: '1', front: 'F1', back: 'B1' }];
      localStorageMock.setItem('cfa-buddy-questions', JSON.stringify(questions));
      localStorageMock.setItem('cfa-buddy-flashcards', JSON.stringify(flashcards));

      cacheAllStudyData();

      expect(postMessageMock).toHaveBeenCalledTimes(2);
      expect(postMessageMock).toHaveBeenCalledWith({
        type: 'CACHE_QUESTION_DATA',
        payload: questions,
      });
      expect(postMessageMock).toHaveBeenCalledWith({
        type: 'CACHE_FLASHCARD_DATA',
        payload: flashcards,
      });
    });
  });
});
