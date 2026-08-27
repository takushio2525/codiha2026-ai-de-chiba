/** 投稿 API の入力の検証。**サーバー側からしか読み込まないこと**。
 *
 * 仕様の正本は docs/design/interfaces.md の I-3（一覧のクエリ）と I-4（投稿の作成）。
 * **どの項目が悪いか分かる日本語**を返すのが約束なので、reason はそのまま画面に出せる文にする。
 *
 * ここで守っているのは「入力の健全性」（docs/design/requirements.md 10-1）:
 *   - 写真の形式（JPEG / PNG / WebP）とサイズの上限
 *   - タイトル・本文の文字数の上限
 *   - クライアントが決めてよい項目だけを通す（city_code・rainfallMm・isOfficial は通さない）
 */
import type { Municipality } from "./municipalities";
import { isAllowedPhotoType, sniffImageType } from "./photoStore";
import {
  ALLOWED_PHOTO_TYPES,
  BODY_MAX_LENGTH,
  CHIBA_BOUNDS,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_COUNT,
  REPORTS_DEFAULT_LIMIT,
  REPORTS_MAX_LIMIT,
  REPORT_CATEGORY_IDS,
  REPORT_STATUS_IDS,
  TITLE_MAX_LENGTH,
  isReportCategory,
  isReportStatus,
  reportCategoryDef,
  type PhotoMimeType,
  type ReportCategory,
  type ReportStatus,
} from "./reports";
import type { ReportFilter } from "./reportStore";

/** 検証の結果。失敗したときは HTTP ステータスも一緒に決める。 */
export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string; status: number };

function bad(reason: string, status = 400): { ok: false; reason: string; status: number } {
  return { ok: false, reason, status };
}

// ---- I-3: 一覧のクエリ --------------------------------------------------------

/** `GET /api/reports` のクエリを検証する。既定値は I-3 の表のとおり。 */
export function parseListQuery(
  params: URLSearchParams,
  municipality: Municipality,
): Parsed<ReportFilter> {
  const categories = parseEnumList(params.get("category"), isReportCategory, REPORT_CATEGORY_IDS);
  if (!categories) {
    return bad(`category には ${REPORT_CATEGORY_IDS.join(" / ")} をカンマ区切りで指定してください。`);
  }

  const statuses = parseEnumList(params.get("status"), isReportStatus, REPORT_STATUS_IDS);
  if (!statuses) {
    return bad(`status には ${REPORT_STATUS_IDS.join(" / ")} をカンマ区切りで指定してください。`);
  }

  // 既定は市町村の範囲。地図の表示範囲が渡ってきたらそちらで絞る
  let bbox = municipality.bbox;
  const rawBbox = params.get("bbox");
  if (rawBbox !== null) {
    const parsed = parseBbox(rawBbox);
    if (!parsed) return bad("bbox は「西,南,東,北」の順に度で指定してください。");
    bbox = parsed;
  }

  let limit = REPORTS_DEFAULT_LIMIT;
  const rawLimit = params.get("limit");
  if (rawLimit !== null) {
    const value = Number(rawLimit);
    if (!Number.isInteger(value) || value < 1) {
      return bad("limit には 1 以上の整数を指定してください。");
    }
    if (value > REPORTS_MAX_LIMIT) {
      return bad(`limit は ${REPORTS_MAX_LIMIT} 以下にしてください。`);
    }
    limit = value;
  }

  return {
    ok: true,
    value: { cityCode: municipality.code, categories, statuses, bbox, limit },
  };
}

/** カンマ区切りの列挙。未指定なら全部。知らない値が 1 つでもあれば null（＝ 400）。 */
function parseEnumList<T extends string>(
  raw: string | null,
  guard: (value: unknown) => value is T,
  all: T[],
): T[] | null {
  if (raw === null) return all;
  const parts = raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  if (parts.length === 0) return null;
  const picked: T[] = [];
  for (const part of parts) {
    if (!guard(part)) return null;
    if (!picked.includes(part)) picked.push(part);
  }
  return picked;
}

function parseBbox(raw: string): [number, number, number, number] | null {
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = parts;
  if (west >= east || south >= north) return null;
  return [west, south, east, north];
}

/** 5 桁の市町村コード。数字以外は 400 にする。 */
export function parseCityCode(raw: string | null, fallback: string): string | null {
  if (raw === null || raw === "") return fallback;
  return /^[0-9]{5}$/.test(raw) ? raw : null;
}

// ---- I-4: 投稿の作成 ----------------------------------------------------------

export type NewPhotoInput = { bytes: Uint8Array; mimeType: PhotoMimeType };

export type NewReportInput = {
  category: ReportCategory;
  title: string;
  body: string;
  lat: number;
  lon: number;
  details: Record<string, string>;
  photos: NewPhotoInput[];
};

/** `POST /api/reports` の multipart を検証する。 */
export async function parseReportForm(form: FormData): Promise<Parsed<NewReportInput>> {
  const category = form.get("category");
  if (!isReportCategory(category)) {
    return bad("投稿の種類が正しくありません。");
  }

  const title = String(form.get("title") ?? "").trim();
  if (title.length === 0) return bad("タイトルを入力してください。");
  if (title.length > TITLE_MAX_LENGTH) {
    return bad(`タイトルは ${TITLE_MAX_LENGTH} 文字以内にしてください。`);
  }

  const body = String(form.get("body") ?? "").trim();
  if (body.length === 0) return bad("説明を入力してください。");
  if (body.length > BODY_MAX_LENGTH) {
    return bad(`説明は ${BODY_MAX_LENGTH} 文字以内にしてください。`);
  }

  const lat = Number(form.get("lat"));
  const lon = Number(form.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return bad("投稿する場所を地図で指定してください。");
  }
  if (
    lat < CHIBA_BOUNDS.lat[0] || lat > CHIBA_BOUNDS.lat[1] ||
    lon < CHIBA_BOUNDS.lon[0] || lon > CHIBA_BOUNDS.lon[1]
  ) {
    return bad("千葉県の範囲から外れています。県内の場所を指定してください。");
  }

  const details = parseDetails(category, form.get("details"));
  if (details === null) return bad("カテゴリ固有の項目が正しくありません。");

  const photos = await parsePhotos(form.getAll("photos"));
  if (!photos.ok) return photos;

  return { ok: true, value: { category, title, body, lat, lon, details, photos: photos.value } };
}

/** `details` はカテゴリ定義にあるキーと選択肢だけを通す。
 *  **rainfallMm などサーバーが決める項目は、送られてきても捨てる**（I-4）。 */
function parseDetails(
  category: ReportCategory,
  raw: FormDataEntryValue | null,
): Record<string, string> | null {
  if (raw === null || raw === "") return {};
  if (typeof raw !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return pickDetails(category, parsed);
}

/** 既に JSON として読めている `details` を検証する（PATCH の本体は JSON なので
 *  文字列を通らない）。通す条件は `parseDetails` と同じ。 */
function pickDetails(category: ReportCategory, parsed: unknown): Record<string, string> | null {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

  const source = parsed as Record<string, unknown>;
  const picked: Record<string, string> = {};
  for (const field of reportCategoryDef(category).detailFields) {
    const value = source[field.key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string") return null;
    if (!field.options.some((option) => option.value === value)) return null;
    picked[field.key] = value;
  }
  return picked;
}

/** 写真を検査して中身を読む。**申告された MIME を信じず、先頭バイトでも確かめる**。 */
async function parsePhotos(entries: FormDataEntryValue[]): Promise<Parsed<NewPhotoInput[]>> {
  const files = entries.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );
  if (files.length > PHOTO_MAX_COUNT) {
    return bad(`写真は ${PHOTO_MAX_COUNT} 枚までにしてください。`);
  }

  const photos: NewPhotoInput[] = [];
  for (const file of files) {
    if (file.size > PHOTO_MAX_BYTES) {
      return bad(
        `写真は 1 枚あたり ${Math.round(PHOTO_MAX_BYTES / 1024 / 1024)} MB 以内にしてください。`,
        413,
      );
    }
    if (!isAllowedPhotoType(file.type)) {
      return bad(`写真は ${ALLOWED_PHOTO_TYPES.join(" / ")} のいずれかにしてください。`);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sniffed = sniffImageType(bytes);
    if (sniffed === null) {
      return bad("画像として読めないファイルが含まれています。");
    }
    // 申告と中身が食い違うときは、**中身のほうを正**として記録する
    photos.push({ bytes, mimeType: sniffed });
  }
  return { ok: true, value: photos };
}

// ---- I-5: 投稿の更新（PATCH）----------------------------------------------------

/** `PATCH /api/reports/:id` の本体。**送られてきた項目だけ**が入る。
 *  `status` は行政ユーザー、それ以外は投稿者本人しか変えられない（権限判定は API 側）。 */
export type ReportPatch = {
  status?: ReportStatus;
  title?: string;
  body?: string;
  details?: Record<string, string>;
};

/** PATCH の本体を検証する。**「行政が触れる項目」と「投稿者が触れる項目」を
 *  ここで混ぜない**（どちらを含むかを見て、API 側が権限を判定する）。 */
export function parseReportPatch(category: ReportCategory, raw: unknown): Parsed<ReportPatch> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return bad("更新の内容を読み取れませんでした。");
  }
  const source = raw as Record<string, unknown>;
  const patch: ReportPatch = {};

  if (source.status !== undefined) {
    if (!isReportStatus(source.status)) {
      return bad(`対応状況には ${REPORT_STATUS_IDS.join(" / ")} のいずれかを指定してください。`);
    }
    patch.status = source.status;
  }

  if (source.title !== undefined) {
    if (typeof source.title !== "string") return bad("タイトルを入力してください。");
    const title = source.title.trim();
    if (title.length === 0) return bad("タイトルを入力してください。");
    if (title.length > TITLE_MAX_LENGTH) {
      return bad(`タイトルは ${TITLE_MAX_LENGTH} 文字以内にしてください。`);
    }
    patch.title = title;
  }

  if (source.body !== undefined) {
    if (typeof source.body !== "string") return bad("説明を入力してください。");
    const body = source.body.trim();
    if (body.length === 0) return bad("説明を入力してください。");
    if (body.length > BODY_MAX_LENGTH) {
      return bad(`説明は ${BODY_MAX_LENGTH} 文字以内にしてください。`);
    }
    patch.body = body;
  }

  if (source.details !== undefined) {
    const details = pickDetails(category, source.details);
    if (details === null) return bad("カテゴリ固有の項目が正しくありません。");
    patch.details = details;
  }

  if (Object.keys(patch).length === 0) {
    return bad("変更する項目がありません。");
  }
  return { ok: true, value: patch };
}

/** `status` だけを含む更新か（＝行政の操作か）。権限判定の分岐に使う。 */
export function patchTouchesContent(patch: ReportPatch): boolean {
  return patch.title !== undefined || patch.body !== undefined || patch.details !== undefined;
}

// ---- I-5: コメント -------------------------------------------------------------

/** 数値の ID。パスパラメータの検証に使う。 */
export function parseId(raw: string): number | null {
  if (!/^[0-9]+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
