# 現在の作業文脈

> **書き方**: ここには「**今の状態**」だけを書く。作業のたびに**上書き**する。
> 過去にやったことは `progress.md` に追記し、ここには残さない。
> **80 行を超えたら太りすぎ。** 過去の話を `progress.md` へ逃がす。

## 現在の対象

**プロダクトは CHIZUBA。P2（DB と認証）まで実装済み。次は P3（投稿基盤・F-2）。**

`cd app && docker compose up` → <http://localhost:3000> で、洪水・高潮・津波の浸水想定を
重ねられ（ON/OFF・不透明度・凡例・出典）、避難場所 123・AED 304・子育て施設 388 と徒歩ナビが動く。
**コンテナは `web` + `db` の 2 つ**。`/login` で一般／行政（市川市）としてログインできる。

何を作るかの正本は **`docs/design/requirements.md`**（機能 F-1〜F-8・画面 S-1〜S-7・実装順序）。

## 直近の観点

**P3 が本丸。** 投稿を 1 モデルに統一してあるので、ここさえ通れば
P4（浸水）・P5（観光）・P6（行政応答）はカテゴリと表示の追加で済む。
**9/3・9/4 の個別相談までに P3 を通す。**

P3 で使う土台はもう揃っている:

- `reports` / `report_photos` / `report_comments` テーブルは **P2 で作成済み**
  （`app/db/init/001_schema.sql`。**スキーマを変えたら `docker compose down -v`**）
- ログインユーザーは `getSessionView()`（`app/src/lib/auth.ts`）で
  `{ id, displayName, role, govCityCode }` が取れる。**権限判定は必ず API 側で行う**
- 写真の保存先（`uploads` ボリューム）は**まだ無い**。P3 で `compose.yaml` に足す

P1 で分かった注意点: **浸水深の凡例は 1 つではない**（洪水 6 段階／津波・高潮 8 段階）。
**「色が付いていない＝安全」ではない**ので、想定区域が未公表の地域があることを凡例に常時出す。
定義は `app/src/lib/hazards.ts` に集めてあるので、レイヤーを足すならそこから。

審査のコード評価は **実装割合 × 動作割合の掛け算**。
`requirements.md` §9-1 の「全フェーズ共通の完了条件」5 項目
（`docker compose up` だけで起動・前フェーズが壊れていない・typecheck・
`package_submission.sh --smoke`・`secret_scan.sh`）を**毎フェーズ通してから次へ行く**。

## 次の一手

1. **P3: 投稿基盤 + 危険箇所報告（F-2）** — `GET/POST /api/reports`（I-3・I-4）、
   投稿フォーム（S-4）、詳細パネル（S-3）、地図のピン。
   写真の保存先として `compose.yaml` に `uploads` ボリュームを足す
2. **P4 以降**は `requirements.md` §9-2 の順に進める
3. 提出物のうち **`readme.txt`・説明資料 PDF 2 種はまだ無い**。9/9 に向けて作る。
   固めるのは `bash tools/package_submission.sh`（検証込み）。**手で zip しない**
4. `docs/design/assignments.md` の担当表がまだ空欄。誰がどのフェーズを持つか埋める

## 現フェーズで読むべきドキュメント

- **P3 に入る前に必ず**: `docs/design/interfaces.md` の **I-3・I-4・I-5**（投稿 API の仕様と
  異常時の約束）、`docs/design/requirements.md` §4（投稿を 1 モデルに統一した理由）
- **DB / 認証を触る段**: `app/db/init/001_schema.sql`（**物理スキーマの正本**）と
  `interfaces.md` I-7、`app/src/lib/auth.ts` と `requirements.md` §8
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
