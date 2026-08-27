# 現在の作業文脈

> **書き方**: ここには「**今の状態**」だけを書く。作業のたびに**上書き**する。
> 過去にやったことは `progress.md` に追記し、ここには残さない。
> **80 行を超えたら太りすぎ。** 過去の話を `progress.md` へ逃がす。

## 現在の対象

**プロダクトは CHIZUBA。P6（行政応答・F-7）まで実装済み。残るは P8（Google ログイン本線）と提出物。**

`cd app && docker compose up` → <http://localhost:3000> で、ハザードマップ（洪水・高潮・津波）と
避難場所 123・AED 304・子育て施設 388・徒歩ナビが動き、**ログインして危険箇所・浸水・観光おすすめを
投稿でき、行政は対応状況を 4 段階で更新、投稿者は本文を編集できる**。
浸水には投稿時点の雨量が焼き込まれ、雨の予報が出ていれば注意案内（F-4）が出る。
**投稿は日付の範囲・キーワードで絞れ、絞ったまま CSV / GeoJSON で書き出せる。**
一覧は `/reports`。**閲覧はログイン不要**。ヘッダー直下のタブで防災 / 観光を切り替える。

何を作るかの正本は **`docs/design/requirements.md`**（機能 F-1〜F-8・§3-4 の追加分・画面 S-1〜S-7・実装順序）。

## 直近の観点

- **このアプリはスマホから使う（モバイルファースト）。** 新しい UI は **375px 幅で先に決めてから**
  広い画面へ広げ、**375px で実際に動かして確かめる**。守り方は `.agent/conventions.md` の同名の節
- **F-4 の注意案内は期間の絞り込みに引きずらせない。** 絞ったせいで「過去に浸水報告はありません」に
  なると防災の判断を誤らせるので、根拠になる浸水報告だけ全期間で引き直す（`MapExplorer` の `loadReports`）
- **セッションはこの DB に縛られている。** 署名鍵は `app_instance.install_id` から導き、
  トークンにも同じ ID が入っていて毎回突き合わせる（`app/src/lib/installId.ts`）。
  **`docker compose down -v` をすると全員ログアウトになる**（ID が変わるため）
- **デモ投稿の雨量は書き出しに含めない。** 観測値ではないので、観測値の顔をした列に入れない
- **F-4 の文言は気象業務法の線に触れる。** 「浸水するでしょう」に類する予報表現を足さない

雨量は**最寄りのアメダスの値**で、その地点の実測値ではない。**観測所名と距離を必ず併記する**。

投稿写真は `uploads` ボリューム（`/app/uploads`）。**`docker compose down -v` は写真も消す**。

審査のコード評価は **実装割合 × 動作割合の掛け算**。`requirements.md` §9-1 の
「全フェーズ共通の完了条件」5 項目（`docker compose up` だけで起動・前フェーズが壊れていない・
typecheck・`package_submission.sh --smoke`・`secret_scan.sh`）を**毎フェーズ通す**。

## 次の一手

1. **P8: Google ログイン（F-8 の本線）** — キーを設定した環境だけ Google に切り替わり、
   未設定ならデモログインのまま動くことを確かめる。**9/9 直前には触らない**
2. 提出物のうち **`readme.txt`・説明資料 PDF 2 種はまだ無い**。9/9 に向けて作る。
   固めるのは `bash tools/package_submission.sh`（検証込み）。**手で zip しない**
3. `docs/design/assignments.md` の担当表がまだ空欄。誰がどのフェーズを持つか埋める

## 現フェーズで読むべきドキュメント

- **UI を足す段**: `.agent/conventions.md` の「モバイルファースト」（375px 先行・実機確認）
- **投稿 API を触る段**: `docs/design/interfaces.md` I-3〜I-5・**I-10**（書き出し）・
  `app/src/lib/reports.ts`（カテゴリ定義の正本）・`app/db/init/001_schema.sql`
- **認証を触る段**: `docs/design/requirements.md` §8（特に **§8-6** のインストール ID）・
  `app/src/lib/installId.ts`・`app/.env.example`
- **気象まわりを触る段**: `interfaces.md` **I-6** と `app/src/lib/jma.ts` の頭（実測の落とし穴）
- **注意案内の文言を触る段**: `requirements.md` §3-1（**気象業務法の線**）
- **地図に何か足す段**: `mapModes.ts`（モードの組）・`scenic.ts`（景観）・`layers.ts`（施設）
- **アプリに手を入れる段**: `.agent/architecture.md`・`app/README.md`（**既知の制約**）
- **提出物の判断**: `課題/2026-09-09_CODIHA2026_提出要件.md`（**正本**）
- **データを増やす段**: `data/analysis/findings.md`・`data/*/SOURCE.md`（出典・ライセンス・落とし穴）

## 決まっていること（変わりにくい前提）

| 項目 | 内容 |
|---|---|
| プロダクト | **CHIZUBA** — 千葉県の地図系サービスを束ね、住民と行政が相互に投稿できるウェブサイト |
| 表示名 | 画面・ブラウザタイトル・README すべて **CHIZUBA**。子ページは画面名だけ書く（`title.template` が付ける）。`compose.yaml` の `name: ichikawa-opendata-map` だけは据え置き（意図的） |
| ロゴ | 正本は `app/src/app/icon.svg`。画面の中は `BrandMark.tsx` に同じ図形。**変えるなら両方** |
| UI の前提 | **モバイルファースト**（375px 先行・320px でも溢れない）。`AuthBar` の 3 段構えは崩さない |
| 対応範囲 | **千葉県全域**（市町村コードでパラメータ化）。**デモデータは市川市**（`12203`） |
| イベント | CODIHA 2026 ハッカソン部門・千葉工業大学会場 |
| チーム | 愛で千葉は救えるのか |
| **コード提出** | **2026-09-09（水）17:00** — `app/` を丸ごと zip / 7z ＋ 説明資料 PDF 2 種 |
| **プレゼン資料提出** | **2026-09-16（水）11:50** — PowerPoint・16:9・発表 10 分 + 質疑 3 分 |
| 実行環境 | Docker（`docker compose up`）。**コンテナ 2 つ**（`node:22-slim` / `postgres:17-alpine`。DOI）＋ ボリューム 2 つ |
| 実装 | Next.js（App Router）+ TypeScript / MapLibre GL JS / Tailwind CSS v4 / lucide-react / `pg` / Auth.js |
| DB | **PostgreSQL 17**。**PostGIS は使わない**。ORM もマイグレーションツールも入れない |
| 投稿 | **3 種類を 1 テーブル・1 API・1 フォームに統一**。違いは `category` と `details`(jsonb) |
| 認証 | Google OAuth が本線。**キー未設定なら自動でデモログイン**。**署名鍵はインストール ID から導く** |
| 外部サービス | 国土地理院タイル・重ねるハザードマップ・OSRM・気象庁 JSON。**すべて認証キー不要** |
| 提出単位 | `app/` 配下のみ。**日本語ファイル名禁止**。`readme.txt` / `Dockerfile` / `compose.yaml` 必須 |
| リポジトリ | **public**。氏名・学籍番号・配布資料・API キー・`.env` を置かない |
