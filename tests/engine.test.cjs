const { test } = require('node:test');
const assert = require('node:assert/strict');
let engine;
try { engine = require('../engine.js'); } catch { engine = {}; }
const board = (...rows) => rows.concat(Array(4 - rows.length).fill(null).map(() => [0, 0, 0, 0]));

test('equal tiles merge only once per move', () => {
  assert.equal(typeof engine.move, 'function');
  const result = engine.move(board([2, 2, 2, 2], [4, 4, 8, 0]), 'left');
  assert.deepEqual(result.board, board([4, 4, 0, 0], [8, 8, 0, 0]));
  assert.equal(result.score, 16);
  assert.equal(result.motions.length, 7);
});
test('gaps compact before merging without mutating input', () => {
  const input = board([2, 0, 2, 4]);
  const original = structuredClone(input);
  assert.deepEqual(engine.move(input, 'left').board, board([4, 4, 0, 0]));
  assert.deepEqual(input, original);
});
test('right, up and down use the leading edge', () => {
  assert.deepEqual(engine.move(board([2, 2, 4, 4]), 'right').board, board([0, 0, 4, 8]));
  const input = board([2, 0, 0, 0], [2, 0, 0, 0], [4, 0, 0, 0]);
  assert.deepEqual(engine.move(input, 'up').board, board([4, 0, 0, 0], [4, 0, 0, 0]));
  assert.deepEqual(engine.move(input, 'down').board, board([0, 0, 0, 0], [0, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0]));
});
test('blocked direction produces no change or points', () => {
  const result = engine.move(board([2, 4, 0, 0]), 'left');
  assert.equal(result.changed, false);
  assert.equal(result.score, 0);
});
test('full board is playable only if adjacent cells match', () => {
  const stuck = board([2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]);
  assert.equal(engine.canMove(stuck), false);
  stuck[0][0] = 4;
  assert.equal(engine.canMove(stuck), true);
  stuck[0][0] = 0;
  assert.equal(engine.canMove(stuck), true);
});
test('spawn selects empty cell and respects 90 percent two distribution', () => {
  const input = board([2, 0, 0, 0]);
  const spawned = engine.spawn(input, () => 0);
  assert.deepEqual(spawned, {row: 0, col: 1, value: 2});
  assert.equal(input[0][1], 2);
  assert.equal(engine.spawn(input, () => 0.99).value, 4);
  const full = Array.from({length: 4}, () => [2, 2, 2, 2]);
  assert.equal(engine.spawn(full), null);
});
test('new board has exactly two starting tiles', () => {
  assert.equal(engine.newBoard(() => 0).flat().filter(Boolean).length, 2);
});
