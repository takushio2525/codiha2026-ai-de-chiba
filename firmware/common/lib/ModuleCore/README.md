# ModuleCore — EMA（Embedded Module Architecture）の骨格

複数人でマイコンのコードを書くときに、**担当ごとにコードが混ざって読めなくなる**のを
防ぐための設計パターンとその最小実装。

> リファレンス実装と詳しい解説:
> <https://github.com/takushio2525/Embedded-Module-Architecture>

## 何が問題なのか

Arduino のコードは放っておくと `loop()` に全部が書かれ、`setup()` の上に
グローバル変数が積み上がる。1 人で書くうちは動くが、3 人で触ると次が起きる。

- 誰かがセンサの処理を足したら、別の人が書いた表示処理が壊れた
- 同じ「LED を光らせる処理」が 3 ノードにコピペされ、直すときに 3 か所直す羽目になった
- グローバル変数が何十個もあり、担当以外は読めない

## EMA の 3 つのルール

1. **`loop()` は「入力 → ロジック → 出力」の 3 フェーズに固定する**
2. **ハードウェアごとに `IModule` を継承した「モジュール」を書く**
   （入力モジュールは `updateInput()` だけ、出力モジュールは `updateOutput()` だけ）
3. **モジュール同士を直接呼ばない。データのやり取りは必ず `SystemData` 経由**

```cpp
void loop() {
    // ① 入力フェーズ: 外界から SystemData へ取り込む
    for (IModule* m : gInputs)  if (m->enabled) m->updateInput(gData);
    // ② ロジックフェーズ: SystemData だけを見て状態を決める
    applyPattern(gData);
    // ③ 出力フェーズ: SystemData を外界へ反映する
    for (IModule* m : gOutputs) if (m->enabled) m->updateOutput(gData);
}
```

このルールを守ると、**モジュール 1 個 = 担当者 1 人**で分担できる。
`applyPattern()` だけ読めばシステムの振る舞いが分かる状態も保たれる。

## ファイル構成

| ファイル | 役割 | プロジェクト依存 |
|---|---|---|
| `IModule.h` | モジュールの抽象基底（`init` / `updateInput` / `updateOutput` / `deinit`） | **なし**（書き換え不要） |
| `ModuleTimer.h` | `delay()` を使わずに周期処理を書くためのタイマ | **なし**（書き換え不要） |

これに対して、**プロジェクトごとに書くもの**は以下。

| ファイル | 置き場所 | 役割 |
|---|---|---|
| `SystemData.h` | `node_XX/include/` | このノードで共有する状態（各モジュールの Data 構造体もここ） |
| `ProjectConfig.h` | `node_XX/include/` | ピン番号・設定値の一元管理 |
| `XxxModule.h/.cpp` | 共通なら `common/lib/`、ノード固有なら `node_XX/lib/` | 各ハードウェアのモジュール |
| `applyPattern()` | `node_XX/src/main.cpp` | 入力から出力を決めるロジック |

### 依存の向きは一方向にする

```
  XxxModule.h  ──include──▶  SystemData.h
                                 │
                          （何も include しない）
```

- **モジュールのヘッダが `SystemData.h` を include する**
- **`SystemData.h` はモジュールのヘッダを include しない**（`<stdint.h>` 程度だけ）
- 各モジュールが読み書きするデータ構造（`ButtonData` など）は **`SystemData.h` に置く**

逆向き（`SystemData.h` からモジュールのヘッダを include）にすると、
循環インクルードになるうえ、**PlatformIO のビルドも通らなくなる**
（ライブラリは互いのヘッダを見られないため）。

この向きなら「このノードにどんな状態があるか」が `SystemData.h` を見るだけで分かる、
という利点もある。

## 動くサンプル

`firmware/node_01/` が EMA を適用した状態になっている。
動作は「ボタンを押している間 LED が点滅し、長押しで点灯。PC から `ON` / `OFF` を
送ると直接操作でき、100ms ごとに状態を PC へ送る」。

モジュールの 3 パターンを 1 つのサンプルで見せている。

| サンプル | パターン | 実装するメソッド | 置き場所 |
|---|---|---|---|
| `node_01/lib/ButtonModule/` | **入力だけ**を持つ | `updateInput()` | このノード専用なので `node_XX/lib/` |
| `common/lib/LedModule/` | **出力だけ**を持つ | `updateOutput()` | 全ノードで使うので `common/lib/` |
| `common/lib/SerialLinkModule/` | **入出力の両方**を持つ | 両方 | 全ノードで使うので `common/lib/` |

通信モジュールはたいてい 3 番目になる（受信は入力フェーズ、送信は出力フェーズ）。
その場合は `gInputs[]` と `gOutputs[]` の**両方に同じインスタンスを入れる**。

- 状態: `firmware/node_01/include/SystemData.h`
- 設定: `firmware/node_01/include/ProjectConfig.h`
- 3 フェーズループとロジック: `firmware/node_01/src/main.cpp`

`node_02` 〜 `node_05` は**まっさらな状態**にしてある。EMA を使うなら
`node_01` の `include/` `lib/` `src/main.cpp` と `platformio.ini` をコピーして始めるのが早い。

## モジュールを 1 個追加する手順

1. 置き場所を決める（全ノードで使う → `common/lib/` / このノードだけ → `node_XX/lib/`）
2. `SystemData.h` に、そのモジュールが読み書きする `XxxData` 構造体を書き、
   `SystemData` にフィールドを 1 行足す
3. `XxxModule/XxxModule.h` に `XxxConfig`（設定）と
   `class XxxModule : public IModule` を書く（先頭で `SystemData.h` を include する）
4. `XxxModule.cpp` に実装を書く（`#include <Arduino.h>` を忘れずに）
5. `ProjectConfig.h` に `constexpr XxxConfig XXX_CONFIG = {...};` を足す
6. `main.cpp` でインスタンスを作り、`gInputs[]` か `gOutputs[]` に入れる
7. `applyPattern()` にロジックを書く

## PlatformIO の設定（EMA を使うノードに必要な 2 行）

```ini
lib_extra_dirs = ../common/lib   ; 共通モジュールを読み込む
build_flags = -I include         ; include/ をモジュールからも見えるようにする
```

`build_flags` の行が無いと、`common/lib/` や `lib/` の中の `.cpp` から
`SystemData.h` が見つからず、ビルドが落ちる
（PlatformIO は `include/` を `src/` にしか通さないため）。

**他のノードに EMA を展開するときは、この 2 行も一緒にコピーする。**

## つまずきやすいところ

| 症状 | 原因 | 対処 |
|---|---|---|
| `SystemData.h: No such file or directory` | `platformio.ini` に `build_flags = -I include` が無い | 上記の 2 行を足す |
| `XxxModule.h: No such file or directory` | `SystemData.h` がモジュールのヘッダを include している | 依存を一方向（モジュール → SystemData）に直す |
| `pinMode` が未定義と言われる | `.cpp` で `<Arduino.h>` を include し忘れている | `.cpp` の先頭で include する |
| 通信モジュールが送信しない | `gOutputs[]` に入れ忘れている | 入出力を持つモジュールは両方の配列に入れる |
| ある機能だけ動かない | `init()` が失敗して `enabled = false` になっている | 起動時のシリアルログ `[INIT] ...` を確認する |
| `Serial` が壊れる | モジュールと `main.cpp` の両方で `Serial.begin()` を呼んでいる | 共有資源は `main.cpp` の `setup()` だけで開く |
| ループが重くて反応が鈍い | モジュールの中で `delay()` を使っている | `ModuleTimer` に置き換える |

## EMA を使わない班は

`ModuleCore/` ごと削除し、`node_01/src/main.cpp` を空の `setup()` / `loop()` に戻してよい。
1 台だけ・数十行で終わるスケッチなら、EMA はオーバースペック。
**複数人が同じマイコンのコードを触る予定があるなら、最初から入れておく価値が高い。**
