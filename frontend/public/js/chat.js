/**
 * chat.js — entry point for the chat page.
 * Wires all modules together. No business logic lives here.
 */
import { MAX_MESSAGE_LENGTH } from './modules/config.js';
import { currentEmail, clearEmail } from './modules/auth.js';
import { chatFile, chatVisionStream } from './modules/api.js';
import { setStatus, appendMessage } from './modules/ui.js';
import { loadCommands, renderCommands, saveCommand, findCommand, allCommands } from './modules/commands.js';
import { restoreHistory, pushLocal, clearAll } from './modules/history.js';
import { initSpeech, isListening, startRecording, stopRecording, speak } from './modules/speech.js';
import { sendStream } from './modules/stream.js';
import { normalizeUrl, isValidDomain } from './modules/url.js';

// ── Auth Guard ────────────────────────────────────────────────────────────────
const email = currentEmail();
if (!email) {
  window.location.href = '/';
}

// ── Element refs ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const listEl       = $('messageList');
const form         = $('chatForm');
const msgInput     = $('messageInput');
const charCounter  = $('charCounter');
const errorEl      = $('error');
const statusDot    = $('statusDot');
const statusText   = $('statusText');
const sendBtn      = $('sendBtn');
const stopBtn      = $('stopBtn');
const clearBtn     = $('clearBtn');
const micBtn       = $('micBtn');
const micText      = $('micText');
const switchBtn    = $('switchBtn');
const cameraBtn    = $('cameraBtn');
const camVideo     = $('cameraVideo');
const camCanvas    = $('cameraCanvas');
const cameraModal     = $('cameraModal');
const closeCameraBtn  = $('closeCameraBtn');
const cancelCameraBtn = $('cancelCameraBtn');
const captureBtn      = $('captureBtn');

const attachmentPreview = $('attachmentPreview');
const filePreview       = $('filePreview');
const imagePreview      = $('imagePreview');
const fileInput         = $('fileInput');
const fileNameEl        = $('fileName');
const clearFileBtn      = $('clearFileBtn');
const clearImgBtn       = $('clearImgBtn');
const heldImageThumb    = $('heldImageThumb');

const cmdList      = $('commandList');
const cmdForm      = $('commandForm');
const cmdKeyword   = $('commandKeyword');
const cmdUrl       = $('commandUrl');
const cmdError     = $('commandError');

// ── State ─────────────────────────────────────────────────────────────────────
let heldImageData = null;

// ── Status helper ─────────────────────────────────────────────────────────────
const st = (state, msg) => setStatus(statusDot, statusText, { state, message: msg });

// ── Char counter ──────────────────────────────────────────────────────────────
msgInput.addEventListener('input', () => {
  const len = msgInput.value.length;
  charCounter.textContent = `${len} / ${MAX_MESSAGE_LENGTH}`;
  charCounter.classList.toggle('warn', len > 3500 && len <= MAX_MESSAGE_LENGTH);
  charCounter.classList.toggle('over', len > MAX_MESSAGE_LENGTH);
});

// Enter to send
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// ── Attachment Handling ───────────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) {
    resetImg(); // Clear camera if file selected
    fileNameEl.textContent = fileInput.files[0].name;
    attachmentPreview.style.display = 'flex';
    filePreview.style.display = 'flex';
  } else {
    resetFile();
  }
});

clearFileBtn.addEventListener('click', resetFile);
clearImgBtn.addEventListener('click', resetImg);

function resetFile() {
  fileInput.value = '';
  fileNameEl.textContent = 'No file selected';
  filePreview.style.display = 'none';
  if (!heldImageData) attachmentPreview.style.display = 'none';
}

function resetImg() {
  heldImageData = null;
  heldImageThumb.src = '';
  imagePreview.style.display = 'none';
  if (!fileInput.files.length) attachmentPreview.style.display = 'none';
}

// ── Speech ────────────────────────────────────────────────────────────────────
const hasMic = initSpeech({
  onTranscript: (t) => { const v = msgInput.value.trim(); msgInput.value = v ? `${v} ${t}` : t; msgInput.dispatchEvent(new Event('input')); },
  onStart:  () => { micBtn.classList.add('recording');    micText.textContent = 'Listening…'; st('ok', 'Listening to microphone…'); },
  onStop:   () => { micBtn.classList.remove('recording'); micText.textContent = 'Speak';      st('ok', 'Idle. Ready to send'); },
  onError:  (e) => st('error', `Mic error: ${e}`),
});
if (!hasMic) micBtn.style.display = 'none';
micBtn.addEventListener('click', () => isListening() ? stopRecording() : startRecording());

// ── Camera (Vision) ───────────────────────────────────────────────────────────
let camStream = null;

async function startCamera() {
  try {
    resetFile(); // Clear file if camera opened
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
    camVideo.srcObject = camStream;
    cameraModal.style.display = 'flex';
    st('ok', 'Camera active');
  } catch (err) {
    st('error', `Camera access denied: ${err.message}`);
    throw err;
  }
}

function stopCamera() {
  if (camStream) {
    camStream.getTracks().forEach(t => t.stop());
    camStream = null;
  }
  camVideo.srcObject = null;
  cameraModal.style.display = 'none';
  st('ok', 'Idle. Ready to send');
}

async function captureImage() {
  st('ok', 'Capturing frame…');
  camCanvas.width  = camVideo.videoWidth;
  camCanvas.height = camVideo.videoHeight;
  const ctx = camCanvas.getContext('2d');
  ctx.drawImage(camVideo, 0, 0);
  
  const dataUrl = camCanvas.toDataURL('image/jpeg', 0.8);
  heldImageData = dataUrl.split(',')[1];
  
  // Show thumbnail in UI
  heldImageThumb.src = dataUrl;
  attachmentPreview.style.display = 'flex';
  imagePreview.style.display = 'flex';
  
  stopCamera();
  msgInput.focus();
}

cameraBtn.addEventListener('click', () => startCamera().catch(() => {}));
closeCameraBtn.addEventListener('click', stopCamera);
cancelCameraBtn.addEventListener('click', stopCamera);
captureBtn.addEventListener('click', captureImage);

// ── Clear history ─────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => clearAll(listEl));

// ── Switch account ─────────────────────────────────────────────────────────────
switchBtn.addEventListener('click', () => { clearEmail(); window.location.href = '/'; });


cmdForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  cmdError.style.display = 'none';
  const kw  = cmdKeyword.value.trim();
  const url = normalizeUrl(cmdUrl.value);          // auto-prepends https:// if missing
  if (!kw || !url) { cmdError.textContent = 'Both fields are required.'; cmdError.style.display = 'block'; return; }
  if (!isValidDomain(url)) {
    cmdError.textContent = 'Please enter a real website (e.g. instagram.com or https://mysite.io).';
    cmdError.style.display = 'block';
    return;
  }
  if (allCommands().some(c => c.keyword.toLowerCase() === kw.toLowerCase())) {
    cmdError.textContent = 'A command with this keyword already exists.'; cmdError.style.display = 'block'; return;
  }
  try {
    await saveCommand(kw, url, cmdList);
    cmdKeyword.value = ''; cmdUrl.value = ''; cmdKeyword.focus();
  } catch (err) { cmdError.textContent = err.message; cmdError.style.display = 'block'; }
});

// Command form navigation
cmdKeyword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    cmdUrl.focus();
  }
});
cmdUrl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    cmdForm.requestSubmit();
  }
});

// ── Chat form ─────────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.style.display = 'none';
  const message  = msgInput.value.trim();
  const hasFile  = fileInput.files.length > 0;
  const hasImage = !!heldImageData;
  const email    = currentEmail();

  if (!message && !hasFile && !hasImage) { errorEl.textContent = 'Please enter a message or attach an item.'; errorEl.style.display = 'block'; return; }
  if (message.length > MAX_MESSAGE_LENGTH) { errorEl.textContent = `Message is too long (max ${MAX_MESSAGE_LENGTH} chars).`; errorEl.style.display = 'block'; return; }

  let displayMsg = message;
  if (hasFile) displayMsg = `[File: ${fileInput.files[0].name}] ${message}`;
  else if (hasImage) displayMsg = `[Camera Snapshot] ${message || '(Describe this image)'}`;

  appendMessage(listEl, 'user', displayMsg, { onSave: () => pushLocal('user', displayMsg) });

  sendBtn.disabled = true;
  cameraBtn.disabled = true;
  st('ok', 'Sending…');

  let abortController = null;

  try {
    // ── Local command match (Text only) ───────────────────────
    const cmd = (!hasFile && !hasImage) ? findCommand(message) : null;
    
    if (cmd) {
      window.open(cmd.url, '_blank');
      const reply = `Opening ${cmd.label || cmd.keyword}!`;
      appendMessage(listEl, 'bot', reply, { onSave: () => pushLocal('bot', reply) });
      speak(reply);
    } else if (hasFile) {
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('message', message);
      if (email) fd.append('email', email);
      const { result } = await chatFile(fd);
      appendMessage(listEl, 'bot', result.reply || '', { onSave: () => pushLocal('bot', result.reply) });
      speak(result.reply);
      resetFile();
    } else {
      // ── Streaming (Standard or Vision) ───────────────────────────────────────
      abortController = new AbortController();
      stopBtn.style.display = 'inline-flex';
      sendBtn.style.display = 'none';
      stopBtn.onclick = () => { abortController.abort(); st('ok', 'Interrupted by user'); };

      await sendStream(message || 'Analyze this image.', listEl,
        (result) => {
          if (result?.command) {
            const c2 = findCommand(result.command);
            if (c2) window.open(c2.url, '_blank');
          }
          st('ok', 'Done');
        },
        (err) => { if (err.name !== 'AbortError') { errorEl.textContent = 'Error: ' + err.message; errorEl.style.display = 'block'; st('error', 'Failed'); } },
        abortController.signal,
        heldImageData
      );
      if (hasImage) resetImg();
    }
    msgInput.value = ''; charCounter.textContent = `0 / ${MAX_MESSAGE_LENGTH}`; charCounter.classList.remove('warn','over');
    if (!abortController?.signal.aborted) st('ok', 'Idle. Ready to send');
  } catch (err) {
    if (err.name !== 'AbortError') { errorEl.textContent = 'Error: ' + err.message; errorEl.style.display = 'block'; st('error', 'Failed'); }
  } finally {
    sendBtn.disabled = false;
    cameraBtn.disabled = false;
    sendBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
    msgInput.focus();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  await Promise.all([loadCommands(), restoreHistory(listEl)]);
  renderCommands(cmdList);
})();
