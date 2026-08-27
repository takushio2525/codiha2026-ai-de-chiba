/** 投稿を**オープンデータとして書き出す**（CSV / GeoJSON）。
 *
 * 経路: `GET /api/reports/export?format=csv|geojson`（docs/design/interfaces.md I-10）
 *
 * **絞り込みの条件は一覧（I-3）と同じ**ものをそのまま受け取る（`city` / `category` /
 * `status` / `bbox` / `from` / `to` / `limit`）。画面で絞ってから書き出すと、
 * 見えているものと同じ範囲が落ちてくる。
 *
 * **ログインは不要。** 出すのは誰でも画面で読める情報だけで、
 * ユーザー ID・メールアドレス・provider_uid は含めない（`lib/reportExport.ts`）。
 *
 * 「行政が公開したデータを住民が使う」だけでなく、**住民が寄せた情報も
 * オープンデータとして誰でも持ち出せる**ようにするための経路。
 */
import type { NextRequest } from "next/server";

import { apiFail, dbUnavailable } from "@/lib/apiResponse";
import { DbUnavailableError } from "@/lib/db";
import { DEMO_CITY_CODE, findMunicipality } from "@/lib/municipalities";
import {
  exportFileName,
  isExportFormat,
  toCsv,
  toGeoJson,
  type ExportFormat,
} from "@/lib/reportExport";
import { parseCityCode, parseListQuery } from "@/lib/reportInput";
import { describeRange, todayJst } from "@/lib/reportRange";
import { REPORTS_MAX_LIMIT } from "@/lib/reports";
import { listReports } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

/** 書き出した時刻（JST の ISO 8601）。`sv-SE` は `YYYY-MM-DD HH:MM:SS` で出る。 */
const JST_STAMP = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function nowJstIso(): string {
  return `${JST_STAMP.format(new Date()).replace(" ", "T")}+09:00`;
}

const CONTENT_TYPE: Record<ExportFormat, string> = {
  // Excel 対策の BOM を付けるので、文字コードは UTF-8 と明示する
  csv: "text/csv; charset=utf-8",
  // RFC 7946 が定めた MIME
  geojson: "application/geo+json; charset=utf-8",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const format = params.get("format") ?? "csv";
  if (!isExportFormat(format)) {
    return apiFail("format には csv か geojson を指定してください。", 400);
  }

  const cityCode = parseCityCode(params.get("city"), DEMO_CITY_CODE);
  if (cityCode === null) {
    return apiFail("city には 5 桁の市町村コードを指定してください。", 400);
  }

  try {
    const municipality = await findMunicipality(cityCode);
    if (!municipality) {
      return apiFail("指定された市町村にはまだ対応していません。", 400);
    }

    const parsed = parseListQuery(params, municipality);
    if (!parsed.ok) return apiFail(parsed.reason, parsed.status);

    const filter = parsed.value;
    // 書き出しは「持ち帰る」ための経路なので、既定を画面用の 500 ではなく上限にする。
    // 明示的に limit を渡したときはその値を尊重する
    if (params.get("limit") === null) filter.limit = REPORTS_MAX_LIMIT;

    const features = await listReports(filter);

    // **0 件でもエラーにしない**（見出しだけの CSV / 空の FeatureCollection を返す）。
    // 「その条件では 0 件だった」ことがファイルとして残るほうが扱いやすい
    const body =
      format === "csv"
        ? toCsv(features)
        : toGeoJson(features, {
            cityName: municipality.name,
            cityCode: municipality.code,
            rangeLabel: describeRange(filter.range),
            generatedAt: nowJstIso(),
          });

    return new Response(body, {
      headers: {
        "Content-Type": CONTENT_TYPE[format],
        // ファイル名に日本語を入れない（Content-Disposition は ASCII が無難）
        "Content-Disposition":
          `attachment; filename="${exportFileName(format, municipality.code, todayJst())}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      return dbUnavailable("投稿を書き出せませんでした。");
    }
    throw error;
  }
}
