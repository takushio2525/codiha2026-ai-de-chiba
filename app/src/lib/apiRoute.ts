/** API ルートが繰り返す前処理。**サーバー側からしか読み込まないこと**（db.ts を経由する）。
 *
 * 応答の «形» は `apiResponse.ts`（`apiFail` / `dbUnavailable`）が持つ。
 * こちらは「どのルートでも同じように書いていた手順」を 1 か所に集めたもの。
 *
 * 失敗したときは**画面にそのまま出せる日本語**を載せた `Response` を返す。
 * 呼び出し側は `instanceof Response` で受けてそのまま返す。
 */
import { apiFail, dbUnavailable } from "./apiResponse";
import { DbUnavailableError } from "./db";
import { DEMO_CITY_CODE, findMunicipality, type Municipality } from "./municipalities";
import { parseCityCode, parseListQuery } from "./reportInput";
import type { ReportFilter } from "./reportStore";

/**
 * DB に繋がらないときだけ 503 に落とす。
 *
 * **地図と静的レイヤーは出したままにする**という約束（interfaces.md I-3・I-7）を
 * 5 つのルートがそれぞれ書いていたので、ここに集めた。
 * `DbUnavailableError` 以外の例外は**そのまま投げ直す**（SQL の書き間違いなどを
 * 503 で覆い隠すと、開発中に気づけなくなる）。
 *
 * @param reason 画面に出す文言。省略すると `dbUnavailable` の既定文になる
 */
export async function withDb(
  run: () => Promise<Response>,
  reason?: string,
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof DbUnavailableError) return dbUnavailable(reason);
    throw error;
  }
}

/**
 * `city` と一覧の絞り込み条件を読む（interfaces.md I-3）。
 *
 * **一覧（`/api/reports`）と書き出し（`/api/reports/export`）は同じ条件を受け取る**
 * 約束なので、読み方も同じでなければならない。別々に書くと、片方だけ通る
 * クエリができてしまい「画面で絞ったのと違うものが落ちてくる」ことになる。
 *
 * 市町村そのものも返すのは、書き出しが名前とコードをファイルの中身に使うため。
 */
export async function resolveListQuery(
  params: URLSearchParams,
): Promise<{ municipality: Municipality; filter: ReportFilter } | Response> {
  const cityCode = parseCityCode(params.get("city"), DEMO_CITY_CODE);
  if (cityCode === null) {
    return apiFail("city には 5 桁の市町村コードを指定してください。", 400);
  }

  const municipality = await findMunicipality(cityCode);
  if (!municipality) {
    return apiFail("指定された市町村にはまだ対応していません。", 400);
  }

  const parsed = parseListQuery(params, municipality);
  if (!parsed.ok) return apiFail(parsed.reason, parsed.status);

  return { municipality, filter: parsed.value };
}
