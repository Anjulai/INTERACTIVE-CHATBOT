export default function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  selectedModel,
  onModelChange,
  models,
  isOpen,
  onClose,
}) {
  return (
    <>
      {isOpen && <div className="mobile-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">✦</div>
          <span className="sidebar-title">NexusAI</span>
        </div>

        {/* New Chat Button */}
        <button className="new-chat-btn" onClick={onNewChat}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>

        {/* Model Selector */}
        <div className="model-selector">
          <label>Model</label>
          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.provider}
              </option>
            ))}
          </select>
        </div>

        {/* Conversation History */}
        <div className="conversation-list">
          <div className="conversation-list-label">History</div>
          {conversations.length === 0 && (
            <div style={{ padding: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
              No conversations yet
            </div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conv-icon">💬</div>
              <div className="conv-text">
                <div className="conv-title">{conv.title}</div>
                <div className="conv-preview">{conv.preview}</div>
              </div>
              <button
                className="conv-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                title="Delete conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-text">Powered by OpenRouter</div>
        </div>
      </aside>
    </>
  );
}
