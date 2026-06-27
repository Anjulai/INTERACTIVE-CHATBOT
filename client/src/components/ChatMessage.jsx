import { useMemo } from 'react';

function formatContent(text) {
  if (!text) return '';

  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    // Code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const lang = lines[0].trim();
      const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
      return (
        <pre key={i}>
          <code>{code.trim()}</code>
        </pre>
      );
    }

    // Regular text with inline formatting
    return part.split('\n').map((line, j) => {
      if (!line.trim()) return <br key={`${i}-${j}`} />;

      // Bold
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code
      formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const content = line.trim().slice(2);
        let bulletFormatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        bulletFormatted = bulletFormatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        return (
          <div key={`${i}-${j}`} style={{ paddingLeft: '16px', position: 'relative', marginBottom: '4px' }}>
            <span style={{ position: 'absolute', left: '4px' }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: bulletFormatted }} />
          </div>
        );
      }

      // Numbered lists
      const numberedMatch = line.trim().match(/^(\d+)\.\s(.+)/);
      if (numberedMatch) {
        let numberedFormatted = numberedMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        numberedFormatted = numberedFormatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        return (
          <div key={`${i}-${j}`} style={{ paddingLeft: '20px', position: 'relative', marginBottom: '4px' }}>
            <span style={{ position: 'absolute', left: '0' }}>{numberedMatch[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: numberedFormatted }} />
          </div>
        );
      }

      return <p key={`${i}-${j}`} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessage({ message }) {
  const { role, content, timestamp } = message;

  const formattedContent = useMemo(() => formatContent(content), [content]);

  return (
    <div className={`message ${role}`}>
      <div className="message-avatar">
        {role === 'assistant' ? '✦' : '👤'}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {role === 'assistant' ? formattedContent : content}
        </div>
        {timestamp && (
          <div className="message-timestamp">{formatTime(timestamp)}</div>
        )}
      </div>
    </div>
  );
}
