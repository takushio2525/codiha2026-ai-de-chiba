/** 投稿 1 件の取得・更新・削除。
 *
 * `GET` は詳細パネル（S-3）が使う。一覧（I-3）の properties に**コメントと座標**を
 * 足した形で返す。**閲覧はログイン不要**。
 * `PATCH` は 2 つの操作を 1 本にまとめてある（docs/design/interfaces.md I-5）:
 *   - `status`（対応状況）… **担当市町村の行政ユーザーだけ**（F-7）
 *   - `title` / `body` / `details` … **投稿者本人だけ**
 *   どちらを含むかで要る権限が変わるので、**含まれている項目ごとに判定**する。
 * `DELETE` は投稿者本人だけ。写真の実体も一緒に消す。
 */
import type { NextRequest } from "next/server";

import { apiFail } from "@/lib/apiResponse";
import { withDb } from "@/lib/apiRoute";
import { getSessionView } from "@/lib/auth";
import { removePhotos } from "@/lib/photoStore";
import { parseId, parseReportPatch, patchTouchesContent } from "@/lib/reportInput";
import type { ReportDetail } from "@/lib/reports";
import {
  deleteReport,
  findReport,
  findReportOwnership,
  listComments,
  updateReport,
} from "@/lib/reportStore";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const id = parseId((await context.params).id);
  if (id === null) return apiFail("投稿が見つかりませんでした。", 404);

  // 閲覧はログイン不要。セッションは「削除ボタンを出すか」の判断にだけ使う
  const { user } = await getSessionView();

  return withDb(async () => {
    const found = await findReport(id);
    if (!found) return apiFail("投稿が見つかりませんでした。", 404);

    const comments = await listComments(id);
    return Response.json({
      ok: true,
      report: found.properties,
      coordinates: found.coordinates,
      comments,
      isAuthor: user !== null && user.id === found.authorId,
    } satisfies ReportDetail);
  });
}

export async function PATCH(request: NextRequest, context: Context) {
  const id = parseId((await context.params).id);
  if (id === null) return apiFail("投稿が見つかりませんでした。", 404);

  const { user } = await getSessionView();
  if (!user) return apiFail("変更するにはログインしてください。", 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiFail("更新の内容を読み取れませんでした。", 400);
  }

  return withDb(async () => {
    // 何を変えられるかはカテゴリ（details の選択肢）と持ち主で決まるので、先に引く
    const owner = await findReportOwnership(id);
    if (!owner) return apiFail("投稿が見つかりませんでした。", 404);

    const parsed = parseReportPatch(owner.category, raw);
    if (!parsed.ok) return apiFail(parsed.reason, parsed.status);
    const patch = parsed.value;

    // **対応状況を変えられるのは担当市町村の行政ユーザーだけ。**
    // 市川市の職員が船橋市の投稿を閉じられてはいけない（interfaces.md I-5）
    if (patch.status !== undefined) {
      const isCityOfficial = user.role === "gov" && user.govCityCode === owner.cityCode;
      if (!isCityOfficial) {
        return apiFail("この投稿の対応状況を変更する権限がありません。", 403);
      }
    }

    // **本文を書き換えられるのは投稿者本人だけ。** 行政ユーザーでも他人の本文は触れない
    // （行政の言い分はコメントとして残す。書き換えると誰が書いたか分からなくなる）
    if (patchTouchesContent(patch) && user.id !== owner.authorId) {
      return apiFail("この投稿を変更する権限がありません。", 403);
    }

    const updated = await updateReport(id, patch);
    if (!updated) return apiFail("投稿が見つかりませんでした。", 404);

    // 画面が持っている内容を差し替えられるよう、更新後の姿を返す
    const fresh = await findReport(id);
    if (!fresh) return apiFail("投稿が見つかりませんでした。", 404);
    return Response.json({ ok: true, report: fresh.properties });
  }, "投稿を更新できませんでした。");
}

export async function DELETE(_request: NextRequest, context: Context) {
  const id = parseId((await context.params).id);
  if (id === null) return apiFail("投稿が見つかりませんでした。", 404);

  const { user } = await getSessionView();
  if (!user) return apiFail("削除するにはログインしてください。", 401);

  return withDb(async () => {
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
  }, "投稿を削除できませんでした。");
}
