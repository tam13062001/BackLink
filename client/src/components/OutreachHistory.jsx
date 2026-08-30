import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const STATUS_LABELS = { draft: 'Bản nháp', sent: 'Đã gửi' };

export default function OutreachHistory() {
  const [items, setItems] = useState([]);
  const [sentToday, setSentToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const data = await api.listOutreach();
      setItems(data.items);
      setSentToday(data.sentToday);
      setDailyLimit(data.dailyLimit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(id) {
    try {
      await api.deleteOutreach(id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Lịch Sử Outreach</h1>
        <p>Toàn bộ email đã soạn và đã gửi, cùng hạn mức gửi mỗi ngày để tránh bị đánh dấu spam.</p>
      </div>

      <div className="summary-row">
        <div className="summary-stat">
          <span className="num">{sentToday} / {dailyLimit}</span>
          <span className="label">Đã gửi hôm nay</span>
        </div>
        <div className="summary-stat">
          <span className="num">{items.length}</span>
          <span className="label">Tổng bản nháp + đã gửi</span>
        </div>
      </div>

      {error && <div className="error-state">{error}</div>}

      {loading ? (
        <div className="empty-state">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          Chưa có email nào — sang tab "Tìm Guest Post", bấm "Liên hệ" ở một kết quả để bắt đầu.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="ledger">
            <thead>
              <tr>
                <th></th>
                <th>Site</th>
                <th>Người nhận</th>
                <th>Tiêu đề email</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td className="idx-cell">{String(i + 1).padStart(3, '0')}</td>
                  <td className="mono">{item.siteDomain}</td>
                  <td className="mono">{item.recipientEmail || '—'}</td>
                  <td>{item.subject}</td>
                  <td>
                    <span className={`badge ${item.status === 'sent' ? 'live' : 'pending'}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
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
