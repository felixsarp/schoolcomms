import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function MessageComposer({ classId, parentCount }) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);

  async function loadMessages() {
    const list = await api.listMessages(classId);
    setMessages(list);
  }

  useEffect(() => {
    loadMessages();
  }, [classId]);

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    if (!body.trim() && !file) {
      setError('Write a message or attach a file first.');
      return;
    }
    setSending(true);
    try {
      const formData = new FormData();
      if (body.trim()) formData.append('body', body.trim());
      if (file) formData.append('file', file);
      await api.sendMessage(classId, formData);
      setBody('');
      setFile(null);
      await loadMessages();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="banner">
        Sending is in mock mode — messages are logged and saved here, not actually delivered via
        WhatsApp yet.
      </div>

      <form className="composer" onSubmit={handleSend}>
        <textarea
          placeholder={`Write a message to all ${parentCount} parent${parentCount === 1 ? '' : 's'} in this class…`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="composer__toolbar">
          <div>
            <input
              id="fileInput"
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="fileInput" className="btn" style={{ display: 'inline-flex' }}>
              Attach file
            </label>
            {file && (
              <span className="file-chip" style={{ marginLeft: 10 }}>
                {file.name}
                <button
                  type="button"
                  className="btn--ghost"
                  style={{ border: 'none', background: 'none', padding: 0, color: 'inherit' }}
                  onClick={() => setFile(null)}
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <button className="btn btn--primary" type="submit" disabled={sending || parentCount === 0}>
            {sending ? 'Sending…' : `Send to ${parentCount} parent${parentCount === 1 ? '' : 's'}`}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
        {parentCount === 0 && (
          <p className="error-text">Add parents to this class before sending a message.</p>
        )}
      </form>

      <h3 style={{ fontSize: 16, marginBottom: 12 }}>Message history</h3>
      {messages.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No messages sent yet.</p>
      ) : (
        messages.map((m) => (
          <div className="message-item" key={m.id}>
            <div className="message-item__meta">
              <span>
                {m.sentBy} · {new Date(m.sentAt).toLocaleString()}
              </span>
              <span className={`status-pill${m.status.includes('failure') ? ' status-pill--warn' : ''}`}>
                {m.status}
              </span>
            </div>
            {m.body && <p style={{ margin: '0 0 6px' }}>{m.body}</p>}
            {m.mediaUrl && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                📎 {m.mediaFilename} ({m.type})
              </p>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              Sent to {m.recipientCount} recipient{m.recipientCount === 1 ? '' : 's'}
            </p>
          </div>
        ))
      )}
    </>
  );
}
