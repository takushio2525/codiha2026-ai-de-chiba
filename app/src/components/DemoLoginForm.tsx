"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle, LogIn } from "lucide-react";

import { demoLoginAction, type DemoLoginState } from "@/lib/authActions";
import { DISPLAY_NAME_MAX } from "@/lib/displayName";

const INITIAL: DemoLoginState = { error: null };

type Props = {
  /** 行政ユーザーが担当する市町村名。DB から引けなかったときは null。 */
  govCityName: string | null;
  /** 行政ユーザーを選ぶのに PIN が要るか（サーバーが `GOV_DEMO_PIN` から決める）。
   *  **PIN そのものは画面へ渡さない。** */
  govPinRequired: boolean;
};

/** デモログインのフォーム（S-6）。表示名とロールを選ぶだけでログインできる。
 *
 * ロールを自己申告できるのは**デモモードだからこそ**で、
 * Google モードでは環境変数でしか行政ロールを付けない
 * （docs/design/requirements.md 8-3）。
 *
 * ただし**インターネットに公開するときは行政ロールに PIN を挟める**。
 * `GOV_DEMO_PIN` が設定された環境でだけ入力欄が増える（同 8-3）。
 */
export default function DemoLoginForm({ govCityName, govPinRequired }: Props) {
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

          <label className="peer/gov flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:border-ink-muted has-checked:border-ink">
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
                {govPinRequired ? "この環境では PIN が要ります。" : ""}
              </span>
            </span>
          </label>

          {/* PIN の欄。**出し入れを React の状態でやらない。**
              React 19 はフォームアクションが終わるとフォームを reset するので、
              状態で出し入れすると「ラジオは一般に戻ったのに PIN 欄は出たまま」に
              なり、そのまま送ると role が user に化ける（実測）。
              直前の行政ラジオ（peer/gov）が checked のときだけ CSS で出す。
              こうすると reset と必ず一致し、JavaScript が無くても動く。 */}
          {govPinRequired ? (
            <div className="hidden pt-1 peer-has-checked/gov:block">
              <label
                htmlFor="govPin"
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink"
              >
                <KeyRound aria-hidden className="size-3.5 text-ink-muted" />
                行政ユーザーの PIN
              </label>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                この CHIZUBA は行政ユーザーだけを合言葉で守っています。運用している人に聞いてください。
              </p>
              {/* **required を付けない。** 一般ユーザーを選んでいるとき、この欄は
                  display:none で残っている。required が付いていると
                  ブラウザが「見えない必須項目」を理由に送信そのものを止める。
                  空のまま行政で送られた場合はサーバーが日本語の理由を返す */}
              <input
                id="govPin"
                name="govPin"
                type="password"
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] text-ink outline-none transition placeholder:text-ink-muted focus-visible:border-ink"
              />
            </div>
          ) : null}
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
