import { COMMANDS_KEY } from './config.js';
import { currentEmail }  from './auth.js';
import { fetchCmds, addCmd, deleteCmd as apiDeleteCmd } from './api.js';
import { escapeHtml }    from './ui.js';

export const DEFAULT_COMMANDS = [
  { keyword: 'open youtube',   url: 'https://www.youtube.com',   label: 'YouTube',   aliases: ['youtube','yt'] },
  { keyword: 'open instagram', url: 'https://www.instagram.com', label: 'Instagram', aliases: ['instagram','insta','ig'] },
];

let _custom = [];

// ── Cache helpers ─────────────────────────────────────────────────────────────
const cacheKey  = () => { const e = currentEmail(); return e ? `${COMMANDS_KEY}_${e}` : COMMANDS_KEY; };
const saveCache = (c) => { try { localStorage.setItem(cacheKey(), JSON.stringify(c)); } catch {} };
const loadCache = ()  => { try { const r = localStorage.getItem(cacheKey()); return r ? JSON.parse(r) : []; } catch { return []; } };

// ── Load from server ───────────────────────────────────────────────────────────
export async function loadCommands() {
  const email = currentEmail();
  if (!email) { 
    _custom = loadCache(); // <--- Read local commands for guest users
    return; 
  }
  try {
    const { commands } = await fetchCmds(email);
    _custom = Array.isArray(commands) ? commands : [];
    saveCache(_custom);
  } catch { _custom = loadCache(); }
}

export const allCommands = () => [...DEFAULT_COMMANDS, ..._custom];

// ── Render ─────────────────────────────────────────────────────────────────────
export function renderCommands(listEl) {
  if (!listEl) return;
  const cmds = allCommands();
  if (!cmds.length) { listEl.innerHTML = '<div class="empty-state">No commands yet.</div>'; return; }
  listEl.innerHTML = '';
  cmds.forEach(cmd => {
    const row  = document.createElement('div');   row.className = 'cmd-row';
    const info = document.createElement('div');
    info.innerHTML = `<div class="cmd-keyword">${escapeHtml(cmd.keyword)}</div><div class="cmd-url">${escapeHtml(cmd.url)}</div>`;
    row.appendChild(info);
    const isCustom = !DEFAULT_COMMANDS.some(d => d.keyword.toLowerCase() === cmd.keyword.toLowerCase());
    if (isCustom) {
      const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'btn-secondary', textContent: 'Delete' });
      btn.style.cssText = 'padding:4px 8px;font-size:11px';
      btn.addEventListener('click', () => removeCommand(cmd.keyword, listEl));
      row.appendChild(btn);
    }
    listEl.appendChild(row);
  });
}

// ── Add ───────────────────────────────────────────────────────────────────────
export async function saveCommand(keyword, url, listEl) {
  const email = currentEmail();
  if (email) {
    const { commands } = await addCmd(email, keyword, url, keyword);
    _custom = commands;
    saveCache(_custom);
  } else {
    _custom.push({ keyword, url, label: keyword });
    saveCache(_custom); // <--- Persist for guest users too
  }
  renderCommands(listEl);
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function removeCommand(keyword, listEl) {
  const email = currentEmail();
  if (email) {
    const { commands } = await apiDeleteCmd(email, keyword);
    _custom = commands;
    saveCache(_custom);
  } else {
    _custom = _custom.filter(c => c.keyword.toLowerCase() !== keyword.toLowerCase());
    saveCache(_custom); // <--- Persist deletion for guest users too
  }
  renderCommands(listEl);
}

// ── Match ─────────────────────────────────────────────────────────────────────
function escapeRe(v) { return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function findCommand(msg) {
  const norm = msg.trim().toLowerCase();
  const cmds = allCommands();
  const tokens = (c) => [(c.keyword||'').toLowerCase(), ...(c.aliases||[]).map(a=>(a||'').toLowerCase())].filter(Boolean);
  const wordMatch = (text, tok) => new RegExp(`\\b${escapeRe(tok)}\\b`,'i').test(text);

  // 1. Exact match (e.g. "open youtube")
  let match = cmds.find(c => tokens(c).some(t => t === norm));
  if (match) return match;

  // 2. Word boundary match (e.g. "please open youtube for me")
  match = cmds.find(c => tokens(c).some(t => wordMatch(norm, t)));
  if (match) return match;

  // 3. Fuzzy match (space-insensitive) for typos like "Khulja" vs "Khul ja"
  const scrub = (s) => s.replace(/\s+/g, '');
  const scrubbedNorm = scrub(norm);
  return cmds.find(c => tokens(c).some(t => scrubbedNorm.includes(scrub(t))));
}
