/** 投稿（危険箇所・浸水・観光おすすめ）の共通定義。
 *
 * **ブラウザ側からも読み込む**ので、ここに DB や Node.js の API を持ち込まないこと
 * （サーバー側の読み書きは `reportStore.ts`、写真の実体は `photoStore.ts`）。
 *
 * 3 種類の投稿は **1 つのモデル**にまとめてある（docs/design/requirements.md 4 章）。
 * 違いは `category` と、カテゴリ固有の `details` だけ。
 * **カテゴリを増やす作業 = 下の REPORT_CATEGORIES に 1 行足すだけ**にしてある。
 * フォームの入力欄も詳細パネルの表示も、この表から組み立てる。
 *
 * 値と上限の正本は docs/design/interfaces.md の I-3・I-4・I-5。
 */

export type ReportCategory = "hazard" | "flood" | "spot";

/** 行政の対応状況。変えられるのは担当市町村の行政ユーザーだけ（F-7 / P6）。 */
export type ReportStatus = "open" | "ack" | "in_progress" | "done";

/** 凡例と操作パネルに出す lucide のアイコン名。色だけに頼らず形でも区別する。 */
export type ReportIconName = "triangleAlert" | "droplets" | "camera";

/** `details` に入れられる項目。ここに無いキーはサーバーが捨てる（詐称を防ぐため）。 */
export type ReportDetailField = {
  /** `details` の中のキー */
  key: string;
  label: string;
  /** 選べる値。クライアントはこの中からしか選べない */
  options: { value: string; label: string }[];
};

export type ReportCategoryDef = {
  id: ReportCategory;
  /** 操作パネル・一覧に出す名前 */
  label: string;
  /** 地図の点とバッジの色。Okabe-Ito（色覚多様性に配慮した配色）から取る */
  color: string;
  icon: ReportIconName;
  summary: string;
  /** 地図で最初から表示するか。観光の投稿は観光モード（S-2）で出す */
  defaultVisible: boolean;
  /** カテゴリ固有の項目。フォームと詳細パネルの両方がこれを読む */
  detailFields: ReportDetailField[];
};

/** 投稿のカテゴリ定義。**ここが 3 種類統一モデルの実体**。 */
export const REPORT_CATEGORIES: ReportCategoryDef[] = [
  {
    id: "hazard",
    label: "危険箇所",
    color: "#e69f00",
    icon: "triangleAlert",
    summary: "壊れたガードレール・陥没した路面など、直してほしい場所",
    defaultVisible: true,
    detailFields: [
      {
        key: "hazardType",
        label: "危険の種別",
        options: [
          { value: "road", label: "道路・歩道" },
          { value: "light", label: "照明・電柱" },
          { value: "bank", label: "護岸・水路" },
          { value: "playground", label: "公園・遊具" },
          { value: "other", label: "その他" },
        ],
      },
    ],
  },
  {
    id: "flood",
    label: "浸水",
    color: "#56b4e9",
    icon: "droplets",
    summary: "冠水している場所。投稿した時点の雨量も記録される",
    defaultVisible: true,
    detailFields: [
      {
        key: "depthLevel",
        label: "冠水の深さ",
        options: [
          { value: "ankle", label: "足首まで" },
          { value: "knee", label: "膝まで" },
          { value: "waist", label: "腰まで" },
        ],
      },
    ],
  },
  {
    id: "spot",
    label: "観光おすすめ",
    color: "#cc79a7",
    icon: "camera",
    summary: "景観・お土産・飲食のおすすめ",
    defaultVisible: false,
    detailFields: [
      {
        key: "spotType",
        label: "おすすめの種別",
        options: [
          { value: "scenery", label: "景観" },
          { value: "souvenir", label: "お土産" },
          { value: "food", label: "飲食" },
          { value: "other", label: "その他" },
        ],
      },
    ],
  },
];

export const REPORT_CATEGORY_IDS: ReportCategory[] = REPORT_CATEGORIES.map((c) => c.id);

export function reportCategoryDef(id: ReportCategory): ReportCategoryDef {
  // 呼び出し側は必ず妥当な値を渡す（API 側で検証済み）。念のため既定を返す
  return REPORT_CATEGORIES.find((c) => c.id === id) ?? REPORT_CATEGORIES[0];
}

export function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === "string" && REPORT_CATEGORY_IDS.includes(value as ReportCategory);
}

/** 対応状況の表示。**更新できるのは担当市町村の行政ユーザーだけ**（F-7 / P6）。
 *  `summary` は行政が選ぶときに出す 1 行の説明で、4 段階の使い分けを迷わせないためのもの。 */
export const REPORT_STATUSES: { id: ReportStatus; label: string; summary: string }[] = [
  { id: "open", label: "未対応", summary: "まだ確認していない" },
  { id: "ack", label: "受付", summary: "受け付けた。確認はこれから" },
  { id: "in_progress", label: "対応中", summary: "現地の確認・工事などを進めている" },
  { id: "done", label: "対応済", summary: "対応が終わった" },
];

export const REPORT_STATUS_IDS: ReportStatus[] = REPORT_STATUSES.map((s) => s.id);

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && REPORT_STATUS_IDS.includes(value as ReportStatus);
}

export function reportStatusLabel(id: ReportStatus): string {
  return REPORT_STATUSES.find((s) => s.id === id)?.label ?? id;
}

/** **対応状況を変えられるか**（担当市町村の行政ユーザーだけ・F-7）。
 *
 * **画面の出し分けにしか使わない。** ここを信じて権限を決めてはいけない
 * （権限判定は必ず API 側でセッションを見て行う・interfaces.md I-5 / I-8）。 */
export function canUpdateStatus(
  user: { role: "user" | "gov"; govCityCode: string | null } | null | undefined,
  report: { cityCode: string },
): boolean {
  return user != null && user.role === "gov" && user.govCityCode === report.cityCode;
}

// ---- 入力の上限（interfaces.md I-4・I-5 が正本）------------------------------
export const TITLE_MAX_LENGTH = 60;
export const BODY_MAX_LENGTH = 1000;
export const COMMENT_MAX_LENGTH = 500;
export const PHOTO_MAX_COUNT = 3;
/** 写真 1 枚の上限。DB の report_photos.byte_size の CHECK と同じ値にすること */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
/** 1 リクエストの上限（写真込み） */
export const REQUEST_MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoMimeType = (typeof ALLOWED_PHOTO_TYPES)[number];

/** 千葉県のおおよその範囲。ここから外れた座標は受け付けない（I-4）。 */
export const CHIBA_BOUNDS = {
  lat: [34.8, 36.2],
  lon: [139.7, 140.9],
} as const;

/** 一覧で 1 度に返す件数（I-3）。 */
export const REPORTS_DEFAULT_LIMIT = 500;
export const REPORTS_MAX_LIMIT = 1000;

// ---- API の形（interfaces.md I-3）-------------------------------------------

/** GeoJSON の properties。**メールアドレスと provider_uid は絶対に入れない**。 */
export type ReportProperties = {
  id: number;
  category: ReportCategory;
  title: string;
  body: string;
  cityCode: string;
  status: ReportStatus;
  /** 表示名のみ */
  authorName: string;
  authorRole: "user" | "gov";
  /** JST（+09:00）の ISO 8601 */
  createdAt: string;
  photoCount: number;
  photoUrls: string[];
  commentCount: number;
  hasOfficialComment: boolean;
  /** カテゴリ固有の項目。知らないキーは無視する */
  details: Record<string, unknown>;
};

export type ReportFeature = {
  type: "Feature";
  /** 座標は [経度, 緯度] */
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: ReportProperties;
};

export type ReportCollection = {
  type: "FeatureCollection";
  features: ReportFeature[];
};

export type ReportComment = {
  id: number;
  body: string;
  authorName: string;
  authorRole: "user" | "gov";
  /** 行政の公式回答かどうか。サーバーが決める（I-5） */
  isOfficial: boolean;
  createdAt: string;
};

/** `GET /api/reports/:id` の成功レスポンス。 */
export type ReportDetail = {
  ok: true;
  report: ReportProperties;
  /** 地図を投稿の位置へ寄せるために返す。[経度, 緯度] */
  coordinates: [number, number];
  comments: ReportComment[];
  /** 今ログインしている人がこの投稿の投稿者か。**削除ボタンを出すかの判断にだけ使う**。
   *  投稿者の ID は返さない（表示名とロール以外を出さないため）ので、
   *  サーバーがセッションと突き合わせた結果だけを渡す。権限判定は API 側で改めて行う */
  isAuthor: boolean;
};

/** GeoJSON 以外の経路はすべてこの形（interfaces.md の共通の約束 2）。 */
export type ApiFailure = { ok: false; reason: string };

export const EMPTY_REPORT_COLLECTION: ReportCollection = {
  type: "FeatureCollection",
  features: [],
};

// ---- 表示の補助 --------------------------------------------------------------

/** **デモ投稿かどうか。**
 *
 * 初回起動時に入るデモ投稿（`app/db/init/003_seed_demo_reports.sql`）だけが
 * `details.demo` を持つ。審査員が起動した直後から機能が動いて見えるように
 * 入れてあるデータで、**実際の通報ではない**。画面ではバッジを出して区別し、
 * 浸水の雨量は「デモ値」として表示する（`components/FloodRainfall.tsx`）。
 *
 * **利用者の投稿にこの印が付くことはない。** API は `details` のうち
 * カテゴリ定義にあるキーしか通さないので（`reportInput.ts` の `parseDetails`）、
 * `demo` を送り付けても捨てられる。
 */
export function isDemoReport(details: Record<string, unknown> | null | undefined): boolean {
  return details?.demo === true;
}

/** `details` を「ラベル: 値」の並びに直す。定義に無いキーは出さない（I-3）。 */
export function detailRows(
  category: ReportCategory,
  details: Record<string, unknown>,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (const field of reportCategoryDef(category).detailFields) {
    const raw = details?.[field.key];
    if (typeof raw !== "string") continue;
    const option = field.options.find((o) => o.value === raw);
    if (option) rows.push({ label: field.label, value: option.label });
  }
  return rows;
}

/** JST での表示。API が返す文字列は +09:00 付きなので、そのまま日本時間で読める。 */
const JST_FORMAT = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return JST_FORMAT.format(date);
}

/** 写真の配信 URL（I-3 の photoUrls）。`index` は 1 始まり。 */
export function photoUrl(reportId: number, index: number): string {
  return `/api/photos/${reportId}/${index}`;
}
