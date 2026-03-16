export const escapeHtml = (s) =>
  String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export function setStatus(dotEl, textEl, { state, message }) {
  textEl.textContent = message;
  dotEl.classList.toggle('err', state === 'error');
  dotEl.classList.toggle('ok',  state !== 'error');
}

export function appendMessage(listEl, role, content, { save = true, onSave } = {}) {
  listEl.querySelector('.empty-state')?.remove();

  const row     = Object.assign(document.createElement('div'), { className: 'msg-row' });
  const roleEl  = Object.assign(document.createElement('div'), { className: 'msg-role', textContent: role === 'user' ? 'USER' : 'ULTRON' });
  const bodyEl  = Object.assign(document.createElement('div'), { className: `msg-content ${role === 'user' ? 'user' : 'bot'}` });

  const textNode = document.createTextNode(content);
  bodyEl.appendChild(textNode);

  const copyBtn = makeCopyBtn(() => bodyEl.firstChild.textContent);
  bodyEl.appendChild(copyBtn);

  row.appendChild(roleEl);
  row.appendChild(bodyEl);
  listEl.appendChild(row);
  listEl.scrollTop = listEl.scrollHeight;

  if (save && onSave) onSave(role, content);
  return bodyEl;
}

export function createStreamingBubble(listEl) {
  listEl.querySelector('.empty-state')?.remove();

  const row    = Object.assign(document.createElement('div'), { className: 'msg-row' });
  const roleEl = Object.assign(document.createElement('div'), { className: 'msg-role', textContent: 'ULTRON' });
  const bodyEl = Object.assign(document.createElement('div'), { className: 'msg-content bot' });
  const txtNode = document.createTextNode('');
  const cursor  = Object.assign(document.createElement('span'), { className: 'streaming-cursor' });

  bodyEl.appendChild(txtNode);
  bodyEl.appendChild(cursor);

  // Copy button lives inside the bubble
  const copyBtn = makeCopyBtn(() => txtNode.textContent);
  bodyEl.appendChild(copyBtn);

  row.appendChild(roleEl);
  row.appendChild(bodyEl);
  listEl.appendChild(row);

  const scroll = () => { listEl.scrollTop = listEl.scrollHeight; };

  return { row, txtNode, cursor, bodyEl, scroll };
}

export function createThinkingBubble(listEl) {
  listEl.querySelector('.empty-state')?.remove();

  const row    = Object.assign(document.createElement('div'), { className: 'msg-row' });
  const roleEl = Object.assign(document.createElement('div'), { className: 'msg-role', textContent: 'ULTRON' });
  const bodyEl = Object.assign(document.createElement('div'), { className: 'msg-content bot thinking-bubble' });
  
  bodyEl.innerHTML = `Thinking<span class="thinking-dots"><span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span></span>`;

  row.appendChild(roleEl);
  row.appendChild(bodyEl);
  listEl.appendChild(row);

  const scroll = () => { listEl.scrollTop = listEl.scrollHeight; };
  scroll();

  return { row, remove: () => row.remove() };
}

// ── Copy Button ────────────────────────────────────────────────────────────────
function makeCopyBtn(getText) {
  const btn = Object.assign(document.createElement('button'), {
    className: 'copy-btn',
    title: 'Copy response',
    innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  });
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getText());
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        btn.classList.remove('copied');
      }, 1500);
    } catch {}
  });
  return btn;
}
