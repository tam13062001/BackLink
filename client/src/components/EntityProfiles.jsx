import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const STATUS_OPTIONS = ['not_started', 'drafted', 'submitted', 'live'];
const STATUS_LABELS = {
  not_started: 'Chưa làm',
  drafted: 'Đã soạn nội dung',
  submitted: 'Đã đăng ký',
  live: 'Đã lên (live)',
};

function DraftBox({ platform, businessInfo, tracked, onSaved }) {
  const [bio, setBio] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState('');
  const [profileUrl, setProfileUrl] = useState(tracked?.profileUrl || '');
  const [status, setStatus] = useState(tracked?.status || 'not_started');

  async function handleDraft() {
    if (!businessInfo.businessName || !businessInfo.website) {
      setError('Điền tên thương hiệu và website ở phần trên trước.');
      return;
    }
    setDrafting(true);
    setError('');
    try {
      const result = await api.draftEntityProfile({ platformId: platform.id, ...businessInfo });
      setBio(result.bio);
      setStatus('drafted');
    } catch (err) {
      setError(err.message);
    } finally {
      setDrafting(false);
    }
  }

  async function handleSaveStatus(newStatus) {
    setStatus(newStatus);
    try {
      await api.saveEntityProfileStatus({ platformId: platform.id, status: newStatus, profileUrl });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveUrl() {
    try {
      await api.saveEntityProfileStatus({ platformId: platform.id, status, profileUrl });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card" style={{ marginTop: 10, background: '#f8f5ec' }}>
      <div className="field-row" style={{ marginBottom: 12 }}>
        <a className="btn secondary" href={platform.url} target="_blank" rel="noreferrer">
          Mở trang đăng ký {platform.name} ↗
        </a>
        <button className="btn secondary" onClick={handleDraft} disabled={drafting}>
          {drafting ? 'Đang soạn…' : bio ? 'Soạn lại' : 'Soạn nội dung bằng AI'}
        </button>
      </div>

      {error && <div className="error-state">{error}</div>}

      {bio && (
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Nội dung bio — xem lại và chỉnh trước khi dán vào {platform.name}</label>
          <textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label>Trạng thái</label>
          <select value={status} onChange={(e) => handleSaveStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>Link hồ sơ sau khi đăng (tùy chọn)</label>
          <input
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            onBlur={handleSaveUrl}
            placeholder="https://about.me/your-brand"
          />
        </div>
      </div>
    </div>
  );
}

export default function EntityProfiles() {
  const [platforms, setPlatforms] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    website: '',
    description: '',
    contactInfo: '',
  });

  async function refresh() {
    const [p, t] = await Promise.all([api.listEntityPlatforms(), api.listEntityProfiles()]);
    setPlatforms(p);
    setTracked(t);
  }

  useEffect(() => {
    refresh();
  }, []);

  function trackedFor(platformId) {
    return tracked.find((t) => t.platformId === platformId);
  }

  const doneCount = tracked.filter((t) => t.status === 'live').length;

  return (
    <>
      <div className="page-header">
        <h1>Hồ Sơ Thương Hiệu</h1>
        <p>
          Danh sách chọn lọc các nền tảng uy tín để tạo hồ sơ thương hiệu thật. AI soạn nội dung
          riêng cho từng nền tảng — bạn tự tay đăng ký và đăng, không có gì tự động chạy ngầm.
        </p>
      </div>

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Tên thương hiệu</label>
            <input
              value={businessInfo.businessName}
              onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
              placeholder="Blog Tài Chính ABC"
            />
          </div>
          <div className="field">
            <label>Website</label>
            <input
              value={businessInfo.website}
              onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
              placeholder="https://yourfinancesite.com"
            />
          </div>
        </div>
        <div className="field-row" style={{ marginTop: 12 }}>
          <div className="field" style={{ flex: 2 }}>
            <label>Mô tả hoạt động (thật, sẽ dùng để soạn bio)</label>
            <textarea
              rows={2}
              value={businessInfo.description}
              onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
              placeholder="Chuyên viết về đầu tư chứng khoán và quản lý tài chính cá nhân cho người Việt trẻ."
            />
          </div>
          <div className="field">
            <label>Liên hệ (tùy chọn)</label>
            <input
              value={businessInfo.contactInfo}
              onChange={(e) => setBusinessInfo({ ...businessInfo, contactInfo: e.target.value })}
              placeholder="contact@yourfinancesite.com"
            />
          </div>
        </div>
      </div>

      <div className="summary-row">
        <div className="summary-stat">
          <span className="num">{doneCount} / {platforms.length}</span>
          <span className="label">Nền tảng đã live</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="ledger">
          <thead>
            <tr>
              <th></th>
              <th>Nền tảng</th>
              <th>Nhóm</th>
              <th>Ghi chú</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((p, i) => {
              const t = trackedFor(p.id);
              return (
                <React.Fragment key={p.id}>
                  <tr>
                    <td className="idx-cell">{String(i + 1).padStart(2, '0')}</td>
                    <td>{p.name}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{p.category}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{p.notes}</td>
                    <td>
                      <span className={`badge ${t?.status === 'live' ? 'live' : 'pending'}`}>
                        {STATUS_LABELS[t?.status || 'not_started']}
                      </span>
                    </td>
                    <td>
                      <button className="btn secondary" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                        {openId === p.id ? 'Đóng' : 'Bắt đầu'}
                      </button>
                    </td>
                  </tr>
                  {openId === p.id && (
                    <tr>
                      <td colSpan={6}>
                        <DraftBox platform={p} businessInfo={businessInfo} tracked={t} onSaved={refresh} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
