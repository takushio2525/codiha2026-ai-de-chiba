/** 公開オリジン（`https://例.ts.net` や `http://localhost:3100`）を
 *  **リクエストのヘッダーから導く**。**サーバー側からしか呼ばないこと。**
 *
 * ## なぜ要るか
 *
 * Next.js は `output: "standalone"` で動かすと、リクエストの URL を
 * **待ち受けアドレスから組み立てる**（`attachRequestMeta`）。
 * Dockerfile が `HOSTNAME=0.0.0.0` を渡しているので、
 * ルートハンドラが受け取る `req.nextUrl` は
 *
 *     http://0.0.0.0:3000/api/auth/callback/google
 *
 * になる。Auth.js の `/api/auth/*` はこの URL を土台にコールバック先と
 * リダイレクト先を作るため、**そのままだと利用者が開いていない住所へ飛ばす**。
 *
 * 以前はこれを `AUTH_URL=http://localhost:3000` の固定値で塞いでいたが、
 * 固定値は「3000 番以外で公開した瞬間に壊れる」うえ、Tailscale Funnel の
 * ような外部公開では**設定し忘れたら必ず壊れる**。そこで固定値をやめ、
 * **リクエストが実際に名乗ったホストから毎回導く**ことにした
 * （設計の理由は `.agent/architecture.md`「公開 URL の決め方」）。
 *
 * ## どのヘッダーを見るか
 *
 * `x-forwarded-host` → 無ければ `Host`。プロトコルは `x-forwarded-proto`。
 * Auth.js の `createActionURL()` が使う優先順位とそろえてある。
 *
 * - Next.js は `x-forwarded-host` が無ければ `Host` の値を自分で入れる
 *   （`base-server.ts`）。だから素の `docker compose up` でも
 *   `localhost:3000` / `localhost:3100` が正しく入る
 * - Tailscale Funnel は `X-Forwarded-Host` に**公開ホスト名**を、
 *   TLS を終端したときは `X-Forwarded-Proto: https` を入れる
 *   （`ipn/ipnlocal/serve.go` の `addProxyForwardedHeaders`）
 *
 * **`x-forwarded-port` は見ない。** Next.js がコンテナ内のポート（3000）を
 * 無条件に入れてしまうので、当てにすると 3100 で開いた人を 3000 へ飛ばす。
 * ポートは `x-forwarded-host` 側に付いてくる。
 *
 * ## 信頼の線引き
 *
 * `x-forwarded-host` は**リバースプロキシが居なければ利用者が偽装できる**。
 * このアプリは `trustHost: true`（`auth.ts`）で動く前提なので、そこは
 * Auth.js の既定の割り切りに合わせている。偽装で起きるのは
 * 「偽装した本人が別の住所へ飛ぶ」ことで、他人のセッションは取れない。
 * どうしても固定したい運用では `AUTH_URL` を設定すれば Auth.js 側が勝つ。
 */

/** ヘッダーは複数のプロキシを通ると `a, b` とカンマで連なる。先頭が大元。 */
function first(value: string | null): string | null {
  if (value === null) return null;
  const head = value.split(",")[0]?.trim() ?? "";
  return head === "" ? null : head;
}

/** URL の authority として安全に使える形か。
 *  改行や `/` が混ざったヘッダーで URL を組み立てないための門番。 */
const SAFE_HOST = /^[A-Za-z0-9._-]+(:[0-9]{1,5})?$|^\[[0-9A-Fa-f:.]+\](:[0-9]{1,5})?$/;

/**
 * リクエストが名乗ったオリジンを返す。末尾にスラッシュは付けない。
 * 判断できないときは null（呼び出し側は元の URL のままにする）。
 */
export function publicOriginFrom(headers: Headers): string | null {
  // **形が壊れていたら次の候補に落ちる。** 途中のプロキシが妙な
  // `X-Forwarded-Host` を付けたときに、素の `Host` を捨てないため
  // （捨てると `0.0.0.0` に戻ってしまう。実測で踏んだ）
  const host = [headers.get("x-forwarded-host"), headers.get("host")]
    .map(first)
    .find((candidate) => candidate !== null && SAFE_HOST.test(candidate));
  if (host === undefined || host === null) return null;

  const proto = first(headers.get("x-forwarded-proto"))?.replace(/:$/, "").toLowerCase();
  // 素の HTTP で待ち受けているので、名乗りが無ければ http と見なす
  const scheme = proto === "https" || proto === "http" ? proto : "http";

  return `${scheme}://${host}`;
}
