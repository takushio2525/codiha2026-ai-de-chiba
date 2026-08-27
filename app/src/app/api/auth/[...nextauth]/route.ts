/** Auth.js のエンドポイント（/api/auth/*）。
 *
 * サインイン・サインアウト・OAuth のコールバックがここを通る。
 * 設定の実体は src/lib/auth.ts。
 */
import { NextRequest } from "next/server";

import { handlers } from "@/lib/auth";
import { publicOriginFrom } from "@/lib/publicOrigin";

// DB（pg）を使うので Node ランタイムで動かす。Edge では動かない。
export const runtime = "nodejs";

/**
 * Auth.js に渡す前に、**リクエストの URL を利用者が開いた住所に直す**。
 *
 * `output: "standalone"` の Next.js は待ち受けアドレスから URL を組むため、
 * ここに来る `req.nextUrl` は `http://0.0.0.0:3000/...` になっている
 * （理由と実測は `src/lib/publicOrigin.ts`）。Auth.js はこの URL を土台に
 * リダイレクト先と Google の `redirect_uri` を作るので、直さないと
 * **3000 番以外で公開した瞬間に全部 3000 番へ飛ぶ**。
 *
 * サーバーアクション側（`signIn` / `signOut`）は Auth.js が自分で
 * `x-forwarded-host` を見るので、直す必要があるのはこの経路だけ。
 *
 * `AUTH_URL` を設定した環境では、この後に Auth.js 自身が同じ差し替えを
 * その固定値で行う（`reqWithEnvURL`）。**設定した人の意図が勝つ**ので、
 * ここで場合分けはしない。
 */
function withPublicOrigin(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    const origin = publicOriginFrom(req.headers);
    const current = req.nextUrl.origin;
    if (origin === null || origin === current) return handler(req);

    // 第 2 引数に元のリクエストを渡すとメソッド・ヘッダー・本文を引き継ぐ
    // （Auth.js の reqWithEnvURL と同じ作り）
    return handler(new NextRequest(origin + req.nextUrl.href.slice(current.length), req));
  };
}

export const GET = withPublicOrigin(handlers.GET);
export const POST = withPublicOrigin(handlers.POST);
