import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './components/ChatMessage';
import Sidebar from './components/Sidebar';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const DEFAULT_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large', provider: 'Mistral' },
];

const SUGGESTIONS = [
  { emoji: '💡', text: 'Explain quantum computing in simple terms' },
  { emoji: '✍️', text: 'Write a creative short story about AI' },
  { emoji: '🐍', text: 'Help me debug a Python script' },
  { emoji: '🎨', text: 'Design a color palette for a modern app' },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch models on mount
  useEffect(() => {
    fetch(`${API_URL}/models`)
      .then((res) => res.json())
      .then((data) => {
        if (data.models?.length) setModels(data.models);
      })
      .catch(() => { /* Use default models */ });
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // Create new conversation
  const createConversation = useCallback((firstMessage) => {
    const id = generateId();
    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + '...' : firstMessage;
    const conv = {
      id,
      title,
      preview: firstMessage.slice(0, 60),
      createdAt: new Date().toISOString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(id);
    return id;
  }, []);

  // Send message
  const sendMessage = useCallback(async (messageText) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    // Create conversation if needed
    if (!activeConversationId) {
      createConversation(text);
    }

    const userMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Prepare assistant message placeholder
    const assistantMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() };

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
          model: selectedModel,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      setMessages([...updatedMessages, assistantMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              accumulatedContent += parsed.content;
              setMessages([
                ...updatedMessages,
                { ...assistantMessage, content: accumulatedContent },
              ]);
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) {
              throw e;
            }
          }
        }
      }

      // Update conversation preview
      if (accumulatedContent) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId || prev[0]?.id === c.id
              ? { ...c, preview: accumulatedContent.slice(0, 60) }
              : c
          )
        );
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, messages, selectedModel, activeConversationId, createConversation]);

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // New chat
  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setSidebarOpen(false);
  };

  // Select conversation
  const handleSelectConversation = (id) => {
    setActiveConversationId(id);
    setSidebarOpen(false);
    // In a real app you'd load messages from storage
  };

  // Delete conversation
  const handleDeleteConversation = (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  // Get current model name
  const currentModelName = models.find((m) => m.id === selectedModel)?.name || selectedModel;

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        models={models}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main">
        {/* Header */}
        <div className="chat-header">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="chat-header-model">{currentModelName}</div>
          <div className="chat-header-status">
            <span className="status-dot" />
            Online
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">✦</div>
              <h1 className="welcome-title">Welcome to NexusAI</h1>
              <p className="welcome-subtitle">
                Your intelligent assistant powered by multiple AI models.
                Start a conversation or try one of the suggestions below.
              </p>
              <div className="welcome-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <div
                    key={i}
                    className="suggestion-card"
                    onClick={() => sendMessage(s.text)}
                  >
                    <div className="suggestion-emoji">{s.emoji}</div>
                    <div className="suggestion-text">{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="message assistant">
                  <div className="message-avatar">✦</div>
                  <div className="message-content">
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <div className="dot" />
                        <div className="dot" />
                        <div className="dot" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Input */}
        <div className="input-area">
          <div className="input-wrapper">
            <div className="input-container">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                disabled={isLoading}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                title="Send message"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22,2 15,22 11,13 2,9" />
                </svg>
              </button>
            </div>
            <div className="input-hint">
              Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
