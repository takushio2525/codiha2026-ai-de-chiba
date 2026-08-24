/** 投稿写真の配信。URL の形は docs/design/interfaces.md I-3 の `photoUrls`
 *  （`/api/photos/<投稿 ID>/<1 始まりの通し番号>`）。
 *
 * 実体は uploads ボリュームにあり、DB にはファイル名だけが入っている。
 * **閲覧はログイン不要**（投稿そのものが誰でも読めるため）。
 */
import type { NextRequest } from "next/server";

import { apiFail, dbUnavailable } from "@/lib/apiResponse";
import { DbUnavailableError } from "@/lib/db";
import { readPhoto } from "@/lib/photoStore";
import { parseId } from "@/lib/reportInput";
import { findPhoto } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

/** 投稿 ID と通し番号の組に対して中身は変わらないので、しばらく持たせてよい。 */
const CACHE_CONTROL = "public, max-age=86400";

type Context = { params: Promise<{ reportId: string; index: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { reportId: rawReportId, index: rawIndex } = await context.params;
  const reportId = parseId(rawReportId);
  const index = parseId(rawIndex);
  if (reportId === null || index === null) {
    return apiFail("写真が見つかりませんでした。", 404);
  }

  try {
    const photo = await findPhoto(reportId, index);
    if (!photo) return apiFail("写真が見つかりませんでした。", 404);

    const bytes = await readPhoto(photo.fileName);
    if (!bytes) return apiFail("写真が見つかりませんでした。", 404);

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      return dbUnavailable("写真を読み込めませんでした。");
    }
    throw error;
  }
}
