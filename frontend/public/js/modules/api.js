import { API_BASE } from './config.js';

const toJson = async (res) => {
  if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status}: ${t}`); }
  return res.json();
};

const jsonPost = (path, body) =>
  fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(toJson);

export const login        = (email)                    => jsonPost('/login', { email });
export const fetchHistory = (email)                    => fetch(`${API_BASE}/history?email=${encodeURIComponent(email)}&_t=${Date.now()}`).then(toJson);
export const clearHistory = (email)                    => fetch(`${API_BASE}/history?email=${encodeURIComponent(email)}`, { method: 'DELETE' }).then(toJson);
export const fetchCmds    = (email)                    => fetch(`${API_BASE}/commands?email=${encodeURIComponent(email)}&_t=${Date.now()}`).then(toJson);
export const addCmd       = (email, keyword, url, label) => jsonPost('/commands', { email, keyword, url, label });
export const deleteCmd    = (email, keyword)           => fetch(`${API_BASE}/commands?email=${encodeURIComponent(email)}&keyword=${encodeURIComponent(keyword)}`, { method: 'DELETE' }).then(toJson);
export const chatStream   = (message, email, signal)    => fetch(`${API_BASE}/chat-stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, email }), signal });
export const chatFile     = (formData)                 => fetch(`${API_BASE}/chat-file`, { method: 'POST', body: formData }).then(toJson);
