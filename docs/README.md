# docs — 設計ドキュメント（例）

プロジェクトの**設計上の判断**や**アーキテクチャの説明**を残すためのディレクトリ。

ソースコードのコメントだけでは伝えきれない「なぜこう設計したのか」を
ドキュメントとして残しておくと、あとから参加するメンバーにも背景が伝わる。

> **提出する説明資料との違い**: `docs/` は開発中にチーム内で共有する Markdown メモ。
> 審査員へ提出する説明資料（サービス概要スライド・機能対応表の PDF）とは目的が異なる。
> `docs/` の内容を素材にして提出資料を書き起こす、という関係になる。

## 最初に読むもの

**[`before_coding.md`](before_coding.md) — コーディング開始前に決めること**

チームで最初のコードを書き始める前に、全員で読む。担当範囲の切り方・つなぎ目の
決め方・リポジトリに入れてよいものの線引きの 3 つが書いてある。
ここを飛ばすと、結合の週に作り直しが発生する。

## 構成

| パス | 内容 |
|---|---|
| `design/requirements.md` | **CHIZUBA の要件定義書**（**何を作るかの正本**。機能 F-1〜F-8・ロール・投稿モデル・画面・実装順序） |
| `before_coding.md` | **開始前ガイド**（担当の切り方・インターフェース・public/private の線引き） |
| `design/assignments.md` | **担当表**（記入テンプレ。**まだ空欄。開始前に埋める**） |
| `design/interfaces.md` | **チーム間インターフェース定義書**（記入済み。つなぎ目 I-1〜I-9） |
| `design/data_flow.md` | データフロー図のテンプレート（**中身は `.agent/architecture.md` に集約済み。二重管理しない**） |
| `design/protocol.md` | 通信プロトコル設計のテンプレート（**中身は `design/interfaces.md` に集約済み。二重管理しない**） |
| `decisions/0001-template.md` | ADR（Architecture Decision Record）のテンプレート |

**構成・データフロー・設計判断の正本は [`../.agent/architecture.md`](../.agent/architecture.md)。**
`docs/` は人間向け、`.agent/` は AI 向けだが、**同じことを 2 か所に書かない**。

### ADR とは

「このプロジェクトで重要な設計判断を記録する」ためのフォーマット。
議論で決めた結果を `0002-use-ble.md` のようにファイル化して残す。
チームメンバーの入れ替わりや、半年後の自分が「なぜこうなっているのか」を
理解する手がかりになる。

## こんなときに使う

- **何の機能を作るのか知りたい / 機能を足したい** → `design/requirements.md`（**正本**）
- **誰が何を担当するか決めたい** → `before_coding.md` → `design/assignments.md`
- **担当同士の受け渡し形式を決めたい / API を実装する** → `design/interfaces.md`
- システム構成・データの流れを知りたい → `../.agent/architecture.md`
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
