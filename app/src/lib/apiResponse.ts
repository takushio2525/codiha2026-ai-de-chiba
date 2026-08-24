/** API の失敗レスポンス。形は docs/design/interfaces.md の「共通の約束 2」。
 *
 *   { ok: false, reason: "画面にそのまま出せる日本語" }
 *
 * HTTP ステータスも合わせる（400 入力不正 / 401 未ログイン / 403 権限なし /
 * 404 無い / 413 大きすぎ / 503 DB に繋がらない）。
 */
import type { ApiFailure } from "./reports";

export function apiFail(reason: string, status: number): Response {
  return Response.json({ ok: false, reason } satisfies ApiFailure, { status });
}

/** DB に繋がらないときの決まり文句。**地図と静的レイヤーは出したまま**にしたいので
 *  500 ではなく 503 を返し、画面側が「投稿だけ空」に落とせるようにする（I-3・I-7）。 */
export function dbUnavailable(reason = "投稿を読み込めませんでした。"): Response {
  return apiFail(reason, 503);
}
