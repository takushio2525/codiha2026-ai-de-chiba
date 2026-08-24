# コーディング規約

> **AI 向けの記述。** Git の使い方など人間向けの手順は `CONTRIBUTING.md` が正本。
> ここにはコードを書くときの約束だけを書く。

## 全体

- **コメント・ドキュメント・コミットメッセージはすべて日本語**
- マジックナンバーを直接書かない。設定ファイル（例: `ProjectConfig.h`）に集める
- 「あとで直す」コードには `TODO:` を付け、Issue 番号も添える

## 命名

| 対象 | 規則 | 例 |
|---|---|---|
| クラス・型 | PascalCase | `SerialLinkModule` |
| 関数・変数 | camelCase | `updateInput` |
| 定数 | UPPER_SNAKE_CASE | `LED_PIN` |
| ファイル | 中身のクラス名と揃える | `SerialLinkModule.h` |

〈使う言語に合わせて書き換える〉

## C++ / Arduino（`firmware/`）

- ヘッダは `#pragma once` でガードする
- ヘッダには**宣言だけ**を書き、実装は `.cpp` に分ける
- モジュールは `IModule` を継承し、入力なら `updateInput()`、出力なら `updateOutput()` を実装する
- **モジュール同士を直接呼ばない。** やり取りは `SystemData` 経由
- 依存の向きは **モジュール → `SystemData.h`** の一方向。
  各モジュールの Data 構造体は `SystemData.h` に置き、`SystemData.h` からは何も include しない
- Arduino の API を使う `.cpp` は `<Arduino.h>` を明示的に include する
- `delay()` を使わない。周期処理は `ModuleTimer` を使う
- 共有資源（`Serial` / I2C / SPI）は `main.cpp` の `setup()` で開く。モジュール側で開かない
- 2 台以上で使うコードは `common/lib/` へ。**コピペで増やさない**

## Python（`tools/`）

- 標準ライブラリで済むものは追加ライブラリを使わない
- 外部ライブラリが要るときは、入っていない場合に**分かるエラーメッセージを出して終わる**
- `argparse` で引数を受け、`--help` だけで使い方が分かるようにする

## ファイル配置

| 置くもの | 場所 |
|---|---|
| 2 台以上のマイコンで使うコード | `firmware/common/lib/` |
| 1 台だけで使うコード | `firmware/node_XX/lib/` |
| 複数の Processing スケッチで使う部品 | `pc_app/common/`（`sync_common.py` で配る） |
| 計測・評価のスクリプト | `tools/verification/` |
| データのサンプル | `assets/examples/` |

## やらないこと

| やらない | 代わりに |
|---|---|
| 個人情報・著作物をコミットする | private リポジトリへ（`docs/before_coding.md` の線引き表） |
| `main` へ直接 push する | ブランチを切って PR |
| `rebase` を使う | `merge` で main を取り込む |
| 同じコードを 2 か所にコピーする | 共通の置き場へ移す |
| 動作確認せずに「完了」と報告する | 実際に動かして結果を確かめる |
