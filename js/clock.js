// Pure chess clock logic. No DOM access, so it can be tested in Node.
// All times are in milliseconds. Every method that depends on time takes `now`
// explicitly; remaining time is always derived from timestamps, never from
// counted ticks (F-005).

export const COLORS = ['white', 'black'];
export const other = (color) => (color === 'white' ? 'black' : 'white');

const HISTORY_LIMIT = 100;

/**
 * A player's time control:
 * { baseMs, incrementMs, delayMs, stages: [{ afterMoves, addMs }] }
 * - incrementMs is added after each completed move (Fischer).
 * - delayMs: the clock waits this long at the start of each turn before it
 *   starts counting down (simple / US delay) (F-014).
 * - stages: when the player has completed `afterMoves` moves, `addMs` is
 *   added (e.g. 90 min for 40 moves, then +30 min) (F-015).
 */
export function normalizeControl(c = {}) {
  const num = (v) => (Number.isFinite(+v) && +v > 0 ? Math.round(+v) : 0);
  return {
    baseMs: num(c.baseMs),
    incrementMs: num(c.incrementMs),
    delayMs: num(c.delayMs),
    stages: (c.stages || [])
      .map((s) => ({ afterMoves: num(s.afterMoves), addMs: num(s.addMs) }))
      .filter((s) => s.afterMoves > 0 && s.addMs > 0)
      .sort((a, b) => a.afterMoves - b.afterMoves),
  };
}

export class ChessClock {
  /** @param {{white: object, black: object}} control */
  constructor(control) {
    this.control = {
      white: normalizeControl(control.white),
      black: normalizeControl(control.black),
    };
    this.reset();
  }

  reset() {
    this.status = 'ready'; // ready | running | paused | flagged
    this.active = null; // colour whose clock runs (or would run when paused)
    this.flagged = null;
    this.players = {
      white: { remaining: this.control.white.baseMs, moves: 0 },
      black: { remaining: this.control.black.baseMs, moves: 0 },
    };
    // Current turn bookkeeping.
    this.turnBase = 0; // active player's remaining when the turn started
    this.turnElapsed = 0; // active time this turn before `runningSince`
    this.runningSince = null; // timestamp, set only while running
    this.history = [];
  }

  /** Total active time spent in the current turn. */
  turnTime(now) {
    if (!this.active) return 0;
    const live = this.runningSince === null ? 0 : Math.max(0, now - this.runningSince);
    return this.turnElapsed + live;
  }

  /** Remaining time of the delay in the current turn, for display. */
  delayLeft(now) {
    if (!this.active || this.status === 'flagged') return 0;
    const delay = this.control[this.active].delayMs;
    return Math.max(0, delay - this.turnTime(now));
  }

  /** Remaining time for a colour at `now`. */
  remaining(color, now) {
    if (color !== this.active || this.status === 'ready' || this.status === 'flagged') {
      return this.players[color].remaining;
    }
    const used = Math.max(0, this.turnTime(now) - this.control[color].delayMs);
    return Math.max(0, this.turnBase - used);
  }

  /** Who may tap now: both before start, only the active player while running. */
  canTap(color) {
    if (this.status === 'ready') return true;
    if (this.status === 'running') return color === this.active;
    return false;
  }

  /**
   * A player taps their half. Before the start this starts the opponent's
   * clock (the convention is that Black starts White's clock). While running
   * it ends the active player's turn. Returns true if something happened.
   */
  tap(color, now) {
    if (!this.canTap(color)) return false;
    if (this.status === 'ready') {
      this._pushHistory(now);
      this.status = 'running';
      this._startTurn(other(color), now);
      return true;
    }
    if (this.tick(now)) return false; // flag fell before the tap registered
    this._pushHistory(now);
    const p = this.players[color];
    const c = this.control[color];
    p.remaining = this.remaining(color, now);
    p.moves += 1;
    p.remaining += c.incrementMs;
    for (const s of c.stages) if (s.afterMoves === p.moves) p.remaining += s.addMs;
    this._startTurn(other(color), now);
    return true;
  }

  pause(now) {
    if (this.status !== 'running') return false;
    this.turnElapsed = this.turnTime(now);
    this.runningSince = null;
    this.status = 'paused';
    return true;
  }

  resume(now) {
    if (this.status !== 'paused') return false;
    this.runningSince = now;
    this.status = 'running';
    return true;
  }

  /** Checks for a fallen flag. Returns true if the flag fell now. */
  tick(now) {
    if (this.status !== 'running') return false;
    if (this.remaining(this.active, now) > 0) return false;
    this.players[this.active].remaining = 0;
    this.turnElapsed = this.turnTime(now);
    this.runningSince = null;
    this.flagged = this.active;
    this.status = 'flagged';
    return true;
  }

  /** Undo the last tap. The game is paused afterwards (F-017). */
  undo() {
    const prev = this.history.pop();
    if (!prev) return false;
    Object.assign(this, structuredClone(prev));
    this.runningSince = null;
    this.status = this.active ? 'paused' : 'ready';
    return true;
  }

  get canUndo() {
    return this.history.length > 0;
  }

  /** True when the game has started and something could be lost by a reset. */
  get inProgress() {
    return this.status !== 'ready';
  }

  _startTurn(color, now) {
    this.active = color;
    this.turnBase = this.players[color].remaining;
    this.turnElapsed = 0;
    this.runningSince = now;
  }

  /** State at `now`, with the time spent so far in this turn frozen. */
  _snapshot(now) {
    return {
      status: this.status,
      active: this.active,
      flagged: this.flagged,
      players: structuredClone(this.players),
      turnBase: this.turnBase,
      turnElapsed: this.turnTime(now),
    };
  }

  _pushHistory(now) {
    this.history.push(this._snapshot(now));
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
  }

  /**
   * Serialises the clock. A running clock is stored as paused at `now`, so a
   * reload or an accidentally closed page does not eat time (F-009).
   */
  toJSON(now) {
    const snap = this._snapshot(now);
    if (this.status === 'running') snap.status = 'paused';
    return { control: this.control, ...snap, history: this.history };
  }

  static fromJSON(data) {
    const clock = new ChessClock(data?.control || {});
    if (!data || !['ready', 'paused', 'flagged'].includes(data.status)) return clock;
    clock.status = data.status;
    clock.active = data.active ?? null;
    clock.flagged = data.flagged ?? null;
    for (const c of COLORS) {
      const p = data.players?.[c];
      if (p) clock.players[c] = { remaining: +p.remaining || 0, moves: +p.moves || 0 };
    }
    clock.turnBase = +data.turnBase || 0;
    clock.turnElapsed = +data.turnElapsed || 0;
    clock.history = Array.isArray(data.history) ? data.history.slice(-HISTORY_LIMIT) : [];
    return clock;
  }
}

/**
 * Formats remaining time. Under 10 seconds tenths are shown (F-004).
 * Rounds up, so 0:00 is only shown when time is really out.
 */
export function formatTime(ms) {
  ms = Math.max(0, ms);
  const tenths = Math.ceil(ms / 100);
  if (tenths < 100) {
    return `0:0${Math.floor(tenths / 10)}.${tenths % 10}`;
  }
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Short label for a time control, e.g. "5+0", "90+30 d5", "W 5+0 / B 3+0". */
export function controlLabel(control) {
  const one = (c) => {
    // Whole minutes as "5", otherwise minutes and seconds as "0:30".
    const secs = Math.round(c.baseMs / 1000);
    const baseStr = secs % 60 === 0 ? String(secs / 60) : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    let s = `${baseStr}+${Math.round(c.incrementMs / 1000)}`;
    if (c.delayMs) s += ` d${Math.round(c.delayMs / 1000)}`;
    for (const st of c.stages || []) s += ` /${st.afterMoves}:+${Math.round(st.addMs / 60000)}`;
    return s;
  };
  const w = one(control.white);
  const b = one(control.black);
  return w === b ? w : `W ${w} / B ${b}`;
}
