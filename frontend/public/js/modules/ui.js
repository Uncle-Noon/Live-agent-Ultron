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
  const bodyEl  = Object.assign(document.createElement('div'), { className: `msg-content ${role === 'user' ? 'user' : 'bot'}`, textContent: content });

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
  row.appendChild(roleEl);
  row.appendChild(bodyEl);
  listEl.appendChild(row);

  const scroll = () => { listEl.scrollTop = listEl.scrollHeight; };
  return { txtNode, cursor, bodyEl, scroll };
}
