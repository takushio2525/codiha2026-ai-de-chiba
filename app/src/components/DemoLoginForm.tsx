"use client";

import { useActionState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";

import { demoLoginAction, type DemoLoginState } from "@/lib/authActions";
import { DISPLAY_NAME_MAX } from "@/lib/displayName";

const INITIAL: DemoLoginState = { error: null };

type Props = {
  /** 行政ユーザーが担当する市町村名。DB から引けなかったときは null。 */
  govCityName: string | null;
};

/** デモログインのフォーム（S-6）。表示名とロールを選ぶだけでログインできる。
 *
 * ロールを自己申告できるのは**デモモードだからこそ**で、
 * Google モードでは環境変数でしか行政ロールを付けない
 * （docs/design/requirements.md 8-3）。
 */
export default function DemoLoginForm({ govCityName }: Props) {
  const [state, formAction, pending] = useActionState(demoLoginAction, INITIAL);

  return (
    <form action={formAction} className="mt-5 space-y-5">
      <div>
        <label htmlFor="displayName" className="block text-[12.5px] font-medium text-ink">
          表示名
        </label>
        <p className="mt-1 text-[11.5px] text-ink-muted">
          投稿やコメントに表示される名前です。本名でなくてかまいません。
        </p>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="nickname"
          placeholder="いちかわ たろう"
          className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] text-ink outline-none transition placeholder:text-ink-muted focus-visible:border-ink"
        />
      </div>

      <fieldset>
        <legend className="text-[12.5px] font-medium text-ink">ロール</legend>
        <p className="mt-1 text-[11.5px] text-ink-muted">
          行政ユーザーを選ぶと、公式コメントと対応状況の更新も試せます。
        </p>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:border-ink-muted has-checked:border-ink">
            <input
              type="radio"
              name="role"
              value="user"
              defaultChecked
              className="mt-1 accent-[color:var(--color-ink)]"
            />
            <span>
              <span className="block text-[13.5px] font-medium text-ink">一般ユーザー</span>
              <span className="block text-[11.5px] text-ink-sub">
                住民・来訪者として投稿とコメントができます。
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:border-ink-muted has-checked:border-ink">
            <input
              type="radio"
              name="role"
              value="gov"
              className="mt-1 accent-[color:var(--color-ink)]"
            />
            <span>
              <span className="block text-[13.5px] font-medium text-ink">
                行政ユーザー{govCityName ? `（${govCityName}）` : ""}
              </span>
              <span className="block text-[11.5px] text-ink-sub">
                担当する市町村の投稿に、公式コメントと対応状況を付けられます。
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-[#d55e00] bg-[#fdf3ec] px-3 py-2 text-[12.5px] text-[#8a3d00]"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : (
          <LogIn aria-hidden className="size-4" />
        )}
        デモログイン
      </button>
    </form>
  );
}
