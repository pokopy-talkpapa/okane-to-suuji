import { test } from 'node:test';
import assert from 'node:assert/strict';
import pkg from './logic.js';
const { splitDigits, coinsToNumber, checkAnswer, generateProblem } = pkg;

// ── splitDigits ──────────────────────────────────────────
test('splitDigits: 438 → {h:4,t:3,o:8}', () => {
  assert.deepEqual(splitDigits(438), { h: 4, t: 3, o: 8 });
});
test('splitDigits: 100 → {h:1,t:0,o:0}', () => {
  assert.deepEqual(splitDigits(100), { h: 1, t: 0, o: 0 });
});
test('splitDigits: 999 → {h:9,t:9,o:9}', () => {
  assert.deepEqual(splitDigits(999), { h: 9, t: 9, o: 9 });
});
test('splitDigits: 205 → {h:2,t:0,o:5}', () => {
  assert.deepEqual(splitDigits(205), { h: 2, t: 0, o: 5 });
});

// ── coinsToNumber ────────────────────────────────────────
test('coinsToNumber: {h:4,t:3,o:8} → 438', () => {
  assert.equal(coinsToNumber({ h: 4, t: 3, o: 8 }), 438);
});
test('coinsToNumber: {h:1,t:0,o:0} → 100', () => {
  assert.equal(coinsToNumber({ h: 1, t: 0, o: 0 }), 100);
});
test('coinsToNumber: {h:9,t:9,o:9} → 999', () => {
  assert.equal(coinsToNumber({ h: 9, t: 9, o: 9 }), 999);
});

// ── checkAnswer ──────────────────────────────────────────
test('checkAnswer: 正解', () => {
  assert.equal(checkAnswer({ h: 4, t: 3, o: 8 }, 438), true);
});
test('checkAnswer: 不正解（十の位がちがう）', () => {
  assert.equal(checkAnswer({ h: 4, t: 2, o: 8 }, 438), false);
});
test('checkAnswer: 不正解（百の位がちがう）', () => {
  assert.equal(checkAnswer({ h: 3, t: 3, o: 8 }, 438), false);
});
test('checkAnswer: 0の位が両方0で正解', () => {
  assert.equal(checkAnswer({ h: 1, t: 0, o: 0 }, 100), true);
});

// ── generateProblem ──────────────────────────────────────
test('generateProblem: 100〜999 の範囲', () => {
  for (let i = 0; i < 100; i++) {
    const n = generateProblem();
    assert.ok(n >= 100 && n <= 999, `out of range: ${n}`);
  }
});
test('generateProblem: 百の位は1以上', () => {
  for (let i = 0; i < 100; i++) {
    const n = generateProblem();
    assert.ok(Math.floor(n / 100) >= 1, `hundreds digit is 0: ${n}`);
  }
});
test('generateProblem: prev と異なる値を返す', () => {
  let prev = 438;
  for (let i = 0; i < 30; i++) {
    const n = generateProblem(prev);
    assert.notEqual(n, prev);
    prev = n;
  }
});
