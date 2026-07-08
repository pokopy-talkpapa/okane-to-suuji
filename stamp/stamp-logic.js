(function (root) {
  // ── 日付ユーティリティ ──────────────────────────────────
  // タイムゾーンに依存しないよう、日付は 'YYYY-MM-DD' の文字列で扱う。
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // 年・月(1-12)・日 → 'YYYY-MM-DD'
  function toKey(y, m, d) {
    return y + '-' + pad2(m) + '-' + pad2(d);
  }

  // 'YYYY-MM-DD' → { y, m, d }（m は 1-12）
  function parseKey(key) {
    var p = String(key).split('-');
    return { y: +p[0], m: +p[1], d: +p[2] };
  }

  // Date → 'YYYY-MM-DD'（ローカル日付。ブラウザの「きょう」に使う）
  function dateKey(date) {
    return toKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  // 開始日〜終了日（両端を含む）の日付キー配列。UTC で刻んで DST の影響を避ける。
  function enumerateDates(startKey, endKey) {
    var s = parseKey(startKey);
    var e = parseKey(endKey);
    var cur = Date.UTC(s.y, s.m - 1, s.d);
    var end = Date.UTC(e.y, e.m - 1, e.d);
    var out = [];
    while (cur <= end) {
      var dt = new Date(cur);
      out.push(toKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()));
      cur += 86400000;
    }
    return out;
  }

  // ── スタンプ集計 ────────────────────────────────────────
  // stampKeys のうち、期間(rangeKeys)に含まれるものの個数（重複は1つに数える）
  function countStamped(stampKeys, rangeKeys) {
    var inRange = {};
    for (var i = 0; i < rangeKeys.length; i++) inRange[rangeKeys[i]] = true;
    var seen = {};
    var n = 0;
    for (var j = 0; j < stampKeys.length; j++) {
      var k = stampKeys[j];
      if (inRange[k] && !seen[k]) { seen[k] = true; n++; }
    }
    return n;
  }

  // 新しく増えたスタンプ（prevKeys になくて nextKeys にあるもの）。ポン！演出用。
  function newlyAdded(prevKeys, nextKeys) {
    var had = {};
    for (var i = 0; i < prevKeys.length; i++) had[prevKeys[i]] = true;
    var out = [];
    for (var j = 0; j < nextKeys.length; j++) {
      if (!had[nextKeys[j]]) out.push(nextKeys[j]);
    }
    return out;
  }

  // ── ごほうびバッジ（種まきテーマ：芽が育っていく）──────────
  var BADGES = [
    { count: 5,  emoji: '🌱', label: 'め' },
    { count: 10, emoji: '🌿', label: 'ふたば' },
    { count: 15, emoji: '🌷', label: 'つぼみ' },
    { count: 20, emoji: '🌸', label: 'はな' },
    { count: 30, emoji: '🌳', label: 'き' },
  ];

  // これまでに獲得したバッジ一覧
  function earnedBadges(count) {
    return BADGES.filter(function (b) { return count >= b.count; });
  }

  // 直近で獲得したバッジ（なければ null）
  function latestBadge(count) {
    var earned = earnedBadges(count);
    return earned.length ? earned[earned.length - 1] : null;
  }

  // 次にもらえるバッジ（すべて獲得済みなら null）
  function nextBadge(count) {
    for (var i = 0; i < BADGES.length; i++) {
      if (count < BADGES[i].count) return BADGES[i];
    }
    return null;
  }

  var api = {
    pad2: pad2,
    toKey: toKey,
    parseKey: parseKey,
    dateKey: dateKey,
    enumerateDates: enumerateDates,
    countStamped: countStamped,
    newlyAdded: newlyAdded,
    earnedBadges: earnedBadges,
    latestBadge: latestBadge,
    nextBadge: nextBadge,
    BADGES: BADGES,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.STAMP = api; // ブラウザでは window.STAMP.xxx で使う
})(typeof window !== 'undefined' ? window : globalThis);
