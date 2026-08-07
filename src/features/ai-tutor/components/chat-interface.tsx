'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage, SourceReference } from '../types';
import {
  addMessage,
  createSession,
  getActiveSession,
  loadSessions,
} from '../utils/chat-storage';
import { SourceCitation } from './source-citation';
import { SuggestedQuestions } from './suggested-questions';

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session from localStorage
  useEffect(() => {
    const sessions = loadSessions();
    if (sessions.length > 0) {
      const active = getActiveSession();
      if (active) {
        setSessionId(active.id);
        setMessages(active.messages);
      }
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewSession = useCallback(() => {
    const session = createSession();
    setSessionId(session.id);
    setMessages([]);
  }, []);

  const handleSubmit = useCallback(
    async (text?: string) => {
      const messageText = text ?? input.trim();
      if (!messageText || isLoading) return;

      // Ensure we have a session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const session = createSession();
        currentSessionId = session.id;
        setSessionId(currentSessionId);
      }

      // Add user message
      const userMessage = addMessage(currentSessionId, 'user', messageText);
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setAiUnavailable(false);

      try {
        const response = await fetch('/api/tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: messageText }].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            sessionId: currentSessionId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage =
            errorData?.error ?? `Request failed with status ${response.status}`;

          if (response.status === 503) {
            setAiUnavailable(true);
            const assistantMsg = addMessage(
              currentSessionId,
              'assistant',
              errorData?.message ??
                'AI tutor is not currently available. Please configure an API key (OpenAI or Anthropic) to enable AI-powered responses.'
            );
            setMessages((prev) => [...prev, assistantMsg]);
          } else {
            const assistantMsg = addMessage(
              currentSessionId,
              'assistant',
              `I encountered an error: ${errorMessage}. Please try again.`
            );
            setMessages((prev) => [...prev, assistantMsg]);
          }
          return;
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let fullContent = '';
        const sources: SourceReference[] = [];

        // Check for sources in header
        const sourcesHeader = response.headers.get('X-Sources');
        if (sourcesHeader) {
          try {
            const parsed = JSON.parse(sourcesHeader) as SourceReference[];
            sources.push(...parsed);
          } catch {
            // Ignore malformed sources header
          }
        }

        // Create placeholder assistant message
        const placeholderId = `streaming-${Date.now()}`;
        const placeholderMsg: ChatMessage = {
          id: placeholderId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          sources,
        };
        setMessages((prev) => [...prev, placeholderMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          setMessages((prev) =>
            prev.map((m) => (m.id === placeholderId ? { ...m, content: fullContent } : m))
          );
        }

        // Persist the final message
        const assistantMsg = addMessage(
          currentSessionId,
          'assistant',
          fullContent,
          sources.length > 0 ? sources : undefined
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? assistantMsg : m))
        );
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'An unexpected error occurred';
        const assistantMsg = addMessage(
          currentSessionId,
          'assistant',
          `I had trouble responding: ${errMsg}. Please try again.`
        );
        setMessages((prev) => [...prev, assistantMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, sessionId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const showSuggestions = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            CFA Buddy AI Tutor
          </h2>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Ask anything about CFA Level I curriculum
          </p>
        </div>
        <button
          type="button"
          onClick={startNewSession}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#C5A258]/10"
          style={{ color: '#C5A258', border: '1px solid #C5A258' }}
        >
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {showSuggestions && (
          <div className="flex h-full flex-col items-center justify-center space-y-6 py-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Welcome to CFA Buddy AI Tutor
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Ask me anything about CFA Level I concepts, formulas, or exam strategies.
              </p>
            </div>
            <SuggestedQuestions onSelect={(q) => handleSubmit(q)} />
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              }`}
              style={
                message.role === 'user'
                  ? { backgroundColor: '#002B5C', color: '#ffffff' }
                  : { backgroundColor: 'var(--card-border)', color: 'var(--foreground)' }
              }
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <SourceCitation sources={message.sources} />
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div
              className="max-w-[80%] rounded-lg rounded-bl-sm px-4 py-3"
              style={{ backgroundColor: 'var(--card-border)' }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 animate-bounce rounded-full"
                  style={{ backgroundColor: '#C5A258', animationDelay: '0ms' }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full"
                  style={{ backgroundColor: '#C5A258', animationDelay: '150ms' }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full"
                  style={{ backgroundColor: '#C5A258', animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* AI Unavailable Notice */}
      {aiUnavailable && (
        <div
          className="mx-4 mb-2 rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: '#C5A258', backgroundColor: '#C5A25810', color: '#C5A258' }}
        >
          AI is not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable to enable the tutor.
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about any CFA topic..."
            rows={1}
            className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[#C5A258]"
            style={{
              borderColor: 'var(--card-border)',
              backgroundColor: 'transparent',
              color: 'var(--foreground)',
            }}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#002B5C', color: '#ffffff' }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
