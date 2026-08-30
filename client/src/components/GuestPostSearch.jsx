import React, { useState } from 'react';
import { api } from '../api.js';
import OutreachPanel from './OutreachPanel.jsx';

export default function GuestPostSearch() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [openRow, setOpenRow] = useState(null);
  const [senderInfo, setSenderInfo] = useState({ senderName: '', senderSite: '', senderBio: '' });

  async function handleSearch(e) {
    e.preventDefault();
    if (!keyword) return;
    setLoading(true);
    setError('');
    setResult(null);
    setOpenRow(null);
    try {
      const data = await api.searchGuestPosts(keyword);
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
        <h1>Tìm Cơ Hội Guest Post</h1>
        <p>
          Tìm các trang tài chính công khai nhận bài viết cộng tác, để bạn bắt đầu liên hệ từ
          những site đã sẵn sàng mời gọi thay vì đoán mò.
        </p>
      </div>

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Tên bạn (để cá nhân hóa email)</label>
            <input
              value={senderInfo.senderName}
              onChange={(e) => setSenderInfo({ ...senderInfo, senderName: e.target.value })}
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div className="field">
            <label>Site của bạn</label>
            <input
              value={senderInfo.senderSite}
              onChange={(e) => setSenderInfo({ ...senderInfo, senderSite: e.target.value })}
              placeholder="https://yourfinancesite.com"
            />
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label>Giới thiệu ngắn</label>
            <input
              value={senderInfo.senderBio}
              onChange={(e) => setSenderInfo({ ...senderInfo, senderBio: e.target.value })}
              placeholder="Blog tài chính cá nhân, chuyên về đầu tư dài hạn"
            />
          </div>
        </div>
      </div>

      <form className="card" onSubmit={handleSearch}>
        <div className="field-row">
          <div className="field" style={{ flex: 3 }}>
            <label htmlFor="kw">Từ khóa chủ đề / niche</label>
            <input
              id="kw"
              required
              placeholder="tài chính cá nhân, đầu tư, fintech, crypto…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Đang tìm…' : 'Tìm cơ hội'}
          </button>
        </div>
      </form>

      {error && <div className="error-state">{error}</div>}

      {result?.demoMode && (
        <div className="notice">
          {result.message} Thêm key vào <code>server/.env</code> rồi khởi động lại server để lấy
          kết quả thật.
          <ul className="query-list" style={{ marginTop: 12 }}>
            {result.queries.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {result && !result.demoMode && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          {result.results.length === 0 ? (
            <div className="empty-state">Chưa tìm thấy trang nào nhận cộng tác viên cho từ khóa này.</div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th></th>
                  <th>Domain</th>
                  <th>Tiêu đề trang</th>
                  <th>Mô tả ngắn</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((item, i) => (
                  <React.Fragment key={item.link}>
                    <tr>
                      <td className="idx-cell">{String(i + 1).padStart(3, '0')}</td>
                      <td className="mono">{item.domain}</td>
                      <td>
                        <a href={item.link} target="_blank" rel="noreferrer">
                          {item.title}
                        </a>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 13 }}>{item.snippet}</td>
                      <td>
                        <button
                          className="btn secondary"
                          onClick={() => setOpenRow(openRow === item.link ? null : item.link)}
                        >
                          {openRow === item.link ? 'Đóng' : 'Liên hệ'}
                        </button>
                      </td>
                    </tr>
                    {openRow === item.link && (
                      <tr>
                        <td colSpan={5} style={{ background: '#f8f5ec' }}>
                          <OutreachPanel site={item} keyword={keyword} senderInfo={senderInfo} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
