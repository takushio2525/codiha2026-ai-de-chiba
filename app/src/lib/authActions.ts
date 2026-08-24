"use server";

/** ログイン・ログアウトのサーバーアクション。
 *
 * フォームの action に直接渡して使う。JavaScript が無効でも動くように、
 * クライアント側で fetch せずサーバーアクションで完結させている。
 */
import { AuthError, signIn, signOut } from "./auth";
import { normalizeDisplayName, validateDisplayName } from "./displayName";

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

  try {
    await signIn("demo", { displayName, role, redirectTo: "/" });
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
