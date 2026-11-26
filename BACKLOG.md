# BACKLOG

IDs: B- bug, F- feature, D- planning/design. Priority: High, Medium, Low.

## Open

### Planning / design
- **D-001** (High) – Project setup: static web app, publishing via GitHub Pages, web basics from agent-rules WEB.md (no tap highlight, focus ring only for keyboard, own select arrow).

### Features
- **F-001** (High) – Split-screen clock: top half rotated 180°, tap your own half to end your turn, only the active half reacts, active half highlighted.
- **F-002** (High) – Time controls: presets 1+0, 3+2, 5+0, 10+0, 15+10, 30+0; custom time; increment per move; different time per player (handicap).
- **F-003** (High) – Middle strip with pause, reset and settings.
- **F-004** (High) – Low time: tenths of seconds and colour change under 10 s; half turns red with "time out" when the flag falls.
- **F-005** (High) – Accurate timing based on real elapsed time, not counted ticks.
- **F-006** (High) – No accidental zoom, scroll or text selection; works in portrait on phones.
- **F-007** (Medium) – Click sound on tap; vibration where supported (Android).
- **F-008** (Medium) – Keep the screen awake during a game.
- **F-009** (Medium) – Remember the ongoing game and settings if the page is reloaded or closed.
- **F-010** (Medium) – Installable on the home screen and works offline.
- **F-011** (Medium) – Themes: light, dark, and split by colour played (chalk white / pure black).
- **F-012** (Medium) – A few preset colour themes.
- **F-013** (Medium) – Custom theme where the user sets the colours.
- **F-014** (Low) – Delay time control (clock waits a few seconds before counting down).
- **F-015** (Low) – Multi-stage time controls (e.g. 90 min for 40 moves, then 30 min).
- **F-016** (Low) – Move counter per player.
- **F-017** (Low) – Undo the last tap.
- **F-018** (Low) – Game history.
- **F-019** (Low) – Spoken time announcements ("one minute left").

## Proposed runs (2026-11-26)
Prioritised for: playable on the phone as quickly as possible.
- **A** – strong model, high level – Playable first version: D-001, F-001, F-002, F-003, F-004, F-005, F-006 – waiting for answer (publishing / push to main)
- **B** – strong model, medium level – Mobile polish: F-007, F-008, F-009, F-010 – builds on A
- **C** – strong model, medium level – Themes: F-011, F-012, F-013 – builds on A
  - Question: in the split theme, which half is white? Recommendation: bottom half white by default, with a "swap sides" button on the setup screen.
  - Question: which preset themes? Recommendation: four board-inspired themes – Wood (brown/beige), Green (green/cream), Ocean (blue/light blue), Rose (pink/white).
  - Question: what can be set in the custom theme? Recommendation: background and digit colour per half, plus the highlight colour for the active half.
- **D** – standard model, medium level – Extended time controls: F-014, F-015 – builds on A
- **E** – standard model, medium level – Extras: F-016, F-017, F-018, F-019 – builds on A

## Done
(none yet)
