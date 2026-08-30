import React, { useState } from 'react';
import { api } from '../api.js';

// Inline compose-and-send panel for one guest-post candidate.
// Flow: AI drafts a personalized email -> user reviews/edits -> user enters recipient email -> user sends.
// Sending always requires an explicit click here; nothing is sent automatically.
export default function OutreachPanel({ site, keyword, senderInfo, onSent }) {
  const [draft, setDraft] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentOk, setSentOk] = useState(false);

  async function handleDraft() {
    setDrafting(true);
    setError('');
    try {
      const result = await api.draftOutreach({
        siteDomain: site.domain,
        pageTitle: site.title,
        snippet: site.snippet,
        pageUrl: site.link,
        keyword,
        ...senderInfo,
      });
      setDraft(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setDrafting(false);
    }
  }

  async function handleFieldChange(field, value) {
    setDraft({ ...draft, [field]: value });
  }

  async function handleSend() {
    if (!recipientEmail) {
      setError('Cần nhập email người nhận trước khi gửi.');
      return;
    }
    setSending(true);
    setError('');
    try {
      // Persist any edits first
      await api.updateOutreach(draft.id, { subject: draft.subject, body: draft.body });
      await api.sendOutreach(draft.id, recipientEmail);
      setSentOk(true);
      onSent?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!draft) {
    return (
      <div style={{ marginTop: 8 }}>
        <button className="btn secondary" onClick={handleDraft} disabled={drafting}>
          {drafting ? 'Đang soạn…' : 'Soạn email bằng AI'}
        </button>
        {error && <div className="error-state" style={{ marginTop: 10 }}>{error}</div>}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 10, background: '#fbf8f0' }}>
      {sentOk ? (
        <div style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          ✓ Đã gửi tới {recipientEmail}
        </div>
      ) : (
        <>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Email người nhận</label>
            <input
              type="email"
              placeholder="editor@somesite.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Tiêu đề</label>
            <input value={draft.subject} onChange={(e) => handleFieldChange('subject', e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Nội dung (xem lại và sửa trước khi gửi)</label>
            <textarea
              rows={8}
              value={draft.body}
              onChange={(e) => handleFieldChange('body', e.target.value)}
            />
          </div>
          {error && <div className="error-state">{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={handleSend} disabled={sending}>
              {sending ? 'Đang gửi…' : 'Gửi email này'}
            </button>
            <button className="btn secondary" onClick={handleDraft} disabled={drafting}>
              {drafting ? 'Đang soạn lại…' : 'Soạn lại bằng AI'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
