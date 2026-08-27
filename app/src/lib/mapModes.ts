/** 地図のモード（画面 S-1 防災 / S-2 観光）。
 *
 * **画面は 1 枚のまま**で、最初から表示するレイヤーの組と、投稿できるカテゴリだけを
 * 切り替える（docs/design/requirements.md §6）。防災の投稿と観光の投稿が同じ地図に
 * 同じ濃さで混ざると読めなくなるので、既定の組を分けている（同 §4「統一しない部分」）。
 *
 * ここが決めるのは**初期値だけ**。切り替えたあとに個別のレイヤーを足し引きするのは自由で、
 * 「観光モードのまま避難場所も重ねる」ことはできる。
 */
import { HAZARDS, initialHazardVisibility, type HazardId } from "./hazards";
import { LAYERS, type LayerId } from "./layers";
import { REPORT_CATEGORIES, type ReportCategory } from "./reports";

export type MapMode = "disaster" | "tourism";

/** 切り替えボタンに出す lucide のアイコン名。 */
export type MapModeIconName = "shieldAlert" | "camera";

export type MapModeDef = {
  id: MapMode;
  label: string;
  summary: string;
  icon: MapModeIconName;
  /** 最初から表示するオープンデータの施設レイヤー */
  layers: LayerId[];
  /** 景観スポット（F-5）を最初から表示するか */
  scenic: boolean;
  /** ハザードマップ（浸水想定）を重ねるか。true なら `hazards.ts` の `defaultVisible` に従う */
  hazards: boolean;
  /** 最初から表示する投稿のカテゴリ */
  reportCategories: ReportCategory[];
  /** このモードで投稿できるカテゴリ。**操作パネルのボタンがこの順で並ぶ** */
  postable: ReportCategory[];
};

export const MAP_MODES: MapModeDef[] = [
  {
    id: "disaster",
    label: "防災",
    summary: "ハザードマップ・避難場所・危険箇所の報告",
    icon: "shieldAlert",
    layers: ["evacuation", "aed", "childcare"],
    scenic: false,
    hazards: true,
    reportCategories: ["hazard", "flood"],
    // **ここに 1 つ足すと投稿の入り口が 1 つ増える**（中身は `reports.ts` が正本）
    postable: ["hazard", "flood"],
  },
  {
    id: "tourism",
    label: "観光",
    summary: "景観100選・観光おすすめの投稿",
    icon: "camera",
    layers: [],
    scenic: true,
    hazards: false,
    reportCategories: ["spot"],
    postable: ["spot"],
  },
];

export const DEFAULT_MAP_MODE: MapMode = "disaster";

export function isMapMode(value: unknown): value is MapMode {
  return typeof value === "string" && MAP_MODES.some((mode) => mode.id === value);
}

export function mapModeDef(id: MapMode): MapModeDef {
  return MAP_MODES.find((mode) => mode.id === id) ?? MAP_MODES[0];
}

/** URL の `?mode=` を読む。知らない値と未指定は防災モードにする。 */
export function parseMapMode(value: string | null | undefined): MapMode {
  return isMapMode(value) ? value : DEFAULT_MAP_MODE;
}

// ---- モードから初期状態を組み立てる ------------------------------------------
// レイヤーやカテゴリを増やしても、ここは書き換えなくてよい形にしてある。

export function layerVisibilityFor(mode: MapMode): Record<LayerId, boolean> {
  const on = new Set(mapModeDef(mode).layers);
  return Object.fromEntries(LAYERS.map((layer) => [layer.id, on.has(layer.id)])) as Record<
    LayerId,
    boolean
  >;
}

/** ハザードの重ね。防災モードは `hazards.ts` の既定に従い、観光モードは全部外す。 */
export function hazardVisibilityFor(mode: MapMode): Record<HazardId, boolean> {
  if (mapModeDef(mode).hazards) return initialHazardVisibility();
  return Object.fromEntries(HAZARDS.map((hazard) => [hazard.id, false])) as Record<
    HazardId,
    boolean
  >;
}

export function reportVisibilityFor(mode: MapMode): Record<ReportCategory, boolean> {
  const on = new Set(mapModeDef(mode).reportCategories);
  return Object.fromEntries(
    REPORT_CATEGORIES.map((category) => [category.id, on.has(category.id)]),
  ) as Record<ReportCategory, boolean>;
}
