# AGENTS.md — AI 開発支援ツール向けの指示

このファイルは **AI（Claude Code / Codex / Cursor / Cline など）がこのリポジトリで
作業するときに最初に読む入口**。人間が読んでも構わない。

主要な AI ツールはリポジトリ直下の `AGENTS.md` を自動で読む。
Claude Code 用の `CLAUDE.md` は、このファイルへのリダイレクト 1 行だけにしてある。

---

## プロジェクト概要

- **何を作るか**: 千葉県・市町村の**オープンデータ**を活用し、地域の課題解決に繋がる
  サービスを実装する。**扱う課題とプロダクトはまだ確定していない**（アイデア出しフェーズ）。
  ただし**地図 × オープンデータの土台**は先に作ってあり、`app/` で動く
  （市川市の避難場所・AED・子育て施設を地図に重ね、そこまでの徒歩経路を出す）。
  プロダクトが決まったら、この土台の上に載せる
- **誰が使うか**: 〈対象となる住民・自治体などを、プロダクトが決まったら書く〉
- **イベント**: ちばオープンデータアイデアソン・ハッカソン（CODIHA）2026・ハッカソン部門
- **チーム**: 愛で千葉は救えるのか（担当は `docs/design/assignments.md`）

### 締切（厳守・遅れたら採点されない）

| 期日 | 提出物 |
|---|---|
| **2026-09-09（水）17:00** | コード（作業ディレクトリの zip / 7z ＋ 説明資料 PDF 2 種） |
| **2026-09-16（水）11:50** | プレゼン資料（PowerPoint・16:9） |

**提出要件の正本は `課題/2026-09-09_CODIHA2026_提出要件.md`。**
提出物・0 点条件・審査基準の判断は必ずこのファイルを見てから行う。
このファイルと他のドキュメントが食い違ったら、**課題 md を勝たせる**。

## 言語

**すべて日本語で書く。** コードのコメント・コミットメッセージ・
ドキュメント・PR の説明文すべて。

---

## 技術スタック

| 領域 | 技術 | 場所 |
|---|---|---|
| サービス本体 | **Next.js（App Router）+ TypeScript**。Docker 公式イメージ `node:22-slim` の multi-stage で `docker compose up` 一発起動。DB なし・1 コンテナ | `app/` |
| 地図 | **MapLibre GL JS** + 国土地理院「淡色地図」タイル（**認証キー不要**） | `app/src/components/MapView.tsx` |
| 徒歩経路 | **OSRM**（FOSSGIS e.V. 提供・**認証キー不要**）。サーバー側 API で中継し、UA 明示と 1 秒 1 リクエストの制限を守る | `app/src/app/api/routing/` |
| 見た目 | Tailwind CSS v4 + lucide-react（アイコンは SVG。絵文字は使わない） | `app/src/` |
| データ整形 | Python（標準ライブラリのみ）。市川市 CSV → GeoJSON | `data/scripts/build_geojson.py` |

**認証キーが要る外部サービス（Mapbox / Google 等）は使わない。**
審査員の環境で追加設定なしに動くことを最優先にしている。
ベースイメージは Docker 公式イメージ（DOI）、タグは固定する（`latest` を使わない）。

## 重要なパス

| パス | 何があるか |
|---|---|
| `課題/2026-09-09_CODIHA2026_提出要件.md` | **提出要件の正本**。締切・0 点条件・審査基準・readme.txt の書式 |
| `app/` | **提出するサービス本体**（市川市オープンデータマップ）。ここを丸ごと zip 化して提出する。動かし方と既知の制約は `app/README.md` |
| `app/src/lib/layers.ts` | 地図に載せるレイヤーの定義（データ・色・ポップアップ項目）。**データを足すならここから** |
| `app/src/lib/credits.ts` | 出典（クレジット）の正本。地図の隅と `/about` の両方がここを見る |
| `data/scripts/build_geojson.py` | 市川市 CSV → `app/public/data/*.geojson` の変換（cp932・市域外座標の除外） |
| `docs/before_coding.md` | **開始前に決めること**（担当の切り方・つなぎ目・public/private の線引き） |
| `docs/design/assignments.md` | 担当表。誰が何を持っているか |
| `docs/design/interfaces.md` | **コンポーネント間のデータ形式**。ここを変える変更は影響が広い |
| `data/analysis/findings.md` | **取得したオープンデータの所見**。アイデア出しはここから読む |
| `data/` | 取得したオープンデータ（`<ソース>/raw/`）・取得スクリプト・分析（`data/README.md` に規約） |
| `assets/` | オープンデータの検討用サンプル・データ形式のメモ |
| `tools/package_submission.sh` | **提出アーカイブの生成と検証**。`dist/` に 7z を作り、展開し直して提出要件（必須ファイル・日本語名・キャッシュ混入）を確認する |
| `tools/verification/` | 評価指標の計測・判定 |
| `.agent/` | AI 向けの詳細仕様と作業文脈（下記） |
| `CONTRIBUTING.md` | Git の使い方・開発ルール（人間向けの正本） |

## よく使うコマンド

```bash
# サービスの起動（審査員もこれだけ。http://localhost:3000）
cd app && docker compose up

# UI をいじるとき（ホットリロード。Node.js 22 以上が必要）
cd app && npm install && npm run dev

# 型チェック
cd app && npm run typecheck

# 市川市 CSV → 地図用 GeoJSON（app/public/data/ に出力）
python3 data/scripts/build_geojson.py

# 秘匿情報スキャン（コミット前に実行できる）
bash .github/scripts/secret_scan.sh

# 提出アーカイブを作って検証（dist/ に出力。NG が 1 つでもあればアーカイブを消して非 0 終了）
bash tools/package_submission.sh

# 評価用ログの判定
python tools/verification/evaluate.py --input tools/verification/results/run.csv

# オープンデータの取得と分析（詳細は data/README.md, data/analysis/README.md）
python3 data/scripts/fetch_datasets.py
for s in data/analysis/scripts/0*.py; do data/analysis/.venv/bin/python "$s"; done
```

---

## 守ってほしいこと

### 1. 個人情報・著作物を絶対にコミットしない

**このリポジトリは public。**

- 氏名・学籍番号・学内メールアドレス・評価情報を書かない（**ファイル名にも入れない**）
- 配布資料（授業スライド・課題 PDF）など著作権のあるものを追加しない。
  `課題/` に置いてよいのは、要点を自分たちで抽出した md だけ
- API キー・トークン・パスワードを書かない
- **提出用 `readme.txt` には氏名と所属を書く必要があるが、それは提出直前に手元で書く。
  リポジトリにはコミットしない**

判断ルール: **氏名・学籍番号・著作権物・評価情報が 1 つでも入るなら置かない。
公開されて困るか 5 秒迷ったら置かない。**

線引き表は `docs/before_coding.md`。コミット前に `bash .github/scripts/secret_scan.sh` を実行する。

### 2. 提出 zip の中身に日本語ファイル名を使わない

**`app/` 配下は、ディレクトリ名・ファイル名をすべて英数字にする。**
提出要件で「作業ディレクトリ内のファイル名に日本語を使わない」と決まっているため。

リポジトリ直下の `課題/` は zip に含めないので日本語名のままでよい。
**この線引きを崩さない**（提出対象を `app/` の外に置かない）。

### 3. コミット規約

`[種別] 変更内容の概要` の形式。種別は
`[機能追加]` `[修正]` `[改善]` `[リファクタ]` `[ドキュメント]` `[スタイル]` から選ぶ。

- 機能単位で細かく分割する（無関係な変更を 1 コミットにまとめない）
- **コード変更とドキュメント更新は同一コミットに含める**
- Issue 番号があれば末尾に付ける → `[修正] データ取得の欠損を修正 (#12)`

### 4. ブランチと PR

- `main` へ直接 push しない。必ずブランチを切って PR を出す
- `rebase` は使わない（このチームのルール）。main の取り込みは `merge`
- 詳細は `CONTRIBUTING.md`

### 5. ドキュメントの整合性を保つ

以下を変更したら、関連するドキュメントも同じコミットで直す。

| 変更したもの | 一緒に直すもの |
|---|---|
| ディレクトリ構成 | ルート `README.md` とそのディレクトリの `README.md` |
| CI ワークフロー | `README.md` の秘匿情報スキャンの説明 |
| データ形式・通信仕様 | `docs/design/interfaces.md`（変更は PR で） |
| 担当の変更 | `docs/design/assignments.md` |
| 起動手順（`compose.yaml` など） | このファイルの「よく使うコマンド」と `app/README.md` |
| ディレクトリの追加・削除 | そのディレクトリの `README.md`（何のフォルダか） |
| `data/` に取得先を追加 | `data/scripts/manifest.json` と `data/<ソース>/SOURCE.md`（出典・ライセンス） |
| 地図に載せるデータを追加・変更 | `data/scripts/build_geojson.py`・`app/src/lib/layers.ts`・`app/src/lib/credits.ts`・`app/README.md` |
| 外部サービス（地図タイル・経路）を変更 | `app/src/lib/credits.ts`（出典）・`app/README.md` の「既知の制約」・このファイルの技術スタック |
| 提出物の作り方・検証項目 | `tools/package_submission.sh`・`app/README.md` の「提出アーカイブを作る」・このファイルの「よく使うコマンド」 |

### 6. 完了報告の前に確認する

- ビルド・スキャンが通ることを実際に実行して確かめる
- **`docker compose up` で実際に起動して動くところまで確認する。**
  コードは「実装した割合 × 正しく動作する割合」で採点される。
  **動かない機能を積むより、動く機能を確実に仕上げる**
- 「たぶん動く」で完了報告しない。確かめられていないことは、そう書く

---

## `.agent/` — AI 向けの詳細仕様と作業文脈

`docs/` が**人間向け**の設計ドキュメントなのに対し、`.agent/` は
**AI が作業するために読む**ファイルを置く。詳細は [`.agent/README.md`](.agent/README.md)。

| ファイル | 内容 | 更新頻度 |
|---|---|---|
| `.agent/activeContext.md` | **今どこを触っているか**・次の一手 | 毎回上書き |
| `.agent/progress.md` | 完了した作業の時系列 | 一段落ごとに追記 |
| `.agent/architecture.md` | システム構成と設計判断 | 設計が変わったとき |
| `.agent/conventions.md` | コーディング規約・命名 | 規約を決めたとき |

@.agent/activeContext.md
@.agent/progress.md

> **`@` を付けると毎回全文が読み込まれる。**
> 上の 2 つ（現在状態と履歴）だけを `@` にして、重い設計書は
> バックティック参照（`` `.agent/architecture.md` ``）にしてある。
> 全部 `@` にすると毎回の読み込みが重くなるので、増やすときは慎重に。
