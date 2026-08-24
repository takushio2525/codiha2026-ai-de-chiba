/** 投稿の一覧取得（I-3）と作成（I-4）。
 *
 * 仕様の正本は docs/design/interfaces.md。要点だけ再掲する:
 *
 *   - GET は**ログイン不要**。防災情報をログインの壁の向こうに置かない
 *   - GET は **GeoJSON の FeatureCollection をそのまま返す**（地図がソースとして読める）
 *   - POST は**ログイン必須**。`city_code` はクライアントから受け取らず、
 *     サーバーが座標を市町村マスタの bbox と突き合わせて決める（詐称を防ぐ）
 *   - **写真の保存に成功して DB の INSERT に失敗したら、保存した写真を消す**
 *   - 浸水（`flood`）の投稿は、**サーバーが投稿時点の雨量を取って `details` に焼き込む**。
 *     取れなくても投稿は成功させる（現場で投稿できないほうが害が大きい・I-4）
 */
import type { NextRequest } from "next/server";

import { apiFail, dbUnavailable } from "@/lib/apiResponse";
import { getSessionView } from "@/lib/auth";
import { DbUnavailableError } from "@/lib/db";
import { observeRainfall } from "@/lib/jma";
import { DEMO_CITY_CODE, findMunicipality } from "@/lib/municipalities";
import { removePhotos, savePhoto } from "@/lib/photoStore";
import { parseCityCode, parseListQuery, parseReportForm } from "@/lib/reportInput";
import { REQUEST_MAX_BYTES, type ReportCollection } from "@/lib/reports";
import { createReport, findReport, listReports, resolveCityCode } from "@/lib/reportStore";
import { toFloodDetails } from "@/lib/weather";

/** 投稿は増えるのでキャッシュしない。 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

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

    const features = await listReports(parsed.value);
    return Response.json({ type: "FeatureCollection", features } satisfies ReportCollection);
  } catch (error) {
    if (error instanceof DbUnavailableError) return dbUnavailable();
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const { user } = await getSessionView();
  if (!user) {
    return apiFail("投稿するにはログインしてください。", 401);
  }

  // 本文を読む前に大きさを見る。10 MB を超えるものを読み込まないため
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > REQUEST_MAX_BYTES) {
    return apiFail(tooLargeMessage(), 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiFail("投稿の内容を読み取れませんでした。", 400);
  }

  const parsed = await parseReportForm(form);
  if (!parsed.ok) return apiFail(parsed.reason, parsed.status);
  const input = parsed.value;

  // content-length が無い経路でも上限を効かせる
  const totalBytes = input.photos.reduce((sum, photo) => sum + photo.bytes.byteLength, 0);
  if (totalBytes > REQUEST_MAX_BYTES) {
    return apiFail(tooLargeMessage(), 413);
  }

  // 保存した写真の実体。DB の INSERT に失敗したらこれを消す（孤児ファイルを残さない）
  const savedFiles: string[] = [];
  let reportId: number;

  try {
    const cityCode = await resolveCityCode(input.lat, input.lon);
    if (cityCode === null) {
      return apiFail("この場所に対応している市町村がまだ登録されていません。", 400);
    }

    // 浸水報告（F-3）は投稿した瞬間の雨量を記録に残す。**クライアントは値を送れない**
    // （F-4 の注意案内の根拠になるので、投稿者が自由に入れられてはいけない・I-4）。
    // 最寄りのアメダスが遠い / 気象庁が落ちているときは null が返る。
    // **そのときも投稿は通す**。雨量が無いことを理由に浸水報告を弾かない。
    const details: Record<string, unknown> = { ...input.details };
    if (input.category === "flood") {
      const observed = await observeRainfall(input.lat, input.lon);
      if (observed) Object.assign(details, toFloodDetails(observed));
    }

    try {
      for (const photo of input.photos) {
        savedFiles.push(await savePhoto(photo.bytes, photo.mimeType));
      }
      reportId = await createReport({
        category: input.category,
        title: input.title,
        body: input.body,
        lat: input.lat,
        lon: input.lon,
        cityCode,
        userId: user.id,
        details,
        photos: input.photos.map((photo, index) => ({
          fileName: savedFiles[index],
          mimeType: photo.mimeType,
          byteSize: photo.bytes.byteLength,
        })),
      });
    } catch (error) {
      await removePhotos(savedFiles);
      throw error;
    }

    // ここから先で失敗しても写真は消さない（DB には投稿が残っているため）
    const created = await findReport(reportId);
    if (!created) {
      return apiFail("投稿を保存しましたが、読み直せませんでした。", 503);
    }
    return Response.json({ ok: true, report: created.properties }, { status: 201 });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      return dbUnavailable("投稿を保存できませんでした。しばらくしてからもう一度お試しください。");
    }
    console.error("[api/reports] 投稿の作成に失敗しました:", error);
    return apiFail("投稿を保存できませんでした。", 500);
  }
}

function tooLargeMessage(): string {
  return `写真を含めて ${Math.round(REQUEST_MAX_BYTES / 1024 / 1024)} MB 以内にしてください。`;
}
