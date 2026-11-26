// Time control presets (F-002). Minutes + increment seconds.
const min = (m) => m * 60000;
const sec = (s) => s * 1000;

const preset = (id, baseMin, incSec) => ({
  id,
  control: { baseMs: min(baseMin), incrementMs: sec(incSec), delayMs: 0, stages: [] },
});

export const PRESETS = [
  preset('1+0', 1, 0),
  preset('3+2', 3, 2),
  preset('5+0', 5, 0),
  preset('10+0', 10, 0),
  preset('15+10', 15, 10),
  preset('30+0', 30, 0),
];

export const DEFAULT_PRESET = '5+0';

export function presetControl(id) {
  const p = PRESETS.find((x) => x.id === id) || PRESETS.find((x) => x.id === DEFAULT_PRESET);
  return { white: structuredClone(p.control), black: structuredClone(p.control) };
}
