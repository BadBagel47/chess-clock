import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChessClock, formatTime, controlLabel } from '../js/clock.js';

const ctl = (baseMs, incrementMs = 0, delayMs = 0, stages = []) => ({ baseMs, incrementMs, delayMs, stages });
const both = (c) => ({ white: c, black: c });

test('starts ready; a tap by Black starts White\'s clock', () => {
  const c = new ChessClock(both(ctl(60000)));
  assert.equal(c.status, 'ready');
  assert.ok(c.canTap('white') && c.canTap('black'));
  assert.ok(c.tap('black', 1000));
  assert.equal(c.status, 'running');
  assert.equal(c.active, 'white');
  assert.equal(c.remaining('white', 4000), 57000);
  assert.equal(c.remaining('black', 4000), 60000);
  assert.equal(c.players.black.moves, 0, 'the start tap is not a move');
});

test('only the active player can tap while running', () => {
  const c = new ChessClock(both(ctl(60000)));
  c.tap('black', 0);
  assert.equal(c.canTap('black'), false);
  assert.equal(c.tap('black', 100), false);
  assert.ok(c.tap('white', 5000));
  assert.equal(c.active, 'black');
  assert.equal(c.players.white.remaining, 55000);
  assert.equal(c.players.white.moves, 1);
});

test('time is derived from timestamps, not ticks', () => {
  const c = new ChessClock(both(ctl(60000)));
  c.tap('black', 0);
  // No tick calls at all in between.
  assert.equal(c.remaining('white', 12345), 60000 - 12345);
});

test('increment is added after each move', () => {
  const c = new ChessClock(both(ctl(60000, 2000)));
  c.tap('black', 0);
  c.tap('white', 10000);
  assert.equal(c.players.white.remaining, 52000);
});

test('pause and resume exclude paused time', () => {
  const c = new ChessClock(both(ctl(60000)));
  c.tap('black', 0);
  c.pause(10000);
  assert.equal(c.status, 'paused');
  assert.equal(c.remaining('white', 50000), 50000);
  assert.equal(c.canTap('white'), false);
  c.resume(50000);
  assert.equal(c.remaining('white', 55000), 45000);
});

test('flag falls when time runs out', () => {
  const c = new ChessClock(both(ctl(5000)));
  c.tap('black', 0);
  assert.equal(c.tick(4999), false);
  assert.equal(c.tick(5000), true);
  assert.equal(c.status, 'flagged');
  assert.equal(c.flagged, 'white');
  assert.equal(c.remaining('white', 9999), 0);
  assert.equal(c.tap('white', 6000), false);
});

test('a late tap after the flag fell does not save the player', () => {
  const c = new ChessClock(both(ctl(5000)));
  c.tap('black', 0);
  assert.equal(c.tap('white', 6000), false);
  assert.equal(c.status, 'flagged');
});

test('delay: clock waits before counting down (F-014)', () => {
  const c = new ChessClock(both(ctl(60000, 0, 3000)));
  c.tap('black', 0);
  assert.equal(c.remaining('white', 2000), 60000);
  assert.equal(c.delayLeft(2000), 1000);
  assert.equal(c.remaining('white', 5000), 58000);
  c.tap('white', 2500);
  assert.equal(c.players.white.remaining, 60000, 'a move within the delay costs nothing');
});

test('delay survives pause', () => {
  const c = new ChessClock(both(ctl(60000, 0, 3000)));
  c.tap('black', 0);
  c.pause(2000);
  c.resume(10000);
  assert.equal(c.remaining('white', 11000), 60000);
  assert.equal(c.remaining('white', 12000), 59000);
});

test('stages add time after a number of moves (F-015)', () => {
  const c = new ChessClock(both(ctl(60000, 0, 0, [{ afterMoves: 2, addMs: 30000 }])));
  c.tap('black', 0);
  let t = 0;
  for (let i = 0; i < 2; i++) {
    c.tap('white', (t += 1000));
    c.tap('black', (t += 1000));
  }
  assert.equal(c.players.white.moves, 2);
  assert.equal(c.players.white.remaining, 60000 - 2000 + 30000);
});

test('different time per player (handicap)', () => {
  const c = new ChessClock({ white: ctl(300000), black: ctl(60000) });
  assert.equal(c.players.white.remaining, 300000);
  assert.equal(c.players.black.remaining, 60000);
});

test('undo restores the state before the last tap and pauses (F-017)', () => {
  const c = new ChessClock(both(ctl(60000, 2000)));
  c.tap('black', 0);
  c.tap('white', 10000);
  assert.ok(c.undo());
  assert.equal(c.status, 'paused');
  assert.equal(c.active, 'white');
  assert.equal(c.players.white.moves, 0);
  assert.equal(c.remaining('white', 99999), 50000);
  c.resume(100000);
  assert.equal(c.remaining('white', 101000), 49000);
  assert.ok(c.undo());
  assert.equal(c.status, 'ready');
  assert.equal(c.undo(), false);
});

test('serialises a running clock as paused (F-009)', () => {
  const c = new ChessClock(both(ctl(60000, 1000, 0, [{ afterMoves: 40, addMs: 1800000 }])));
  c.tap('black', 0);
  c.tap('white', 4000);
  const json = JSON.parse(JSON.stringify(c.toJSON(7000)));
  const r = ChessClock.fromJSON(json);
  assert.equal(r.status, 'paused');
  assert.equal(r.active, 'black');
  assert.equal(r.remaining('black', 0), 57000);
  assert.equal(r.players.white.remaining, 57000);
  assert.deepEqual(r.control, c.control);
  r.resume(100);
  assert.equal(r.remaining('black', 1100), 56000);
  assert.ok(r.canUndo);
});

test('fromJSON tolerates garbage', () => {
  assert.equal(ChessClock.fromJSON(null).status, 'ready');
  assert.equal(ChessClock.fromJSON({ status: 'running' }).status, 'ready');
});

test('formatTime', () => {
  assert.equal(formatTime(300000), '5:00');
  assert.equal(formatTime(299001), '5:00');
  assert.equal(formatTime(299000), '4:59');
  assert.equal(formatTime(10000), '0:10');
  assert.equal(formatTime(9950), '0:10');
  assert.equal(formatTime(9900), '0:09.9');
  assert.equal(formatTime(450), '0:00.5');
  assert.equal(formatTime(0), '0:00.0');
  assert.equal(formatTime(-5), '0:00.0');
  assert.equal(formatTime(5400000), '1:30:00');
  assert.equal(formatTime(3600000), '1:00:00');
});

test('controlLabel', () => {
  assert.equal(controlLabel(both(ctl(300000, 0))), '5+0');
  assert.equal(controlLabel(both(ctl(5400000, 30000, 0, [{ afterMoves: 40, addMs: 1800000 }]))), '90+30 /40:+30');
  assert.equal(controlLabel({ white: ctl(300000), black: ctl(180000, 2000) }), 'W 5+0 / B 3+2');
  assert.equal(controlLabel(both(ctl(30000, 0, 5000))), '0:30+0 d5');
});
