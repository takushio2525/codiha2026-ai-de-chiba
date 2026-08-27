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

import { apiFail } from "@/lib/apiResponse";
import { resolveListQuery, withDb } from "@/lib/apiRoute";
import {
  EXPORT_CONTENT_TYPE,
  exportFileName,
  isExportFormat,
  nowJstIso,
  toCsv,
  toGeoJson,
} from "@/lib/reportExport";
import { describeRange, todayJst } from "@/lib/reportRange";
import { REPORTS_MAX_LIMIT } from "@/lib/reports";
import { listReports } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const format = params.get("format") ?? "csv";
  if (!isExportFormat(format)) {
    return apiFail("format には csv か geojson を指定してください。", 400);
  }

  return withDb(async () => {
    // 絞り込みの読み方は一覧（I-3）と共通。別々に書くと、画面で絞ったのと
    // 違う範囲が落ちてくることになる
    const resolved = await resolveListQuery(params);
    if (resolved instanceof Response) return resolved;

    const { municipality, filter } = resolved;
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
        "Content-Type": EXPORT_CONTENT_TYPE[format],
        // ファイル名に日本語を入れない（Content-Disposition は ASCII が無難）
        "Content-Disposition":
          `attachment; filename="${exportFileName(format, municipality.code, todayJst())}"`,
        "Cache-Control": "no-store",
      },
    });
  }, "投稿を書き出せませんでした。");
}
