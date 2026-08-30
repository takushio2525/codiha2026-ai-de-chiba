import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LogIn, TriangleAlert, UserRound } from "lucide-react";

import DemoLoginForm from "@/components/DemoLoginForm";
import { getSessionView } from "@/lib/auth";
import { googleSignInAction, signOutAction } from "@/lib/authActions";
import { GOV_PIN_REQUIRED } from "@/lib/govPin";
import { DEMO_CITY_CODE, findMunicipality } from "@/lib/municipalities";

export const metadata: Metadata = {
  title: "ログイン",
  description:
    "危険箇所や浸水の報告、観光おすすめの投稿にはログインが必要です。閲覧はログインなしでできます。",
};

/** ログイン画面（S-6）。
 *
 * 認証モードはサーバーが決める（docs/design/requirements.md 8-2）。
 * **デモログインのフォームは常に出す。** Google の鍵が設定されている環境では
 * その上に「Google でログイン」を足すだけで、デモログインは消さない
 * （Google アカウントを持たない人が公開先で投稿できなくなるため）。
 */
export default async function LoginPage() {
  const { authMode, user } = await getSessionView();
  // authMode === "google" は「Google **も** 使える」の意味（interfaces.md I-8）
  const googleEnabled = authMode === "google";

  // 行政ユーザーの担当市町村名をマスタから引く。DB が落ちていても画面は出す
  let govCityName: string | null = null;
  let dbReachable = true;
  try {
    govCityName = (await findMunicipality(DEMO_CITY_CODE))?.name ?? null;
  } catch {
    dbReachable = false;
  }

  return (
    <div className="min-h-full bg-canvas px-5 py-10">
      <main className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-sub transition hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          地図に戻る
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">ログイン</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-sub">
          地図・ハザードマップ・投稿の閲覧は<strong className="font-medium text-ink">ログインなし</strong>
          でできます。ログインが要るのは、危険箇所・浸水・観光おすすめを
          <strong className="font-medium text-ink">投稿するとき</strong>だけです。
        </p>

        {!dbReachable ? (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-2xl border border-[#d55e00] bg-[#fdf3ec] px-4 py-3 text-[12.5px] leading-relaxed text-[#8a3d00]"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              データベースに接続できていません。ログインは行えますが失敗します。
              コンテナが起動しきっているか（<code>docker compose ps</code>）確認してください。
            </span>
          </p>
        ) : null}

        <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_30px_-26px_rgb(0_0_0/0.5)]">
          {user ? (
            <>
              <p className="flex items-center gap-2 text-[13.5px] text-ink">
                <UserRound aria-hidden className="size-4 text-ink-muted" />
                <span>
                  <strong className="font-medium">{user.displayName}</strong> でログイン中
                  {user.role === "gov" ? "（行政ユーザー）" : ""}
                </span>
              </p>
              <form action={signOutAction} className="mt-4">
                <button
                  type="submit"
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-[13.5px] font-medium text-ink transition hover:bg-[#f1f2f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <>
              {/* 鍵がある環境だけ Google を足す。**下のデモログインは消さない** */}
              {googleEnabled ? (
                <>
                  <h2 className="text-[13px] font-semibold text-ink">Google アカウントでログイン</h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-sub">
                    Google のログイン画面へ移動します。取得するのは表示名だけで、
                    メールアドレスは画面に出しません。
                  </p>
                  <form action={googleSignInAction} className="mt-4">
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <LogIn aria-hidden className="size-4" />
                      Google でログイン
                    </button>
                  </form>

                  {/* 区切り。**線の上に文字を重ねない**（375px で文字が線に触れる） */}
                  <div className="mt-6 flex items-center gap-3" role="separator">
                    <span aria-hidden className="h-px flex-1 bg-line" />
                    <span className="text-[11.5px] font-medium text-ink-muted">または</span>
                    <span aria-hidden className="h-px flex-1 bg-line" />
                  </div>
                </>
              ) : null}

              <h2 className={`text-[13px] font-semibold text-ink${googleEnabled ? " mt-6" : ""}`}>
                デモログイン
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-sub">
                {googleEnabled ? (
                  <>
                    Google アカウントが無くても、表示名を入れるだけでログインできます。
                    投稿とコメントは Google で入ったときとまったく同じように使えます。
                  </>
                ) : (
                  <>
                    Google の認証キーが設定されていないため、デモモードで動いています。
                    表示名を入れるだけでログインでき、
                    <strong className="font-medium text-ink">投稿・コメント・行政操作まで全機能を試せます</strong>。
                  </>
                )}
                {GOV_PIN_REQUIRED ? "なお、この環境では行政ユーザーだけ PIN で守っています。" : ""}
              </p>
              <DemoLoginForm govCityName={govCityName} govPinRequired={GOV_PIN_REQUIRED} />
            </>
          )}
        </section>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">
          {googleEnabled
            ? "認証キーを外すと、デモログインだけになります（app/.env.example 参照）。"
            : "GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を設定すると、Google ログインも選べるようになります（app/.env.example 参照）。"}
        </p>
      </main>
    </div>
  );
}
