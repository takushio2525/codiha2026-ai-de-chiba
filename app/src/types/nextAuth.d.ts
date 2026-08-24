/** next-auth の型にアプリ固有の項目（ロール・担当市町村）を足す。
 *
 * 中身の意味は docs/design/interfaces.md の I-8 を参照。
 * **画面の role は表示の出し分けにしか使わない。** 権限判定は必ず API 側で行う。
 */
import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/lib/users";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      govCityCode: string | null;
    } & DefaultSession["user"];
  }

  /** authorize / profile が返すユーザー。 */
  interface User {
    role?: UserRole;
    govCityCode?: string | null;
  }
}

// JWT（トークン）側は拡張しない。next-auth/jwt は @auth/core/jwt の再エクスポートで、
// モジュール拡張が効かないため。載せる項目は src/lib/auth.ts の AppToken が持つ。
