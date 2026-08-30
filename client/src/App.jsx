import React, { useState } from 'react';
import BrokenLinkFinder from './components/BrokenLinkFinder.jsx';
import GuestPostSearch from './components/GuestPostSearch.jsx';
import BacklinkTracker from './components/BacklinkTracker.jsx';
import OutreachHistory from './components/OutreachHistory.jsx';
import EntityProfiles from './components/EntityProfiles.jsx';

const TABS = [
  { key: 'broken', label: 'Tìm Link Hỏng', component: BrokenLinkFinder },
  { key: 'guest', label: 'Tìm Guest Post', component: GuestPostSearch },
  { key: 'outreach', label: 'Lịch Sử Outreach', component: OutreachHistory },
  { key: 'entity', label: 'Hồ Sơ Thương Hiệu', component: EntityProfiles },
  { key: 'tracker', label: 'Sổ Backlink', component: BacklinkTracker },
];

export default function App() {
  const [active, setActive] = useState('broken');
  const ActiveComponent = TABS.find((t) => t.key === active).component;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Backlink Toolkit
          <small>Cho blog tài chính</small>
        </div>
        <nav className="nav">
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              className={`nav-item ${active === tab.key ? 'active' : ''}`}
              onClick={() => setActive(tab.key)}
            >
              <span className="idx">{String(i + 1).padStart(2, '0')}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          Chỉ làm SEO trắng (white-hat).
          <br />
          Không auto-post, không spam link.
        </div>
      </aside>
      <main className="main">
        <ActiveComponent />
      </main>
    </div>
  );
}
