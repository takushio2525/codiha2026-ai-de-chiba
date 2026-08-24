# 現在の作業文脈

> **書き方**: ここには「**今の状態**」だけを書く。作業のたびに**上書き**する。
> 過去にやったことは `progress.md` に追記し、ここには残さない。
> **80 行を超えたら太りすぎ。** 過去の話を `progress.md` へ逃がす。

## 現在の対象

**プロダクトは CHIZUBA に決定。要件定義と設計が固まり、実装待ちの状態。**
何を作るかの正本は **`docs/design/requirements.md`**（機能 F-1〜F-8・ロール 3 段階・
投稿モデルの統一・画面 S-1〜S-7・実装順序 P1〜P8）。
既存の `app/` は P0 として動いており（`cd app && docker compose up` →
<http://localhost:3000> で避難場所 123・AED 304・子育て施設 388 と徒歩ナビ）、
**ここに機能を積み上げていく**。

## 直近の観点

**次に着手するのは P1（ハザードマップ表示・F-1）。** DB も認証も要らず、
既存の地図にラスタタイルを重ねるだけで機能が 1 つ完成する。
洪水・高潮・津波の 3 種は市川市で疎通確認済み（土砂は市川市に該当区域が無く 404）。

審査のコード評価は **実装割合 × 動作割合の掛け算**。
`requirements.md` §9-1 の「全フェーズ共通の完了条件」5 項目
（`docker compose up` だけで起動・前フェーズが壊れていない・typecheck・
`package_submission.sh --smoke`・`secret_scan.sh`）を**毎フェーズ通してから次へ行く**。

## 次の一手

1. **P1: ハザードマップ（F-1）** — `app/src/lib/` にタイル定義を足し、
   `MapView.tsx` にラスタレイヤーと不透明度スライダー、凡例、
   `credits.ts` に国土地理院ハザードマップポータルの出典を追加
2. **P2: DB と認証の基盤** — `compose.yaml` に `postgres:17-alpine` +
   `healthcheck` + `depends_on: service_healthy`、`app/db/init/*.sql`、
   `app/.env.example`、Auth.js のデモログイン。**構成を変える唯一の危険なフェーズ**
3. **P3: 投稿基盤 + 危険箇所報告（F-2）** — ここが本丸。9/3・9/4 の個別相談までに通す
4. 提出物のうち **`readme.txt`・説明資料 PDF 2 種はまだ無い**。9/9 に向けて作る。
   固めるのは `bash tools/package_submission.sh`（検証込み）。**手で zip しない**
5. `docs/design/assignments.md` の担当表がまだ空欄。誰がどのフェーズを持つか埋める

## 現フェーズで読むべきドキュメント

- **実装に入る前に必ず**: `docs/design/requirements.md`（**何を作るかの正本**）、
  `docs/design/interfaces.md`（つなぎ目 I-1〜I-9 の仕様。**実装前にここを読む**）
- **アプリに手を入れる段**: `.agent/architecture.md`（構成・データフロー・認証フロー・
  全域対応の建付け）、`.agent/conventions.md`、`app/README.md`（**既知の制約**）
- **提出物の判断**: `課題/2026-09-09_CODIHA2026_提出要件.md`（**正本**）
- **データを増やす段**: `data/analysis/findings.md`、
  `data/chiba-pref/SOURCE.md`, `data/ichikawa-city/SOURCE.md`（出典・ライセンス・落とし穴）

## 決まっていること（変わりにくい前提）

| 項目 | 内容 |
|---|---|
| プロダクト | **CHIZUBA** — 千葉県の地図系サービスを束ね、住民と行政が相互に投稿できるウェブサイト |
| 対応範囲 | **千葉県全域**（市町村コードでパラメータ化）。**デモデータは市川市**（`12203`） |
| イベント | CODIHA 2026 ハッカソン部門・千葉工業大学会場（2026-08-24 開始） |
| チーム | 愛で千葉は救えるのか |
| **コード提出** | **2026-09-09（水）17:00** — `app/` を丸ごと zip / 7z ＋ 説明資料 PDF 2 種 |
| **プレゼン資料提出** | **2026-09-16（水）11:50** — PowerPoint・16:9・発表 10 分 + 質疑 3 分 |
| 実行環境 | Docker（`docker compose up`）。**コンテナ 2 つ**（`web` = `node:22-slim` / `db` = `postgres:17-alpine`。どちらも DOI） |
| 実装 | Next.js（App Router）+ TypeScript / MapLibre GL JS / Tailwind CSS v4 / lucide-react / `pg` / Auth.js |
| DB | **PostgreSQL 17**。**PostGIS は使わない**（緯度経度の数値カラム）。ORM もマイグレーションツールも入れない |
| 認証 | Google OAuth が本線。**キー未設定なら自動でデモログイン**（審査員はこちらで全機能を試せる） |
| 外部サービス | 国土地理院タイル・重ねるハザードマップ・OSRM・気象庁 JSON。**すべて認証キー不要** |
| 提出単位 | `app/` 配下のみ。**日本語ファイル名禁止**。`readme.txt` / `Dockerfile` / `compose.yaml` 必須 |
| 提出経路 | ハッカソン Slack のチーム用プライベートチャンネル（チーム代表者が投稿） |
| リポジトリ | **public**。氏名・学籍番号・配布資料・API キー・`.env` を置かない |
| その他 | 個別相談 9/3・9/4（1 チーム 30 分・Google Meet）。UI/UX デザインは Moqups |
