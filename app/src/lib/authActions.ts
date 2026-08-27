"use server";

/** ログイン・ログアウトのサーバーアクション。
 *
 * フォームの action に直接渡して使う。JavaScript が無効でも動くように、
 * クライアント側で fetch せずサーバーアクションで完結させている。
 */
import { AuthError, signIn, signOut } from "./auth";
import { normalizeDisplayName, validateDisplayName } from "./displayName";
import { verifyGovPin } from "./govPin";

export type DemoLoginState = {
  /** 画面にそのまま出せる日本語のエラー。問題なければ null。 */
  error: string | null;
};

/** デモログイン。表示名とロールを受け取ってセッションを張る。 */
export async function demoLoginAction(
  _prev: DemoLoginState,
  formData: FormData,
): Promise<DemoLoginState> {
  const displayName = normalizeDisplayName(String(formData.get("displayName") ?? ""));
  const invalid = validateDisplayName(displayName);
  if (invalid !== null) return { error: invalid };

  const role = formData.get("role") === "gov" ? "gov" : "user";
  const govPin = String(formData.get("govPin") ?? "");

  // 行政ロールの PIN（requirements.md 8-3）。GOV_DEMO_PIN が未設定なら常に通る。
  // **ここで確かめるのは、理由を日本語で画面に返すため。** signIn に任せると
  // authorize が null を返しても「ログインできませんでした」としか言えない。
  // 数え直しにならないよう、**この経路では authorize が正しい PIN を受け取る**
  if (role === "gov") {
    const pin = await verifyGovPin(govPin);
    if (!pin.ok) return { error: pin.error };
  }

  try {
    await signIn("demo", { displayName, role, govPin, redirectTo: "/" });
  } catch (error) {
    // 成功時は signIn がリダイレクト例外を投げる。それは Next.js に処理させる
    if (error instanceof AuthError) {
      return {
        error:
          "ログインできませんでした。データベースに接続できているか確認してください。",
      };
    }
    throw error;
  }

  return { error: null };
}

/** Google ログイン。Google の同意画面へリダイレクトする。 */
export async function googleSignInAction(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}

/** ログアウト。地図の画面へ戻す。 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
