import type { ChatMessage, ChatSession } from '../types';

const STORAGE_KEY = 'cfa-buddy-tutor-sessions';

/**
 * Generates a unique ID for a chat session or message.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Loads all chat sessions from localStorage.
 */
export function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

/**
 * Saves all sessions to localStorage.
 */
function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Creates a new chat session and persists it.
 */
export function createSession(topic?: string): ChatSession {
  const session: ChatSession = {
    id: generateId(),
    messages: [],
    topic,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions);
  return session;
}

/**
 * Gets the most recently updated session, or null if none exist.
 */
export function getActiveSession(): ChatSession | null {
  const sessions = loadSessions();
  if (sessions.length === 0) return null;
  return sessions[0];
}

/**
 * Lists all sessions sorted by most recently updated first.
 */
export function listSessions(): ChatSession[] {
  return loadSessions();
}

/**
 * Gets a specific session by ID.
 */
export function getSession(id: string): ChatSession | null {
  const sessions = loadSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

/**
 * Deletes a session by ID.
 */
export function deleteSession(id: string): void {
  const sessions = loadSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  saveSessions(filtered);
}

/**
 * Adds a message to a session and updates the session timestamp.
 */
export function addMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  sources?: ChatMessage['sources']
): ChatMessage {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const message: ChatMessage = {
    id: generateId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    sources,
  };

  session.messages.push(message);
  session.updatedAt = new Date().toISOString();

  // Update topic from first user message if not set
  if (!session.topic && role === 'user') {
    session.topic = content.slice(0, 50) + (content.length > 50 ? '...' : '');
  }

  // Move session to front (most recent)
  const idx = sessions.indexOf(session);
  if (idx > 0) {
    sessions.splice(idx, 1);
    sessions.unshift(session);
  }

  saveSessions(sessions);
  return message;
}
