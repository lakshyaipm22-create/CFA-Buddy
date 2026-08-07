export interface SourceReference {
  type: 'formula' | 'question' | 'concept';
  id: string;
  title: string;
  relevanceScore: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: SourceReference[];
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  topic?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TutorConfig {
  maxHistoryLength: number;
  contextWindowSize: number;
  systemPromptOverride?: string;
}

export interface TutorRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  sessionId: string;
}

export interface RetrievedContext {
  formulas: FormulaContext[];
  questions: QuestionContext[];
}

export interface FormulaContext {
  id: string;
  name: string;
  subject: string;
  formula: string;
  variables: string;
  topic: string;
  keyTip?: string;
  relevanceScore: number;
}

export interface QuestionContext {
  id: string;
  questionText: string;
  subject: string;
  topic: string | null;
  relevanceScore: number;
}
