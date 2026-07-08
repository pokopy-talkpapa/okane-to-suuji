/**
 * あさかつ スタンプカード — バックエンド（Google Apps Script）
 *
 * このコードは Google スプレッドシートに紐づく Apps Script プロジェクトに
 * まるごとコピペして、「ウェブアプリ」としてデプロイして使います。
 * くわしい手順は ../SETUP.md を見てください。
 *
 * スプレッドシートのシート構成（1行目はヘッダー）:
 *   members : id | なまえ | あいことば
 *   stamps  : 日付 | member_id
 *   config  : key | value    （開始日 / 終了日 / 管理キー / タイトル の4行）
 *
 * すべて GET で呼び出します（ブラウザからの CORS プリフライトを避けるため）:
 *   ?action=card&pass=あいことば
 *   ?action=roster&key=管理キー&date=YYYY-MM-DD
 *   ?action=stamp&key=管理キー&member=ID&date=YYYY-MM-DD&op=toggle|on|off
 */

/**
 * 初期セットアップ（最初に1回だけ Apps Script エディタから実行する）。
 * members / stamps / config の3シートを自動で作り、ヘッダー・サンプル・
 * 管理キー（自動生成）・期間の初期値をセットします。
 * すでにデータがあるシートは上書きしません（何度実行しても安全）。
 * 実行後、実行ログ（表示 → ログ）に管理キーが出ます。
 */
function setup() {
  var book = SpreadsheetApp.getActiveSpreadsheet();

  // --- members ---
  var members = book.getSheetByName('members') || book.insertSheet('members');
  if (members.getLastRow() === 0) {
    members.getRange(1, 1, 1, 3).setValues([['id', 'なまえ', 'あいことば']]);
    members.getRange(2, 1, 2, 3).setValues([
      ['1', 'さんぷる1', 'りんご3'],
      ['2', 'さんぷる2', 'そらの5'],
    ]);
    members.setFrozenRows(1);
  }

  // --- stamps ---
  var stamps = book.getSheetByName('stamps') || book.insertSheet('stamps');
  if (stamps.getLastRow() === 0) {
    stamps.getRange(1, 1, 1, 2).setValues([['日付', 'member_id']]);
    stamps.setFrozenRows(1);
  }

  // --- config ---
  var config = book.getSheetByName('config') || book.insertSheet('config');
  if (config.getLastRow() === 0) {
    var tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
    var today = new Date();
    var end = new Date(today.getTime() + 41 * 86400000); // 42日間（両端含む）
    var fmt = function (d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); };
    var key = 'key-' + Utilities.getUuid(); // 推測されにくい管理キーを自動生成
    config.getRange(1, 1, 5, 2).setValues([
      ['key', 'value'],
      ['開始日', fmt(today)],
      ['終了日', fmt(end)],
      ['管理キー', key],
      ['タイトル', 'あさかつ スタンプカード'],
    ]);
    config.setFrozenRows(1);
  }

  // デフォルトの「シート1」が残っていて空なら消す
  var first = book.getSheetByName('シート1') || book.getSheetByName('Sheet1');
  if (first && book.getSheets().length > 1 && first.getLastRow() === 0) {
    book.deleteSheet(first);
  }

  var cfg = readConfig();
  Logger.log('セットアップ完了。管理キー = ' + cfg.key);
  Logger.log('期間 = ' + cfg.start + ' 〜 ' + cfg.end);
  return cfg.key;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'card')   return json(handleCard(e.parameter));
    if (action === 'roster') return json(handleRoster(e.parameter));
    if (action === 'stamp')  return json(handleStamp(e.parameter));
    return json({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

// ===== 各アクション =====

// 子ども向けカード: あいことばで自分のスタンプ一覧を返す
function handleCard(p) {
  var pass = normText(p.pass);
  if (!pass) return { ok: false, error: 'あいことばをいれてね' };

  var member = findMemberByPass(pass);
  if (!member) return { ok: false, error: 'あいことばがちがうみたい' };

  var cfg = readConfig();
  return {
    ok: true,
    title: cfg.title,
    start: cfg.start,
    end: cfg.end,
    name: member.name,
    stamps: stampsForMember(member.id),
  };
}

// 管理: 当日の名簿（押下済みフラグつき）を返す
function handleRoster(p) {
  requireAdmin(p.key);
  var date = normDate(p.date);
  var stampedSet = stampedMemberSetOn(date);
  var members = readMembers().map(function (m) {
    return { id: m.id, name: m.name, stamped: !!stampedSet[m.id] };
  });
  return { ok: true, date: date, members: members };
}

// 管理: スタンプを付ける / 外す（誤タップ用に toggle 可）
function handleStamp(p) {
  requireAdmin(p.key);
  var date = normDate(p.date);
  var memberId = normText(p.member);
  var op = normText(p.op) || 'toggle';
  if (!memberId) return { ok: false, error: 'member がありません' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20 * 1000);
  try {
    var sheet = sheetByName('stamps');
    var rowIndex = findStampRow(sheet, date, memberId); // 見つからなければ -1
    var exists = rowIndex > 0;
    var want = op === 'on' ? true : op === 'off' ? false : !exists; // toggle

    if (want && !exists) {
      sheet.appendRow([date, memberId]);
    } else if (!want && exists) {
      sheet.deleteRow(rowIndex);
    }
    return { ok: true, stamped: want };
  } finally {
    lock.releaseLock();
  }
}

// ===== スプレッドシート読み書き =====

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheetByName(name) {
  var sh = ss().getSheetByName(name);
  if (!sh) throw new Error('シート「' + name + '」がありません');
  return sh;
}

// members: [{ id, name, pass }]  ※id が空なら あいことば を id として使う
function readMembers() {
  var values = sheetByName('members').getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) { // 0行目はヘッダー
    var name = normText(values[i][1]);
    var pass = normText(values[i][2]);
    if (!name && !pass) continue; // 空行はスキップ
    var id = normText(values[i][0]) || pass;
    out.push({ id: id, name: name, pass: pass });
  }
  return out;
}

function findMemberByPass(pass) {
  var members = readMembers();
  for (var i = 0; i < members.length; i++) {
    if (members[i].pass && members[i].pass === pass) return members[i];
  }
  return null;
}

// config: { start, end, key, title }
function readConfig() {
  var values = sheetByName('config').getDataRange().getValues();
  var map = {};
  for (var i = 1; i < values.length; i++) {
    var k = normText(values[i][0]);
    if (k) map[k] = values[i][1];
  }
  return {
    start: normDate(map['開始日']),
    end: normDate(map['終了日']),
    key: normText(map['管理キー']),
    title: normText(map['タイトル']) || 'あさかつ スタンプカード',
  };
}

function requireAdmin(key) {
  var cfg = readConfig();
  if (!cfg.key || normText(key) !== cfg.key) {
    throw new Error('管理キーがちがいます');
  }
}

// あるメンバーのスタンプ日付一覧（期間内かどうかはフロント側で判定）
function stampsForMember(memberId) {
  var values = sheetByName('stamps').getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (normText(values[i][1]) === memberId) {
      var d = normDate(values[i][0]);
      if (d) out.push(d);
    }
  }
  return out;
}

// ある日に押されているメンバーidの集合 { id: true }
function stampedMemberSetOn(date) {
  var values = sheetByName('stamps').getDataRange().getValues();
  var set = {};
  for (var i = 1; i < values.length; i++) {
    if (normDate(values[i][0]) === date) set[normText(values[i][1])] = true;
  }
  return set;
}

// stamps シートから (date, memberId) の行番号を探す。なければ -1。
function findStampRow(sheet, date, memberId) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (normDate(values[i][0]) === date && normText(values[i][1]) === memberId) {
      return i + 1; // 1始まりの行番号
    }
  }
  return -1;
}

// ===== 共通ユーティリティ =====

function normText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// セルが Date でも文字列でも 'YYYY-MM-DD' にそろえる
function normDate(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  // 2026/7/8 のような入力も 2026-07-08 にそろえる
  var m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  }
  return s;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
