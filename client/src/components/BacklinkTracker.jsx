import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const STATUS_OPTIONS = ['pending', 'live', 'lost', 'disavowed'];
const QUALITY_OPTIONS = ['unrated', 'good', 'spam'];

const STATUS_LABELS = { pending: 'Đang chờ', live: 'Đang sống', lost: 'Đã mất', disavowed: 'Đã disavow' };
const QUALITY_LABELS = { unrated: 'Chưa đánh giá', good: 'Tốt', spam: 'Spam' };

const empty = { sourceUrl: '', targetUrl: '', anchorText: '', status: 'pending', quality: 'unrated', notes: '' };

export default function BacklinkTracker() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(await api.listBacklinks());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.sourceUrl || !form.targetUrl) return;
    try {
      await api.addBacklink(form);
      setForm(empty);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFieldUpdate(id, patch) {
    try {
      await api.updateBacklink(id, patch);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteBacklink(id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  const spamCount = items.filter((i) => i.quality === 'spam').length;

  return (
    <>
      <div className="page-header">
        <h1>Sổ Theo Dõi Backlink</h1>
        <p>
          Ghi lại toàn bộ backlink bạn đang có — nằm ở đâu, còn sống hay không, và có nên
          disavow hay không.
        </p>
      </div>

      <form className="card" onSubmit={handleAdd}>
        <div className="field-row">
          <div className="field">
            <label>URL nguồn (nơi đặt link)</label>
            <input
              required
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              placeholder="https://someblog.com/article"
            />
          </div>
          <div className="field">
            <label>URL đích (trang của bạn)</label>
            <input
              required
              value={form.targetUrl}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              placeholder="https://yourfinancesite.com/guide"
            />
          </div>
        </div>
        <div className="field-row" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Anchor text</label>
            <input
              value={form.anchorText}
              onChange={(e) => setForm({ ...form, anchorText: e.target.value })}
              placeholder="quỹ chỉ số tốt nhất"
            />
          </div>
          <div className="field">
            <label>Ghi chú</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="guest post từ đợt outreach số 3"
            />
          </div>
          <button className="btn" type="submit">Thêm vào sổ</button>
        </div>
      </form>

      {error && <div className="error-state">{error}</div>}

      <div className="summary-row">
        <div className="summary-stat">
          <span className="num">{items.length}</span>
          <span className="label">Tổng số theo dõi</span>
        </div>
        <div className="summary-stat">
          <span className="num">{items.filter((i) => i.status === 'live').length}</span>
          <span className="label">Đang sống</span>
        </div>
        <div className="summary-stat">
          <span className="num">{spamCount}</span>
          <span className="label">Bị đánh dấu spam</span>
        </div>
      </div>

      <div className="toolbar">
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {spamCount > 0
            ? `Có ${spamCount} backlink bị đánh dấu spam, sẵn sàng để disavow.`
            : 'Đánh dấu một backlink là "spam" để đưa domain đó vào file disavow.'}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="btn secondary" href="/api/backlinks/export/csv">Xuất CSV</a>
          <a className="btn secondary" href="/api/backlinks/export/disavow">Xuất disavow.txt</a>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">Chưa theo dõi backlink nào — thêm cái đầu tiên ở trên.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ledger">
            <thead>
              <tr>
                <th></th>
                <th>Nguồn</th>
                <th>Đích</th>
                <th>Anchor</th>
                <th>Trạng thái</th>
                <th>Chất lượng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td className="idx-cell">{String(i + 1).padStart(3, '0')}</td>
                  <td className="mono">
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a>
                  </td>
                  <td className="mono">{item.targetUrl}</td>
                  <td>{item.anchorText}</td>
                  <td>
                    <select
                      value={item.status}
                      onChange={(e) => handleFieldUpdate(item.id, { status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={item.quality}
                      onChange={(e) => handleFieldUpdate(item.id, { quality: e.target.value })}
                    >
                      {QUALITY_OPTIONS.map((q) => (
                        <option key={q} value={q}>{QUALITY_LABELS[q]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="btn danger" onClick={() => handleDelete(item.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
