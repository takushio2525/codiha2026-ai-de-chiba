/** 気象庁 防災情報 JSON の取得。**サーバー側からしか読み込まないこと**。
 *
 * ブラウザから直接叩かずここでまとめる理由は、OSRM の中継（api/routing）と同じ:
 *
 *   - User-Agent を確実に名乗る
 *   - **サーバー側でキャッシュする**（投稿数・閲覧数に比例して気象庁へ投げない）
 *   - タイムアウトを 1 箇所で効かせる（I-6 の 5 秒）
 *
 * 使う JSON は**すべて認証キー不要**。実測した諸元は次のとおり。
 *
 * | 用途 | URL | 大きさ |
 * |---|---|---|
 * | 観測所の一覧 | `amedas/const/amedastable.json` | 約 183 KB・1,286 地点 |
 * | 最新の観測時刻 | `amedas/data/latest_time.txt` | 25 B |
 * | 全国の実況（10 分値） | `amedas/data/map/<時刻>.json` | 約 245 KB |
 * | 市区町村と予報区の対応 | `common/const/area.json` | 約 256 KB・class20s に全国の市区町村 |
 * | 府県天気予報 | `forecast/data/forecast/<府県>.json` | 約 4 KB |
 *
 * ## 注意した落とし穴（実測で分かったもの）
 *
 * - `amedastable.json` の `lat` / `lon` は **`[度, 分]` の配列**。小数の度ではない
 * - 観測値は **`[数値, 品質フラグ]` の 2 要素配列**。フラグが 0 でないものは使わない
 * - **市川市にはアメダスが無く、最寄りは船橋で約 10 km**。
 *   だから観測所名と距離を必ず持ち回る（`WeatherObservation.distanceKm`）
 * - 予報区は**市町村単位では取れない**。千葉県は「北西部 / 北東部 / 南部」の 3 区分が最小
 *
 * ## 出典
 *
 * 気象庁ホームページ（<https://www.jma.go.jp/bosai/>）。
 * 公共データ利用規約（第 1.0 版）に準拠。文言は `lib/credits.ts` が正本。
 */
import { AMEDAS_MAX_DISTANCE_KM, RAIN_POP_THRESHOLD, type WeatherForecast, type WeatherObservation }
  from "./weather";

const BOSAI = "https://www.jma.go.jp/bosai";
const USER_AGENT = "codiha2026-chizuba/0.1 (CODIHA 2026 hackathon prototype)";
/** I-6 の約束。ここを過ぎたら諦めて、投稿は雨量なしで通す。 */
const UPSTREAM_TIMEOUT_MS = 5_000;

/** キャッシュの寿命（I-6）。実況は 10 分ごとに更新されるので、それに合わせる。 */
const TTL = {
  /** 観測所の一覧・市区町村と予報区の対応。どちらもめったに変わらない */
  constant: 24 * 60 * 60 * 1000,
  /** アメダス実況 */
  observation: 10 * 60 * 1000,
  /** 府県天気予報 */
  forecast: 30 * 60 * 1000,
} as const;

// ---- 取得とキャッシュ ---------------------------------------------------------

type CacheEntry = { expiresAt: number; value: Promise<unknown> };
const cache = new Map<string, CacheEntry>();

/** 同じ URL への同時アクセスを 1 本にまとめる。**失敗はキャッシュしない**
 *  （気象庁が一時的に落ちたあと、TTL のあいだ復旧を見に行けなくなるのを防ぐ）。 */
function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as Promise<T>;

  const value = load();
  cache.set(key, { expiresAt: now + ttlMs, value });
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  return value;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} が HTTP ${res.status} を返しました`);
  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} が HTTP ${res.status} を返しました`);
  return (await res.json()) as T;
}

// ---- アメダス（雨量の実況）----------------------------------------------------

/** `amedastable.json` の 1 地点。`lat` / `lon` は `[度, 分]`。 */
type AmedasTableRow = { kjName?: string; lat?: [number, number]; lon?: [number, number] };
type AmedasStation = { code: string; name: string; lat: number; lon: number };

/** `[度, 分]` を小数の度にする。**ここを忘れると全部の距離が壊れる**。 */
function toDegrees(dm: [number, number] | undefined): number | null {
  if (!Array.isArray(dm) || dm.length !== 2) return null;
  const [deg, min] = dm;
  if (!Number.isFinite(deg) || !Number.isFinite(min)) return null;
  return deg + min / 60;
}

function loadStations(): Promise<AmedasStation[]> {
  return cached("amedas/table", TTL.constant, async () => {
    const table = await fetchJson<Record<string, AmedasTableRow>>(
      `${BOSAI}/amedas/const/amedastable.json`,
    );
    const stations: AmedasStation[] = [];
    for (const [code, row] of Object.entries(table)) {
      const lat = toDegrees(row.lat);
      const lon = toDegrees(row.lon);
      if (lat === null || lon === null || !row.kjName) continue;
      stations.push({ code, name: row.kjName, lat, lon });
    }
    return stations;
  });
}

/** 観測値は `[数値, 品質フラグ]`。フラグ 0 以外（欠測・資料不足）は使わない。 */
type AmedasValue = [number, number];
type AmedasReading = { precipitation1h?: AmedasValue };

/** 最新の実況。`latest_time.txt` を先に見て、その時刻のマップを取る。 */
function loadLatestObservation(): Promise<{ observedAt: string; readings: Record<string, AmedasReading> }> {
  return cached("amedas/latest", TTL.observation, async () => {
    // 例: "2026-08-24T18:30:00+09:00"
    const observedAt = (await fetchText(`${BOSAI}/amedas/data/latest_time.txt`)).trim();
    // URL に使うのは区切りを落とした "20260824183000"
    const stamp = observedAt.slice(0, 19).replace(/[-:T]/g, "");
    if (!/^[0-9]{14}$/.test(stamp)) throw new Error(`最新の観測時刻を読めませんでした: ${observedAt}`);
    const readings = await fetchJson<Record<string, AmedasReading>>(
      `${BOSAI}/amedas/data/map/${stamp}.json`,
    );
    return { observedAt, readings };
  });
}

const EARTH_RADIUS_KM = 6_371;

/** 2 点間の大円距離（km）。`lib/geo.ts` の haversine と同じ式だが、
 *  あちらはブラウザ側の `[経度, 緯度]` 前提なので、サーバー側はここで持つ。 */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * 指定した地点の 1 時間降水量を、**最寄りのアメダスの値**として返す。
 *
 * - 距離の近い順に見て、**1 時間降水量が正常な値で入っている最初の観測所**を採る
 *   （風だけを測る観測所や、欠測中の観測所を飛ばすため）
 * - {@link AMEDAS_MAX_DISTANCE_KM} より遠ければ `null`。
 *   その地点の雨量として使うには遠すぎる（I-6）
 * - 取得に失敗しても**例外を投げない**。投稿を雨量なしで通すため
 */
export async function observeRainfall(
  lat: number,
  lon: number,
): Promise<WeatherObservation | null> {
  try {
    const [stations, latest] = await Promise.all([loadStations(), loadLatestObservation()]);
    const near = stations
      .map((station) => ({ station, km: distanceKm(lat, lon, station.lat, station.lon) }))
      .filter((entry) => entry.km <= AMEDAS_MAX_DISTANCE_KM)
      .sort((a, b) => a.km - b.km);

    for (const { station, km } of near) {
      const value = latest.readings[station.code]?.precipitation1h;
      if (!Array.isArray(value) || value.length < 2) continue;
      const [mm, flag] = value;
      if (!Number.isFinite(mm) || flag !== 0) continue;
      return {
        rainfallMm: mm,
        observedAt: latest.observedAt,
        station: station.name,
        distanceKm: Math.round(km * 10) / 10,
      };
    }
    return null;
  } catch (error) {
    console.warn("[jma] アメダスの実況を取得できませんでした:", error);
    return null;
  }
}

// ---- 府県天気予報（雨の予報）--------------------------------------------------

type AreaNode = { name?: string; parent?: string };
type AreaIndex = {
  class20s: Record<string, AreaNode>;
  class15s: Record<string, AreaNode>;
  class10s: Record<string, AreaNode>;
};

/** 市区町村コード → 予報区の対応表。**全国分が入っているので千葉県全域に効く**。 */
function loadAreaIndex(): Promise<AreaIndex> {
  return cached("common/area", TTL.constant, () =>
    fetchJson<AreaIndex>(`${BOSAI}/common/const/area.json`),
  );
}

/** 5 桁の市町村コード（JIS X 0402）から、予報区と府県の発表元を引く。
 *  `area.json` の class20s は 7 桁（5 桁 + "00"）なので、そこだけ合わせる。 */
async function resolveForecastArea(
  cityCode: string,
): Promise<{ officeCode: string; areaCode: string; areaName: string } | null> {
  const index = await loadAreaIndex();
  const class20 = index.class20s?.[`${cityCode}00`];
  const class15 = class20?.parent ? index.class15s?.[class20.parent] : undefined;
  const areaCode = class15?.parent;
  const class10 = areaCode ? index.class10s?.[areaCode] : undefined;
  const officeCode = class10?.parent;
  if (!areaCode || !officeCode) return null;
  return { officeCode, areaCode, areaName: class10?.name ?? "" };
}

type ForecastArea = {
  area: { code: string };
  pops?: string[];
  weathers?: string[];
};
type ForecastTimeSeries = { timeDefines: string[]; areas: ForecastArea[] };
type ForecastDocument = { reportDatetime: string; timeSeries: ForecastTimeSeries[] };

function loadForecast(officeCode: string): Promise<ForecastDocument[]> {
  return cached(`forecast/${officeCode}`, TTL.forecast, () =>
    fetchJson<ForecastDocument[]>(`${BOSAI}/forecast/data/forecast/${officeCode}.json`),
  );
}

/** 今後 24 時間の枠だけを残す。予報は翌々日ぶんまで入っているので、そのままだと拾いすぎる。 */
const FORECAST_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * 市町村コードから、その地域の雨の予報を返す。取れなければ `null`。
 *
 * **予報区は市町村単位では取れない**（千葉県は北西部・北東部・南部の 3 区分）。
 * 画面には予報区名を必ず出し、市町村ごとの予報だと誤解させない。
 */
export async function forecastRain(cityCode: string): Promise<WeatherForecast | null> {
  try {
    const resolved = await resolveForecastArea(cityCode);
    if (!resolved) return null;

    const documents = await loadForecast(resolved.officeCode);
    const document = documents?.[0];
    if (!document?.timeSeries?.length) return null;

    // 降水確率を持つ時系列（実測では timeSeries[1]）。番号を決め打ちにしない
    const popSeries = document.timeSeries.find((series) =>
      series.areas?.some((area) => Array.isArray(area.pops)),
    );
    const popArea = popSeries?.areas?.find((area) => area.area?.code === resolved.areaCode);
    if (!popSeries || !popArea?.pops) return null;

    const publishedAt = document.reportDatetime;
    const until = Date.parse(publishedAt) + FORECAST_WINDOW_MS;
    let maxPop = 0;
    popArea.pops.forEach((raw, index) => {
      const at = Date.parse(popSeries.timeDefines?.[index] ?? "");
      if (Number.isFinite(at) && at > until) return;
      const pop = Number(raw);
      if (Number.isFinite(pop) && pop > maxPop) maxPop = pop;
    });

    // 天気の文（実測では timeSeries[0]）。**そのまま引用する**
    const weatherSeries = document.timeSeries.find((series) =>
      series.areas?.some((area) => Array.isArray(area.weathers)),
    );
    const weatherArea = weatherSeries?.areas?.find((area) => area.area?.code === resolved.areaCode);

    return {
      rainExpected: maxPop >= RAIN_POP_THRESHOLD,
      within: "24h",
      summary: weatherArea?.weathers?.[0] ?? "",
      maxPop,
      area: resolved.areaName,
      publishedAt,
    };
  } catch (error) {
    console.warn("[jma] 府県天気予報を取得できませんでした:", error);
    return null;
  }
}
