const BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;
const APP_KEY = import.meta.env.VITE_APP_ACCESS_KEY || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(APP_KEY ? { 'x-app-key': APP_KEY } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  scanBrokenLinks: (url) =>
    request('/broken-links/scan', { method: 'POST', body: JSON.stringify({ url }) }),

  searchGuestPosts: (keyword) =>
    request('/guest-post/search', { method: 'POST', body: JSON.stringify({ keyword }) }),

  listBacklinks: () => request('/backlinks'),
  addBacklink: (entry) => request('/backlinks', { method: 'POST', body: JSON.stringify(entry) }),
  updateBacklink: (id, patch) =>
    request(`/backlinks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteBacklink: (id) => request(`/backlinks/${id}`, { method: 'DELETE' }),

  listOutreach: () => request('/outreach'),
  draftOutreach: (payload) =>
    request('/outreach/draft', { method: 'POST', body: JSON.stringify(payload) }),
  updateOutreach: (id, patch) =>
    request(`/outreach/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  sendOutreach: (id, recipientEmail) =>
    request(`/outreach/${id}/send`, { method: 'POST', body: JSON.stringify({ recipientEmail }) }),
  deleteOutreach: (id) => request(`/outreach/${id}`, { method: 'DELETE' }),

  listEntityPlatforms: () => request('/entity-profiles/platforms'),
  listEntityProfiles: () => request('/entity-profiles'),
  draftEntityProfile: (payload) =>
    request('/entity-profiles/draft', { method: 'POST', body: JSON.stringify(payload) }),
  saveEntityProfileStatus: (payload) =>
    request('/entity-profiles', { method: 'POST', body: JSON.stringify(payload) }),
};
