// Renders the PNG app icons from icons/icon.svg using the pre-installed
// Playwright Chromium. Run: NODE_PATH=$(npm root -g) node scripts/make-icons.mjs
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// require() so a globally installed Playwright is found via NODE_PATH.
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(import.meta.dirname, '..');
const svg = await readFile(resolve(root, 'icons/icon.svg'), 'utf8');
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
  // Maskable icons need the artwork inside the central safe zone.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.1 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, pad } of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - 2 * pad));
  const band = (inner * 10) / 512; // half the height of the orange middle band
  const bg = `linear-gradient(#fff calc(50% - ${band}px),#f5a623 calc(50% - ${band}px),#f5a623 calc(50% + ${band}px),#000 calc(50% + ${band}px))`;
  await page.setContent(
    `<body style="margin:0;background:${bg};display:grid;place-items:center;height:${size}px">` +
      `<img src="${dataUrl}" width="${inner}" height="${inner}"></body>`,
  );
  await page.screenshot({ path: resolve(root, 'icons', file) });
}
await browser.close();
console.log('Icons written.');
