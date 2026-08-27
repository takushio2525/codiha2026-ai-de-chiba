/** 投稿を**オープンデータとして書き出す**（CSV / GeoJSON）。
 *
 * **ブラウザ側からも読み込む**（ダウンロードの URL を組み立てるため）ので、
 * ここに DB や Node.js の API を持ち込まないこと。引くのは `reportStore.ts`。
 *
 * ---- ここで守っていること ----
 *
 *   1. **出すのは公開情報だけ。** 画面で誰でも読める項目（I-3 の properties）と
 *      座標しか含めない。**ユーザー ID・メールアドレス・provider_uid は出さない**
 *   2. **デモ投稿はデモと分かるようにする**（`is_demo` 列 / `isDemo`）。
 *      さらに**デモ投稿の雨量は書き出さない**。あれは数字を置いてあるだけの
 *      ダミーで、観測値ではない（requirements.md 7-5 の 3）。
 *      観測値の顔をした列に入れると、受け取った人には見分けが付かない
 *   3. **CSV は UTF-8 BOM 付き・CRLF。** Excel が既定の文字コードで開いても
 *      日本語が化けないようにするため（RFC 4180 + BOM）
 *   4. **GeoJSON は RFC 7946。** 座標は [経度, 緯度] の WGS84 で、
 *      `crs` メンバーは付けない（RFC 7946 は WGS84 固定）
 */
import {
  REPORT_CATEGORIES,
  reportCategoryDef,
  reportStatusLabel,
  isDemoReport,
  type ReportFeature,
} from "./reports";

export type ExportFormat = "csv" | "geojson";

export function isExportFormat(value: unknown): value is ExportFormat {
  return value === "csv" || value === "geojson";
}

/** カテゴリ固有の項目の列。**カテゴリを 1 つ足すと列も自動で増える**
 *  （`REPORT_CATEGORIES` が正本という約束をここでも守る）。 */
const DETAIL_COLUMNS = REPORT_CATEGORIES.flatMap((category) =>
  category.detailFields.map((field) => ({
    categoryId: category.id,
    key: field.key,
    /** `hazardType` → `hazard_type` */
    column: field.key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
    options: field.options,
  })),
);

/** 投稿者のロールの日本語。 */
function roleLabel(role: "user" | "gov"): string {
  return role === "gov" ? "行政" : "住民";
}

/** 1 件ぶんの「書き出す内容」。CSV も GeoJSON もここから作るので、
 *  **どちらかにだけ入っている項目**という食い違いが起きない。 */
type ExportRow = {
  id: number;
  category: string;
  categoryLabel: string;
  title: string;
  body: string;
  latitude: number;
  longitude: number;
  cityCode: string;
  status: string;
  statusLabel: string;
  authorName: string;
  authorRole: string;
  authorRoleLabel: string;
  createdAt: string;
  photoCount: number;
  commentCount: number;
  hasOfficialComment: boolean;
  isDemo: boolean;
  /** カテゴリ固有の項目（日本語のラベル）。**キーは `details` と同じ camelCase**
   *  （GeoJSON の properties にそのまま出す。CSV だけ snake_case の列名に直す）。
   *  持たないカテゴリでは空 */
  details: Record<string, string>;
  /** 投稿時点の雨量。**デモ投稿では必ず null**（上の 2） */
  rainfallMm: number | null;
  rainfallStation: string | null;
  rainfallObservedAt: string | null;
};

/** 座標の桁。RFC 7946 は「必要以上の桁を持たせない」ことを勧めている。
 *  小数 6 桁 ≒ 0.1 m で、投稿の位置には十分すぎる。 */
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function toRow(feature: ReportFeature): ExportRow {
  const p = feature.properties;
  const demo = isDemoReport(p.details);
  const details: Record<string, string> = {};
  for (const column of DETAIL_COLUMNS) {
    if (column.categoryId !== p.category) continue;
    const raw = p.details?.[column.key];
    if (typeof raw !== "string") continue;
    const option = column.options.find((o) => o.value === raw);
    if (option) details[column.key] = option.label;
  }

  // **デモ投稿の雨量は出さない。** 観測値ではないので、観測値の列に入れない
  const station = p.details?.amedasStation;
  const observedAt = p.details?.observedAt;
  const rainfall = p.details?.rainfallMm;
  const realObservation =
    !demo && typeof rainfall === "number" && Number.isFinite(rainfall) &&
    typeof station === "string" && station.length > 0;

  return {
    id: p.id,
    category: p.category,
    categoryLabel: reportCategoryDef(p.category).label,
    title: p.title,
    body: p.body,
    latitude: round6(feature.geometry.coordinates[1]),
    longitude: round6(feature.geometry.coordinates[0]),
    cityCode: p.cityCode,
    status: p.status,
    statusLabel: reportStatusLabel(p.status),
    authorName: p.authorName,
    authorRole: p.authorRole,
    authorRoleLabel: roleLabel(p.authorRole),
    createdAt: p.createdAt,
    photoCount: p.photoCount,
    commentCount: p.commentCount,
    hasOfficialComment: p.hasOfficialComment,
    isDemo: demo,
    details,
    rainfallMm: realObservation ? (rainfall as number) : null,
    rainfallStation: realObservation ? (station as string) : null,
    rainfallObservedAt:
      realObservation && typeof observedAt === "string" ? observedAt : null,
  };
}

// ---- CSV ---------------------------------------------------------------------

const CSV_HEADER = [
  "id",
  "category",
  "category_label",
  "title",
  "body",
  "latitude",
  "longitude",
  "city_code",
  "status",
  "status_label",
  "author_name",
  "author_role",
  "author_role_label",
  "created_at",
  "photo_count",
  "comment_count",
  "has_official_comment",
  ...DETAIL_COLUMNS.map((c) => c.column),
  "rainfall_mm",
  "rainfall_station",
  "rainfall_observed_at",
  "is_demo",
];

/** RFC 4180 の囲み。区切り・引用符・改行を含むときだけ `"` で囲み、
 *  中の `"` は 2 つに重ねる。 */
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

/** **利用者が書いた文字列**を CSV に入れる。
 *
 * 表計算ソフトは `=` `+` `-` `@` で始まるセルを数式として解釈するので、
 * 投稿の本文がそのまま数式として走らないよう、先頭に `'` を足して無効化する
 * （中身は変えずに「文字列である」と示すだけ）。
 * 数値や列挙の値は自前で作っているので、この処理は通さない。 */
function csvText(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return csvCell(guarded);
}

function csvBool(value: boolean): string {
  return value ? "true" : "false";
}

/** 投稿を CSV（UTF-8 BOM 付き・CRLF）にする。 */
export function toCsv(features: ReportFeature[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const feature of features) {
    const row = toRow(feature);
    lines.push(
      [
        String(row.id),
        row.category,
        csvText(row.categoryLabel),
        csvText(row.title),
        csvText(row.body),
        String(row.latitude),
        String(row.longitude),
        row.cityCode,
        row.status,
        csvText(row.statusLabel),
        csvText(row.authorName),
        row.authorRole,
        csvText(row.authorRoleLabel),
        row.createdAt,
        String(row.photoCount),
        String(row.commentCount),
        csvBool(row.hasOfficialComment),
        ...DETAIL_COLUMNS.map((c) => csvText(row.details[c.key] ?? "")),
        row.rainfallMm === null ? "" : String(row.rainfallMm),
        csvText(row.rainfallStation ?? ""),
        row.rainfallObservedAt ?? "",
        csvBool(row.isDemo),
      ].join(","),
    );
  }
  // 先頭の BOM は Excel が UTF-8 と判断するための目印。CRLF は RFC 4180
  return `﻿${lines.join("\r\n")}\r\n`;
}

// ---- GeoJSON（RFC 7946）-------------------------------------------------------

export type ExportMeta = {
  cityName: string;
  cityCode: string;
  /** 期間の説明（`describeRange` の結果） */
  rangeLabel: string;
  /** 書き出した時刻（JST の ISO 8601） */
  generatedAt: string;
};

/** 全体の外接矩形。RFC 7946 5 章の `bbox`（[西, 南, 東, 北]）。 */
function bboxOf(features: ReportFeature[]): [number, number, number, number] | null {
  if (features.length === 0) return null;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const feature of features) {
    const [lon, lat] = feature.geometry.coordinates;
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [round6(west), round6(south), round6(east), round6(north)];
}

/** 投稿を GeoJSON（RFC 7946）にする。
 *
 * 先頭の `name` / `attribution` / `note` / `generated` は RFC 7946 6-1 が認めている
 * 外部メンバー。読み飛ばしても妥当な GeoJSON として読める。 */
export function toGeoJson(features: ReportFeature[], meta: ExportMeta): string {
  const bbox = bboxOf(features);
  const collection = {
    type: "FeatureCollection",
    name: `CHIZUBA の投稿（${meta.cityName}・${meta.rangeLabel}）`,
    attribution: "CHIZUBA（千葉県の住民と行政の投稿）",
    note:
      "住民と行政が CHIZUBA に投稿した情報です。" +
      "isDemo が true の地物は、動作確認のために最初から入っているデモ投稿で、実際の通報ではありません。" +
      "デモ投稿の雨量は観測値ではないため書き出していません。" +
      "投稿の再配布条件は運用時に定めるもので、この試作では確定していません。",
    generated: meta.generatedAt,
    ...(bbox ? { bbox } : {}),
    features: features.map((feature) => {
      const row = toRow(feature);
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [row.longitude, row.latitude],
        },
        properties: {
          id: row.id,
          category: row.category,
          categoryLabel: row.categoryLabel,
          title: row.title,
          body: row.body,
          cityCode: row.cityCode,
          status: row.status,
          statusLabel: row.statusLabel,
          authorName: row.authorName,
          authorRole: row.authorRole,
          authorRoleLabel: row.authorRoleLabel,
          createdAt: row.createdAt,
          photoCount: row.photoCount,
          commentCount: row.commentCount,
          hasOfficialComment: row.hasOfficialComment,
          ...row.details,
          rainfallMm: row.rainfallMm,
          rainfallStation: row.rainfallStation,
          rainfallObservedAt: row.rainfallObservedAt,
          isDemo: row.isDemo,
        },
      };
    }),
  };
  return `${JSON.stringify(collection, null, 2)}\n`;
}

// ---- ダウンロードの URL（ブラウザ側で使う）------------------------------------

/** 書き出しの URL を組み立てる。**いま見ている絞り込みをそのまま渡す**。 */
export function exportHref(params: {
  format: ExportFormat;
  city: string;
  from?: string | null;
  to?: string | null;
  category?: string | null;
  /** 検索語。**そのまま渡す**（サーバー側で正規化する） */
  q?: string | null;
}): string {
  const query = new URLSearchParams({ format: params.format, city: params.city });
  if (params.category) query.set("category", params.category);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.q) query.set("q", params.q);
  return `/api/reports/export?${query.toString()}`;
}

/** ダウンロードするファイル名。**日本語を入れない**
 *  （Content-Disposition の filename は ASCII に収めるのが無難）。 */
export function exportFileName(format: ExportFormat, cityCode: string, date: string): string {
  return `chizuba-reports-${cityCode}-${date.replaceAll("-", "")}.${format}`;
}

/** 書き出したファイルの Content-Type。 */
export const EXPORT_CONTENT_TYPE: Record<ExportFormat, string> = {
  // Excel 対策の BOM を付けるので、文字コードは UTF-8 と明示する
  csv: "text/csv; charset=utf-8",
  // RFC 7946 が定めた MIME
  geojson: "application/geo+json; charset=utf-8",
};

/** 書き出した時刻（JST の ISO 8601）。`sv-SE` は `YYYY-MM-DD HH:MM:SS` で出る。 */
const JST_STAMP = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** GeoJSON の `generatedAt` に入れる、いまの時刻。 */
export function nowJstIso(now: Date = new Date()): string {
  return `${JST_STAMP.format(now).replace(" ", "T")}+09:00`;
}
