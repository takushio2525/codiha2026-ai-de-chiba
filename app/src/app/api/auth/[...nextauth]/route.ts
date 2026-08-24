/** Auth.js のエンドポイント（/api/auth/*）。
 *
 * サインイン・サインアウト・OAuth のコールバックがここを通る。
 * 設定の実体は src/lib/auth.ts。
 */
import { handlers } from "@/lib/auth";

// DB（pg）を使うので Node ランタイムで動かす。Edge では動かない。
export const runtime = "nodejs";

export const { GET, POST } = handlers;
