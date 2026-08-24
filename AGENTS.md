# AGENTS.md — AI 開発支援ツール向けの指示

このファイルは **AI（Claude Code / Codex / Cursor / Cline など）がこのリポジトリで
作業するときに最初に読む入口**。人間が読んでも構わない。

主要な AI ツールはリポジトリ直下の `AGENTS.md` を自動で読む。
Claude Code 用の `CLAUDE.md` は、このファイルへのリダイレクト 1 行だけにしてある。

> **このファイルは雛形。** 〈…〉の部分を自分たちのプロジェクトの内容に書き換える。
> AI を使わない班は `AGENTS.md` `CLAUDE.md` `.agent/` をまとめて削除してよい。

<details>
<summary>このテンプレート自体を改修する人へ</summary>

このリポジトリ（`hackathon-template`）自体はテンプレートの本体。
テンプレートを改修するときは、上の〈…〉は**埋めずに雛形のまま残す**。

改修時に守ること:

- 各ディレクトリには `README.md` を置き、「何のフォルダか」「不要なら削除してよいか」を書く
- サンプルコードは**最小限だが実際に動く状態**を保つ（空のプレースホルダにしない）
- 「〜しなければならない」ではなく「こうすると楽」という**一例としての語り口**にする
- `.gitkeep` は空ディレクトリの維持用。ファイルが増えたら削除してよい
- 機能を足したり消したりしたら、関連する **すべての** README を同じコミットで直す

</details>

---

## プロジェクト概要

- **何を作るか**: 〈1〜2 行で書く〉
- **誰が使うか**: 〈想定利用者〉
- **チーム構成**: 〈人数と担当。詳細は `docs/design/assignments.md`〉

## 言語

**すべて日本語で書く。** コードのコメント・コミットメッセージ・
ドキュメント・PR の説明文すべて。

---

## 技術スタック

| 領域 | 技術 | 場所 |
|---|---|---|
| マイコン | 〈例: Arduino Uno R4 WiFi / PlatformIO〉 | `firmware/` |
| PC アプリ | 〈例: Processing〉 | `pc_app/` |
| 補助スクリプト | 〈例: Python 3.11〉 | `tools/` |
| 報告書 | LaTeX（Docker / Dev Container でビルド） | `report/` |

## 重要なパス

| パス | 何があるか |
|---|---|
| `docs/before_coding.md` | **開始前に決めること**（担当の切り方・つなぎ目・public/private の線引き） |
| `docs/design/assignments.md` | 担当表。誰が何を持っているか |
| `docs/design/interfaces.md` | **コンポーネント間のデータ形式**。ここを変える変更は影響が広い |
| `firmware/common/lib/ModuleCore/` | EMA（マイコンの設計パターン）の骨格 |
| `tools/verification/` | 評価指標の計測・判定 |
| `.agent/` | AI 向けの詳細仕様と作業文脈（下記） |
| `CONTRIBUTING.md` | Git の使い方・開発ルール（人間向けの正本） |

## よく使うコマンド

```bash
# ファームウェアのビルド（Arduino を使う班）
cd firmware/node_01 && pio run

# 報告書のコンパイル
cd report && docker run --rm -v "$(pwd):/workspace" -w /workspace \
  ghcr.io/paperist/texlive-ja:debian latexmk main.tex

# 秘匿情報スキャン（コミット前に実行できる）
bash .github/scripts/secret_scan.sh

# Processing の共通部品を各スケッチへ配る
python pc_app/sync_common.py

# 評価用ログの記録と判定
python tools/verification/serial_logger.py --port <ポート> --out tools/verification/results/run.csv
python tools/verification/evaluate.py --input tools/verification/results/run.csv
```

---

## 守ってほしいこと

### 1. 個人情報・著作物を絶対にコミットしない

**このリポジトリは public 前提で運用している。**

- 氏名・学籍番号・学内メールアドレス・評価情報を書かない（**ファイル名にも入れない**）
- 授業の配布資料など著作権のあるものを追加しない
- API キー・トークン・パスワードを書かない
- 個人のレポート作業は private リポジトリ側で行う

判断ルール: **氏名・学籍番号・著作権物・評価情報が 1 つでも入るなら private。
公開されて困るか 5 秒迷ったら private。**

線引き表は `docs/before_coding.md`。コミット前に `bash .github/scripts/secret_scan.sh` を実行する。

### 2. コミット規約

`[種別] 変更内容の概要` の形式。種別は
`[機能追加]` `[修正]` `[改善]` `[リファクタ]` `[ドキュメント]` `[スタイル]` から選ぶ。

- 機能単位で細かく分割する（無関係な変更を 1 コミットにまとめない）
- **コード変更とドキュメント更新は同一コミットに含める**
- Issue 番号があれば末尾に付ける → `[修正] センサ値の取りこぼしを修正 (#12)`
- `.tex` の変更と生成した `main.pdf` は同じコミットに入れる

### 3. ブランチと PR

- `main` へ直接 push しない。必ずブランチを切って PR を出す
- `rebase` は使わない（このチームのルール）。main の取り込みは `merge`
- 詳細は `CONTRIBUTING.md`

### 4. ドキュメントの整合性を保つ

以下を変更したら、関連するドキュメントも同じコミットで直す。

| 変更したもの | 一緒に直すもの |
|---|---|
| ディレクトリ構成 | ルート `README.md` とそのディレクトリの `README.md` |
| CI ワークフロー | `README.md` の「自動ビルドについて」 |
| データ形式・通信仕様 | `docs/design/interfaces.md`（変更は PR で） |
| 担当の変更 | `docs/design/assignments.md` |
| ビルド手順 | このファイルの「よく使うコマンド」と各 README |
| ディレクトリの追加・削除 | そのディレクトリの `README.md`（何のフォルダか・不要なら削除してよいか） |

### 5. 完了報告の前に確認する

- ビルド・スキャンが通ることを実際に実行して確かめる
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
