import Link from "next/link";
import { LogIn, ShieldCheck, UserRound } from "lucide-react";

import { getSessionView } from "@/lib/auth";
import { signOutAction } from "@/lib/authActions";

/** 画面上部の細い帯。ログイン状態と認証モードを常時出す。
 *
 * デモモードのときに「デモモードで動作中」を出し続けるのは要件
 * （docs/design/requirements.md 8-2）。審査員が
 * 「これは本番の Google ログインではない」と一目で分かるようにするため。
 */
export default async function AuthBar() {
  const { authMode, user } = await getSessionView();

  return (
    <header className="flex h-9 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 text-[11.5px]">
      {authMode === "demo" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f2f4] px-2.5 py-1 font-medium text-ink-sub">
          <ShieldCheck aria-hidden className="size-3.5" />
          デモモードで動作中
        </span>
      ) : null}

      <div className="ml-auto flex items-center gap-2.5">
        {user ? (
          <>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-sub">
              <UserRound aria-hidden className="size-3.5 shrink-0" />
              <span className="max-w-[10rem] truncate font-medium text-ink">
                {user.displayName}
              </span>
            </span>
            {user.role === "gov" ? (
              <span className="rounded-full bg-[#0072b2] px-2 py-0.5 text-[10.5px] font-medium text-white">
                行政
              </span>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1 font-medium text-ink-sub transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                ログアウト
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-ink-sub transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <LogIn aria-hidden className="size-3.5" />
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}
