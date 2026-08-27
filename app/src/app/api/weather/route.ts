/** 気象データの中継（I-6）。
 *
 *   GET /api/weather?city=<5 桁の市町村コード>
 *
 * 実体は気象庁 防災情報 JSON（**認証キー不要**）。ブラウザから直接叩かずここを通すのは、
 * User-Agent を名乗るため・**サーバー側でキャッシュするため**・タイムアウトを効かせるため
 * （取得の実装は `lib/jma.ts`、形の正本は docs/design/interfaces.md I-6）。
 *
 * 使い道は 2 つ。
 *
 *   - **F-4（注意案内）**: ブラウザが `forecast.rainExpected` を見て注意を出すか決める
 *   - **F-3（浸水報告）**: 投稿フォームが「いまの雨量」を先に見せる
 *
 * 投稿に焼き込む雨量は**この経路を通さない**。`POST /api/reports` が
 * `lib/jma.ts` を直接呼ぶ（自分自身へ HTTP を投げると、コンテナ内の自ホスト判定に
 * 引きずられて壊れやすいため）。値の出どころは同じ。
 */
import type { NextRequest } from "next/server";

import { apiFail } from "@/lib/apiResponse";
import { DbUnavailableError } from "@/lib/db";
import { forecastRain, observeRainfall } from "@/lib/jma";
import { DEMO_CITY_CODE, findMunicipality } from "@/lib/municipalities";
import { parseCityCode } from "@/lib/reportInput";
import type { WeatherSuccess } from "@/lib/weather";

/** 気象は刻々と変わる。キャッシュは `lib/jma.ts` 側で時間を決めて持つ。 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cityCode = parseCityCode(request.nextUrl.searchParams.get("city"), DEMO_CITY_CODE);
  if (cityCode === null) {
    return apiFail("city には 5 桁の市町村コードを指定してください。", 400);
  }

  // 雨量は「その地点の最寄り観測所」の値なので、市町村の中心を基準にする。
  // **DB が落ちていても予報は返す**（F-4 の判断材料を落とさないため）。
  let center: { lat: number; lon: number } | null = null;
  try {
    const municipality = await findMunicipality(cityCode);
    if (!municipality) {
      return apiFail("指定された市町村にはまだ対応していません。", 400);
    }
    center = { lat: municipality.centerLat, lon: municipality.centerLon };
  } catch (error) {
    if (!(error instanceof DbUnavailableError)) throw error;
  }

  const [observation, forecast] = await Promise.all([
    center ? observeRainfall(center.lat, center.lon) : Promise.resolve(null),
    forecastRain(cityCode),
  ]);

  // どちらも取れなかったときだけ失敗にする（片方でもあれば画面で使える）
  if (!observation && !forecast) {
    return apiFail("気象情報を取得できませんでした。", 503);
  }

  return Response.json({ ok: true, observation, forecast } satisfies WeatherSuccess);
}
