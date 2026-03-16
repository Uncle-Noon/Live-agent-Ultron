import { STORAGE_KEY, MAX_HISTORY_ITEMS } from './config.js';
import { currentEmail, getClearedAt, liftClearedFlag } from './auth.js';
import { fetchHistory, clearHistory as apiClear } from './api.js';
import { appendMessage } from './ui.js';

const storageKey = () => { const e = currentEmail(); return e ? `${STORAGE_KEY}_${e}` : STORAGE_KEY; };

export function readLocal() {
  try { const r = localStorage.getItem(storageKey()); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}

export function pushLocal(role, content) {
  liftClearedFlag(currentEmail());
  const h = readLocal();
  h.push({ role, content, timestamp: Date.now() });
  if (h.length > MAX_HISTORY_ITEMS) h.splice(0, h.length - MAX_HISTORY_ITEMS);
  try { localStorage.setItem(storageKey(), JSON.stringify(h)); } catch {}
}

export async function restoreHistory(listEl) {
  const email     = currentEmail();
  const clearedAt = getClearedAt(email);
  const addItems  = (items) => items.forEach(i => appendMessage(listEl, i.role, i.content, { save: false }));

  if (!email) { addItems(readLocal().filter(i => !clearedAt || (i.timestamp||0) > clearedAt)); return; }

  try {
    const { history } = await fetchHistory(email);
    if (history?.length) {
      listEl.querySelector('.empty-state') && (listEl.innerHTML = '');
      // Sync local storage with server truth
      try { localStorage.setItem(storageKey(), JSON.stringify(history)); } catch {}
      history.forEach(i => appendMessage(listEl, i.role, i.content, { save: false }));
    } else {
      addItems(readLocal().filter(i => !clearedAt || (i.timestamp||0) > clearedAt));
    }
  } catch {
    addItems(readLocal().filter(i => !clearedAt || (i.timestamp||0) > clearedAt));
  }
}

export async function clearAll(listEl) {
  const email = currentEmail();
  try { localStorage.removeItem(storageKey()); } catch {}
  if (email) {
    const { markHistoryCleared } = await import('./auth.js');
    markHistoryCleared(email);
    await apiClear(email).catch(() => {});
  }
  listEl.innerHTML = '<div class="empty-state">History cleared. Start a new conversation!</div>';
}
