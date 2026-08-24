/** 投稿 1 件の取得と削除。
 *
 * `GET` は詳細パネル（S-3）が使う。一覧（I-3）の properties に**コメントと座標**を
 * 足した形で返す。**閲覧はログイン不要**。
 * `DELETE` は投稿者本人だけ（docs/design/interfaces.md I-5）。写真の実体も一緒に消す。
 */
import type { NextRequest } from "next/server";

import { apiFail, dbUnavailable } from "@/lib/apiResponse";
import { getSessionView } from "@/lib/auth";
import { DbUnavailableError } from "@/lib/db";
import { removePhotos } from "@/lib/photoStore";
import { parseId } from "@/lib/reportInput";
import type { ReportDetail } from "@/lib/reports";
import { deleteReport, findReport, listComments } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const id = parseId((await context.params).id);
  if (id === null) return apiFail("投稿が見つかりませんでした。", 404);

  try {
    const found = await findReport(id);
    if (!found) return apiFail("投稿が見つかりませんでした。", 404);

    const comments = await listComments(id);
    return Response.json({
      ok: true,
      report: found.properties,
      coordinates: found.coordinates,
      comments,
    } satisfies ReportDetail);
  } catch (error) {
    if (error instanceof DbUnavailableError) return dbUnavailable();
    throw error;
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const id = parseId((await context.params).id);
  if (id === null) return apiFail("投稿が見つかりませんでした。", 404);

  const { user } = await getSessionView();
  if (!user) return apiFail("削除するにはログインしてください。", 401);

  try {
    const result = await deleteReport(id, user.id);
    if (result.status === "not_found") {
      return apiFail("投稿が見つかりませんでした。", 404);
    }
    if (result.status === "forbidden") {
      return apiFail("この投稿を変更する権限がありません。", 403);
    }
    // DB の行が消えてから実体を消す。消し損ねてもデータの整合性は壊れない
    await removePhotos(result.fileNames);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      return dbUnavailable("投稿を削除できませんでした。");
    }
    throw error;
  }
}
