/** 気象データ（雨量・雨予報）の共通定義。
 *
 * **ブラウザ側からも読み込む**ので、ここに Node.js の API を持ち込まないこと
 * （気象庁 JSON の取得とキャッシュはサーバー専用の `jma.ts`）。
 *
 * 形の正本は docs/design/interfaces.md の I-6。使い道は 2 つある。
 *
 *   - **F-3（浸水報告）**: 投稿の瞬間にサーバーが雨量を取り、`details` に焼き込む
 *   - **F-4（注意案内）**: 雨の予報が出ているとき、過去に浸水報告のある地点に注意を出す
 *
 * ## 表現の制約（守ること）
 *
 * F-4 は**予測ではない**。「過去にここで浸水報告があります」「雨の予報が出ています」という
 * **事実を 2 つ並べるだけ**で、「浸水するでしょう」に類する独自の予報は出さない。
 * 気象業務法は気象庁以外が予報を業として出すことを許可制にしているため、
 * この線を越えると法的にまずい（docs/design/requirements.md 3-1 の設計判断）。
 */

/** 最寄りのアメダスによる観測値。**その地点の実測値ではない**ので、距離を必ず添えて出す。 */
export type WeatherObservation = {
  /** 1 時間降水量（mm） */
  rainfallMm: number;
  /** 観測時刻。JST（+09:00）の ISO 8601 */
  observedAt: string;
  /** 観測所名（「船橋」など） */
  station: string;
  /** 対象の地点から観測所までの距離（km） */
  distanceKm: number;
};

/** 気象庁の府県天気予報から作る、雨が降る見込みかどうかの判定材料。 */
export type WeatherForecast = {
  /** 今後 24 時間に RAIN_POP_THRESHOLD 以上の降水確率があるか */
  rainExpected: boolean;
  within: "24h";
  /** 気象庁が出している天気の文（そのまま引用する。加工しない） */
  summary: string;
  /** 今後 24 時間の降水確率の最大値（%） */
  maxPop: number;
  /** 予報区の名前（千葉県なら「北西部」「北東部」「南部」のいずれか） */
  area: string;
  /** 発表時刻。JST（+09:00）の ISO 8601 */
  publishedAt: string;
};

export type WeatherSuccess = {
  ok: true;
  /** 最寄りのアメダスが遠すぎる / 取れなかったときは null（I-6） */
  observation: WeatherObservation | null;
  /** 予報を取れなかったときは null。**このとき F-4 の注意案内は出さない** */
  forecast: WeatherForecast | null;
};

export type WeatherFailure = { ok: false; reason: string };
export type WeatherResponse = WeatherSuccess | WeatherFailure;

/**
 * 「雨の予報が出ている」と見なす降水確率のしきい値（%）。
 *
 * 気象庁の府県天気予報は 6 時間ごとの降水確率を 10% 刻みで出す。
 * **30% を境にしたのは、傘を持つかどうかの一般的な目安がここだから**で、
 * これ以上上げると（50% 等）雨が降っても注意が出ない回が増え、
 * これ以下に下げると（10%）ほぼ毎日注意が出て、注意の意味が失われる。
 *
 * **この値は「注意案内を出すかどうか」の内部的な足切りにすぎない。**
 * 画面には気象庁の降水確率そのものを出し、CHIZUBA が確率を作り直すことはしない。
 */
export const RAIN_POP_THRESHOLD = 30;

/** 最寄りのアメダスがこれより遠ければ、その地点の雨量として使わない（I-6）。 */
export const AMEDAS_MAX_DISTANCE_KM = 20;

// ---- 浸水投稿の details（I-4）-------------------------------------------------

/** 浸水投稿に焼き込む観測値。**クライアントからは受け取らない**（I-4）。
 *  `amedasDistanceKm` を必ず持たせるのは、10 km 先の観測値を
 *  「この地点の雨量」と言い切らないため。 */
export type FloodObservation = {
  rainfallMm: number;
  observedAt: string;
  amedasStation: string;
  amedasDistanceKm: number;
};

/** 観測値を `details` に入れる形に直す。 */
export function toFloodDetails(observation: WeatherObservation): FloodObservation {
  return {
    rainfallMm: observation.rainfallMm,
    observedAt: observation.observedAt,
    amedasStation: observation.station,
    amedasDistanceKm: observation.distanceKm,
  };
}

/** `details` から観測値を読む。**揃っていなければ null**（取得できなかった投稿）。
 *  DB の jsonb をそのまま受けるので、型は信用せず 1 つずつ確かめる。 */
export function readFloodObservation(details: Record<string, unknown>): FloodObservation | null {
  const rainfallMm = details?.rainfallMm;
  const observedAt = details?.observedAt;
  const amedasStation = details?.amedasStation;
  const amedasDistanceKm = details?.amedasDistanceKm;
  if (typeof rainfallMm !== "number" || !Number.isFinite(rainfallMm)) return null;
  if (typeof observedAt !== "string" || observedAt === "") return null;
  if (typeof amedasStation !== "string" || amedasStation === "") return null;
  return {
    rainfallMm,
    observedAt,
    amedasStation,
    amedasDistanceKm:
      typeof amedasDistanceKm === "number" && Number.isFinite(amedasDistanceKm)
        ? amedasDistanceKm
        : Number.NaN,
  };
}

/** **デモ投稿に入れてあるダミーの雨量**を読む。無ければ null。
 *
 * デモ投稿には観測所も観測時刻も持たせていない（`readFloodObservation` は null を返す）。
 * **過去の実測値は気象庁 JSON からは取れない**（アメダス実況は直近のぶんしか配信されない）
 * ので、値をでっち上げて「観測値」として出すことはせず、
 * デモ値だと分かる形でだけ表示する（`components/FloodRainfall.tsx`）。
 */
export function readDemoRainfall(details: Record<string, unknown>): number | null {
  const value = details?.rainfallMm;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** 「12.5 mm/h」。0.0 も「0.0 mm/h」と出す（欠測と区別が付くように）。 */
export function formatRainfall(mm: number): string {
  return `${mm.toFixed(1)} mm/h`;
}

/** 「船橋アメダス（約 10.2 km）」。距離が分からない古い投稿は名前だけ出す。 */
export function formatStation(station: string, distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) return `${station}アメダス`;
  return `${station}アメダス（約 ${distanceKm.toFixed(1)} km）`;
}

/** 気象庁の天気文は全角スペースで区切られている。読みやすさのため半角に寄せるだけで、
 *  語そのものは変えない（「加工して作成」に当たらない範囲に留める）。 */
export function tidyForecastSummary(summary: string): string {
  return summary.replace(/　+/g, " ").trim();
}

// ---- F-4: 注意案内 ------------------------------------------------------------

/** 注意案内の材料。**これは予測ではなく、事実 2 つの組み合わせ**。
 *
 *   ① 過去にこの市町村で浸水報告が `reportCount` 件あった（CHIZUBA に溜まった投稿）
 *   ② 気象庁の予報では今後 24 時間に雨の見込みがある（`forecast`）
 *
 * 画面はこの 2 つを並べて出すだけで、「浸水する」とは言わない。
 */
export type FloodAlert = {
  forecast: WeatherForecast;
  /** 過去の浸水報告の件数 */
  reportCount: number;
  /** いちばん新しい浸水報告の日時（JST の ISO 8601）。無ければ null */
  latestAt: string | null;
};

/**
 * 注意案内を出すかどうかを決める。**出さない条件は 3 つ**。
 *
 *   - 予報が取れなかった（`forecast` が null）
 *     → 根拠のない警告になるので出さない（I-6 の異常時の約束）
 *   - 雨の予報が出ていない（`rainExpected` が false）
 *   - 過去の浸水報告が 1 件も無い（注意すべき地点が無い）
 */
export function buildFloodAlert(
  forecast: WeatherForecast | null,
  floodReportDates: string[],
): FloodAlert | null {
  if (!forecast?.rainExpected) return null;
  if (floodReportDates.length === 0) return null;
  const latestAt = floodReportDates.reduce<string | null>(
    (latest, at) => (latest === null || at > latest ? at : latest),
    null,
  );
  return { forecast, reportCount: floodReportDates.length, latestAt };
}

// ---- ブラウザ側 ---------------------------------------------------------------

/** 気象情報を取ってくる（I-6）。**失敗しても画面は止めない**ので、
 *  例外は投げずに `ok: false` を返す。 */
export async function fetchWeather(cityCode: string): Promise<WeatherResponse> {
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(cityCode)}`, {
      // サーバー側でも打ち切るが、そこへ届かない場合に備えてブラウザ側にも上限を置く
      signal: AbortSignal.timeout(12_000),
    });
    return (await res.json()) as WeatherResponse;
  } catch {
    return { ok: false, reason: "気象情報を取得できませんでした。" };
  }
}
