# docs — 設計ドキュメント（例）

プロジェクトの**設計上の判断**や**アーキテクチャの説明**を残すためのディレクトリ。

ソースコードのコメントだけでは伝えきれない「なぜこう設計したのか」を
ドキュメントとして残しておくと、あとから参加するメンバーにも背景が伝わる。

> **`report/` との違い**: `docs/` は開発中にチーム内で共有する Markdown メモ。
> `report/` は最終的に提出・印刷する報告書（LaTeX → PDF）。目的が異なるので両方使ってよい。

## 最初に読むもの

**[`before_coding.md`](before_coding.md) — コーディング開始前に決めること**

チームで最初のコードを書き始める前に、全員で読む。担当範囲の切り方・つなぎ目の
決め方・リポジトリに入れてよいものの線引きの 3 つが書いてある。
ここを飛ばすと、結合の週に作り直しが発生する。

## 構成

| パス | 内容 |
|---|---|
| `before_coding.md` | **開始前ガイド**（担当の切り方・インターフェース・public/private の線引き） |
| `design/assignments.md` | **担当表**（記入テンプレ。開始前に埋める） |
| `design/interfaces.md` | **チーム間インターフェース定義書**（記入テンプレ。開始前に埋める） |
| `design/data_flow.md` | データフロー図のテンプレート |
| `design/protocol.md` | 通信プロトコル設計のテンプレート（通信が必要な場合） |
| `decisions/0001-template.md` | ADR（Architecture Decision Record）のテンプレート |

### ADR とは

「このプロジェクトで重要な設計判断を記録する」ためのフォーマット。
議論で決めた結果を `0002-use-ble.md` のようにファイル化して残す。
チームメンバーの入れ替わりや、半年後の自分が「なぜこうなっているのか」を
理解する手がかりになる。

## こんなときに使う

- **誰が何を担当するか決めたい** → `before_coding.md` → `design/assignments.md`
- **担当同士の受け渡し形式を決めたい** → `design/interfaces.md`
- システムのデータの流れを図にして共有したい → `design/data_flow.md`
- 通信の仕様を統一したい → `design/protocol.md`
- 大きな設計判断（言語選定、ライブラリ選定等）を記録したい → `decisions/`

## 不要な班は

`design/` の各テンプレートは、使わないものを削除してよい
（例: 通信を使わない班は `design/protocol.md` を削除）。

ただし **`before_coding.md` と `design/assignments.md` / `design/interfaces.md` は
テーマを問わず効くので、削除せずに使うことを勧める。**

## ドキュメントを Web サイト化したくなったら

Markdown が 20 ページを超えたあたりから、GitHub 上で読むのがつらくなる。
その段階で [Astro Starlight](https://starlight.astro.build/) などの
静的サイトジェネレータへ移行すると、検索・サイドバー・相互リンクが手に入る。

ただし `npm install` が必要になるので、**最初から入れる必要はない**。
「素の Markdown のまま最後まで行く」「途中で Starlight 化する」の 2 択を
チームで決めればよい。移行するときも Markdown ファイルはそのまま流用できる。
