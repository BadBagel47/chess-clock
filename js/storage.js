// Local storage helpers (F-009, F-018). Only functional data the user asked
// for is stored on the device; nothing is sent anywhere.

const KEYS = {
  settings: 'chessclock.settings.v1',
  game: 'chessclock.game.v1',
  history: 'chessclock.history.v1',
};

const HISTORY_MAX = 50;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app still works, it just won't remember */
  }
}

export const loadSettings = () => read(KEYS.settings);
export const saveSettings = (s) => write(KEYS.settings, s);
export const loadGame = () => read(KEYS.game);
export const saveGame = (g) => write(KEYS.game, g);
export const loadHistory = () => {
  const h = read(KEYS.history);
  return Array.isArray(h) ? h : [];
};
export function addHistory(entry) {
  const h = loadHistory();
  h.unshift(entry);
  write(KEYS.history, h.slice(0, HISTORY_MAX));
}
export const clearHistory = () => write(KEYS.history, []);
