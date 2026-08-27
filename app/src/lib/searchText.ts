/** キーワード検索の文字そろえ。**ブラウザ側からもサーバー側からも読む**。
 *
 * 日本語の入力は、同じ語でも見た目が何通りにもなる（全角/半角のカナ・英数、
 * 大文字/小文字）。**NFKC で正規化して小文字に寄せてから**突き合わせることで、
 * 「ｱﾝﾀﾞｰﾊﾟｽ」と打っても「アンダーパス」に当たるようにする。
 *
 * DB 側も同じ変換を SQL の中で行う（`reportStore.ts`）。
 * PostgreSQL の `normalize(text, NFKC)` は 13 以降の組み込み関数で、
 * 拡張を入れなくても使える（PostgreSQL 17 で実測）。
 *
 * **読み（ひらがな⇄漢字）までは合わせない。** 形態素解析や辞書が要るうえ、
 * 100 件規模のデータで効果より複雑さのほうが勝つため。
 */

/** 検索語の長さの上限。長すぎる語を DB へ投げないための歯止め。 */
export const SEARCH_MAX_LENGTH = 40;

/** 検索語と検索対象をそろえる。 */
export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim();
}

/** 正規化したうえでの部分一致。**語が空なら常に true**（絞り込まない）。 */
export function searchMatches(haystack: string | undefined | null, needle: string): boolean {
  if (needle.length === 0) return true;
  if (!haystack) return false;
  return normalizeSearch(haystack).includes(needle);
}
