/** 投稿へのコメント（docs/design/interfaces.md I-5）。
 *
 * **`isOfficial` はクライアントから受け取らない。** サーバーが投稿者のロールを見て決める。
 * ここを信用すると、一般ユーザーが行政を騙れる。
 * 公式扱いにするのは「行政ユーザー」かつ「担当市町村がその投稿の市町村と一致する」ときだけ
 * （市川市の職員が船橋市の投稿に公式回答を出せてはいけない）。
 */
import type { NextRequest } from "next/server";

import { apiFail, dbUnavailable } from "@/lib/apiResponse";
import { getSessionView } from "@/lib/auth";
import { DbUnavailableError } from "@/lib/db";
import { parseId } from "@/lib/reportInput";
import { COMMENT_MAX_LENGTH } from "@/lib/reports";
import { addComment, findReport } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const id = parseId((await context.params).id);
  if (id === null) return apiFail("投稿が見つかりませんでした。", 404);

  const { user } = await getSessionView();
  if (!user) return apiFail("コメントするにはログインしてください。", 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiFail("コメントの内容を読み取れませんでした。", 400);
  }

  const raw = (payload as { body?: unknown })?.body;
  const body = typeof raw === "string" ? raw.trim() : "";
  if (body.length === 0) return apiFail("コメントを入力してください。", 400);
  if (body.length > COMMENT_MAX_LENGTH) {
    return apiFail(`コメントは ${COMMENT_MAX_LENGTH} 文字以内にしてください。`, 400);
  }

  try {
    const found = await findReport(id);
    if (!found) return apiFail("投稿が見つかりませんでした。", 404);

    const isOfficial =
      user.role === "gov" && user.govCityCode === found.properties.cityCode;

    const comment = await addComment({ reportId: id, userId: user.id, body, isOfficial });
    return Response.json({ ok: true, comment }, { status: 201 });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      return dbUnavailable("コメントを保存できませんでした。");
    }
    throw error;
  }
}
