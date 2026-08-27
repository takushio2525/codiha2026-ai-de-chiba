/** このインストールを識別するランダム値。**サーバー側からしか読み込まないこと**。
 *
 * ---- 何のためにあるか ----
 *
 * セッションは JWT で、中身は `uid`（users.id）ほか数個の値でしかない。
 * users.id は**ただの連番**なので、データベースを作り直せば同じ番号が別人に割り当たる。
 * さらに Cookie は**ポートを区別しない**ので、同じ `localhost` で別のインスタンスを
 * 動かすと、片方で発行したトークンがもう片方へ届く。
 *
 * 実測（2026-08-27）: 別の DB で発行した「行政ユーザー」のトークンを、
 * 作り直した直後の DB に持ち込んだところ、そのまま行政操作（対応状況の更新）が通った。
 * トークンの `uid = 9` はその DB に存在すらしていなかった
 * （権限判定に使う `role` / `govCityCode` もトークン側の値だったため）。
 *
 * そこで **DB に「このインストールの ID」を 1 つ置き**、
 *
 *   1. **署名鍵をそこから導く**（`AUTH_SECRET` が未設定のとき）
 *      → 別インストールのトークンはそもそも復号できない
 *   2. **トークンにも同じ ID を焼き込んで毎回突き合わせる**
 *      → `AUTH_SECRET` を人が固定していても、DB が違えば通らない
 *
 * の二重で縛る。**鍵を 1 つも設定していない環境でも成り立つ**のが要点で、
 * 審査員が `docker compose up` だけで動かす前提を崩さない。
 */
import { createHash } from "node:crypto";

import { query } from "./db";

/** 一度読めたら以降は使い回す。**プロセスが生きているあいだの読み取りは 1 回**。
 *  `docker compose down -v` で DB を作り直すときは web も一緒に作り直されるので、
 *  古い値が残ったままになることはない。 */
let cached: string | null = null;

/**
 * このインストールの ID を返す。**読めなければ null**（例外は投げない）。
 *
 * 認証はアプリの入り口で毎回通るので、ここで投げると DB が落ちた瞬間に
 * 画面ごと 500 になる。**読めないときは「セッションを通さない」に倒す**
 * （`auth.ts` の jwt コールバックが null を返す）。
 */
export async function getInstallId(): Promise<string | null> {
  if (cached !== null) return cached;
  try {
    const rows = await query<{ install_id: string }>(
      "SELECT install_id FROM app_instance WHERE id = 1",
    );
    if (rows.length > 0) {
      cached = rows[0].install_id;
      return cached;
    }
    // 初期化 SQL が入れているので普通は通らない。手で消された場合の保険
    const created = await query<{ install_id: string }>(
      "INSERT INTO app_instance (id) VALUES (1) ON CONFLICT (id) DO NOTHING RETURNING install_id",
    );
    if (created.length > 0) {
      cached = created[0].install_id;
      return cached;
    }
    // 同時に別のプロセスが入れた場合はもう一度読む
    const again = await query<{ install_id: string }>(
      "SELECT install_id FROM app_instance WHERE id = 1",
    );
    cached = again.length > 0 ? again[0].install_id : null;
    return cached;
  } catch {
    // DB に繋がらない。ここで投げると画面が出なくなるので黙って null を返す
    return null;
  }
}

/** インストール ID から JWT の署名鍵を導く。
 *  **ID そのものを鍵に使わない**のは、鍵が漏れても ID が推測できないようにするため。 */
export function sessionSecretFor(installId: string): string {
  return createHash("sha256").update(`chizuba-session-key:${installId}`).digest("hex");
}
