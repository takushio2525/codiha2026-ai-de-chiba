/** 投稿 API をブラウザから呼ぶための薄いラッパ。
 *
 * 失敗したときは**画面にそのまま出せる日本語**を返す約束なので、
 * サーバーの `reason` をそのまま通し、通信そのものが失敗したときだけここで文を作る
 * （docs/design/interfaces.md の「共通の約束」）。
 */
import type { DateRange } from "./reportRange";
import {
  EMPTY_REPORT_COLLECTION,
  type ReportCategory,
  type ReportCollection,
  type ReportComment,
  type ReportDetail,
  type ReportProperties,
} from "./reports";

export type ApiResult<T> = { ok: true; value: T } | { ok: false; reason: string };

const NETWORK_ERROR = "サーバーに接続できませんでした。通信状況を確認してください。";

/** 失敗レスポンスから reason を取り出す。JSON でなければ既定の文言にする。 */
async function failure(response: Response, fallback: string): Promise<{ ok: false; reason: string }> {
  try {
    const body = (await response.json()) as { reason?: unknown };
    if (typeof body?.reason === "string" && body.reason.length > 0) {
      return { ok: false, reason: body.reason };
    }
  } catch {
    // JSON で返ってこないときは既定の文言を使う
  }
  return { ok: false, reason: fallback };
}

/** 投稿の一覧（GeoJSON）。**DB が落ちていても地図は出す**ので、失敗したら空で返す。 */
export async function fetchReports(params: {
  city: string;
  categories?: ReportCategory[];
  /** 投稿日の範囲（JST の暦日）。未指定なら全期間 */
  range?: DateRange;
}): Promise<ApiResult<ReportCollection>> {
  const query = new URLSearchParams({ city: params.city });
  if (params.categories && params.categories.length > 0) {
    query.set("category", params.categories.join(","));
  }
  if (params.range?.from) query.set("from", params.range.from);
  if (params.range?.to) query.set("to", params.range.to);
  try {
    const response = await fetch(`/api/reports?${query.toString()}`, { cache: "no-store" });
    if (!response.ok) return failure(response, "投稿を読み込めませんでした。");
    const collection = (await response.json()) as ReportCollection;
    return { ok: true, value: collection ?? EMPTY_REPORT_COLLECTION };
  } catch {
    return { ok: false, reason: NETWORK_ERROR };
  }
}

/** 投稿 1 件の詳細（コメント付き）。 */
export async function fetchReportDetail(id: number): Promise<ApiResult<ReportDetail>> {
  try {
    const response = await fetch(`/api/reports/${id}`, { cache: "no-store" });
    if (!response.ok) return failure(response, "投稿を読み込めませんでした。");
    return { ok: true, value: (await response.json()) as ReportDetail };
  } catch {
    return { ok: false, reason: NETWORK_ERROR };
  }
}

/** 投稿の作成。写真を含むので multipart（FormData）で送る。 */
export async function submitReport(form: FormData): Promise<ApiResult<ReportProperties>> {
  try {
    const response = await fetch("/api/reports", { method: "POST", body: form });
    if (!response.ok) return failure(response, "投稿を保存できませんでした。");
    const body = (await response.json()) as { report: ReportProperties };
    return { ok: true, value: body.report };
  } catch {
    return { ok: false, reason: NETWORK_ERROR };
  }
}

/** コメントの追加。 */
export async function submitComment(
  reportId: number,
  body: string,
): Promise<ApiResult<ReportComment>> {
  try {
    const response = await fetch(`/api/reports/${reportId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!response.ok) return failure(response, "コメントを保存できませんでした。");
    const payload = (await response.json()) as { comment: ReportComment };
    return { ok: true, value: payload.comment };
  } catch {
    return { ok: false, reason: NETWORK_ERROR };
  }
}

/** 投稿の更新（interfaces.md I-5 の PATCH）。
 *
 *   - `status` … 担当市町村の行政ユーザーだけ（F-7）
 *   - `title` / `body` / `details` … 投稿者本人だけ
 *
 * どちらも同じ経路なので、**権限が無ければサーバーが 403 を返す**。
 * その reason をそのまま画面に出す。 */
export async function patchReport(
  reportId: number,
  patch: {
    status?: string;
    title?: string;
    body?: string;
    details?: Record<string, string>;
  },
): Promise<ApiResult<ReportProperties>> {
  try {
    const response = await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) return failure(response, "投稿を更新できませんでした。");
    const payload = (await response.json()) as { report: ReportProperties };
    return { ok: true, value: payload.report };
  } catch {
    return { ok: false, reason: NETWORK_ERROR };
  }
}

/** 投稿の削除（投稿者本人のみ）。 */
export async function deleteReport(reportId: number): Promise<ApiResult<null>> {
  try {
    const response = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
    if (!response.ok) return failure(response, "投稿を削除できませんでした。");
    return { ok: true, value: null };
  } catch {
    return { ok: false, reason: NETWORK_ERROR };
  }
}
