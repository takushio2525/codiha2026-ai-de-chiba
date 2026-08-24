# hackathon-template

ハッカソン・チーム開発用のテンプレートリポジトリ。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Template](https://img.shields.io/badge/GitHub-Use%20this%20template-2ea44f?logo=github)](https://github.com/takushio2525/hackathon-template/generate)
[![PlatformIO Build](https://github.com/takushio2525/hackathon-template/actions/workflows/pio-build.yml/badge.svg)](https://github.com/takushio2525/hackathon-template/actions/workflows/pio-build.yml)
[![Secret Scan](https://github.com/takushio2525/hackathon-template/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/takushio2525/hackathon-template/actions/workflows/secret-scan.yml)

このテンプレートは「**共同開発のためのフォルダ構成と進め方の教材**」として作られている。
使うテーマ（音楽・ゲーム・ロボット・Web アプリ…）は問わない。

> **これは「一例」です。**
> 厳密に従わせる規格ではありません。班によって運用が変わるのは当たり前なので、
> **自分たちに合わせて自由に変えてよいし、使わないフォルダは丸ごと削除してよい。**
> 「こんな感じでフォルダを分けて、こんな順番で進めるとやりやすい」という見本として使ってください。

---

## フォルダ構成の全体像

```
your-project/
├── firmware/        マイコンのプログラム（複数台を分担開発する構成の例）
│   ├── common/lib/  ├ 全ノード共通のコード（EMA の骨格 + サンプルモジュール）
│   └── node_01〜05/ └ マイコン 1 台ごとの PlatformIO プロジェクト
├── pc_app/          PC 側で動くもの（可視化・GUI・音）の置き場
├── hardware/        回路図・配線図・部品表
├── assets/          データ（マップ・シナリオ・設定・テストデータ）
├── tools/           補助スクリプト
│   └── verification/  評価・検証の型（指標決め → 計測 → 判定 → 作図）
├── docs/            設計ドキュメント
│   ├── before_coding.md  ★ 書き始める前に全員で読む
│   └── design/           担当表・インターフェース定義・データフロー
├── meetings/        議事録・WBS・ガントチャート
├── report/          提出用の報告書（LaTeX → PDF）
├── .agent/          AI 向けの詳細仕様と作業文脈
├── AGENTS.md        AI が最初に読むファイル
├── CONTRIBUTING.md  Git の使い方・開発ルール
└── .github/         CI（ビルド・秘匿情報スキャン）、PR / Issue テンプレ
```

各フォルダの `README.md` に「何のフォルダか・どう使うか・不要なら削除してよいか」が
書いてある。**迷ったら、まずそのフォルダの README を読む。**

---

## 初めての人はここから

Git や共同開発が初めてなら、以下の順番で読むとスムーズに始められる。

| 順番 | 読むもの | 内容 |
|:---:|---|---|
| 1 | **この README** | テンプレートの全体像・クイックスタート |
| 2 | [`docs/before_coding.md`](docs/before_coding.md) | **書き始める前に決めること**（担当の切り方・つなぎ目・public/private の線引き） |
| 3 | [CONTRIBUTING.md](CONTRIBUTING.md) | Git の初期設定・ブランチの使い方・PR の出し方（**初心者向けに丁寧に書いてある**） |
| 4 | 使うフォルダの `README.md` | 各フォルダの使い方（例: [`firmware/README.md`](firmware/README.md)、[`report/README.md`](report/README.md)） |

> 慣れている人は「[ブランチ戦略](CONTRIBUTING.md#2-ブランチ戦略)」以降を斜め読みでOK。
> ただし **2 の開始前ガイドだけは全員で読むことを勧める**（ここを飛ばすと結合の週に作り直しになる）。

---

## 🚨 一番大事なこと

> **コード編集を始める前に、必ず `git pull` でリポジトリを最新化してください。**
>
> チームメンバーが push した変更を取り込まずに作業を始めると、
> 後でコンフリクト（衝突）が大量発生して時間を浪費します。
> 作業の最初に pull、これを徹底してください。
>
> 詳しい理由と具体的な手順は [CONTRIBUTING.md](CONTRIBUTING.md) を読んでください。

---

## 🔒 このテンプレートは「public 前提」で運用する

授業では、最後に成果物を教員・TA に見てもらう場面がある。private のままだと
閲覧してもらえず、**提出直前に慌てて public 化**することになる。そのとき
個人情報や授業資料が混ざっていると、**履歴に残るので簡単には消せない。**

だから**最初から「いつ public になっても平気」な状態で開発する**。
そのぶん、履歴ごと堂々と見せられる（誰がいつ何をやったかが、そのまま作業の証拠になる）。

そのかわり、public に置けないものは**別の private リポジトリ**に分ける。
そちらのテンプレートも用意してある。

| リポジトリ | 公開設定 | 中身 | テンプレート |
|---|---|---|---|
| チーム開発 | **public** | コード・設計・チーム提出物 | **このリポジトリ** |
| チーム内部 | **private** | 個人レポート・授業資料・議事録・評価物 | [hackathon-template-private](https://github.com/takushio2525/hackathon-template-private) |

### 線引き表

| 種類 | どちらへ |
|---|:---:|
| ソースコード・ビルド設定・CI 設定 | **public**（こちら） |
| 設計書・データフォーマット定義・ADR | **public** |
| 開発の運用規約 | **public** |
| チームの提出物（報告書の `.tex` と PDF） | **public** |
| 自分たちで撮った回路写真・自作した図 | **public** |
| 個人レポート・個人提出物（氏名・学籍番号入り） | **private** |
| 授業の配布資料（スライド・課題 PDF・ルーブリック）＝著作権物 | **private** |
| 評価・成績に関わるもの | **private** |
| 議事録・チーム内の連絡 | **private** |
| 人が写った写真・学内システムの画面キャプチャ | **private** |
| API キー・トークン・パスワード | **どちらにも置かない**（環境変数か `.env`） |

> **迷ったときの判断ルール：氏名・学籍番号・著作権物・評価情報が 1 つでも入るなら private。
> 公開されて困るか 5 秒迷ったら private。**

人の注意力だけに頼らないよう、**CI で秘匿情報スキャン**が動くようにしてある
（[`.github/workflows/secret-scan.yml`](.github/workflows/secret-scan.yml)）。
詳しくは [`docs/before_coding.md`](docs/before_coding.md) と
[CONTRIBUTING.md の 9 章](CONTRIBUTING.md#9-リポジトリに入れてよいものダメなもの)。

---

## このテンプレートの考え方

- 各フォルダは「**こう分担すると開発がしやすい**」という**例**
- サンプルコードは**空のプレースホルダではなく、実際に動くもの**を置いている。
  「どう書けばいいか」を読んで真似できるようにするため
- **いらないフォルダは削除してよい**（`firmware/`、`pc_app/`、`hardware/`、`assets/` など、テーマ次第で不要になる）
- 各フォルダの `README.md` に「何のフォルダか・どう使うか・不要なら削除OK」が書いてあるので、迷ったらまずそれを読む

---

## クイックスタート

### Step 1. このテンプレートから新しいリポジトリを作る

1. GitHub でこのテンプレートリポジトリを開く
2. 右上の緑の **「Use this template」** → **「Create a new repository」** をクリック
3. Owner（組織 or 個人）とリポジトリ名を入力
4. 公開設定は **Public**（上記の「public 前提」の方針）
5. **「Create repository」**

> **「Use this template」と「Fork」の違い**
>
> - **Use this template**（推奨）: テンプレートのコミット履歴を**引き継がない**。
>   最初のコミットが 1 件だけの、まっさらな履歴で始まる
> - **Fork / clone してから push**: テンプレートを作った過程の履歴も**丸ごと付いてくる**。
>   `git log` の一番古いところが「テンプレートを作っている過程」になる
>
> どちらでも動くが、**自分たちの作業だけが履歴に残るほうが見やすい**ので
> 「Use this template」を勧める。

### Step 2. private 側のリポジトリも作る

[hackathon-template-private](https://github.com/takushio2525/hackathon-template-private) から
同じ手順で、**必ず Private** で作る。名前は `<チーム名>-private` のように対で分かる名前に。

**両方にチームメンバー全員を招待する。** private 側の招待漏れは気づきにくいので確認する。

### Step 3. 手元に clone する

```bash
cd ~/Documents               # 好きな場所に移動
git clone https://github.com/<あなたの組織名>/<新しいリポジトリ名>.git
cd <新しいリポジトリ名>
```

### Step 4. チームでルールに合意する

[CONTRIBUTING.md](CONTRIBUTING.md) をチーム全員で読み、ブランチ戦略と
コミットメッセージ規約に合意する。

**このとき、全員が `git config user.email` を学内メール以外にする**
（設定したアドレスは全コミットに刻まれ、public では誰でも読める）。

### Step 5. 書き始める前に決めることを決める

**[`docs/before_coding.md`](docs/before_coding.md) を全員で読む。**
ここで決めるのは 3 つ。

1. **担当範囲**をコンポーネント単位で切る（プログラムの行で分けない）
   → [`docs/design/assignments.md`](docs/design/assignments.md) に記入
2. **コンポーネント間のデータ形式**を先に確定する
   → [`docs/design/interfaces.md`](docs/design/interfaces.md) に記入
3. **リポジトリの public / private の線引き**を全員が理解する

**この 3 つが決まる前にコードを書き始めない。** ここを飛ばすのが、
チーム開発でいちばん時間を溶かすパターン。

### Step 6. 不要なフォルダを削除する

テーマ・技術スタックに合わせて**使わないフォルダを削除**する。
各フォルダの `README.md` の末尾に「不要な班は丸ごと削除してよい」と
書いてあるので、チームで相談して決める。

例：
- Web アプリ中心 → `firmware/`, `hardware/`, `pc_app/`, `assets/` を削除
- Arduino 中心 → `pc_app/` は残すかどうかチーム判断、`assets/` は設定値置き場に流用
- ゲーム中心 → `firmware/`, `hardware/` を削除、`assets/` は「マップ・シナリオ置き場」に流用

### Step 7. 自分たちのコードを書き始める

- WBS・ガントチャートの記入 → [`meetings/`](meetings/)
- マイコンの実装 → [`firmware/`](firmware/)（複数人で触るなら
  [EMA の説明](firmware/common/lib/ModuleCore/README.md) を先に読む）
- PC 側の実装 → [`pc_app/`](pc_app/)
- 評価指標を決める → [`tools/verification/metrics.md`](tools/verification/metrics.md)
  （**評価は最後にやろうとすると必ず間に合わない**）
- 報告書 → [`report/`](report/)（LaTeX）

---

## ディレクトリ構成

| ディレクトリ | 用途 | 例として示していること |
|---|---|---|
| [`firmware/`](firmware/) | マイコン用ファームウェア | **複数マイコンを分担開発**するときの構成（PlatformIO、node_01〜05）と、[EMA という設計パターン](firmware/common/lib/ModuleCore/README.md)の動くサンプル |
| [`pc_app/`](pc_app/) | PC 側のサブシステム | 本体とは別言語で GUI・可視化を作る場合の置き場と、**複数スケッチでコードを共有する仕組み** |
| [`hardware/`](hardware/) | 回路図・配線図・部品表 | ハードを使うときの資料一式の管理例 |
| [`assets/`](assets/) | プロジェクト固有のデータ | マップ・シナリオ・設定ファイル・テストデータなどの置き場 |
| [`tools/`](tools/) | 補助スクリプト | ベンチマーク・解析スクリプトの置き場と、[**評価・検証の型**](tools/verification/) |
| [`docs/`](docs/) | 設計ドキュメント・ADR | [**開始前に決めること**](docs/before_coding.md)、担当表、インターフェース定義、設計判断の記録 |
| [`meetings/`](meetings/) | 議事録・WBS・ガント | 進捗管理ドキュメントのテンプレ |
| [`report/`](report/) | LaTeX 報告書 | 提出用 PDF 報告書の雛形（`docs/` とは別物。提出・印刷用） |
| [`.agent/`](.agent/) | AI 向けの仕様と作業文脈 | AI に毎回説明し直さなくて済むようにする仕組み |
| `.devcontainer/` | LaTeX コンパイル環境 | VSCode の Dev Container 設定 |
| `.github/` | CI、PR / Issue テンプレ | ビルド自動化と秘匿情報スキャンの例 |
| `.vscode/` | VSCode 推奨拡張・設定 | エディタ環境の共有 |

---

## 自動ビルドについて

### PlatformIO（Arduino ビルド）

`firmware/` の内容を push すると、**`platformio.ini` があるディレクトリを自動で探して**
全部ビルドする。ビルドに失敗すると PR がブロックされる。

フォルダを増やしても勝手にビルド対象に入るので、**CI の設定を直し忘れて
「最終成果物だけビルドされていなかった」という事故が起きない。**

Arduino を使わない班は [`.github/workflows/pio-build.yml`](.github/workflows/pio-build.yml) を削除してよい。

### 秘匿情報スキャン

push / PR のたびに、学籍番号らしき文字列・メールアドレス・API キー・
ローカルの絶対パスなどが混ざっていないか検査する。

**最初にやること**: [`.github/secret-scan-patterns.txt`](.github/secret-scan-patterns.txt) の
学籍番号のパターンを、自分たちの大学の形式に合わせて書き換える。

手元でも実行できる。

```bash
bash .github/scripts/secret_scan.sh
```

### LaTeX 報告書

報告書の PDF は**手元で Docker を使ってコンパイル**する運用（CI では自動コンパイルしない）。

```bash
cd report
docker run --rm -v "$(pwd):/workspace" -w /workspace \
  ghcr.io/paperist/texlive-ja:debian latexmk main.tex
```

VSCode の Dev Container（`.devcontainer/`）を使えば、コンテナ内で自動コンパイルもできる。

---

## 手元でのビルド

### ファームウェア（Arduino 使う班のみ）

VSCode に [PlatformIO 拡張](https://platformio.org/install/ide?install=vscode) を入れ、
`firmware/node_01/` をフォルダとして開く。または：

```bash
cd firmware/node_01
pio run
```

### LaTeX 報告書

VSCode で `.devcontainer/` を **「Reopen in Container」** で開くのが一番楽
（LaTeX 環境がすべて含まれている）。または Docker を直接使う：

```bash
cd report
docker run --rm -v "$(pwd):/workspace" -w /workspace \
  ghcr.io/paperist/texlive-ja:debian latexmk main.tex
```

---

## 開発ルール

[CONTRIBUTING.md](CONTRIBUTING.md) を参照。Git / 共同開発が初めての人向けに、
clone から PR、コンフリクト解消までを丁寧に書いてある。

実戦で痛い目を見た内容も入っている（履歴が分岐する事故の見分け方、
Issue と WBS のつなぎ方、コミット前に確認すること）。

---

## AI 開発支援ツールを使う場合

`AGENTS.md` を置いてあるので、Claude Code / Codex / Cursor / Cline などが
プロジェクトの前提を自動で読み込む。

- [`AGENTS.md`](AGENTS.md) — AI が最初に読むファイル（〈…〉を埋めて使う）
- [`.agent/`](.agent/) — AI 向けの詳細仕様と、セッションをまたいで引き継ぐ作業文脈
- `CLAUDE.md` — `AGENTS.md` へのリダイレクト 1 行

AI を使わない班は、この 3 つをまとめて削除してよい。

---

## 関連

| | |
|---|---|
| **private 用テンプレート**（個人レポート・授業資料の置き場） | [hackathon-template-private](https://github.com/takushio2525/hackathon-template-private) |
| マイコンの設計パターン（EMA）の解説記事 | [loop()に全部書くのをやめる組み込み設計パターンを自作した](https://zenn.dev/takushio2525/articles/20260818-embedded-module-architecture) |
| EMA のリファレンス実装 | [Embedded-Module-Architecture](https://github.com/takushio2525/Embedded-Module-Architecture) |
| このテンプレートの背景を書いた記事 | 解説記事（近日公開） |

---

## ライセンス

[MIT License](LICENSE)
