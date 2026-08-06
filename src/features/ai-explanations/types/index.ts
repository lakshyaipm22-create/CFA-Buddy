export type AIProvider = 'openai' | 'anthropic';

export interface ExplainRequest {
  questionText: string;
  answerChoices: {
    label: string;
    text: string;
    isCorrect: boolean;
  }[];
  selectedAnswer: string;
  correctAnswer: string;
}

export interface ExplainResponse {
  explanation: string;
  streaming: false;
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}
