let _recog;
let _listening = false;

export function initSpeech({ onTranscript, onStart, onStop, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;

  _recog = new SR();
  _recog.continuous     = true;
  _recog.interimResults = true;
  _recog.lang           = 'en-US';

  _recog.onstart  = () => { _listening = true;  onStart?.(); };
  _recog.onend    = () => { _listening = false; onStop?.(); };
  _recog.onerror  = (e) => { _listening = false; onStop?.(); onError?.(e.error); };
  _recog.onresult = (e) => {
    let fin = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) fin += e.results[i][0].transcript;
    }
    if (fin) onTranscript(fin);
  };
  return true;
}

export const isListening = () => _listening;

export function startRecording() {
  if (!_recog) return;
  window.speechSynthesis?.cancel();
  try { _recog.start(); } catch {}
}

export function stopRecording() {
  try { _recog?.stop(); } catch {}
}

export function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt    = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const voice  = voices.find(v => v.lang.startsWith('en-'));
  if (voice) utt.voice = voice;
  window.speechSynthesis.speak(utt);
}
