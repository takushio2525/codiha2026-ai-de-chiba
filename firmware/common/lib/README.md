# common/lib — 全ノード共通ライブラリ置き場

全ノードで共有するライブラリを置くディレクトリ。各ノードの `platformio.ini` に
`lib_extra_dirs = ../common/lib` があれば、ここのライブラリを `#include` できる。

## 現在のライブラリ

| ライブラリ | 概要 | 状態 |
|---|---|---|
| [`ModuleCore/`](ModuleCore/) | **EMA の骨格**（`IModule.h` / `ModuleTimer.h`）。プロジェクト非依存 | そのまま使う |
| `LedModule/` | **出力だけ**を持つモジュールのサンプル（`SystemData.led.mode` を見て LED を制御） | 書き換え前提のサンプル |
| `SerialLinkModule/` | **入力と出力の両方**を持つモジュールのサンプル（受信＋周期送信） | 書き換え前提のサンプル |

**EMA（Embedded Module Architecture）とは何か・なぜ使うのかは
[`ModuleCore/README.md`](ModuleCore/README.md) に書いてある。マイコンを複数人で
分担開発するなら、最初にこれを読む。**

## ライブラリを追加する手順

1. `firmware/common/lib/XxxModule/` を作る（`Xxx` は PascalCase で分かりやすい名前）
2. `XxxModule.h`（宣言）と `XxxModule.cpp`（実装）を置く
3. 使いたいノードの `platformio.ini` に `lib_extra_dirs = ../common/lib` が
   書かれていることを確認する（書いていないノードからは読めない）
4. ノード側のコードで `#include "XxxModule.h"` と書いて使う
5. この README の表に追記する
6. PR を作ってチームで共有する

EMA に沿ったモジュールの追加手順は [`ModuleCore/README.md`](ModuleCore/README.md) を参照。

## 「共通」と「ノード固有」の分け方

| 置き場所 | 使う場面 |
|---|---|
| `firmware/common/lib/` | **2 台以上**のノードで使うもの（通信・LED・共通プロトコル） |
| `firmware/node_XX/lib/` | **そのノードだけ**で使うもの（そのノード固有のセンサ等） |

迷ったらまず `node_XX/lib/` に置き、2 台目で必要になった時点で `common/lib/` へ移す。
**逆に「コピペで 2 か所に置く」は絶対にやらない**（片方だけ直して壊れる事故が起きる）。

## コード規則（最低限）

- ヘッダ（`.h`）は `#pragma once` で先頭をガードする
- ヘッダには「**宣言**」だけを書き、実装は `.cpp` に分ける
- 依存するライブラリがあれば README に明記する
