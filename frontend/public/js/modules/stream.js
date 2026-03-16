import { chatStream } from './api.js';
import { pushLocal } from './history.js';
import { currentEmail } from './auth.js';
import { speak } from './speech.js';
import { createStreamingBubble, createThinkingBubble } from './ui.js';

/**
 * Sends a text message via SSE streaming and renders it word-by-word.
 * @param {string}   message
 * @param {Element}  listEl      — message list container
 * @param {Function} onDone      — called with final result object
 * @param {Function} onError     — called with Error
 */
export async function sendStream(message, listEl, onDone, onError, signal) {
  const thinking = createThinkingBubble(listEl);
  let streaming = null;
  const email = currentEmail();

  try {
    const res = await chatStream(message, email, signal);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // First chunk received: remove thinking and start streaming bubble
      if (!streaming) {
        thinking.remove();
        streaming = createStreamingBubble(listEl);
      }
      const { txtNode, cursor, scroll } = streaming;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let parsed;
        try { parsed = JSON.parse(line.slice(6)); } catch { continue; }

        if (parsed.error)  { 
          if (streaming) {
            streaming.txtNode.textContent = `Error: ${parsed.error}`; 
            streaming.cursor.remove(); 
          } else {
            thinking.remove();
            appendMessage(listEl, 'bot', `Error: ${parsed.error}`);
          }
          return; 
        }
        if (parsed.done)   { 
          if (streaming) streaming.cursor.remove();
          thinking.remove(); // backup
          const reply = parsed.done === true ? (parsed.reply || (streaming ? streaming.txtNode.textContent : '')) : '';
          if (streaming) streaming.txtNode.textContent = reply;
          pushLocal('bot', reply); 
          speak(reply); 
          onDone?.(parsed); 
          return; 
        }
        if (parsed.chunk)  {
          full += parsed.chunk;
          // Extract "reply" portion from accumulating JSON
          const m = full.match(/"(?:reply|text)"\s*:\s*"((?:[^"\\]|\\.)*)/);
          if (m) {
            txtNode.textContent = m[1].replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\');
          } else {
            // Fallback: remove simple JSON wrapper brackets so it doesn't look blank
            txtNode.textContent = full.replace(/^[{\s"]+/, '').replace(/[}\s"]+$/, '');
          }
          scroll();
        }
      }
    }
    if (streaming) streaming.cursor.remove();
    thinking.remove();
  } catch (err) {
    thinking.remove();
    // AbortError = user clicked Stop — clean exit, no error message
    if (err.name === 'AbortError') {
      if (streaming) {
        streaming.cursor.remove();
        // Leave whatever was already typed in the bubble
      }
      onDone?.(null);
      return;
    }
    if (streaming) {
      streaming.cursor.remove();
      streaming.txtNode.textContent = 'Error: ' + err.message;
    }
    onError?.(err);
  }
}
