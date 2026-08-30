import React, { useState } from 'react';
import { api } from '../api.js';

export default function BrokenLinkFinder() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleScan(e) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.scanBrokenLinks(url);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Tìm Link Hỏng</h1>
        <p>
          Dán vào đây bài viết tài chính bạn muốn được gắn link. Tool sẽ quét toàn bộ link ra
          ngoài trong bài đó và báo cái nào đã chết — lý do chính đáng để liên hệ và đề xuất bài
          của bạn làm link thay thế.
        </p>
      </div>

      <form className="card" onSubmit={handleScan}>
        <div className="field-row">
          <div className="field" style={{ flex: 3 }}>
            <label htmlFor="scan-url">Trang cần quét</label>
            <input
              id="scan-url"
              type="url"
              required
              placeholder="https://example-finance-blog.com/best-etfs-2026"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Đang quét…' : 'Quét trang'}
          </button>
        </div>
      </form>

      {error && <div className="error-state">{error}</div>}

      {result && (
        <>
          <div className="summary-row">
            <div className="summary-stat">
              <span className="num">{result.totalLinks}</span>
              <span className="label">Link tìm thấy</span>
            </div>
            <div className="summary-stat">
              <span className="num">{result.brokenCount}</span>
              <span className="label">Link hỏng</span>
            </div>
          </div>

          {result.brokenCount === 0 ? (
            <div className="empty-state">Không có link nào bị hỏng ở trang này. Thử trang khác xem sao.</div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th></th>
                    <th>Anchor text</th>
                    <th>URL</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {result.broken.map((link, i) => (
                    <tr key={link.href}>
                      <td className="idx-cell">{String(i + 1).padStart(3, '0')}</td>
                      <td>{link.text || <em>(không có anchor text)</em>}</td>
                      <td className="mono">
                        <a href={link.href} target="_blank" rel="noreferrer">
                          {link.href}
                        </a>
                      </td>
                      <td>
                        <span className="badge broken">
                          {link.status ?? link.error ?? 'HỎNG'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
