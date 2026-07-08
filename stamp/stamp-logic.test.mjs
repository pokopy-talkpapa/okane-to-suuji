import { test } from 'node:test';
import assert from 'node:assert/strict';
import pkg from './stamp-logic.js';
const {
  toKey, parseKey, dateKey, enumerateDates,
  countStamped, newlyAdded, earnedBadges, latestBadge, nextBadge,
} = pkg;

// ── toKey / parseKey ─────────────────────────────────────
test('toKey: 0埋めされる', () => {
  assert.equal(toKey(2026, 7, 8), '2026-07-08');
});
test('toKey: 2桁月日はそのまま', () => {
  assert.equal(toKey(2026, 12, 25), '2026-12-25');
});
test('parseKey: 文字列 → 数値', () => {
  assert.deepEqual(parseKey('2026-07-08'), { y: 2026, m: 7, d: 8 });
});

// ── dateKey ──────────────────────────────────────────────
test('dateKey: Date → YYYY-MM-DD（ローカル日付）', () => {
  assert.equal(dateKey(new Date(2026, 6, 8)), '2026-07-08'); // 月は0始まり
});

// ── enumerateDates ───────────────────────────────────────
test('enumerateDates: 両端を含む', () => {
  assert.deepEqual(
    enumerateDates('2026-07-08', '2026-07-11'),
    ['2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11']
  );
});
test('enumerateDates: 同じ日なら1つ', () => {
  assert.deepEqual(enumerateDates('2026-07-08', '2026-07-08'), ['2026-07-08']);
});
test('enumerateDates: 月をまたぐ', () => {
  const days = enumerateDates('2026-07-30', '2026-08-02');
  assert.deepEqual(days, ['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']);
});
test('enumerateDates: 夏休みの長さ（7/21〜8/31 = 42日）', () => {
  assert.equal(enumerateDates('2026-07-21', '2026-08-31').length, 42);
});

// ── countStamped ─────────────────────────────────────────
const RANGE = enumerateDates('2026-07-08', '2026-07-14');
test('countStamped: 期間内のスタンプを数える', () => {
  assert.equal(countStamped(['2026-07-08', '2026-07-10'], RANGE), 2);
});
test('countStamped: 期間外は無視する', () => {
  assert.equal(countStamped(['2026-07-08', '2026-06-30'], RANGE), 1);
});
test('countStamped: 重複は1つに数える', () => {
  assert.equal(countStamped(['2026-07-08', '2026-07-08'], RANGE), 1);
});
test('countStamped: 空なら0', () => {
  assert.equal(countStamped([], RANGE), 0);
});

// ── newlyAdded ───────────────────────────────────────────
test('newlyAdded: 増えた分だけ返す', () => {
  assert.deepEqual(
    newlyAdded(['2026-07-08'], ['2026-07-08', '2026-07-09']),
    ['2026-07-09']
  );
});
test('newlyAdded: 変化なしなら空', () => {
  assert.deepEqual(newlyAdded(['2026-07-08'], ['2026-07-08']), []);
});
test('newlyAdded: 初回はすべて新規', () => {
  assert.deepEqual(newlyAdded([], ['2026-07-08', '2026-07-09']), ['2026-07-08', '2026-07-09']);
});

// ── バッジ ───────────────────────────────────────────────
test('earnedBadges: 5個で最初のバッジ', () => {
  assert.equal(earnedBadges(5).length, 1);
  assert.equal(earnedBadges(5)[0].emoji, '🌱');
});
test('earnedBadges: 4個ではまだ0個', () => {
  assert.equal(earnedBadges(4).length, 0);
});
test('earnedBadges: 12個で2個獲得', () => {
  assert.equal(earnedBadges(12).length, 2);
});
test('latestBadge: 直近の1つを返す', () => {
  assert.equal(latestBadge(12).label, 'ふたば');
});
test('latestBadge: 0個なら null', () => {
  assert.equal(latestBadge(0), null);
});
test('nextBadge: 次の目標を返す', () => {
  assert.equal(nextBadge(3).count, 5);
  assert.equal(nextBadge(12).count, 15);
});
test('nextBadge: 全部達成で null', () => {
  assert.equal(nextBadge(30), null);
});
