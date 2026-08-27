# 現在の作業文脈

> **書き方**: ここには「**今の状態**」だけを書く。作業のたびに**上書き**する。
> 過去にやったことは `progress.md` に追記し、ここには残さない。
> **80 行を超えたら太りすぎ。** 過去の話を `progress.md` へ逃がす。

## 現在の対象

**プロダクトは CHIZUBA。P4（浸水報告・F-3 ＋ 注意案内・F-4）まで実装済み。**
**次は P5（観光・F-5/F-6）と P6（行政応答・F-7）。**

`cd app && docker compose up` → <http://localhost:3000> で、ハザードマップ（洪水・高潮・津波）と
避難場所 123・AED 304・子育て施設 388・徒歩ナビが動き、**ログインして危険箇所と浸水を投稿でき、
浸水には投稿時点の雨量が自動で焼き込まれ、雨の予報が出ているときは過去の浸水報告に注意案内が出る**。
一覧は `/reports`。**閲覧はログイン不要**。

何を作るかの正本は **`docs/design/requirements.md`**（機能 F-1〜F-8・画面 S-1〜S-7・実装順序）。

## 直近の観点

**気象は「サーバーで取ってキャッシュし、ブラウザには結果だけ渡す」形に固まった。**
上流の取得は `app/src/lib/jma.ts`（サーバー専用）、型と表示と F-4 の判定は
`app/src/lib/weather.ts`（ブラウザからも読む）に分かれている。

- **P5（観光・F-5/F-6）でやること**: `MapExplorer.tsx` の `POSTABLE_CATEGORIES` に
  `"spot"` を足せば投稿の入り口が増える。景観100選の GeoJSON 化（F-5）は別作業
- **P6（行政応答・F-7）でやること**: `PATCH /api/reports/:id`（`status` の更新）。
  **`GET`・`DELETE`・コメントは P3 で実装済み、`PATCH` だけが未実装**。
  コメントの `is_official` はもうサーバーが判定していて、行政の発言はバッジで区別されている
- **F-4 の文言は気象業務法の線に触れる。** 「浸水するでしょう」に類する予報表現を
  足さない。判定は `buildFloodAlert` 1 箇所、文言は `FloodAlertCard.tsx` 1 箇所

雨量は**最寄りのアメダスの値**であって、その地点の実測値ではない（市川市に観測所が無く
最寄りの船橋まで約 10 km）。**観測所名と距離を必ず併記する**建付けを崩さない。

投稿写真は `uploads` ボリューム（コンテナの `/app/uploads`）。**`docker compose down -v` は写真も
一緒に消す**。置き場のパスは環境変数で差し替えない（Next がパスを追えず、実行イメージが膨らむ）。

審査のコード評価は **実装割合 × 動作割合の掛け算**。
`requirements.md` §9-1 の「全フェーズ共通の完了条件」5 項目
（`docker compose up` だけで起動・前フェーズが壊れていない・typecheck・
`package_submission.sh --smoke`・`secret_scan.sh`）を**毎フェーズ通してから次へ行く**。

## 次の一手

1. **P5: 観光モード（F-5・F-6）** — 景観100選の GeoJSON 化と、投稿カテゴリ `spot` の開放
2. **P6: 行政からの応答（F-7）** — `PATCH /api/reports/:id` で対応状況を更新する
3. 提出物のうち **`readme.txt`・説明資料 PDF 2 種はまだ無い**。9/9 に向けて作る。
   固めるのは `bash tools/package_submission.sh`（検証込み）。**手で zip しない**
4. `docs/design/assignments.md` の担当表がまだ空欄。誰がどのフェーズを持つか埋める

## 現フェーズで読むべきドキュメント

- **気象まわりを触る段**: `docs/design/interfaces.md` の **I-6**（上流 JSON の諸元・
  降水確率のしきい値・異常時の約束）と `app/src/lib/jma.ts` の頭（実測で分かった落とし穴）
- **注意案内の文言を触る段**: `docs/design/requirements.md` §3-1（**気象業務法の線**）
- **投稿まわりを触る段**: `app/src/lib/reports.ts`（カテゴリ定義の正本）・`interfaces.md` I-3〜I-5・`app/db/init/001_schema.sql`
- **アプリに手を入れる段**: `.agent/architecture.md`・`.agent/conventions.md`・`app/README.md`（**既知の制約**）
- **提出物の判断**: `課題/2026-09-09_CODIHA2026_提出要件.md`（**正本**）
- **データを増やす段**: `data/analysis/findings.md`・`data/*/SOURCE.md`（出典・ライセンス・落とし穴）

## 決まっていること（変わりにくい前提）

| 項目 | 内容 |
|---|---|
| プロダクト | **CHIZUBA** — 千葉県の地図系サービスを束ね、住民と行政が相互に投稿できるウェブサイト |
| 表示名 | 画面・ブラウザタイトル・README すべて **CHIZUBA**。ワードマークは `AuthBar.tsx`（**sm 以上でだけ出す**）と `ControlPanel.tsx` の見出し。ブラウザタイトルは `layout.tsx` の `title.template` が末尾に付けるので、**子ページは画面名だけ書く**。`compose.yaml` の `name: ichikawa-opendata-map` だけは据え置き（意図的） |
| 対応範囲 | **千葉県全域**（市町村コードでパラメータ化）。**デモデータは市川市**（`12203`） |
| イベント | CODIHA 2026 ハッカソン部門・千葉工業大学会場（2026-08-24 開始） |
| チーム | 愛で千葉は救えるのか |
| **コード提出** | **2026-09-09（水）17:00** — `app/` を丸ごと zip / 7z ＋ 説明資料 PDF 2 種 |
| **プレゼン資料提出** | **2026-09-16（水）11:50** — PowerPoint・16:9・発表 10 分 + 質疑 3 分 |
| 実行環境 | Docker（`docker compose up`）。**コンテナ 2 つ**（`web` = `node:22-slim` / `db` = `postgres:17-alpine`。どちらも DOI）＋ ボリューム 2 つ（`db-data` / `uploads`） |
| 実装 | Next.js（App Router）+ TypeScript / MapLibre GL JS / Tailwind CSS v4 / lucide-react / `pg` / Auth.js |
| DB | **PostgreSQL 17**。**PostGIS は使わない**（緯度経度の数値カラム）。ORM もマイグレーションツールも入れない |
| 投稿 | **3 種類（危険箇所・浸水・観光おすすめ）を 1 テーブル・1 API・1 フォームに統一**。違いは `category` と `details`(jsonb) |
| 認証 | Google OAuth が本線。**キー未設定なら自動でデモログイン**（審査員はこちらで全機能を試せる） |
| 外部サービス | 国土地理院タイル・重ねるハザードマップ・OSRM・気象庁 JSON。**すべて認証キー不要** |
| 提出単位 | `app/` 配下のみ。**日本語ファイル名禁止**。`readme.txt` / `Dockerfile` / `compose.yaml` 必須 |
| 提出経路 | ハッカソン Slack のチーム用プライベートチャンネル（チーム代表者が投稿） |
| リポジトリ | **public**。氏名・学籍番号・配布資料・API キー・`.env` を置かない |
| その他 | 個別相談 9/3・9/4（1 チーム 30 分・Google Meet）。UI/UX デザインは Moqups |
