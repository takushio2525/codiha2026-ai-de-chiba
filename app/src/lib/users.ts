/** ユーザーの読み書き。**サーバー側からしか読み込まないこと**（db.ts を経由するため）。
 *
 * Google ログインでもデモログインでも、入り口が違うだけで users テーブルの
 * 1 行になる（docs/design/requirements.md 8 章）。
 */
import { query } from "./db";

/** 'user' … 一般ユーザー / 'gov' … 行政ユーザー */
export type UserRole = "user" | "gov";

export type AppUser = {
  id: number;
  displayName: string;
  role: UserRole;
  /** 行政ユーザーが担当する市町村コード。一般ユーザーは null。 */
  govCityCode: string | null;
};

type UserRow = {
  id: string | number;
  display_name: string;
  role: UserRole;
  gov_city_code: string | null;
};

/** ログインしたユーザーを登録する。2 回目以降は表示名とロールを更新する。 */
export async function upsertUser(params: {
  provider: "google" | "demo";
  providerUid: string;
  displayName: string;
  role: UserRole;
  govCityCode: string | null;
}): Promise<AppUser> {
  const rows = await query<UserRow>(
    `INSERT INTO users (provider, provider_uid, display_name, role, gov_city_code)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider, provider_uid) DO UPDATE
        SET display_name  = EXCLUDED.display_name,
            role          = EXCLUDED.role,
            gov_city_code = EXCLUDED.gov_city_code
     RETURNING id, display_name, role, gov_city_code`,
    [
      params.provider,
      params.providerUid,
      params.displayName,
      params.role,
      params.govCityCode,
    ],
  );

  const row = rows[0];
  return {
    // pg は bigint を文字列で返す（53 bit を超える値を壊さないため）
    id: Number(row.id),
    displayName: row.display_name,
    role: row.role,
    govCityCode: row.gov_city_code,
  };
}
