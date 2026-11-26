// Sound, vibration, spoken announcements and keeping the screen awake
// (F-007, F-008, F-019). All of it degrades silently where unsupported.

let audio = null;

function ctx() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = new AC();
  }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

function tone(freq, start, duration, volume, type = 'sine') {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** Short mechanical-sounding click. */
export function click() {
  tone(1900, 0, 0.035, 0.35, 'square');
  tone(950, 0, 0.05, 0.25, 'triangle');
}

/** Three beeps when a flag falls. */
export function flagSound() {
  for (let i = 0; i < 3; i++) tone(880, i * 0.22, 0.16, 0.4, 'square');
}

/** Must be called from a user gesture once, so iOS allows audio later. */
export function unlockAudio() {
  ctx();
}

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

// --- Spoken announcements ---------------------------------------------------

let voiceUnlocked = false;

/** iOS only speaks after a first utterance from a user gesture. */
export function unlockVoice() {
  if (voiceUnlocked || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  speechSynthesis.speak(u);
  voiceUnlocked = true;
}

export function say(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

export const ANNOUNCEMENTS = [
  { ms: 60000, text: 'One minute' },
  { ms: 30000, text: 'Thirty seconds' },
  { ms: 10000, text: 'Ten seconds' },
];

// --- Screen wake lock ---------------------------------------------------------

let lock = null;
let wanted = false;

async function acquire() {
  if (!wanted || lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => {
      lock = null;
    });
  } catch {
    lock = null;
  }
}

export function keepAwake(on) {
  wanted = on;
  if (on) acquire();
  else if (lock) {
    lock.release().catch(() => {});
    lock = null;
  }
}

document.addEventListener('visibilitychange', acquire);
