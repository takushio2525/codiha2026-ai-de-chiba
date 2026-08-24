/** 地図に載せるオープンデータのレイヤー定義。
 *
 * GeoJSON は `data/scripts/build_geojson.py` が市川市の CSV から生成して
 * `public/data/` に置いている。列名の対応もそのスクリプトを見ること。
 */

export type IconName = "shield" | "heartPulse" | "baby";

export type LayerId = "evacuation" | "aed" | "childcare";

/** GeoJSON の properties。スクリプト側で値が空のキーは落としてあるので全部省略可能。 */
export type FacilityProps = {
  name?: string;
  address?: string;
  area?: string;
  tel?: string;
  url?: string;
  /** 指定緊急避難場所 */
  capacity?: string;
  disasters?: string[];
  /** AED */
  spot?: string;
  days?: string;
  note?: string;
  /** AED・子育て施設に共通 */
  hours?: string;
  /** 子育て施設 */
  category?: string;
  ages?: string;
};

/** ポップアップに出す項目。上から順に、値があるものだけ表示する。 */
export type PopupField = { label: string; key: keyof FacilityProps };

export type LayerDef = {
  id: LayerId;
  label: string;
  /** public/ からのパス */
  file: string;
  /** 点の色。Okabe-Ito（カラーユニバーサルデザイン推奨配色）から取る */
  color: string;
  /** 凡例に出す lucide のアイコン名。色だけに頼らず形でも区別できるようにする */
  icon: IconName;
  summary: string;
  popupFields: PopupField[];
};

export const LAYERS: LayerDef[] = [
  {
    id: "evacuation",
    label: "指定緊急避難場所",
    file: "/data/evacuation_sites.geojson",
    color: "#0072b2",
    icon: "shield",
    summary: "災害種別ごとに、逃げ込める場所として市が指定している施設",
    popupFields: [
      { label: "対応する災害", key: "disasters" },
      { label: "想定収容人数", key: "capacity" },
      { label: "電話", key: "tel" },
    ],
  },
  {
    id: "aed",
    label: "AED 設置箇所",
    file: "/data/aed_locations.geojson",
    color: "#d55e00",
    icon: "heartPulse",
    summary: "市が把握している AED の設置場所と、使える曜日・時間",
    popupFields: [
      { label: "設置位置", key: "spot" },
      { label: "利用できる曜日", key: "days" },
      { label: "利用できる時間", key: "hours" },
      { label: "備考", key: "note" },
      { label: "電話", key: "tel" },
    ],
  },
  {
    id: "childcare",
    label: "子育て施設",
    file: "/data/childcare_facilities.geojson",
    color: "#009e73",
    icon: "baby",
    summary: "保育所・幼稚園・児童館・放課後児童クラブなど 12 種別",
    popupFields: [
      { label: "種別", key: "category" },
      { label: "受入年齢", key: "ages" },
      { label: "開所時間", key: "hours" },
      { label: "電話", key: "tel" },
    ],
  },
];

/** MapLibre のレイヤー ID。ソース ID と揃えると取り回しが楽なので関数にしておく。 */
export const pointLayerId = (id: LayerId) => `${id}-points`;
