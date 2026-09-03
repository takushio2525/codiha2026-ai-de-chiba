# 03. ファイル全一覧

`git ls-files` が返す **269 ファイル**をすべて扱う。1 件も省かない。
バイナリ（画像・xls）はまとまりごとに件数で示し、除外したものは末尾に理由を書く。

各ファイルの見方:

- **役割** … 何のためのファイルか
- **主な export** … 他から使われる名前（TypeScript のみ）
- **→ import する** … このファイルが読み込むもの
- **← import される** … このファイルを読み込むもの（＝**壊すと影響が出る先**）

依存の向きは、`app/src` 配下の `from "…"` を機械的にたどって作った
（解決規則: `@/` → `app/src/`、相対パスはそのまま。`.ts`／`.tsx` を補う）。

---

## 3-0. 全体のファイル数

| ディレクトリ | 件数 | 提出 zip に入るか |
|---|---|---|
| `app/`（サービス本体） | 162 | **入る**（これが提出物） |
| `data/`（オープンデータと加工スクリプト） | 45 | 入らない |
| `docs/`（設計・発表資料） | 14 | 入らない |
| `deploy/`（自宅公開） | 6 | 入らない |
| `tools/`（提出物の生成・検証） | 8 | 入らない |
| `.github/`（CI・テンプレート） | 8 | 入らない |
| `.agent/`（AI 向け作業文脈） | 6 | 入らない |
| `meetings/` 5・`assets/` 3・ルート直下 8・`.vscode/` 2・`課題/` 2 | 20 | 入らない |
| **合計** | **269** | |

数え方: `git ls-tree -r --name-only main | wc -l` = **269**（2026-09-03 時点・この仕様書を足す前）。
内訳の合計 162+45+14+8+8+6+6+20 = 269 で一致する。

---

## 3-1. `app/` — サービス本体

### 3-1-1. ビルド・起動の設定（8 件）

| ファイル | 役割 | 繋がり |
|---|---|---|
| `app/Dockerfile` | 3 ステージのビルド定義。実行イメージは `.next/standalone` + `public` + `uploads` だけ | `compose.yaml` の `build: .` が使う。`db/seed-photos/` を `/app/uploads` へ配る |
| `app/compose.yaml` | コンテナ 2 つとボリューム 2 つの定義。`name: ichikawa-opendata-map` を固定 | `db/init/` を `/docker-entrypoint-initdb.d` にマウント。`.env` を任意で読む。`deploy/selfhost/compose.prod.yaml` が上書きする |
| `app/.dockerignore` | ビルド文脈から `node_modules`・`.next`・`readme.txt` などを除く | Docker ビルドが読む |
| `app/.env.example` | 環境変数のキーと説明だけ。**値は書かない**（public リポのため） | [10 章](10-config.md)。実際の値は `.gitignore` 済みの `app/.env` |
| `app/package.json` | 依存 9 個・devDependencies 5 個・スクリプト 5 個 | `npm ci` が `package-lock.json` と対で読む |
| `app/package-lock.json` | 依存の固定。linux 版バイナリも記録してあるので macOS でビルドしても linux 版が入る | `Dockerfile:14,17` |
| `app/next.config.ts` | `output: "standalone"` と `agentRules: false` の 2 行だけ | `npm run build` が読む |
| `app/tsconfig.json` | `strict: true`、パスエイリアス `@/*` → `./src/*` | `npm run typecheck`・エディタ |
| `app/postcss.config.mjs` | Tailwind CSS v4 のプラグイン登録 | ビルド時 |
| `app/next-env.d.ts` | Next.js が自動生成する型定義。**手で編集しない** | TypeScript |
| `app/scripts/copy-maplibre-worker.mjs` | MapLibre の Web Worker 2 本を `public/maplibre/` にコピー | `predev`／`prebuild` が実行。`MapView.tsx` の `setWorkerUrl()` と対 |
| `app/README.md` | 動かし方・何ができるか・**既知の制約**・提出アーカイブの作り方 | 人間向けの正本。`.dockerignore` で zip からは除かれる |

### 3-1-2. データベース（`app/db/`・20 件 = SQL 3 ＋ 写真 17）

| ファイル | 役割 |
|---|---|
| `app/db/init/001_schema.sql`（138 行） | **スキーマの正本**。5 テーブル・6 索引・`app_instance` に 1 行 |
| `app/db/init/002_seed_municipalities.sql`（18 行） | 市町村マスタ。市川市 `12203` の 1 行だけ |
| `app/db/init/003_seed_demo_reports.sql`（215 行） | デモユーザー 7・投稿 22・写真 17・コメント 6 |
| `app/db/seed-photos/*.jpg`（17 枚・4.2 MB） | デモ投稿の写真の実体。`Dockerfile:50` が `/app/uploads` へ配る |

写真の内訳: `demo-ref-*` が 6 枚（防災の**参考**写真・**市外で撮影**）、
`demo-spot-*` が 11 枚（観光・梨以外は市川市内）。出典は `app/src/lib/credits.ts` の
`DEMO_PHOTO_CREDITS` と `data/wikimedia-commons/SOURCE.md`。

### 3-1-3. 同梱データ（`app/public/`・58 件 = GeoJSON 4 ＋ 写真 54）

| ファイル | 件数 | 誰が読むか |
|---|---|---|
| `app/public/data/evacuation_sites.geojson` | 123 地点 / 60 KB | `lib/layers.ts` の `LAYERS[0].file` → `MapExplorer.tsx` が `fetch` |
| `app/public/data/aed_locations.geojson` | 304 地点 / 124 KB | 同上 `LAYERS[1].file` |
| `app/public/data/childcare_facilities.geojson` | 388 地点 / 152 KB | 同上 `LAYERS[2].file` |
| `app/public/data/scenic_spots.geojson` | 100 地点 / 84 KB | `lib/scenic.ts` の `SCENIC_FILE` → `MapExplorer.tsx` が `fetch` |
| `app/public/images/scenic/*.jpg` | 54 枚 / 11 MB | `lib/scenicPhotos.ts` の `scenicPhotoSrc()` → `MapView.tsx` のポップアップ・`/about` |

`public/maplibre/` は **git 管理外**（ビルド時に生成）。

### 3-1-4. 画面（`app/src/app/`・18 件 = ページ 5 ＋ API 8 ＋ レイアウト/CSS/アイコン 5）

| ファイル | 画面 | 役割 | → import | ← import される |
|---|---|---|---|---|
| `layout.tsx` | 全画面 | `<html lang="ja">`・`metadata`（タイトルの雛形）・`viewport`・`AuthBar` を常時表示 | `components/AuthBar.tsx` | Next.js が自動で使う |
| `page.tsx` | **S-1/S-2 地図** | `getSessionView()` と `?mode=` をサーバー側で解決して `MapExplorer` に渡すだけ（21 行） | `components/MapExplorer.tsx`, `lib/auth.ts`, `lib/mapModes.ts`, `lib/municipalities.ts` | — |
| `reports/page.tsx` | **S-5 投稿一覧** | サーバー側で `listReports()` を直接呼ぶ。絞り込みはリンクと GET フォームなので **JS 不要** | `components/DemoBadge/ExportLinks/FloodRainfall/OfficialBadge`, `lib/db/municipalities/reportInput/reportRange/reportStore/reports/searchText` | — |
| `login/page.tsx` | **S-6 ログイン** | 認証モードで Google の有無だけを出し分け、デモログインは常に出す | `components/DemoLoginForm.tsx`, `lib/auth/authActions/govPin/municipalities` | — |
| `about/page.tsx` | **S-7 出典** | データ出典・写真 54 枚と 17 枚の一覧・ハザードの凡例 | `components/HazardLegend.tsx`, `lib/credits/hazards/scenicPhotos` | — |
| `privacy/page.tsx` | **S-8 プライバシー** | 受け取る情報・保存先・外部送信を実装どおりに書いた静的ページ（343 行・import なし） | なし | — |
| `globals.css` | 全画面 | Tailwind v4 の `@theme`（色・書体）、MapLibre のポップアップの見た目と **z-index 15**、レンジ入力の当たり判定 | — | `layout.tsx` |
| `icon.svg` | — | **ロゴの正本**。`favicon.ico`・`apple-icon.png` はここから起こす | — | `components/BrandMark.tsx` が同じ図形を写している |
| `favicon.ico` / `apple-icon.png` | — | `icon.svg` から書き出した派生物 | — | ブラウザが自動で読む |

### 3-1-5. API ルート（`app/src/app/api/`）

| ファイル | メソッド | ログイン | 何をするか | → import |
|---|---|---|---|---|
| `api/reports/route.ts` | `GET` | 不要 | 条件に合う投稿を **GeoJSON** で返す | `apiResponse`, `apiRoute`, `auth`, `db`, `jma`, `photoStore`, `reportInput`, `reports`, `reportStore`, `weather` |
| 同上 | `POST` | **必須** | 投稿を作る。`city_code` はサーバーが座標から決める。浸水なら雨量を焼き込む | 同上 |
| `api/reports/[id]/route.ts` | `GET` | 不要 | 詳細＋コメント＋座標＋`isAuthor` | `apiResponse`, `apiRoute`, `auth`, `photoStore`, `reportInput`, `reports`, `reportStore` |
| 同上 | `PATCH` | **必須** | `status` は担当市町村の行政、`title`/`body`/`details` は投稿者本人 | 同上 |
| 同上 | `DELETE` | **必須** | 投稿者本人のみ。写真の実体も消す | 同上 |
| `api/reports/[id]/comments/route.ts` | `POST` | **必須** | コメント追加。`isOfficial` はサーバーが決める | `apiResponse`, `apiRoute`, `auth`, `reportInput`, `reports`, `reportStore` |
| `api/reports/export/route.ts` | `GET` | 不要 | CSV / GeoJSON で書き出す。条件は一覧と共通 | `apiResponse`, `apiRoute`, `reportExport`, `reportRange`, `reports`, `reportStore` |
| `api/photos/[reportId]/[index]/route.ts` | `GET` | 不要 | 写真 1 枚を配信（`Cache-Control: public, max-age=86400`） | `apiResponse`, `db`, `photoStore`, `reportInput`, `reportStore` |
| `api/weather/route.ts` | `GET` | 不要 | 気象庁の実況と予報を中継 | `apiResponse`, `db`, `jma`, `municipalities`, `reportInput`, `weather` |
| `api/routing/route.ts` | `GET` | 不要 | OSRM を中継（**1 秒 1 リクエスト**の待ち行列つき） | なし。**`lib/routing.ts` が型 `RouteResponse` をここから import する**（唯一の逆向き参照） |
| `api/auth/[...nextauth]/route.ts` | `GET`/`POST` | — | Auth.js のエンドポイント。**URL を公開ホストに直してから**渡す | `lib/auth.ts`, `lib/publicOrigin.ts` |

### 3-1-6. コンポーネント（`app/src/components/`・22 件）

依存の向きは実測（`from "…"` を解決）。

| ファイル | 行数 | 役割 | → import する | ← import される |
|---|---|---|---|---|
| `MapExplorer.tsx` | 687 | **状態の親**。地図・パネル・詳細・フォームの全状態をここで持つ | `ControlPanel`, `MapModeTabs`, `MapView`, `ReportForm`, `ReportPanel`, `SearchBox`, `Toast`, `lib/auth/geo/hazards/layers/mapModes/reportRange/reports/reportsApi/routing/scenic/searchText/weather` | `app/page.tsx` |
| `MapView.tsx` | 932 | MapLibre の生成・レイヤーの積み上げ・ポップアップの DOM 組み立て | `lib/basemap/credits/geo/hazards/layers/reports/routing/scenic/scenicPhotos` | `MapExplorer` |
| `ControlPanel.tsx` | 596 | 左（スマホは下）の操作パネル。表示切替・投稿ボタン・期間・書き出し・徒歩ナビ・ハザード | `BrandMark`, `DateRangeFilter`, `ExportLinks`, `FloodAlertCard`, `HazardLegend`, `RouteCard`, `SearchBox`, `ToggleRow`, `lib/geo/hazards/layers/reportRange/reports/routing/scenic/weather` | `MapExplorer` |
| `ReportPanel.tsx` | 438 | **S-3 投稿の詳細**。写真・本文・対応状況・コメント・編集・削除 | `DemoBadge`, `FloodRainfall`, `OfficialBadge`, `ReportEditForm`, `ReportStatusControl`, `lib/auth/geo/reports/reportsApi` | `MapExplorer` |
| `ReportForm.tsx` | 345 | **S-4 投稿フォーム**。入力欄は `REPORT_CATEGORIES` から組み立てる | `lib/geo/reports/reportsApi` | `MapExplorer` |
| `SearchBox.tsx` | 118 | キーワード検索の入力欄と候補一覧（最大 8 件） | `lib/geo`, `lib/searchText` | `ControlPanel`, `MapExplorer`（型 `SearchHit`） |
| `DateRangeFilter.tsx` | 105 | 期間の近道 4 つ＋日付入力 2 つ | `lib/reportRange` | `ControlPanel` |
| `ReportEditForm.tsx` | 140 | 投稿者本人による本文編集。位置と写真は変えられない | `lib/reports`, `lib/reportsApi` | `ReportPanel` |
| `ReportStatusControl.tsx` | 104 | 行政による対応状況の 4 段階更新 | `lib/reports`, `lib/reportsApi` | `ReportPanel` |
| `FloodRainfall.tsx` | 134 | 浸水投稿の雨量表示。**デモ値と実測値を別経路で描く** | `lib/reports`, `lib/weather` | `ReportPanel`, `reports/page.tsx` |
| `FloodAlertCard.tsx` | 78 | **F-4 注意案内**。事実 2 つを並べるだけ（予報表現を書かない） | `lib/reports`, `lib/weather` | `ControlPanel` |
| `HazardLegend.tsx` | 64 | 浸水深の凡例＋注意書き 2 本 | `lib/hazards` | `ControlPanel`, `about/page.tsx` |
| `RouteCard.tsx` | 74 | 徒歩ナビの結果（距離・所要時間・概算の断り） | `lib/geo`, `lib/routing` | `ControlPanel` |
| `ExportLinks.tsx` | 55 | CSV / GeoJSON のダウンロードリンク（`<a href>`・JS 不要） | `lib/reportExport`, `lib/reportRange`, `lib/reports` | `ControlPanel`, `reports/page.tsx` |
| `MapModeTabs.tsx` | 70 | 防災／観光の切り替えタブ | `lib/mapModes` | `MapExplorer` |
| `AuthBar.tsx` | 108 | 画面上部の帯（40px）。ロゴ・デモモード表示・投稿一覧・ログイン状態 | `BrandMark`, `OfficialBadge`, `lib/auth`, `lib/authActions` | `app/layout.tsx` |
| `DemoLoginForm.tsx` | 149 | デモログインのフォーム。**PIN 欄の出し入れは CSS（`peer-has-checked`）** | `lib/authActions`, `lib/displayName` | `login/page.tsx` |
| `ToggleRow.tsx` | 81 | 「出す／出さない」の 1 行。`SwitchTrack` も export | なし | `ControlPanel` |
| `OfficialBadge.tsx` | 51 | 行政の印（`#0072b2`）。`OfficialBadge` と `OfficialRoleBadge` | なし | `AuthBar`, `ReportPanel`, `reports/page.tsx` |
| `DemoBadge.tsx` | 58 | デモ投稿の印（灰 `#5b6270`）と断り書き `DemoNote` | なし | `ReportPanel`, `reports/page.tsx` |
| `BrandMark.tsx` | 28 | 画面の中のロゴ。`app/src/app/icon.svg` と**同じ図形** | なし | `AuthBar`, `ControlPanel` |
| `Toast.tsx` | 39 | 画面上部の短い通知（7 秒で自動的に消える） | なし | `MapExplorer` |

### 3-1-7. ライブラリ（`app/src/lib/`・31 件 ＋ 型定義 `app/src/types/` 1 件）

**サーバー専用**と書いてあるものをブラウザ側から import すると、
`pg` や `node:fs` がブラウザ向けバンドルに入って壊れる。

| ファイル | 行数 | 向き | 役割 | 主な export | ← import される |
|---|---|---|---|---|---|
| `reports.ts` | 289 | 両方 | **投稿の定義の正本**。カテゴリ 3 種・対応状況 4 段階・入力の上限・API の型 | `REPORT_CATEGORIES`, `REPORT_STATUSES`, `TITLE_MAX_LENGTH`…, `CHIBA_BOUNDS`, `isDemoReport`, `detailRows`, `formatJst`, `photoUrl`, `canUpdateStatus` | **22 ファイル**（最多） |
| `reportStore.ts` | 448 | サーバー | 投稿の読み書き。SQL はすべてここ | `listReports`, `findReport`, `createReport`, `updateReport`, `deleteReport`, `listComments`, `addComment`, `findPhoto`, `resolveCityCode`, `findReportOwnership` | 8 ファイル |
| `reportInput.ts` | 339 | サーバー | 入力の検証。**日本語の理由**を返す | `parseListQuery`, `parseReportForm`, `parseReportPatch`, `parseId`, `parseCityCode`, `patchTouchesContent` | 7 ファイル |
| `reportExport.ts` | 346 | 両方 | CSV（BOM+CRLF+RFC 4180）と GeoJSON（RFC 7946）の生成、URL の組み立て | `toCsv`, `toGeoJson`, `exportHref`, `exportFileName`, `EXPORT_CONTENT_TYPE`, `nowJstIso` | `api/reports/export`, `ExportLinks` |
| `reportRange.ts` | 107 | 両方 | 投稿日の範囲（**JST の暦日**）。近道 4 つ | `DateRange`, `todayJst`, `daysAgoJst`, `isDateKey`, `normalizeRange`, `describeRange`, `RANGE_PRESETS` | 9 ファイル |
| `reportsApi.ts` | 158 | ブラウザ | 投稿 API の薄いラッパ。**例外を投げない**（`ok` を見るだけでよい） | `fetchReports`, `fetchReportDetail`, `submitReport`, `submitComment`, `patchReport`, `deleteReport` | 5 コンポーネント |
| `db.ts` | 119 | サーバー | `pg` の接続プール。接続不能を `DbUnavailableError` に包む | `query`, `withTransaction`, `getPool`, `DbUnavailableError` | 9 ファイル |
| `auth.ts` | 266 | サーバー | Auth.js の設定。**Google とデモの分岐はここ 1 箇所** | `handlers`, `auth`, `signIn`, `signOut`, `getSessionView`, `SessionView` | 10 ファイル |
| `authMode.ts` | 65 | サーバー | 鍵の有無から認証モードを決める。`GOV_ACCOUNTS` の解釈 | `AUTH_MODE`, `GOOGLE_LOGIN_ENABLED`, `govCityCodeFor` | `auth.ts` のみ |
| `authActions.ts` | 62 | サーバー | `"use server"`。ログイン／ログアウトのフォームアクション | `demoLoginAction`, `googleSignInAction`, `signOutAction` | `login/page.tsx`, `AuthBar`, `DemoLoginForm` |
| `govPin.ts` | 124 | サーバー | 行政ロールの PIN。**総当たり対策 2 段**（指数バックオフ＋ロックアウト） | `GOV_PIN_REQUIRED`, `verifyGovPin` | `auth.ts`, `authActions.ts`, `login/page.tsx` |
| `installId.ts` | 75 | サーバー | このインストールの UUID。**署名鍵をここから導く** | `getInstallId`, `sessionSecretFor` | `auth.ts` のみ |
| `users.ts` | 59 | サーバー | `users` の upsert（provider + provider_uid で一意） | `upsertUser`, `UserRole`, `AppUser` | `auth.ts`, `types/nextAuth.d.ts` |
| `municipalities.ts` | 57 | サーバー | 市町村マスタの読み出し。`DEMO_CITY_CODE = "12203"` | `findMunicipality`, `DEMO_CITY_CODE`, `Municipality` | 7 ファイル |
| `publicOrigin.ts` | 76 | サーバー | `X-Forwarded-Host` →（無ければ）`Host` から公開オリジンを導く | `publicOriginFrom` | `api/auth/[...nextauth]/route.ts` のみ |
| `photoStore.ts` | 104 | サーバー | 写真の実体（`uploads/`）。**先頭バイトで形式を判定** | `savePhoto`, `readPhoto`, `removePhotos`, `sniffImageType`, `isAllowedPhotoType` | 4 ファイル |
| `jma.ts` | 290 | サーバー | 気象庁 JSON の取得とキャッシュ | `observeRainfall`, `forecastRain` | `api/reports`, `api/weather` |
| `weather.ts` | 197 | 両方 | 気象の型・表示・**注意案内を出す条件** | `buildFloodAlert`, `RAIN_POP_THRESHOLD`, `AMEDAS_MAX_DISTANCE_KM`, `toFloodDetails`, `readFloodObservation`, `readDemoRainfall`, `fetchWeather` | 7 ファイル |
| `apiRoute.ts` | 63 | サーバー | ルートが繰り返す前処理（DB 落ちの 503・一覧条件の解釈） | `withDb`, `resolveListQuery` | 4 ルート |
| `apiResponse.ts` | 18 | サーバー | 失敗レスポンスの形（`{ ok: false, reason }`） | `apiFail`, `dbUnavailable` | 6 ルート＋`apiRoute` |
| `searchText.ts` | 28 | 両方 | 検索語の NFKC 正規化＋小文字化 | `normalizeSearch`, `searchMatches`, `SEARCH_MAX_LENGTH` | 4 ファイル |
| `displayName.ts` | 23 | 両方 | 表示名の正規化と検証（30 字） | `normalizeDisplayName`, `validateDisplayName`, `DISPLAY_NAME_MAX` | 3 ファイル |
| `layers.ts` | 94 | 両方 | **オープンデータのレイヤー定義の正本**（3 本）。色・ポップアップ項目 | `LAYERS`, `pointLayerId`, `FacilityProps`, `LayerId` | 5 ファイル |
| `scenic.ts` | 93 | 両方 | 景観100選の定義。カテゴリ 4 種の色、配列プロパティの読み取り | `SCENIC_CATEGORIES`, `SCENIC_FILE`, `scenicCategories`, `scenicColor` | 4 ファイル |
| `scenicPhotos.ts` | 420 | 両方 | **自動生成**。スポット名 → 写真 54 件と出典 | `SCENIC_PHOTOS`, `scenicPhoto`, `scenicPhotoSrc` | `MapView`, `about/page.tsx` |
| `hazards.ts` | 170 | 両方 | ハザードのタイル定義 3 本・凡例 2 種・注意書き | `HAZARDS`, `HAZARD_LEGENDS`, `HAZARD_RENDER_MINZOOM`, `HAZARD_CAUTIONS`, `visibleHazardLegends` | 6 ファイル |
| `mapModes.ts` | 102 | 両方 | 防災／観光モードの既定の組 | `MAP_MODES`, `parseMapMode`, `layerVisibilityFor`, `hazardVisibilityFor`, `reportVisibilityFor` | 3 ファイル |
| `basemap.ts` | 33 | 両方 | 国土地理院タイルのスタイル定義。初期中心と縮尺 | `basemapStyle`, `ICHIKAWA_CENTER`, `INITIAL_ZOOM`, `GSI_ATTRIBUTION` | `MapView` のみ |
| `geo.ts` | 119 | 両方 | 距離計算（haversine）・徒歩ナビの候補の型・書式 | `haversineMeters`, `NavCandidate`, `facilityCandidates`, `scenicCandidates`, `nearestCandidate`, `formatDistance`, `formatDuration` | 8 ファイル |
| `routing.ts` | 75 | ブラウザ | 経路の取得。失敗したら直線＋4.8 km/h の概算に落とす | `fetchWalkingRoute`, `WalkingRoute`, `RouteTarget` | 4 ファイル |
| `credits.ts` | 281 | 両方 | **出典の正本**。データ 6 件・デモ写真 17 件・地図の帰属 | `DATA_CREDITS`, `DEMO_PHOTO_CREDITS`, `MAP_ATTRIBUTION` | `MapView`, `about/page.tsx` |
| `types/nextAuth.d.ts` | 27 | — | `next-auth` の `Session`/`User` に `role`・`govCityCode` を足す型拡張 | — | TypeScript が自動で拾う |

---

## 3-2. `data/` — オープンデータと加工（45 件）

| パス | 件数 | 役割 |
|---|---|---|
| `data/README.md` | 1 | `data/` の規約（生データは `<ソース>/raw/`、出典は `SOURCE.md`） |
| `data/scripts/manifest.json` | 1 | **取得先の一覧**。千葉県 8 件・市川市 9 件の URL とタイトル |
| `data/scripts/fetch_datasets.py`（69 行） | 1 | manifest の URL を順に取得して `raw/` へ置く |
| `data/scripts/build_geojson.py`（213 行） | 1 | **市川市 CSV → `app/public/data/*.geojson`**。cp932・市域外座標の除外・列名の英字化 |
| `data/scripts/fetch_scenic_photos.py`（231 行） | 1 | コモンズから景観スポットの写真を取得（`--credits` で出典も） |
| `data/scripts/build_scenic_photos_ts.py`（110 行） | 1 | 取得結果 → `app/src/lib/scenicPhotos.ts` を**生成** |
| `data/scripts/scenic_photo_credits.json` | 1 | 上 2 本が受け渡す出典データ |
| `data/scripts/fetch_seed_photos.py`（157 行） | 1 | デモ投稿用の写真 17 枚を取得（`app/db/seed-photos/`） |
| `data/ichikawa-city/raw/*.csv` | 9 | 市川市オープンデータの生データ（cp932・CRLF） |
| `data/ichikawa-city/SOURCE.md` | 1 | 出典・ライセンス（CC BY 4.0）・取得日・**元データの誤り**の記録 |
| `data/chiba-pref/raw/*.xls,xlsx` | 8 | 千葉県オープンデータの生データ（PDL1.0） |
| `data/chiba-pref/SOURCE.md` | 1 | 出典・ライセンス・API の注意 |
| `data/wikimedia-commons/SOURCE.md` | 1 | デモ写真 17 枚の台帳（**市外撮影 7 枚の断り**を含む） |
| `data/analysis/README.md`・`requirements.txt` | 2 | 分析環境の作り方 |
| `data/analysis/findings.md` | 1 | オープンデータの所見（アイデア出しの起点） |
| `data/analysis/scripts/*.py` | 5 | 分析図の生成（`common.py` ＋ 4 本） |
| `data/analysis/figures/*.png` | 9 | 生成した図。**アプリには載らない**（発表資料向け） |

**アプリが読むのは `app/public/data/` に出した GeoJSON だけ。**
`data/` 配下はアプリのビルドにも実行にも関与しない（提出 zip にも入らない）。

---

## 3-3. `deploy/` — 自宅の Mac での公開（6 件）

| ファイル | 役割 |
|---|---|
| `deploy/README.md` | `deploy/` の説明 |
| `deploy/selfhost/README.md` | 手順書（Tailscale の準備・運用・**素の `docker compose up` を打つなという警告**） |
| `deploy/selfhost/compose.prod.yaml`（97 行） | 常時稼働の**差分だけ**。`restart: unless-stopped`・`127.0.0.1` へのみ公開 |
| `deploy/selfhost/setup.sh`（549 行） | 前提確認 → 起動 → Funnel 設定。**冪等** |
| `deploy/selfhost/make_qr.py`（553 行） | 公開 URL の QR コード生成 |
| `deploy/selfhost/verify_qr.sh`（173 行） | 生成した QR が読めるかの検証 |

**提出アーカイブには入らない**（`app/` の外にあるため）。

---

## 3-4. `tools/` — 提出物の生成と検証（8 件）

| ファイル | 役割 |
|---|---|
| `tools/package_submission.sh`（422 行） | **提出アーカイブの生成と 9 項目の検査**。`--smoke` で実起動まで見る |
| `tools/README.md` | `tools/` の説明 |
| `tools/verification/evaluate.py`（256 行） | 評価指標の判定 |
| `tools/verification/metrics.md`・`README.md`・`results/README.md` | 指標の定義と置き場 |
| `tools/example_analysis/README.md`・`tools/example_benchmark/README.md` | テンプレート由来の雛形（**中身は空**） |

---

## 3-5. `.github/` — CI と秘匿情報スキャン（8 件）

| ファイル | 役割 |
|---|---|
| `.github/workflows/secret-scan.yml`（25 行） | **唯一の CI**。push・PR・手動で走る |
| `.github/scripts/secret_scan.sh`（173 行） | 追跡中のテキストファイルを走査。**バイナリは意図的に除外**（誤検知するため） |
| `.github/secret-scan-patterns.txt` | 検知パターン（学籍番号・メール・API キー・パスワード・ホームパス・アカウント ID） |
| `.github/secret-scan-allowlist.txt` | 除外リスト（スキャン自身の 3 ファイル＋`example.com` などのプレースホルダ） |
| `.github/ISSUE_TEMPLATE/*.md`（3 件）・`PULL_REQUEST_TEMPLATE.md` | GitHub の入力テンプレート |

---

## 3-6. `docs/` — 設計と発表資料（14 件＋この仕様書と利用説明書）

| ファイル | 役割 |
|---|---|
| `docs/README.md` | `docs/` の案内 |
| `docs/before_coding.md`（221 行） | 開始前に決めたこと（担当の切り方・public/private の線引き） |
| `docs/design/requirements.md`（715 行） | **何を作るかの正本**。F-1〜F-8・画面 S-1〜S-8・実装順序 |
| `docs/design/interfaces.md`（609 行） | **つなぎ目の正本**。I-1〜I-10（API の形） |
| `docs/design/data_flow.md`・`protocol.md` | データの流れと通信の約束 |
| `docs/design/assignments.md` | 担当表（**現時点で空欄**） |
| `docs/decisions/0001-template.md` | 設計判断記録（ADR）の雛形。**まだ 1 件も書かれていない** |
| `docs/presentation/chizuba-overview.progfocus.md` | 発表用の概要 |
| `docs/presentation/chizuba-tech-explainer.typ` / `.pdf` | 技術解説 A4 23 ページ（Typst） |
| `docs/presentation/verify_explainer.py` / `verify_progfocus.py` | 発表資料の自動検査 |
| `docs/presentation/README.md` | 発表資料の作り方 |

---

## 3-7. `.agent/`・`meetings/`・`assets/`・ルート直下

| パス | 件数 | 役割 |
|---|---|---|
| `.agent/README.md`・`activeContext.md`・`progress.md`・`progress-archive.md`・`architecture.md`・`conventions.md` | 6 | AI 向けの作業文脈と設計判断・規約 |
| `meetings/gantt.md`・`wbs.md`・`2026-04-15_kickoff.md`・`_template.md`・`README.md` | 5 | 進行管理 |
| `assets/README.md`・`format_spec.md`・`examples/.gitkeep` | 3 | データ形式の検討メモ |
| `AGENTS.md` | 1 | **AI の入口**。重要パス・よく使うコマンド・守ること |
| `CLAUDE.md` | 1 | `@AGENTS.md` へのリダイレクト 1 行 |
| `README.md` | 1 | リポジトリの入口（人間向け） |
| `CONTRIBUTING.md` | 1 | Git の使い方（`rebase` を使わない等） |
| `LICENSE` | 1 | ライセンス |
| `.gitignore`・`.gitattributes`・`.editorconfig` | 3 | Git とエディタの設定 |
| `.vscode/extensions.json`・`settings.json` | 2 | エディタ設定 |
| `課題/2026-09-09_CODIHA2026_提出要件.md` | 1 | **提出要件の正本** |
| `課題/2026-08-24_市川市説明資料_要点.md` | 1 | 市川市説明資料の要点抽出 |

---

## 3-8. この章で扱わなかったもの（除外理由つき）

| 対象 | 件数 | 除外の理由 |
|---|---|---|
| `app/public/images/scenic/*.jpg` の個別 54 件 | 54 | 内容が同種。1 枚ごとの出典は `app/src/lib/scenicPhotos.ts` と `data/wikimedia-commons/SOURCE.md` が持つ |
| `app/db/seed-photos/*.jpg` の個別 17 件 | 17 | 同上。出典は `app/src/lib/credits.ts` の `DEMO_PHOTO_CREDITS` |
| `data/*/raw/` の個別ファイル | 17 | 出典・件数は [09 章](09-data-pipeline.md)の対応表に一覧で載せた |
| `data/analysis/figures/*.png` | 9 | 分析図。アプリに載らず、コードとも繋がらない |
| `app/public/maplibre/*` | 2 | **git 管理外**。`npm run build` 時に生成される |
| `app/uploads/`・`app/.env`・`app/readme.txt` | — | **git 管理外**（`.gitignore`）。`readme.txt` は氏名を書くため意図的に追跡しない |
