/** PostgreSQL への接続。**サーバー側からしか読み込まないこと**（pg はブラウザで動かない）。
 *
 * つなぎ目の正本は docs/design/interfaces.md の I-7。
 *
 *   - クライアントは pg（node-postgres）。ORM もマイグレーションツールも入れない
 *   - 接続先は環境変数 DATABASE_URL（compose.yaml が既定値を渡す）
 *   - スキーマは app/db/init/*.sql を postgres イメージが起動時に流す
 *
 * DB に繋がらないときは DbUnavailableError を投げる。呼び出し側はこれを捕まえて
 * 503 を返し、**地図と静的レイヤーは出したまま**にする（投稿だけ空になる）。
 */
import { Pool, type PoolClient, type QueryResultRow } from "pg";

/** 接続できない・応答が返らないときに投げる。呼び出し側で 503 に変換する。 */
export class DbUnavailableError extends Error {
  constructor(cause: unknown) {
    super("データベースに接続できませんでした。", { cause });
    this.name = "DbUnavailableError";
  }
}

/** 接続を待つ上限。compose の healthcheck を通ってから起動するので短くてよい。 */
const CONNECTION_TIMEOUT_MS = 5_000;
/** 1 本のクエリが長引いたときに諦める時間。画面を固めないための保険。 */
const STATEMENT_TIMEOUT_MS = 10_000;

// 開発中のホットリロードでプールが作り直され、接続が増え続けるのを防ぐ。
// 本番（standalone のサーバー）では 1 回しか通らない。
const globalForPool = globalThis as unknown as { chizubaPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // compose.yaml が必ず渡す。渡っていないなら設定ミスなので早く気づけるようにする。
    throw new Error("DATABASE_URL が設定されていません（compose.yaml を確認してください）");
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: 30_000,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });

  // アイドル接続が切れたときに例外でプロセスごと落ちないようにする。
  pool.on("error", (error) => {
    console.error("[db] アイドル接続でエラーが発生しました:", error.message);
  });

  return pool;
}

export function getPool(): Pool {
  globalForPool.chizubaPool ??= createPool();
  return globalForPool.chizubaPool;
}

/** SQL を 1 本流す。接続できないときは DbUnavailableError に包み直す。 */
export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  try {
    const result = await getPool().query<T>(text, params as unknown[]);
    return result.rows;
  } catch (error) {
    // 接続そのものに失敗したものだけを DbUnavailableError にする。
    // SQL の書き間違い（制約違反など）はそのまま投げて、開発中に気づけるようにする。
    if (isConnectionError(error)) throw new DbUnavailableError(error);
    throw error;
  }
}

/** 接続不能を表すエラーかどうか。pg は code か errno で返してくる。 */
function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    code === "57P03" || // cannot_connect_now（起動途中）
    error.message.includes("timeout exceeded when trying to connect")
  );
}

/** トランザクションを 1 本張って処理を通す。
 *
 * 投稿の作成のように「reports に 1 行 + report_photos に n 行」を
 * まとめて成立させたいときに使う。途中で例外が出たら ROLLBACK して投げ直すので、
 * 呼び出し側は「失敗したら DB には何も残っていない」前提で後始末できる
 * （写真の実体を消す、など。docs/design/interfaces.md I-4）。
 */
export async function withTransaction<T>(
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  let client: PoolClient;
  try {
    client = await getPool().connect();
  } catch (error) {
    throw new DbUnavailableError(error);
  }

  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // ROLLBACK 自体が失敗しても、元の例外を握りつぶさない
    await client.query("ROLLBACK").catch(() => undefined);
    if (isConnectionError(error)) throw new DbUnavailableError(error);
    throw error;
  } finally {
    client.release();
  }
}
