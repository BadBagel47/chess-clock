# Chess Clock

A two-sided chess clock for your phone. The screen is split in two: the top half is turned upside down so each player reads their own time from their side of the board.

**Use it:** https://badbagel47.github.io/chess-clock/ – open it on your phone and add it to the home screen. It works offline.

## Features
- Tap your own half to end your turn; only the player whose clock runs can tap.
- Presets 1+0, 3+2, 5+0, 10+0, 15+10, 30+0, or a custom time control: base time, increment, delay, extra time after a number of moves, and different time per player.
- Pause, reset, undo the last tap, move counter.
- Tenths of a second and red digits under 10 seconds; the half turns red when the flag falls.
- Click sound, vibration (Android) and optional spoken warnings at 1 min, 30 s and 10 s.
- Keeps the screen awake during a game, and remembers the game if the page is reloaded (it comes back paused).
- Themes: Split (White's half chalk white, Black's half pure black), Light, Dark, Wood, Green, Ocean, Rose and a Custom theme with your own colours.
- Game history, stored on the device only.

## Development
Plain HTML, CSS and JavaScript modules – no build step.

```bash
npm test        # unit tests (Node 20+)
npm start       # serve locally on http://localhost:8080
```

Regenerate the PNG icons after changing `icons/icon.svg`:

```bash
NODE_PATH=$(npm root -g) node scripts/make-icons.mjs
```

When adding a file the app needs, also add it to `ASSETS` in `sw.js` (a test checks this).
