/** 距離まわりの小道具。外部ライブラリは使わない。 */
import type { Feature, FeatureCollection, Point } from "geojson";
import type { FacilityProps, LayerDef, LayerId } from "./layers";
import { SCENIC_LABEL, scenicColor, type ScenicProps } from "./scenic";

/** [経度, 緯度]。GeoJSON と MapLibre の並び順に合わせる。 */
export type LngLat = [number, number];

/** 名前の無い地点の表示名。**空欄にしない**（ポップアップにも徒歩ナビの結果にも出るので、
 *  空だと「読み込めていない」のか「元データに名前が無い」のか区別できなくなる）。 */
export const UNNAMED_PLACE = "名称不明の地点";

const EARTH_RADIUS_M = 6_371_000;

/** 2 点間の大円距離（メートル）。 */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * 徒歩ナビの目的地の候補。オープンデータの施設と景観スポットを同じ形にそろえる。
 *
 * **`routing.ts` の `RouteTarget` はこの型の別名**。候補から選んだものが
 * そのまま目的地になるので、形が食い違うことはあり得ない。
 * 定義をこちら側に置いているのは、`routing.ts` がこのファイルを読む側だから
 * （逆向きに import すると循環参照になる）。
 */
export type NavCandidate = {
  name: string;
  coords: LngLat;
  /** 種別の表示名（「指定緊急避難場所」「景観100選」など） */
  kind: string;
  /** 結果カードの色チップに使う色 */
  color: string;
};

/** 表示中の施設レイヤーの点を、徒歩ナビの候補にそろえる。 */
export function facilityCandidates(
  data: Record<LayerId, FeatureCollection<Point, FacilityProps>>,
  layers: LayerDef[],
  visible: Record<LayerId, boolean>,
): NavCandidate[] {
  const candidates: NavCandidate[] = [];
  for (const layer of layers) {
    if (!visible[layer.id]) continue;
    for (const feature of data[layer.id].features) {
      candidates.push({
        name: featureName(feature),
        coords: feature.geometry.coordinates as LngLat,
        kind: layer.label,
        color: layer.color,
      });
    }
  }
  return candidates;
}

/** 景観スポットを徒歩ナビの候補にそろえる。色はカテゴリごとに変える。 */
export function scenicCandidates(
  data: FeatureCollection<Point, ScenicProps> | null,
  visible: boolean,
): NavCandidate[] {
  if (!data || !visible) return [];
  return data.features.map((feature) => ({
    name: feature.properties?.name ?? UNNAMED_PLACE,
    coords: feature.geometry.coordinates as LngLat,
    kind: SCENIC_LABEL,
    color: scenicColor(feature.properties?.categoryPrimary),
  }));
}

/**
 * 候補のうち、出発地点から直線距離が最も近いものを返す。
 * 徒歩経路の長さでは並べ替えない（OSRM への問い合わせが候補数だけ必要になり、
 * 1 秒 1 リクエストの利用制限に触れるため）。
 */
export function nearestCandidate(origin: LngLat, candidates: NavCandidate[]): NavCandidate | null {
  let best: NavCandidate | null = null;
  let bestMeters = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const meters = haversineMeters(origin, candidate.coords);
    if (meters < bestMeters) {
      best = candidate;
      bestMeters = meters;
    }
  }
  return best;
}

/** 施設の点の表示名。**このファイルの中だけで使う**（外へ出すほどの意味は無い）。 */
function featureName(feature: Feature<Point, FacilityProps>): string {
  return feature.properties?.name ?? UNNAMED_PLACE;
}

/** 「1.2 km」「480 m」のように、桁に応じて単位を変えて読ませる。 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
  return `${Math.round(meters)} m`;
}

/** 「約 12 分」。1 分未満は切り上げる。 */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `約 ${minutes} 分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `約 ${h} 時間` : `約 ${h} 時間 ${m} 分`;
}

/** 徒歩の平均速度。OSRM が使えないときの所要時間の見積もりに使う。 */
export const WALKING_SPEED_MPS = 4.8 * 1000 / 3600;
