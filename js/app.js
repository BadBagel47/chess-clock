import { ChessClock, COLORS, formatTime, controlLabel, normalizeControl } from './clock.js';
import { PRESETS, DEFAULT_PRESET, presetControl } from './presets.js';
import { THEMES, DEFAULT_CUSTOM, getTheme, sanitizeCustom, isDark, lowTimeColor } from './themes.js';
import * as store from './storage.js';
import * as fx from './feedback.js';

const now = () => performance.now();
const $ = (sel, root = document) => root.querySelector(sel);
const NAMES = { white: 'White', black: 'Black' };

// ---- Settings -----------------------------------------------------------------

const DEFAULT_CUSTOM_CONTROL = {
  same: true,
  white: { baseMs: 10 * 60000, incrementMs: 5000, delayMs: 0, stages: [] },
  black: { baseMs: 10 * 60000, incrementMs: 5000, delayMs: 0, stages: [] },
};

const DEFAULTS = {
  presetId: DEFAULT_PRESET,
  custom: DEFAULT_CUSTOM_CONTROL,
  whiteSide: 'bottom',
  themeId: 'split',
  customTheme: DEFAULT_CUSTOM,
  sound: true,
  vibration: true,
  voice: false,
};

function sanitizeSettings(s) {
  s = s && typeof s === 'object' ? s : {};
  const validPreset = s.presetId === 'custom' || PRESETS.some((p) => p.id === s.presetId);
  const c = s.custom && typeof s.custom === 'object' ? s.custom : DEFAULT_CUSTOM_CONTROL;
  const ctrl = (x, d) => {
    const n = normalizeControl(x || d);
    return n.baseMs > 0 ? n : structuredClone(d);
  };
  return {
    presetId: validPreset ? s.presetId : DEFAULTS.presetId,
    custom: {
      same: c.same !== false,
      white: ctrl(c.white, DEFAULT_CUSTOM_CONTROL.white),
      black: ctrl(c.black, DEFAULT_CUSTOM_CONTROL.black),
    },
    whiteSide: s.whiteSide === 'top' ? 'top' : 'bottom',
    themeId: s.themeId === 'custom' || THEMES.some((t) => t.id === s.themeId) ? s.themeId : DEFAULTS.themeId,
    customTheme: sanitizeCustom(s.customTheme),
    sound: s.sound !== false,
    vibration: s.vibration !== false,
    voice: s.voice === true,
  };
}

function controlFrom(s) {
  if (s.presetId !== 'custom') return presetControl(s.presetId);
  const w = structuredClone(s.custom.white);
  return { white: w, black: s.custom.same ? structuredClone(w) : structuredClone(s.custom.black) };
}

let settings = sanitizeSettings(store.loadSettings());
const saveSettings = () => store.saveSettings(settings);

// ---- Clock state -------------------------------------------------------------

let clock;
let recorded = false; // whether the current game is already in the history
{
  const saved = store.loadGame();
  try {
    clock = saved?.clock ? ChessClock.fromJSON(saved.clock) : null;
    recorded = !!saved?.recorded;
  } catch {
    clock = null;
  }
  if (!clock || !(clock.control.white.baseMs > 0) || !(clock.control.black.baseMs > 0)) {
    clock = new ChessClock(controlFrom(settings));
    recorded = false;
  }
}

const saveGame = () => store.saveGame({ clock: clock.toJSON(now()), recorded });

// ---- Elements ----------------------------------------------------------------

const clockEl = $('#clock');
const halves = { top: $('.half.top'), bottom: $('.half.bottom') };
const sideOf = (color) => (color === 'white' ? settings.whiteSide : settings.whiteSide === 'top' ? 'bottom' : 'top');
const colorOf = (side) => (side === settings.whiteSide ? 'white' : 'black');
const btn = {
  settings: $('#btn-settings'),
  undo: $('#btn-undo'),
  pause: $('#btn-pause'),
  reset: $('#btn-reset'),
};

// ---- Rendering ---------------------------------------------------------------

const shown = new Map(); // element -> last text, to touch the DOM only on change

function setText(el, text) {
  if (shown.get(el) !== text) {
    el.textContent = text;
    shown.set(el, text);
  }
}

function statusText(color, t) {
  switch (clock.status) {
    case 'ready':
      return color === 'black' ? 'Tap to start' : '';
    case 'paused':
      return 'Paused';
    case 'flagged':
      return clock.flagged === color ? 'Time out' : '';
    default: {
      if (clock.active !== color) return '';
      const d = clock.delayLeft(t);
      return d > 0 ? `Delay ${Math.ceil(d / 1000)}` : '';
    }
  }
}

function render() {
  const t = now();
  clockEl.classList.remove('ready', 'running', 'paused', 'flagged');
  clockEl.classList.add(clock.status);
  for (const color of COLORS) {
    const el = halves[sideOf(color)];
    const ms = clock.remaining(color, t);
    const text = formatTime(ms);
    const timeEl = $('.time', el);
    setText(timeEl, text);
    timeEl.classList.toggle('long', text.length > 5);
    const started = clock.status !== 'ready';
    el.classList.toggle('active', clock.active === color && (clock.status === 'running' || clock.status === 'paused'));
    el.classList.toggle('low', started && ms < 10000 && clock.flagged !== color);
    el.classList.toggle('flagged', clock.flagged === color);
    el.disabled = !clock.canTap(color);
    setText($('.color-name', el), NAMES[color]);
    setText($('.moves', el), started ? `Moves ${clock.players[color].moves}` : '');
    setText($('.status', el), statusText(color, t));
    el.setAttribute('aria-label', `${NAMES[color]}: ${text}`);
  }
  btn.undo.disabled = !clock.canUndo;
  btn.reset.disabled = !clock.inProgress;
  btn.pause.disabled = clock.status === 'flagged';
  btn.pause.setAttribute('aria-label', clock.status === 'running' ? 'Pause' : clock.status === 'ready' ? 'Start' : 'Resume');
}

// ---- Main loop (runs only while the clock runs) ----------------------------------

let raf = 0;
let lastSave = 0;
const lastMs = { white: Infinity, black: Infinity };

function loop() {
  raf = 0;
  if (clock.status !== 'running') return;
  const t = now();
  if (clock.tick(t)) {
    onFlag();
    return;
  }
  announce(t);
  render();
  if (t - lastSave > 1000) {
    saveGame();
    lastSave = t;
  }
  raf = requestAnimationFrame(loop);
}

function startLoop() {
  if (!raf && clock.status === 'running') raf = requestAnimationFrame(loop);
}

function announce(t) {
  const color = clock.active;
  const ms = clock.remaining(color, t);
  const prev = lastMs[color];
  lastMs[color] = ms;
  if (!settings.voice) return;
  for (const a of fx.ANNOUNCEMENTS) {
    if (prev > a.ms && ms <= a.ms) {
      fx.say(a.text);
      break;
    }
  }
}

function syncWakeLock() {
  fx.keepAwake(clock.status === 'running' || clock.status === 'paused');
}

// ---- History -----------------------------------------------------------------

function recordGame(result) {
  if (recorded) return;
  const moves = clock.players.white.moves + clock.players.black.moves;
  if (!moves && clock.status !== 'flagged') return;
  store.addHistory({
    at: Date.now(),
    label: controlLabel(clock.control),
    result,
    white: { ...clock.players.white },
    black: { ...clock.players.black },
  });
  recorded = true;
}

// ---- Actions -----------------------------------------------------------------

function onGesture() {
  if (settings.sound) fx.unlockAudio();
  if (settings.voice) fx.unlockVoice();
}

function feedback() {
  if (settings.sound) fx.click();
  if (settings.vibration) fx.vibrate(25);
}

function press(color) {
  onGesture();
  const t = now();
  const ok = clock.tap(color, t);
  if (clock.status === 'flagged') return onFlag();
  if (!ok) return;
  feedback();
  lastMs[clock.active] = clock.remaining(clock.active, t);
  syncWakeLock();
  saveGame();
  render();
  startLoop();
}

function onFlag() {
  if (settings.sound) fx.flagSound();
  if (settings.vibration) fx.vibrate([250, 120, 250]);
  if (settings.voice) fx.say('Time');
  recordGame(`${NAMES[clock.flagged]} ran out of time`);
  syncWakeLock();
  saveGame();
  render();
}

function togglePause() {
  onGesture();
  const t = now();
  if (clock.status === 'running') clock.pause(t);
  else if (clock.status === 'paused') clock.resume(t);
  else if (clock.status === 'ready') return press('black'); // starts White's clock
  else return;
  syncWakeLock();
  saveGame();
  render();
  startLoop();
}

function newGame() {
  if (clock.inProgress) recordGame('Unfinished');
  clock = new ChessClock(controlFrom(settings));
  recorded = false;
  lastMs.white = lastMs.black = Infinity;
  syncWakeLock();
  saveGame();
  render();
}

function resetClock() {
  if (!clock.inProgress) return;
  const wasRunning = clock.status === 'running';
  if (wasRunning) clock.pause(now());
  render();
  if (!confirm('Reset the clock and start a new game?')) {
    if (wasRunning) {
      clock.resume(now());
      startLoop();
    }
    render();
    return;
  }
  newGame();
}

function undo() {
  if (!clock.undo()) return;
  recorded = false;
  syncWakeLock();
  saveGame();
  render();
}

for (const side of ['top', 'bottom']) {
  const el = halves[side];
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    press(colorOf(side));
  });
  // Keyboard (Enter/Space) produces a click with detail 0; taps are handled above.
  el.addEventListener('click', (e) => {
    if (e.detail === 0) press(colorOf(side));
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

btn.pause.addEventListener('click', togglePause);
btn.reset.addEventListener('click', resetClock);
btn.undo.addEventListener('click', undo);
btn.settings.addEventListener('click', openSettings);

// Block pinch zoom and double-tap zoom on iOS, which ignores user-scalable=no.
document.addEventListener('gesturestart', (e) => e.preventDefault());

window.addEventListener('pagehide', saveGame);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame();
  else {
    render();
    startLoop();
  }
});

// ---- Theme -------------------------------------------------------------------

function applyTheme() {
  const theme = getTheme(settings.themeId, settings.customTheme);
  const root = document.documentElement;
  root.style.setProperty('--accent', theme.accent);
  for (const color of COLORS) {
    const el = halves[sideOf(color)];
    el.style.setProperty('--bg', theme[color].bg);
    el.style.setProperty('--fg', theme[color].fg);
    el.style.setProperty('--low', lowTimeColor(theme[color].bg));
  }
  const bothLight = !isDark(theme.white.bg) && !isDark(theme.black.bg);
  root.style.setProperty('--strip-bg', bothLight ? '#e9e9e9' : '#1c1c1c');
  root.style.setProperty('--strip-fg', bothLight ? '#222222' : '#f2f2f2');
  const bottomBg = theme[colorOf('bottom')].bg;
  $('#settings').classList.toggle('dark', isDark(bottomBg));
  $('meta[name="theme-color"]').setAttribute('content', theme[colorOf('top')].bg);
}

// ---- Settings panel --------------------------------------------------------------

const panel = $('#settings');
let draft = null; // time control and sides being edited; applied on Done

function openSettings() {
  if (clock.status === 'running') {
    clock.pause(now());
    syncWakeLock();
    saveGame();
    render();
  }
  draft = {
    presetId: settings.presetId,
    custom: structuredClone(settings.custom),
    whiteSide: settings.whiteSide,
  };
  renderPresets();
  renderEditors();
  renderSides();
  renderThemes();
  renderOptions();
  renderHistory();
  panel.hidden = false;
  panel.scrollTop = 0;
  $('#btn-done').focus();
}

function closeSettings() {
  if (draft.presetId === 'custom' && !validateEditors()) return;
  const next = controlFrom(draft);
  const normalized = (c) => JSON.stringify({ white: normalizeControl(c.white), black: normalizeControl(c.black) });
  const changed = normalized(next) !== normalized(clock.control) || draft.whiteSide !== settings.whiteSide;
  const apply = () => {
    settings.presetId = draft.presetId;
    settings.custom = draft.custom;
    settings.whiteSide = draft.whiteSide;
    saveSettings();
  };
  if (!changed) apply();
  else if (!clock.inProgress || confirm('Start a new game with the new settings?')) {
    apply();
    applyTheme();
    newGame();
  }
  draft = null;
  panel.hidden = true;
  applyTheme();
  render();
  btn.settings.focus();
}

$('#btn-done').addEventListener('click', closeSettings);
panel.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettings();
});

// Time control presets

function renderPresets() {
  const wrap = $('#presets');
  wrap.replaceChildren();
  for (const id of [...PRESETS.map((p) => p.id), 'custom']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(draft.presetId === id));
    b.textContent = id === 'custom' ? 'Custom' : id;
    b.addEventListener('click', () => {
      draft.presetId = id;
      renderPresets();
      renderEditors();
    });
    wrap.append(b);
  }
}

// Custom time control editor

const FIELD_READ = {
  min: (c) => Math.floor(c.baseMs / 60000),
  sec: (c) => Math.floor((c.baseMs % 60000) / 1000),
  inc: (c) => Math.round(c.incrementMs / 1000),
  delay: (c) => Math.round(c.delayMs / 1000),
  s1moves: (c) => c.stages[0]?.afterMoves ?? '',
  s1min: (c) => (c.stages[0] ? Math.round(c.stages[0].addMs / 60000) : ''),
  s2moves: (c) => c.stages[1]?.afterMoves ?? '',
  s2min: (c) => (c.stages[1] ? Math.round(c.stages[1].addMs / 60000) : ''),
};

function readEditor(fs) {
  const v = (f) => Math.max(0, Math.floor(+$(`[data-field="${f}"]`, fs).value || 0));
  return normalizeControl({
    baseMs: (v('min') * 60 + v('sec')) * 1000,
    incrementMs: v('inc') * 1000,
    delayMs: v('delay') * 1000,
    stages: [
      { afterMoves: v('s1moves'), addMs: v('s1min') * 60000 },
      { afterMoves: v('s2moves'), addMs: v('s2min') * 60000 },
    ],
  });
}

function renderEditors() {
  const editor = $('#custom-editor');
  editor.hidden = draft.presetId !== 'custom';
  const same = $('#same-for-both');
  same.checked = draft.custom.same;
  const wrap = $('#player-editors');
  wrap.replaceChildren();
  const colors = draft.custom.same ? ['white'] : COLORS;
  for (const color of colors) {
    const fs = $('#player-editor').content.firstElementChild.cloneNode(true);
    fs.dataset.color = color;
    $('legend', fs).textContent = draft.custom.same ? 'Both players' : NAMES[color];
    for (const [field, read] of Object.entries(FIELD_READ)) {
      $(`[data-field="${field}"]`, fs).value = read(draft.custom[color]);
    }
    fs.addEventListener('input', () => {
      draft.custom[color] = readEditor(fs);
      if (draft.custom.same) draft.custom.black = structuredClone(draft.custom.white);
      $('[data-field="min"]', fs).setCustomValidity('');
    });
    wrap.append(fs);
  }
}

$('#same-for-both').addEventListener('change', (e) => {
  draft.custom.same = e.target.checked;
  if (!draft.custom.same) draft.custom.black = structuredClone(draft.custom.white);
  renderEditors();
});

function validateEditors() {
  for (const fs of $('#player-editors').children) {
    const minInput = $('[data-field="min"]', fs);
    if (readEditor(fs).baseMs <= 0) {
      minInput.setCustomValidity('Set a time above zero.');
      minInput.reportValidity();
      return false;
    }
  }
  return true;
}

// Sides

function renderSides() {
  const w = draft.whiteSide;
  $('#sides-text').textContent = `White at the ${w}, Black at the ${w === 'top' ? 'bottom' : 'top'}`;
}

$('#btn-swap').addEventListener('click', () => {
  draft.whiteSide = draft.whiteSide === 'top' ? 'bottom' : 'top';
  renderSides();
});

// Themes

function swatch(theme) {
  const s = document.createElement('span');
  s.className = 'swatch';
  for (const color of ['black', 'white']) {
    const i = document.createElement('i');
    i.style.background = theme[color].bg;
    i.style.color = theme[color].fg;
    i.textContent = color === 'white' ? 'W' : 'B';
    s.append(i);
  }
  return s;
}

function renderThemes() {
  const wrap = $('#themes');
  wrap.replaceChildren();
  for (const theme of [...THEMES, sanitizeCustom(settings.customTheme)]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(settings.themeId === theme.id));
    b.append(swatch(theme), theme.name);
    b.addEventListener('click', () => {
      settings.themeId = theme.id;
      saveSettings();
      applyTheme();
      renderThemes();
    });
    wrap.append(b);
  }
  const custom = $('#custom-colors');
  custom.hidden = settings.themeId !== 'custom';
  for (const input of custom.querySelectorAll('input')) {
    const [a, b] = input.dataset.path.split('.');
    input.value = b ? settings.customTheme[a][b] : settings.customTheme[a];
  }
}

$('#custom-colors').addEventListener('input', (e) => {
  const input = e.target;
  if (!input.dataset.path) return;
  const [a, b] = input.dataset.path.split('.');
  if (b) settings.customTheme[a][b] = input.value;
  else settings.customTheme[a] = input.value;
  settings.customTheme = sanitizeCustom(settings.customTheme);
  saveSettings();
  applyTheme();
  // Update the custom swatch without rebuilding the inputs being dragged.
  const btns = $('#themes').children;
  const last = btns[btns.length - 1];
  last.replaceChild(swatch(settings.customTheme), last.firstChild);
});

// Options

function renderOptions() {
  $('#opt-sound').checked = settings.sound;
  $('#opt-vibration').checked = settings.vibration;
  $('#opt-voice').checked = settings.voice;
}

for (const [id, key] of [['opt-sound', 'sound'], ['opt-vibration', 'vibration'], ['opt-voice', 'voice']]) {
  $(`#${id}`).addEventListener('change', (e) => {
    settings[key] = e.target.checked;
    saveSettings();
    if (key === 'sound' && settings.sound) {
      fx.unlockAudio();
      fx.click();
    }
    if (key === 'voice' && settings.voice) {
      fx.unlockVoice();
      fx.say('Spoken warnings on');
    }
    if (key === 'vibration' && settings.vibration) fx.vibrate(25);
  });
}

// History

const dateFmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function renderHistory() {
  const list = $('#history');
  list.replaceChildren();
  const entries = store.loadHistory();
  if (!entries.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No games yet.';
    list.append(li);
  }
  for (const e of entries) {
    const li = document.createElement('li');
    const moves = (e.white?.moves || 0) + (e.black?.moves || 0);
    li.textContent = `${dateFmt.format(e.at)} · ${e.label} · ${e.result} · ${moves} ${moves === 1 ? 'move' : 'moves'} · W ${formatTime(e.white?.remaining || 0)} / B ${formatTime(e.black?.remaining || 0)}`;
    list.append(li);
  }
  $('#btn-clear-history').disabled = !entries.length;
}

$('#btn-clear-history').addEventListener('click', () => {
  if (!confirm('Clear the game history?')) return;
  store.clearHistory();
  renderHistory();
});

// ---- Start -------------------------------------------------------------------

applyTheme();
render();
syncWakeLock();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
