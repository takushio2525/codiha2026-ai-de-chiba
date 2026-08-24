# report — LaTeX 報告書

提出用の報告書を LaTeX で書くためのディレクトリ。

> **`docs/` との違い**: `docs/` は開発中にチーム内で共有する設計メモ（Markdown）。
> `report/` は最終的に提出・印刷する報告書（LaTeX → PDF）。

## 構成

```
report/
├── main.tex             # メインファイル（\input で各章を読み込む）
├── sections/
│   ├── 01_introduction.tex  # はじめに
│   ├── 02_purpose.tex       # 目的
│   ├── 03_system_design.tex # システム設計
│   ├── 04_implementation.tex# 実装
│   ├── 05_evaluation.tex    # 評価
│   ├── 06_conclusion.tex    # まとめ
│   └── 99_appendix.tex      # 付録（LaTeX チートシート）
├── fig/                 # 図・画像置き場
├── refs.bib             # 参考文献
├── jex.cls / jex.sty    # 大学指定スタイル
├── plistings.sty        # 日本語コードの文字幅補正
└── .latexmkrc           # latexmk 設定
```

## 書き方

1. `sections/` の各 `.tex` ファイルにチームの内容を書く
2. 手元で PDF をコンパイルして確認（下記参照）
3. **`.tex` と生成された `main.pdf` を同じコミットに入れて** コミット → push

## 🚨 提出物の PDF は `.tex` と一緒にコミットする

`.tex` だけをコミットして PDF を `.gitignore` する運用は、一見きれいだが**授業では詰まる**。

- LaTeX 環境（Docker / Dev Container）を持っていないメンバーが、**中身を確認できない**
- 「レビューして」と言われても読めないので、レビューが止まる
- 提出直前に「最新版どれ？」が分からなくなる

なので **`.tex` の変更と PDF の更新は必ず同じコミットにまとめる**（別コミットに分けない）。
このテンプレートの `.gitignore` は、そのために `main.pdf` を除外していない。

### 二重管理にしない

提出用にファイル名を変えた PDF（`提出_最終版.pdf` など）を別に持つと、
**同じ内容の PDF が 2 つコミットされて、片方だけ古くなる**。

- リポジトリに置くのは `main.pdf` **1 本だけ**
- 提出時にファイル名の指定があるなら、**提出する瞬間に手元でコピーしてリネームする**
  （そのコピーはコミットしない）

### PDF が重くなってきたら

図が増えると PDF は数 MB になる。毎回コミットするので、履歴には全バージョンが残る。
`.git` が 100 MB を超えたら [`.gitattributes`](../.gitattributes) の Git LFS を検討する
（有効化手順と注意はそのファイルにコメントで書いてある）。

## コンパイル方法

### Dev Container（推奨）

VSCode で本リポジトリを開き、`Reopen in Container` を選択。
LaTeX Workshop が自動でビルドする。

### Docker を直接使う

```bash
cd report
docker run --rm -v "$(pwd):/workspace" -w /workspace \
  ghcr.io/paperist/texlive-ja:debian latexmk main.tex
```

## 注意

- 図は `fig/` ディレクトリに配置する（推奨形式: PDF / PNG）
- LaTeX の基本記法は `99_appendix.tex`（付録）にチートシートとして載っている
- **中間ファイル（`.aux` `.log` `.dvi` `.synctex.gz` 等）はコミットしない**（`.gitignore` 済み）
- **個人の報告書はここに置かない。** ここに置くのはチームで 1 本の提出物だけ。
  氏名・学籍番号が入る個人提出物は private リポジトリ側で管理する
  （[`docs/before_coding.md`](../docs/before_coding.md) の線引き表を参照）

## 同梱スタイルファイルの出典・ライセンス

| ファイル | 出典 | ライセンス | 備考 |
|---|---|---|---|
| `jex.cls` | `jclasses.dtx`（pLaTeX 標準クラス `jbook.cls`）の派生 | [LaTeX Project Public License (LPPL)](https://www.latex-project.org/lppl/) | 大学実験レポート用にカスタマイズされたもの。ファイル名は原典と異なる名前に変更済み（LPPL の改名要件を満たす） |
| `jex.sty` | `pl209.dtx`（pLaTeX 2.09 互換スタイル `jbook.sty`）の派生 | LPPL | `jex.cls` を読み込むラッパー |
| `plistings.sty` | `lltjp-listings.sty` ベースの改変物 | 原典に準ずる（LPPL） | `listings` パッケージで日本語の文字幅を補正するためのスタイル |

> **注意**: これらのスタイルファイルは特定の大学の報告書フォーマットに合わせたものです。
> 自分たちの所属機関のフォーマットに合わせて差し替えてください。

