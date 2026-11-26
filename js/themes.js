// Themes (F-011, F-012, F-013). Each half is coloured by the colour its player
// plays, so the split theme shows White's half chalk white and Black's half
// pure black, whichever side of the phone White sits on.

export const THEMES = [
  {
    id: 'split',
    name: 'Split',
    white: { bg: '#ffffff', fg: '#000000' },
    black: { bg: '#000000', fg: '#ffffff' },
    accent: '#f5a623',
  },
  {
    id: 'light',
    name: 'Light',
    white: { bg: '#ffffff', fg: '#000000' },
    black: { bg: '#ffffff', fg: '#000000' },
    accent: '#1e88e5',
  },
  {
    id: 'dark',
    name: 'Dark',
    white: { bg: '#000000', fg: '#ffffff' },
    black: { bg: '#000000', fg: '#ffffff' },
    accent: '#4fc3f7',
  },
  {
    id: 'wood',
    name: 'Wood',
    white: { bg: '#ecd3a8', fg: '#3b2614' },
    black: { bg: '#8b5a34', fg: '#ffffff' },
    accent: '#2e7d32',
  },
  {
    id: 'green',
    name: 'Green',
    white: { bg: '#edeed1', fg: '#2f3b22' },
    black: { bg: '#5e8a45', fg: '#ffffff' },
    accent: '#e65100',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    white: { bg: '#dcebf5', fg: '#16324a' },
    black: { bg: '#3f6e96', fg: '#ffffff' },
    accent: '#ffb300',
  },
  {
    id: 'rose',
    name: 'Rose',
    white: { bg: '#fff4f6', fg: '#5a2433' },
    black: { bg: '#b85c76', fg: '#ffffff' },
    accent: '#6a1b9a',
  },
];

export const DEFAULT_CUSTOM = {
  id: 'custom',
  name: 'Custom',
  white: { bg: '#f3efe6', fg: '#222222' },
  black: { bg: '#2b2b2b', fg: '#f3efe6' },
  accent: '#00897b',
};

const HEX = /^#[0-9a-f]{6}$/i;

export function sanitizeCustom(t) {
  const pick = (v, d) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d);
  const d = DEFAULT_CUSTOM;
  return {
    ...d,
    white: { bg: pick(t?.white?.bg, d.white.bg), fg: pick(t?.white?.fg, d.white.fg) },
    black: { bg: pick(t?.black?.bg, d.black.bg), fg: pick(t?.black?.fg, d.black.fg) },
    accent: pick(t?.accent, d.accent),
  };
}

export function getTheme(id, custom) {
  if (id === 'custom') return sanitizeCustom(custom);
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

/** Relative luminance (WCAG) of a #rrggbb colour. */
export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export const isDark = (hex) => luminance(hex) < 0.25;

/** Colour for low time digits that stays readable on the given background. */
export const lowTimeColor = (bg) => (isDark(bg) ? '#ff6b5e' : '#d32f2f');
