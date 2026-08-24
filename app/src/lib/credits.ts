/** 出典（クレジット）。地図の隅と /about の両方で同じ文言を使う。
 *
 * プレゼン資料でもデータの参照元の記載が必須なので、文言はここを正とする。
 * 課題/2026-09-09_CODIHA2026_提出要件.md を参照。
 */

export type Credit = {
  what: string;
  text: string;
  href: string;
  license: string;
};

export const DATA_CREDITS: Credit[] = [
  {
    what: "指定緊急避難場所・AED 設置箇所・子育て施設",
    text: "市川市オープンデータ（千葉県オープンデータサイトに登録）を加工して作成",
    href: "https://www.city.ichikawa.lg.jp/page/4744.html",
    license: "CC BY 4.0",
  },
  {
    what: "背景地図",
    text: "国土地理院「淡色地図」タイル",
    href: "https://maps.gsi.go.jp/development/ichiran.html",
    license: "国土地理院コンテンツ利用規約",
  },
  {
    what: "徒歩経路の計算",
    text: "OSRM（FOSSGIS e.V. 提供）／道路データは OpenStreetMap contributors",
    href: "https://routing.openstreetmap.de/about.html",
    license: "ODbL（OpenStreetMap）",
  },
];

/** 地図の隅（MapLibre の attribution）に出す短い版。HTML 断片として渡す。 */
export const MAP_ATTRIBUTION: string[] = [
  '<a href="https://www.city.ichikawa.lg.jp/page/4744.html" target="_blank" rel="noreferrer">市川市オープンデータ</a>を加工して作成',
  '経路: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer">OSRM / FOSSGIS</a>',
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  // FOSSGIS の利用規約が求めている「地図を修正する」リンク
  '<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">地図の修正</a>',
];
