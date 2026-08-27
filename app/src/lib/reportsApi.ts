/** 投稿 API をブラウザから呼ぶための薄いラッパ。
 *
 * 失敗したときは**画面にそのまま出せる日本語**を返す約束なので、
 * サーバーの `reason` をそのまま通し、通信そのものが失敗したときだけここで文を作る
 * （docs/design/interfaces.md の「共通の約束」）。
 *
 * **どの経路も例外を投げない。** 呼び出し側（画面）は `ok` を見るだけでよく、
 * try/catch を書かなくて済むようにしてある。その決まりを 1 か所で守るのが
 * 下の `request()` で、**各関数は「どこを叩くか」と「成功したら何を取り出すか」だけを書く**。
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

/**
 * API を 1 本叩いて `ApiResult` に均す。**この経路だけが fetch を呼ぶ。**
 *
 *   - HTTP が失敗（`ok` が false）… サーバーの `reason` を優先し、無ければ `fallback`
 *   - 通信そのものが失敗・本文が読めない … `NETWORK_ERROR`
 *
 * `read` は**成功したときだけ**呼ぶ。ここで本文の読み取りごと try に入れているので、
 * 200 なのに JSON が壊れていた場合も画面には日本語の理由が返る。
 */
async function request<T>(
  path: string,
  options: {
    init?: RequestInit;
    /** サーバーが理由を返さなかったときの文言 */
    fallback: string;
    /** 成功したときに本文から値を取り出す。本文を読まない経路（DELETE）もある */
    read: (response: Response) => Promise<T>;
  },
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, options.init);
    if (!response.ok) return failure(response, options.fallback);
    return { ok: true, value: await options.read(response) };
  } catch {
    return { ok: false, reason: NETWORK_ERROR };
  }
}

/** JSON の本体を送るときの共通部分（POST / PATCH）。 */
function jsonBody(method: "POST" | "PATCH", payload: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

/** 投稿の一覧（GeoJSON）。**DB が落ちていても地図は出す**ので、失敗したら空で返す。 */
export async function fetchReports(params: {
  city: string;
  categories?: ReportCategory[];
  /** 投稿日の範囲（JST の暦日）。未指定なら全期間 */
  range?: DateRange;
  /** キーワード。タイトルと本文の部分一致 */
  query?: string;
}): Promise<ApiResult<ReportCollection>> {
  const query = new URLSearchParams({ city: params.city });
  if (params.categories && params.categories.length > 0) {
    query.set("category", params.categories.join(","));
  }
  if (params.range?.from) query.set("from", params.range.from);
  if (params.range?.to) query.set("to", params.range.to);
  if (params.query && params.query.length > 0) query.set("q", params.query);
  return request(`/api/reports?${query.toString()}`, {
    init: { cache: "no-store" },
    fallback: "投稿を読み込めませんでした。",
    read: async (response) => ((await response.json()) as ReportCollection) ?? EMPTY_REPORT_COLLECTION,
  });
}

/** 投稿 1 件の詳細（コメント付き）。 */
export async function fetchReportDetail(id: number): Promise<ApiResult<ReportDetail>> {
  return request(`/api/reports/${id}`, {
    init: { cache: "no-store" },
    fallback: "投稿を読み込めませんでした。",
    read: async (response) => (await response.json()) as ReportDetail,
  });
}

/** 投稿の作成。写真を含むので multipart（FormData）で送る。 */
export async function submitReport(form: FormData): Promise<ApiResult<ReportProperties>> {
  return request("/api/reports", {
    init: { method: "POST", body: form },
    fallback: "投稿を保存できませんでした。",
    read: async (response) => ((await response.json()) as { report: ReportProperties }).report,
  });
}

/** コメントの追加。 */
export async function submitComment(
  reportId: number,
  body: string,
): Promise<ApiResult<ReportComment>> {
  return request(`/api/reports/${reportId}/comments`, {
    init: jsonBody("POST", { body }),
    fallback: "コメントを保存できませんでした。",
    read: async (response) => ((await response.json()) as { comment: ReportComment }).comment,
  });
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
  return request(`/api/reports/${reportId}`, {
    init: jsonBody("PATCH", patch),
    fallback: "投稿を更新できませんでした。",
    read: async (response) => ((await response.json()) as { report: ReportProperties }).report,
  });
}

/** 投稿の削除（投稿者本人のみ）。**本文は読まない**（成功したことだけが要る）。 */
export async function deleteReport(reportId: number): Promise<ApiResult<null>> {
  return request(`/api/reports/${reportId}`, {
    init: { method: "DELETE" },
    fallback: "投稿を削除できませんでした。",
    read: async () => null,
  });
}
