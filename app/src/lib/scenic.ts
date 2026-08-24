/** 景観スポット（いちかわ景観100選）の定義。観光マップ（F-5）の主データ。
 *
 * GeoJSON は `data/scripts/build_geojson.py` が市川市の CSV から生成して
 * `public/data/scenic_spots.geojson` に置いている。列名の対応もそのスクリプトを見ること。
 *
 * **オープンデータの施設レイヤー（`layers.ts`）とは別に持っている。**
 * 景観スポットだけは「日英 2 か国語の解説」「1 件が複数カテゴリを持つ」という形をしていて、
 * `FacilityProps` / `popupFields` の枠に収まらないため。地図の点・ポップアップも専用にする。
 * ただし**徒歩ナビは共通**で、施設と同じ `RouteTarget` を返して既存の経路計算に載せる。
 */

/** カテゴリ（CSV の `備考` 列）。1 件が最大 3 つ持つ。 */
export type ScenicCategoryId = "townscape" | "nature" | "history" | "life";

export type ScenicCategoryDef = {
  id: ScenicCategoryId;
  /** **GeoJSON に入っている生の表記**。CSV の値をそのまま使うので変えないこと */
  raw: string;
  label: string;
  /** 点と凡例の色。Okabe-Ito（色覚多様性に配慮した配色）から取る */
  color: string;
};

/** 件数の多い順（実測: まち並み 65・自然 39・歴史・文化 26・生活風景 14）。 */
export const SCENIC_CATEGORIES: ScenicCategoryDef[] = [
  { id: "townscape", raw: "まち並み", label: "まち並み", color: "#0072b2" },
  { id: "nature", raw: "自然", label: "自然", color: "#009e73" },
  { id: "history", raw: "歴史・文化", label: "歴史・文化", color: "#d55e00" },
  { id: "life", raw: "生活風景", label: "生活風景", color: "#cc79a7" },
];

/** 定義に無いカテゴリ（元データが増えたとき）はこの色で出す。 */
export const SCENIC_FALLBACK_COLOR = "#7b818b";

/** public/ からのパス。 */
export const SCENIC_FILE = "/data/scenic_spots.geojson";
export const SCENIC_LABEL = "景観100選";
export const SCENIC_SUMMARY = "市が選んだ 100 か所の景観。日本語と英語の解説つき";

/** GeoJSON の properties。**値が空のキーは出力されない**ので全部省略可能（interfaces.md I-1）。 */
export type ScenicProps = {
  name?: string;
  address?: string;
  area?: string;
  nameEn?: string;
  /** 日本語の解説。19〜88 文字（中央値 47）の 1〜2 文 */
  description?: string;
  /** 英語の解説。57〜365 文字（中央値 147）と日本語より長い */
  descriptionEn?: string;
  /** アクセス方法。**100 件中 73 件にしか無い** */
  access?: string;
  /** カテゴリの全部。**MapLibre 経由では JSON 文字列に畳まれる**ので `scenicCategories()` で読む */
  categories?: string[];
  /** 色分けに使う主カテゴリ（配列の先頭）。文字列なので地図の式から直接読める */
  categoryPrimary?: string;
  tel?: string;
  url?: string;
};

export function scenicCategoryByRaw(raw: string): ScenicCategoryDef | null {
  return SCENIC_CATEGORIES.find((category) => category.raw === raw) ?? null;
}

export function scenicColor(raw: string | undefined): string {
  return (raw ? scenicCategoryByRaw(raw)?.color : null) ?? SCENIC_FALLBACK_COLOR;
}

/**
 * `properties.categories` を配列で読む。
 *
 * **MapLibre は GeoJSON の配列プロパティを JSON 文字列に畳んでしまう**ので、
 * ソースに渡した生データ（配列）とクリックイベントから受け取る値（文字列）の
 * 両方が来る。どちらで来ても同じ配列に直す。
 */
export function scenicCategories(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value !== "string") return [];
  const text = value.trim();
  if (text.length === 0) return [];
  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
    } catch {
      // 壊れた JSON は読点区切りとして扱う（下へ falls through）
    }
  }
  return text.split("、").map((part) => part.trim()).filter((part) => part.length > 0);
}

/** MapLibre のソース ID とレイヤー ID。既存レイヤーと衝突しない接頭辞を付ける。 */
export const SCENIC_SOURCE = "scenic";
export const SCENIC_POINT_LAYER = "scenic-points";
