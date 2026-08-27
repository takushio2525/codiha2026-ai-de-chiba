import Link from "next/link";
import { List, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";

import BrandMark from "@/components/BrandMark";
import { getSessionView } from "@/lib/auth";
import { signOutAction } from "@/lib/authActions";

/** 画面上部の細い帯。ロゴ・ログイン状態・認証モードを常時出す。
 *
 * デモモードのときに「デモモードで動作中」を出し続けるのは要件
 * （docs/design/requirements.md 8-2）。審査員が
 * 「これは本番の Google ログインではない」と一目で分かるようにするため。
 * **この文言は縮められない**ので、狭い画面で足りない幅は他の要素から作る。
 *
 * **このアプリはスマホから使う前提**なので、375px で
 * 「ロゴ＋デモモード表示＋投稿一覧＋ログイン状態」が窮屈にならないことを先に決め、
 * 幅が増えたぶんだけ文字を出す 3 段構えにしてある。
 *
 * | 幅 | 出るもの |
 * |---|---|
 * | 〜639px（スマホ） | ロゴマーク＋アイコンだけ（＋デモモードの文言） |
 * | 640〜767px | ＋ ワードマーク `CHIZUBA` |
 * | 768px〜 | ＋ 投稿一覧・表示名・ログアウトの文字 |
 *
 * **段を 1 つにまとめない。** まとめると全部が同時に現れる幅で余白が 10px まで詰まる（実測）。
 */
export default async function AuthBar() {
  const { authMode, user } = await getSessionView();

  return (
    <header className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 text-[11.5px] sm:gap-2.5 sm:px-3">
      {/* どの画面にいてもブランドが見える。押すと地図（トップ）へ戻る。
          **スマホではマークだけ**にして、ワードマークは幅が出てから足す。
          タブに出ているアイコンと同じ図形なので、マークだけでも CHIZUBA と分かる。 */}
      <Link
        href="/"
        aria-label="CHIZUBA のトップ（地図）へ"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-1 py-1 transition hover:bg-[#f1f2f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <BrandMark className="size-[17px]" />
        <span className="hidden text-[12px] leading-none font-bold tracking-[0.16em] text-ink sm:inline">
          CHIZUBA
        </span>
      </Link>

      {authMode === "demo" ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f1f2f4] px-2 py-1 font-medium whitespace-nowrap text-ink-sub sm:px-2.5">
          {/* 「デモモードで動作中」の文言は要件（requirements.md 8-2）なので縮められない。
              スマホで幅が要るときは、飾りのアイコンのほうを落とす */}
          <ShieldCheck aria-hidden className="hidden size-3.5 sm:block" />
          デモモードで動作中
        </span>
      ) : null}

      <Link
        href="/reports"
        aria-label="投稿一覧"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-medium whitespace-nowrap text-ink-sub transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <List aria-hidden className="size-3.5" />
        {/* 幅が足りないうちはアイコンだけにする。読み上げ名は aria-label が持つ */}
        <span className="hidden md:inline">投稿一覧</span>
      </Link>

      <div className="ml-auto flex min-w-0 items-center gap-2.5">
        {user ? (
          <>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-sub">
              <UserRound aria-hidden className="size-3.5 shrink-0" />
              {/* 表示名はスマホでは出さない（アイコンとバッジでログイン状態は伝わる）。
                  出すと幅が足りず truncate で潰れて読めない残骸になるため。
                  読み上げには sr-only 側を残す */}
              <span className="sr-only">{user.displayName} でログイン中</span>
              <span aria-hidden className="hidden max-w-[10rem] truncate font-medium text-ink md:block">
                {user.displayName}
              </span>
            </span>
            {user.role === "gov" ? (
              <span className="shrink-0 rounded-full bg-[#0072b2] px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-white">
                行政
              </span>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="ログアウト"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-medium whitespace-nowrap text-ink-sub transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <LogOut aria-hidden className="size-3.5" />
                {/* 幅が足りないうちはアイコンだけ。読み上げ名は aria-label が持つ */}
                <span className="hidden md:inline">ログアウト</span>
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-medium whitespace-nowrap text-ink-sub transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <LogIn aria-hidden className="size-3.5" />
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}
