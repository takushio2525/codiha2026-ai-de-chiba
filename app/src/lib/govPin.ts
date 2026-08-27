/** デモログインの**行政ロールに PIN を要求する**（公開運用向け）。
 *  **サーバー側からしか読み込まないこと。**
 *
 * デモモードはロールを自己申告できる（docs/design/requirements.md 8-3）。
 * 審査員が `docker compose up` だけで行政側の機能まで試せるようにするための
 * 建付けで、**手元で動かすぶんには正しい**。
 *
 * ところが `deploy/selfhost/` でインターネットに公開すると、同じ建付けのまま
 * **通りすがりの誰でも行政ロールで入り、投稿の対応状況を書き換えられる**。
 *
 * そこで `GOV_DEMO_PIN` を設けた。
 *
 *   - **未設定（審査員の既定）** … 何も変わらない。行政ロールは PIN なしで選べる
 *   - **設定済み（公開時）**     … 行政ロールを選ぶときだけ PIN の一致を要求する
 *
 * **一般ユーザーのログインには一切影響しない。** 公開時に守りたいのは
 * 行政だけが持つ操作（対応状況の更新・公式コメント）であって、投稿そのものではない。
 */
import { createHash, timingSafeEqual } from "node:crypto";

/** 設定された PIN。空文字なら「PIN を要求しない」。 */
const GOV_DEMO_PIN = (process.env.GOV_DEMO_PIN ?? "").trim();

/** 行政ロールに PIN が要るか。**画面へはこの真偽値だけを渡す**（PIN そのものは渡さない）。 */
export const GOV_PIN_REQUIRED = GOV_DEMO_PIN.length > 0;

/** これを下回る PIN は総当たりで容易に破れるので警告する。 */
const MIN_PIN_LENGTH = 4;

if (
  GOV_PIN_REQUIRED &&
  GOV_DEMO_PIN.length < MIN_PIN_LENGTH &&
  // ビルド中は黙っておく（next build はワーカーを並列に立てるので何行も並ぶ）
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  console.warn(
    `[auth] GOV_DEMO_PIN が ${GOV_DEMO_PIN.length} 文字です。` +
      `${MIN_PIN_LENGTH} 文字以上（6 桁程度）を推奨します。`,
  );
}

// --- 総当たり対策 ---------------------------------------------------------
//
// PIN は短い。公開したまま放置すれば総当たりされる前提で、2 段構えで遅らせる。
//
//   ① 失敗のたびに待たせる（連続失敗で指数的に伸ばし、8 秒で頭打ち）
//   ② 連続 10 回失敗したら 60 秒は即座に断る
//
// ① だけだと**並列に投げられて意味が薄れる**（各リクエストが別々に待つだけ）。
// ② を足すと、並列でも 60 秒あたり 10 回までに絞れる。
// 6 桁なら 10^6 ÷ 10 × 60 秒 ≒ 69 日かかるので、発表期間の公開には十分。
//
// **プロセス内のカウンタで、IP 別には数えない。** Funnel の背後では
// クライアント IP がヘッダー任せになり、詐称できる値で数えても意味がないため。
// 代償として**攻撃者は行政ログインを妨害できる**が、
// 一般ユーザーのログインと閲覧・投稿は止まらないので、公開デモとしては許容する。
const LOCKOUT_AFTER = 10;
const LOCKOUT_MS = 60_000;
const BASE_DELAY_MS = 250;
/** 待ち時間の上限（250ms × 2^5 = 8 秒）。 */
const MAX_DELAY_STEPS = 5;

let failures = 0;
let lockedUntil = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 秘密の比較。**長さも中身も等しいときだけ true**。
 *
 * 素の `===` は先頭から 1 文字ずつ比べて違いが出た時点で返るので、
 * 応答時間から「何文字目まで合っているか」が漏れる。いったん同じ長さの
 * ハッシュに畳んでから `timingSafeEqual` で比べる（長さの違いも隠れる）。 */
function sameSecret(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/** 行政ロールで入ってよいか。エラーは画面にそのまま出せる日本語で返す。 */
export type GovPinResult = { ok: true } | { ok: false; error: string };

/**
 * 行政ロールの PIN を確かめる。
 *
 * **`GOV_DEMO_PIN` が未設定なら常に `ok`**（審査員の環境では何も起きない）。
 * 失敗すると内部で待たされるので、**呼ぶ側は同じ入力で二度呼ばないこと**
 * （画面からの経路はサーバーアクションで 1 回、API を直接叩かれた経路は
 * `auth.ts` の `authorize` で 1 回、と分かれている）。
 */
export async function verifyGovPin(raw: unknown): Promise<GovPinResult> {
  if (!GOV_PIN_REQUIRED) return { ok: true };

  const now = Date.now();
  if (now < lockedUntil) {
    const wait = Math.ceil((lockedUntil - now) / 1000);
    return {
      ok: false,
      error: `行政ユーザーの PIN を続けて間違えました。${wait} 秒待ってからやり直してください。`,
    };
  }

  const pin = typeof raw === "string" ? raw.trim() : "";
  if (pin.length > 0 && sameSecret(pin, GOV_DEMO_PIN)) {
    failures = 0;
    return { ok: true };
  }

  failures += 1;
  await sleep(BASE_DELAY_MS * 2 ** Math.min(failures - 1, MAX_DELAY_STEPS));
  if (failures >= LOCKOUT_AFTER) {
    lockedUntil = Date.now() + LOCKOUT_MS;
    failures = 0;
  }

  return {
    ok: false,
    error:
      pin.length === 0
        ? "この環境では、行政ユーザーで入るのに PIN が必要です。"
        : "行政ユーザーの PIN が違います。",
  };
}
