/** ブラウザ側から徒歩経路を取ってくる。
 *
 * 経路サービス（OSRM）が落ちていても画面が止まらないよう、失敗したときは
 * 直線と平均徒歩速度からの見積もりに切り替える。見積もりであることは
 * 画面にはっきり出す（`estimated` フラグ）。
 */
import type { LineString } from "geojson";
import type { RouteResponse } from "@/app/api/routing/route";
import { haversineMeters, WALKING_SPEED_MPS, type LngLat } from "./geo";

/** 経路の目的地。どのレイヤーの地点なのかまで持たせる。
 *  避難場所へ行くのか AED へ行くのかは、利用者が最初に知りたいことなので省略しない。 */
export type RouteTarget = {
  name: string;
  coords: LngLat;
  /** レイヤーの表示名（「指定緊急避難場所」など） */
  kind: string;
  /** レイヤーの色。結果カードの色チップに使う */
  color: string;
};

export type WalkingRoute = {
  from: LngLat;
  destination: RouteTarget;
  geometry: LineString;
  distanceMeters: number;
  durationSeconds: number;
  /** true なら OSRM を使えず、直線距離からの見積もりを出している */
  estimated: boolean;
  /** 見積もりに切り替えた理由。estimated が true のときだけ入る */
  note?: string;
};

function straightLine(from: LngLat, destination: RouteTarget, note: string): WalkingRoute {
  const distanceMeters = haversineMeters(from, destination.coords);
  return {
    from,
    destination,
    geometry: { type: "LineString", coordinates: [from, destination.coords] },
    distanceMeters,
    durationSeconds: distanceMeters / WALKING_SPEED_MPS,
    estimated: true,
    note,
  };
}

export async function fetchWalkingRoute(
  from: LngLat,
  destination: RouteTarget,
): Promise<WalkingRoute> {
  const query = new URLSearchParams({
    from: from.join(","),
    to: destination.coords.join(","),
  });
  try {
    const res = await fetch(`/api/routing?${query}`, {
      // サーバ側でも打ち切るが、そこへ届かない場合に備えてブラウザ側にも上限を置く
      signal: AbortSignal.timeout(12_000),
    });
    const body: RouteResponse = await res.json();
    if (!body.ok) {
      return straightLine(from, destination, body.reason);
    }
    return {
      from,
      destination,
      geometry: body.geometry,
      distanceMeters: body.distanceMeters,
      durationSeconds: body.durationSeconds,
      estimated: false,
    };
  } catch {
    return straightLine(from, destination, "経路サービスに接続できませんでした。");
  }
}
