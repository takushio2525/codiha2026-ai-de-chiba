/** ハザードマップ（浸水想定）のレイヤー定義。
 *
 * 国土交通省「ハザードマップポータルサイト」の重ねるハザードマップが配信している
 * ラスタタイルを、背景地図の上に重ねて表示する。認証キーは要らない。
 * 配信仕様: https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html
 *
 * 凡例の色は、実際に配信されているタイルの画素を数えて確かめたもの
 * （2026-08-24・千葉県内 20 タイル）。洪水は 6 段階、津波と高潮は 8 段階で、
 * 同じ色でも表す浸水深が違う。まとめて 1 つの凡例にすると誤読するので分けてある。
 */

export type HazardId = "flood" | "hightide" | "tsunami";

/** 凡例に出す lucide のアイコン名。色だけに頼らず形でも区別できるようにする。 */
export type HazardIconName = "cloudRain" | "wind" | "waves";

/** 浸水深の色分けの種類。洪水と、海側（津波・高潮）で段階が違う。 */
export type HazardLegendId = "flood" | "coastal";

export type HazardLegendClass = {
  /** タイルに実際に使われている色（そのまま見本に出す） */
  color: string;
  /** 浸水深の範囲 */
  label: string;
};

export type HazardLegendDef = {
  id: HazardLegendId;
  title: string;
  /** 深いほうから並べる（凡例は上が深い） */
  classes: HazardLegendClass[];
};

export type HazardDef = {
  id: HazardId;
  label: string;
  /** タイルの XYZ URL テンプレート */
  tiles: string;
  /** 配信されているズームの範囲（ハザードマップポータルの記載どおり） */
  minzoom: number;
  maxzoom: number;
  icon: HazardIconName;
  summary: string;
  /** どの色分けを使うか */
  legend: HazardLegendId;
  /** 初期状態で重ねておくか */
  defaultVisible: boolean;
};

const TILE_BASE = "https://disaportaldata.gsi.go.jp/raster";

/** 洪水浸水想定区域（想定最大規模）の 6 段階。 */
const FLOOD_LEGEND: HazardLegendDef = {
  id: "flood",
  title: "洪水の浸水深",
  classes: [
    { color: "#dc7adc", label: "20 m 以上" },
    { color: "#f285c9", label: "10 〜 20 m" },
    { color: "#ff9191", label: "5 〜 10 m" },
    { color: "#ffb7b7", label: "3 〜 5 m" },
    { color: "#ffd8c0", label: "0.5 〜 3 m" },
    { color: "#f7f5a9", label: "0.5 m 未満" },
  ],
};

/** 津波・高潮の 8 段階（浅い側が洪水より細かい）。 */
const COASTAL_LEGEND: HazardLegendDef = {
  id: "coastal",
  title: "津波・高潮の浸水深",
  classes: [
    { color: "#dc7adc", label: "20 m 以上" },
    { color: "#f285c9", label: "10 〜 20 m" },
    { color: "#ff9191", label: "5 〜 10 m" },
    { color: "#ffb7b7", label: "3 〜 5 m" },
    { color: "#ffd8c0", label: "1 〜 3 m" },
    { color: "#f8e1a6", label: "0.5 〜 1 m" },
    { color: "#f7f5a9", label: "0.3 〜 0.5 m" },
    { color: "#ffffb3", label: "0.3 m 未満" },
  ],
};

export const HAZARD_LEGENDS: Record<HazardLegendId, HazardLegendDef> = {
  flood: FLOOD_LEGEND,
  coastal: COASTAL_LEGEND,
};

export const HAZARDS: HazardDef[] = [
  {
    id: "flood",
    label: "洪水浸水想定区域",
    tiles: `${TILE_BASE}/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png`,
    minzoom: 2,
    maxzoom: 17,
    icon: "cloudRain",
    summary: "想定しうる最大規模の降雨で川が氾濫した場合の浸水の深さ",
    legend: "flood",
    // 千葉県で最も広く整備されている想定なので、これだけ最初から重ねておく
    defaultVisible: true,
  },
  {
    id: "hightide",
    label: "高潮浸水想定区域",
    tiles: `${TILE_BASE}/03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png`,
    minzoom: 2,
    maxzoom: 17,
    icon: "wind",
    summary: "想定しうる最大規模の台風で潮位が上がった場合の浸水の深さ",
    legend: "coastal",
    defaultVisible: false,
  },
  {
    id: "tsunami",
    label: "津波浸水想定",
    tiles: `${TILE_BASE}/04_tsunami_newlegend_data/{z}/{x}/{y}.png`,
    minzoom: 2,
    maxzoom: 17,
    icon: "waves",
    summary: "都道府県が公表している津波の浸水想定（新しい凡例）",
    legend: "coastal",
    defaultVisible: false,
  },
];

/** 不透明度はレイヤーごとに変えられる（重ねたときに下のレイヤーを透かせるため）。 */
export const HAZARD_OPACITY_DEFAULT = 0.6;
export const HAZARD_OPACITY_MIN = 0.1;
export const HAZARD_OPACITY_MAX = 1;
export const HAZARD_OPACITY_STEP = 0.05;

/** MapLibre のソース ID とレイヤー ID。既存レイヤーと衝突しない接頭辞を付ける。 */
export const hazardSourceId = (id: HazardId) => `hazard-${id}`;
export const hazardLayerId = (id: HazardId) => `hazard-${id}-raster`;

/** 表示中のハザードが使っている凡例だけを、重複なく返す。 */
export function visibleHazardLegends(
  visible: Record<HazardId, boolean>,
): HazardLegendDef[] {
  const ids = new Set<HazardLegendId>();
  for (const hazard of HAZARDS) {
    if (visible[hazard.id]) ids.add(hazard.legend);
  }
  return Object.values(HAZARD_LEGENDS).filter((legend) => ids.has(legend.id));
}

/** 初期状態。定義から組み立てるので、レイヤーを足しても書き換えなくてよい。 */
export const initialHazardVisibility = (): Record<HazardId, boolean> =>
  Object.fromEntries(HAZARDS.map((h) => [h.id, h.defaultVisible])) as Record<HazardId, boolean>;

export const initialHazardOpacity = (): Record<HazardId, number> =>
  Object.fromEntries(HAZARDS.map((h) => [h.id, HAZARD_OPACITY_DEFAULT])) as Record<HazardId, number>;

/** 凡例に必ず添える注意書き。
 *
 * 白紙の場所を「危険なし」と誤読させないための約束（docs/design/interfaces.md I-9）。
 * 2 つ目はハザードマップポータルの利用規約が求めている案内。
 */
export const HAZARD_CAUTIONS: string[] = [
  "色が付いていない場所が安全とは限りません。想定区域が公表されていない河川・地域があります。",
  "最新かつ詳しい情報は、各市町村が作成しているハザードマップを確認してください。",
];
