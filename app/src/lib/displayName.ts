/** 表示名の正規化と検証。
 *
 * **画面（クライアント）とサーバーの両方から読む**ので、
 * このファイルは DB にも環境変数にも依存させない
 * （db.ts を巻き込むとブラウザ向けのビルドに pg が入って壊れる）。
 */

/** 表示名の上限。users.display_name の CHECK 制約と同じ値。 */
export const DISPLAY_NAME_MAX = 30;

/** 前後の空白を落とし、連続する空白を 1 つにまとめる。長さの検証はしない。 */
export function normalizeDisplayName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** 表示名として使えるか。使えないときは画面にそのまま出せる日本語の理由を返す。 */
export function validateDisplayName(name: string): string | null {
  if (name.length === 0) return "表示名を入力してください。";
  if (name.length > DISPLAY_NAME_MAX) {
    return `表示名は ${DISPLAY_NAME_MAX} 文字以内にしてください。`;
  }
  return null;
}
