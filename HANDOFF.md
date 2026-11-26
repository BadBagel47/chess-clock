# HANDOFF

Rules version: v1.14
Inventory: 2026-11-26 (repo was empty: no branches, commits, pull requests or issues)
Project language: English (product text and README)
Publishing method: not set up yet – proposed GitHub Pages (see BACKLOG D-001)

## Current state
- Brainstorm done, product direction decided (see Decisions). No code yet.
- Backlog and first run proposal written in BACKLOG.md.

## Next steps
- Wait for the user's answers on the open questions and a go-ahead for the run proposal.

## Goal
A mobile chess clock as a web app: the screen is split in two halves, the top half rotated 180° so each player reads their own time from their side of the board.

## Decisions
- 2026-11-26: Web app (installable on the home screen, works offline), not an app store app.
- 2026-11-26: Product language English.
- 2026-11-26: First version: split screen, presets (1+0, 3+2, 5+0, 10+0, 15+10, 30+0), custom time, increment per move, pause/reset, sound, keep screen awake. Delay, multi-stage controls and other extras later.
- 2026-11-26: A player ends their turn by tapping their own half; only the active half reacts.
- 2026-11-26: Themes: light, dark, and split by the colour each player plays – chalk white and pure black. Plus a few preset colour themes and a custom theme where the user sets the colours.

## One-time actions
- Pending: permission for agents to push to `main` (the session environment currently only allows the agent's own `claude/` branch) – or set up automatic merge per SETUP.md.
- Pending: enable GitHub Pages for the repo.

## Environment notes (2026-11-26)
- Claude Code cloud session: git push allowed to the session's `claude/` branch; GitHub MCP tools available; no `gh` CLI except code search.

## Legal notes
- Saving settings and an ongoing game in the browser's local storage is functional storage the user asks for and normally needs no consent (Swedish Electronic Communications Act ch. 9 s. 28). No personal data is collected. Re-check if analytics or third-party services are ever added.
- Use system fonts and self-generated sounds (Web Audio) to avoid licensing issues.
