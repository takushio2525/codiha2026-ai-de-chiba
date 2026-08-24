/** 徒歩経路の取得。ブラウザからは必ずこの API を経由させる。
 *
 * 経路計算には FOSSGIS e.V. が公開している OSRM（認証キー不要）を使う。
 * 利用規約 <https://routing.openstreetmap.de/about.html> が
 *
 *   - 出典表示と「地図の修正」リンクを出すこと
 *   - 正しい User-Agent を名乗ること
 *   - 1 秒あたり 1 リクエストまで。大量アクセスをしないこと
 *
 * を求めているため、ブラウザから直接叩かずサーバ側でまとめる。
 * こうすると User-Agent を確実に付けられ、送信間隔もここ 1 箇所で守れる。
 * タイムアウトも入れてあるので、OSRM が落ちていても画面が固まることはない。
 */
import type { LineString } from "geojson";
import type { NextRequest } from "next/server";

/** 経路は毎回変わるのでキャッシュしない。 */
export const dynamic = "force-dynamic";

const OSRM_ENDPOINT = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const USER_AGENT = "codiha2026-ichikawa-opendata-map/0.1 (CODIHA 2026 hackathon prototype)";
const UPSTREAM_TIMEOUT_MS = 8_000;
/** 利用規約の「1 秒あたり 1 リクエスト」。少し余裕を持たせる。 */
const MIN_INTERVAL_MS = 1_100;

export type RouteSuccess = {
  ok: true;
  distanceMeters: number;
  durationSeconds: number;
  geometry: LineString;
};
export type RouteFailure = { ok: false; reason: string };
export type RouteResponse = RouteSuccess | RouteFailure;

// 送信間隔を守るための順番待ち。リクエストを 1 本ずつ、間隔を空けて通す。
let queue: Promise<void> = Promise.resolve();
let lastSentAt = 0;

function waitForSlot(): Promise<void> {
  const slot = queue.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastSentAt);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastSentAt = Date.now();
  });
  queue = slot.catch(() => undefined);
  return slot;
}

/** "139.93,35.72" を [経度, 緯度] にする。範囲外・数値でないものは弾く。 */
function parsePoint(raw: string | null): [number, number] | null {
  if (!raw) return null;
  const parts = raw.split(",");
  if (parts.length !== 2) return null;
  const [lng, lat] = parts.map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [lng, lat];
}

function fail(reason: string, status: number) {
  return Response.json({ ok: false, reason } satisfies RouteFailure, { status });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = parsePoint(params.get("from"));
  const to = parsePoint(params.get("to"));
  if (!from || !to) {
    return fail("出発地点と目的地の座標が正しくありません。", 400);
  }

  const url =
    `${OSRM_ENDPOINT}/${from[0]},${from[1]};${to[0]},${to[1]}` +
    "?overview=full&geometries=geojson&steps=false&alternatives=false";

  try {
    await waitForSlot();
    const upstream = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!upstream.ok) {
      return fail(`経路サービスが応答しませんでした（HTTP ${upstream.status}）。`, 502);
    }

    const body = await upstream.json();
    if (body?.code !== "Ok" || !body?.routes?.length) {
      return fail("この 2 地点をつなぐ徒歩経路が見つかりませんでした。", 502);
    }

    const route = body.routes[0];
    return Response.json({
      ok: true,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry as LineString,
    } satisfies RouteSuccess);
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return fail(
      timedOut
        ? "経路サービスの応答が遅いため取得を打ち切りました。"
        : "経路サービスに接続できませんでした。",
      timedOut ? 504 : 502,
    );
  }
}
