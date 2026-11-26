import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { THEMES, luminance } from '../js/themes.js';

const root = resolve(import.meta.dirname, '..');

test('service worker caches every app file, and only existing files', async () => {
  const sw = await readFile(resolve(root, 'sw.js'), 'utf8');
  const list = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const f of list) if (f !== './') await access(resolve(root, f));
  const expected = [
    'index.html',
    'manifest.webmanifest',
    'css/style.css',
    ...(await readdir(resolve(root, 'js'))).map((f) => `js/${f}`),
    ...(await readdir(resolve(root, 'icons'))).map((f) => `icons/${f}`),
  ];
  for (const f of expected) assert.ok(list.includes(f), `${f} missing from sw.js ASSETS`);
});

test('manifest icons exist', async () => {
  const m = JSON.parse(await readFile(resolve(root, 'manifest.webmanifest'), 'utf8'));
  for (const i of m.icons) await access(resolve(root, i.src));
});

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test('theme digits are readable (contrast at least 3:1 for large text)', () => {
  for (const t of THEMES) {
    for (const c of ['white', 'black']) {
      assert.ok(contrast(t[c].bg, t[c].fg) >= 3, `${t.id} ${c}: ${contrast(t[c].bg, t[c].fg).toFixed(2)}`);
    }
  }
});

test('split theme is chalk white and pure black', () => {
  const s = THEMES.find((t) => t.id === 'split');
  assert.equal(s.white.bg, '#ffffff');
  assert.equal(s.black.bg, '#000000');
});
