# node_01

このマイコン（1台目）の役割を担当者が記入する。

## 役割

- 役割: 未定
- 担当者: 未定

## ハードウェア構成

- ボード: 未定（暫定: Arduino Uno R4 WiFi）
- 接続部品: 未定

## ピンアサイン

| ピン | 用途 | 備考 |
|---|---|---|
| - | - | - |

## ビルド・書き込み

VSCode に PlatformIO 拡張を入れた状態で、このディレクトリを開くか、ターミナルで以下を実行する。

```bash
cd firmware/node_01
pio run                 # ビルドのみ
pio run -t upload       # 書き込み
pio device monitor      # シリアルモニタ
```

## このノードは EMA のサンプルになっている

`node_01` だけ **EMA（Embedded Module Architecture）を適用した動くサンプル**に
してある。動作は「ボタンを押している間だけ LED が点滅する」だけ。

| ファイル | 役割 |
|---|---|
| `src/main.cpp` | 3 フェーズループ（入力 → ロジック → 出力）と `applyPattern()` |
| `include/SystemData.h` | このノードで共有する状態 |
| `include/ProjectConfig.h` | ピン番号・設定値の一元管理 |
| `lib/ButtonModule/` | 入力モジュール（このノード固有） |
| `../common/lib/LedModule/` | 出力モジュール（全ノード共通） |

**設計の意図と、モジュールを追加する手順は
[`firmware/common/lib/ModuleCore/README.md`](../common/lib/ModuleCore/README.md) を読む。**

サンプルを実際に動かすなら、`include/ProjectConfig.h` の `BUTTON_PIN` / `LED_PIN` を
自分の配線に合わせて書き換える（ボタンは片側をピン、もう片側を GND へ）。

EMA を使わない場合は `include/` `lib/` を削除し、`src/main.cpp` を空の
`setup()` / `loop()` に戻す。

## 共通ライブラリを使いたくなったら

`firmware/common/lib/` にチーム共通のライブラリを置けるようになっている。
`node_01/platformio.ini` には既に次の 1 行が入っている（他ノードで使うなら同じ行を足す）。

```ini
lib_extra_dirs = ../common/lib
```

詳しくは [`firmware/common/README.md`](../common/README.md) を参照。
