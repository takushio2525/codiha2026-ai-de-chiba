/** 投稿を**日付の範囲**で絞るための共通定義（浸水実績アーカイブ）。
 *
 * **ブラウザ側からも読み込む**ので、ここに DB や Node.js の API を持ち込まないこと。
 * SQL への落とし込みは `reportStore.ts`、クエリの検証は `reportInput.ts`。
 *
 * ---- ここで決めていること ----
 *
 *   - 日付は **JST の暦日**（`YYYY-MM-DD`）で扱う。利用者が見ている日付と、
 *     絞り込みの境目を一致させるため。日本時間には夏時間が無いので、
 *     「その日の 00:00 から翌日の 00:00 まで」で過不足なく表せる
 *   - `from` / `to` は**どちらも含む**（`to` に指定した日の 23:59 までが入る）
 *   - 片方だけの指定もできる（「この日以降」「この日以前」）
 *
 * 雨で冠水した日は、あとから「あの雨のとき、どこが水に浸かったか」を引くための
 * 手がかりになる。CHIZUBA が溜めているのはその**実績**で、予測ではない
 * （docs/design/requirements.md 3-1 の線）。
 */

/** `YYYY-MM-DD`。JST の暦日 1 日を指す。 */
export type DateKey = string;

export type DateRange = {
  from: DateKey | null;
  to: DateKey | null;
};

export const EMPTY_RANGE: DateRange = { from: null, to: null };

/** JST の日付に直すフォーマッタ。`en-CA` は `YYYY-MM-DD` で出る。 */
const JST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** JST での「今日」。 */
export function todayJst(now: Date = new Date()): DateKey {
  return JST_DATE.format(now);
}

/** JST での「n 日前」。日本時間に夏時間が無いので、24 時間ずつ引けばよい。 */
export function daysAgoJst(days: number, now: Date = new Date()): DateKey {
  return JST_DATE.format(new Date(now.getTime() - days * 86_400_000));
}

/** `YYYY-MM-DD` として妥当か。**桁だけでなく実在する日付かも見る**
 *  （`2026-02-31` のような値をそのまま SQL に渡さないため）。 */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** 期間の指定を整える。**始まりと終わりが逆なら入れ替える**
 *  （日付の入力欄は順番を強制できないので、画面側で怒らずに直す）。 */
export function normalizeRange(from: unknown, to: unknown): DateRange {
  const start = isDateKey(from) ? from : null;
  const end = isDateKey(to) ? to : null;
  if (start !== null && end !== null && start > end) return { from: end, to: start };
  return { from: start, to: end };
}

export function hasRange(range: DateRange): boolean {
  return range.from !== null || range.to !== null;
}

/** 画面に出す期間の説明。 */
export function describeRange(range: DateRange): string {
  const from = range.from ? formatDateKey(range.from) : null;
  const to = range.to ? formatDateKey(range.to) : null;
  if (from && to) return from === to ? from : `${from} 〜 ${to}`;
  if (from) return `${from} 以降`;
  if (to) return `${to} まで`;
  return "すべての期間";
}

/** `2026-08-27` → `2026/08/27`。 */
export function formatDateKey(key: DateKey): string {
  return key.replaceAll("-", "/");
}

/** よく使う期間の近道。**スマホ幅に 4 つまで**にしてある（横 2 列で折り返す）。 */
export const RANGE_PRESETS: { id: string; label: string; days: number | null }[] = [
  { id: "all", label: "すべて", days: null },
  { id: "today", label: "今日", days: 0 },
  { id: "7", label: "7 日間", days: 6 },
  { id: "30", label: "30 日間", days: 29 },
];

/** 近道の ID から期間を作る。`days` が null なら「すべて」。 */
export function rangeFromPreset(id: string, now: Date = new Date()): DateRange {
  const preset = RANGE_PRESETS.find((p) => p.id === id);
  if (!preset || preset.days === null) return EMPTY_RANGE;
  return { from: daysAgoJst(preset.days, now), to: todayJst(now) };
}

/** いま選ばれている期間が、どの近道と一致するか。一致しなければ null。 */
export function matchingPreset(range: DateRange, now: Date = new Date()): string | null {
  if (!hasRange(range)) return "all";
  for (const preset of RANGE_PRESETS) {
    if (preset.days === null) continue;
    const candidate = rangeFromPreset(preset.id, now);
    if (candidate.from === range.from && candidate.to === range.to) return preset.id;
  }
  return null;
}
