/** 認証モードの判定。**サーバー側で 1 回だけ**行い、結果を画面へ渡す。
 *
 * 要件（docs/design/requirements.md 8 章）:
 *
 *   GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET が両方ある → Google モード
 *   どちらか欠けている                                  → デモモード（審査員の既定）
 *
 * **クライアント側で鍵の有無を判定しない。** このファイルは環境変数を読むので
 * サーバー側からしか import しないこと（interfaces.md I-8）。
 */

export type AuthMode = "google" | "demo";

function readKey(name: string): string {
  return (process.env[name] ?? "").trim();
}

export const GOOGLE_CLIENT_ID = readKey("GOOGLE_CLIENT_ID");
export const GOOGLE_CLIENT_SECRET = readKey("GOOGLE_CLIENT_SECRET");

/** 起動時に決まる認証モード。プロセスの生存中は変わらない。 */
export const AUTH_MODE: AuthMode =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? "google" : "demo";

/** Google モードで行政ロールを付けるアカウントの一覧。
 *
 * 環境変数 `GOV_ACCOUNTS` に `メールアドレス:市町村コード` をカンマ区切りで書く。
 * 実運用なら自治体ごとの職員アカウント管理が要るが、ハッカソンのスコープ外なので
 * 「仕組みとしては成立する」ことを示すに留める（requirements.md 8-3）。
 */
function parseGovAccounts(raw: string): Map<string, string> {
  const table = new Map<string, string>();
  for (const entry of raw.split(",")) {
    const [email, cityCode] = entry.split(":").map((part) => part.trim());
    if (!email || !/^[0-9]{5}$/.test(cityCode ?? "")) continue;
    table.set(email.toLowerCase(), cityCode);
  }
  return table;
}

const GOV_ACCOUNTS = parseGovAccounts(readKey("GOV_ACCOUNTS"));

/** そのメールアドレスに割り当てられた市町村コード。行政でなければ null。 */
export function govCityCodeFor(email: string): string | null {
  return GOV_ACCOUNTS.get(email.trim().toLowerCase()) ?? null;
}
