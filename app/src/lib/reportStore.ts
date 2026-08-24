/** 投稿の読み書き。**サーバー側からしか読み込まないこと**（db.ts を経由するため）。
 *
 * 3 種類の投稿を 1 テーブルで扱う（docs/design/requirements.md 4 章）。
 * 返す形は docs/design/interfaces.md の I-3（GeoJSON の properties）に合わせてある。
 *
 * **メールアドレスと provider_uid は絶対に返さない。** 返すのは表示名とロールだけ（I-3）。
 */
import { query, withTransaction } from "./db";
import {
  photoUrl,
  type ReportCategory,
  type ReportComment,
  type ReportFeature,
  type ReportProperties,
  type ReportStatus,
} from "./reports";

/** 時刻は JST（+09:00）の ISO 8601 で返す。日本時間には夏時間が無いので固定でよい。 */
const createdAtJst = (column: string) =>
  `to_char(${column} AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD"T"HH24:MI:SS"+09:00"')`;

/** 投稿 1 件ぶんの列。写真・コメントの集計は LATERAL でまとめて引く。
 *  **`r.user_id` は権限の判定にだけ使う列**で、`toProperties` はレスポンスに載せない
 *  （誰の投稿かは表示名でしか外に出さない。interfaces.md I-3）。 */
const REPORT_COLUMNS = `
  r.id, r.category, r.title, r.body, r.lat, r.lon, r.city_code, r.status, r.details, r.user_id,
  u.display_name AS author_name,
  u.role         AS author_role,
  ${createdAtJst("r.created_at")} AS created_at,
  COALESCE(p.orders, ARRAY[]::smallint[]) AS photo_orders,
  COALESCE(c.total, 0)                    AS comment_count,
  COALESCE(c.official, false)             AS has_official_comment
`;

const REPORT_FROM = `
  FROM reports r
  JOIN users u ON u.id = r.user_id
  LEFT JOIN LATERAL (
    SELECT array_agg(ph.sort_order ORDER BY ph.sort_order) AS orders
      FROM report_photos ph WHERE ph.report_id = r.id
  ) p ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS total, bool_or(cm.is_official) AS official
      FROM report_comments cm WHERE cm.report_id = r.id
  ) c ON true
`;

type ReportRow = {
  id: string | number;
  category: ReportCategory;
  title: string;
  body: string;
  lat: number;
  lon: number;
  city_code: string;
  status: ReportStatus;
  user_id: string | number;
  details: Record<string, unknown> | null;
  author_name: string;
  author_role: "user" | "gov";
  created_at: string;
  photo_orders: number[];
  comment_count: number;
  has_official_comment: boolean;
};

function toProperties(row: ReportRow): ReportProperties {
  // pg は bigint を文字列で返す（53 bit を超える値を壊さないため）
  const id = Number(row.id);
  // 写真の URL は「1 始まりの通し番号」。DB の sort_order（0 始まり）に 1 を足す
  const photoUrls = row.photo_orders.map((order) => photoUrl(id, order + 1));
  return {
    id,
    category: row.category,
    title: row.title,
    body: row.body,
    cityCode: row.city_code,
    status: row.status,
    authorName: row.author_name,
    authorRole: row.author_role,
    createdAt: row.created_at,
    photoCount: photoUrls.length,
    photoUrls,
    commentCount: row.comment_count,
    hasOfficialComment: row.has_official_comment,
    details: row.details ?? {},
  };
}

function toFeature(row: ReportRow): ReportFeature {
  return {
    type: "Feature",
    // 座標は [経度, 緯度]（GeoJSON と MapLibre に合わせる）
    geometry: { type: "Point", coordinates: [row.lon, row.lat] },
    properties: toProperties(row),
  };
}

export type ReportFilter = {
  cityCode: string;
  categories: ReportCategory[];
  statuses: ReportStatus[];
  /** [西, 南, 東, 北]（度）。地図の表示範囲 */
  bbox: [number, number, number, number];
  limit: number;
};

/** 条件に合う投稿を新着順に引く（interfaces.md I-3）。 */
export async function listReports(filter: ReportFilter): Promise<ReportFeature[]> {
  const params: unknown[] = [
    filter.cityCode,
    filter.bbox[0],
    filter.bbox[2],
    filter.bbox[1],
    filter.bbox[3],
  ];
  const conditions = [
    "r.city_code = $1",
    "r.lon BETWEEN $2 AND $3",
    "r.lat BETWEEN $4 AND $5",
  ];

  params.push(filter.categories);
  conditions.push(`r.category = ANY($${params.length}::text[])`);
  params.push(filter.statuses);
  conditions.push(`r.status = ANY($${params.length}::text[])`);
  params.push(filter.limit);

  const rows = await query<ReportRow>(
    `SELECT ${REPORT_COLUMNS} ${REPORT_FROM}
      WHERE ${conditions.join(" AND ")}
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $${params.length}`,
    params,
  );
  return rows.map(toFeature);
}

/** 投稿を 1 件引く。無ければ null。
 *  `authorId` は権限の判定用で、レスポンスにそのまま載せてはいけない。 */
export async function findReport(id: number): Promise<
  | { properties: ReportProperties; coordinates: [number, number]; authorId: number }
  | null
> {
  const rows = await query<ReportRow>(
    `SELECT ${REPORT_COLUMNS} ${REPORT_FROM} WHERE r.id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  return {
    properties: toProperties(rows[0]),
    coordinates: [rows[0].lon, rows[0].lat],
    authorId: Number(rows[0].user_id),
  };
}

/** 座標がどの市町村に入るかを市町村マスタの bbox から決める（interfaces.md I-4）。
 *  **クライアントから city_code を受け取らない**のは、詐称を防ぐため。 */
export async function resolveCityCode(lat: number, lon: number): Promise<string | null> {
  const rows = await query<{ code: string }>(
    `SELECT code FROM municipalities
      WHERE $1 BETWEEN bbox_west  AND bbox_east
        AND $2 BETWEEN bbox_south AND bbox_north
      ORDER BY code
      LIMIT 1`,
    [lon, lat],
  );
  return rows.length > 0 ? rows[0].code : null;
}

export type NewPhoto = { fileName: string; mimeType: string; byteSize: number };

/** 投稿を 1 件作る。写真の行までまとめて 1 トランザクションで入れる。
 *
 * ここで失敗したら DB には何も残らないので、呼び出し側は保存済みの写真の実体を
 * 消すだけでよい（interfaces.md I-4「孤児ファイルを残さない」）。 */
export async function createReport(input: {
  category: ReportCategory;
  title: string;
  body: string;
  lat: number;
  lon: number;
  cityCode: string;
  userId: number;
  /** カテゴリ固有の項目。選択肢は文字列だが、**サーバーが決める雨量は数値**なので
   *  `unknown` で受ける（何を入れてよいかの正本は interfaces.md I-4） */
  details: Record<string, unknown>;
  photos: NewPhoto[];
}): Promise<number> {
  return withTransaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO reports (category, title, body, lat, lon, city_code, user_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id`,
      [
        input.category,
        input.title,
        input.body,
        input.lat,
        input.lon,
        input.cityCode,
        input.userId,
        JSON.stringify(input.details),
      ],
    );
    const reportId = Number(inserted.rows[0].id);

    for (const [index, photo] of input.photos.entries()) {
      await client.query(
        `INSERT INTO report_photos (report_id, file_name, mime_type, byte_size, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [reportId, photo.fileName, photo.mimeType, photo.byteSize, index],
      );
    }

    return reportId;
  });
}

export type DeleteResult =
  | { status: "deleted"; fileNames: string[] }
  | { status: "not_found" }
  | { status: "forbidden" };

/** 投稿を消す。消すのは投稿者本人だけ（interfaces.md I-5）。
 *  写真の行は ON DELETE CASCADE で消えるので、実体のファイル名を返す。 */
export async function deleteReport(id: number, userId: number): Promise<DeleteResult> {
  const owner = await query<{ user_id: string }>(
    "SELECT user_id FROM reports WHERE id = $1",
    [id],
  );
  if (owner.length === 0) return { status: "not_found" };
  if (Number(owner[0].user_id) !== userId) return { status: "forbidden" };

  const photos = await query<{ file_name: string }>(
    "SELECT file_name FROM report_photos WHERE report_id = $1",
    [id],
  );
  // 消えていたら（同時に消された）not_found として扱う
  const removed = await query<{ id: string }>(
    "DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId],
  );
  if (removed.length === 0) return { status: "not_found" };

  return { status: "deleted", fileNames: photos.map((p) => p.file_name) };
}

type CommentRow = {
  id: string | number;
  body: string;
  author_name: string;
  author_role: "user" | "gov";
  is_official: boolean;
  created_at: string;
};

function toComment(row: CommentRow): ReportComment {
  return {
    id: Number(row.id),
    body: row.body,
    authorName: row.author_name,
    authorRole: row.author_role,
    isOfficial: row.is_official,
    createdAt: row.created_at,
  };
}

const COMMENT_COLUMNS = `
  cm.id, cm.body, cm.is_official,
  u.display_name AS author_name,
  u.role         AS author_role,
  ${createdAtJst("cm.created_at")} AS created_at
`;

/** 投稿へのコメントを古い順に引く。 */
export async function listComments(reportId: number): Promise<ReportComment[]> {
  const rows = await query<CommentRow>(
    `SELECT ${COMMENT_COLUMNS}
       FROM report_comments cm
       JOIN users u ON u.id = cm.user_id
      WHERE cm.report_id = $1
      ORDER BY cm.created_at, cm.id`,
    [reportId],
  );
  return rows.map(toComment);
}

/** コメントを 1 件足す。**`isOfficial` はサーバーが決める**（interfaces.md I-5）。 */
export async function addComment(input: {
  reportId: number;
  userId: number;
  body: string;
  isOfficial: boolean;
}): Promise<ReportComment> {
  const rows = await query<CommentRow>(
    `WITH inserted AS (
       INSERT INTO report_comments (report_id, user_id, body, is_official)
       VALUES ($1, $2, $3, $4)
       RETURNING id, body, is_official, user_id, created_at
     )
     SELECT cm.id, cm.body, cm.is_official,
            u.display_name AS author_name,
            u.role         AS author_role,
            ${createdAtJst("cm.created_at")} AS created_at
       FROM inserted cm
       JOIN users u ON u.id = cm.user_id`,
    [input.reportId, input.userId, input.body, input.isOfficial],
  );
  return toComment(rows[0]);
}

/** 写真 1 枚の実体を引くための情報。`index` は 1 始まり（I-3 の photoUrls）。 */
export async function findPhoto(
  reportId: number,
  index: number,
): Promise<{ fileName: string; mimeType: string } | null> {
  const rows = await query<{ file_name: string; mime_type: string }>(
    "SELECT file_name, mime_type FROM report_photos WHERE report_id = $1 AND sort_order = $2",
    [reportId, index - 1],
  );
  return rows.length > 0
    ? { fileName: rows[0].file_name, mimeType: rows[0].mime_type }
    : null;
}
