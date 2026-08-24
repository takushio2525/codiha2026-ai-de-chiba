# firmware/common — 全ノード共通コードの置き場

複数のマイコンで同じコードを共有するためのディレクトリ。

各ノード（`node_01` ～ `node_05`）はそれぞれ独立した PlatformIO プロジェクトなので、
**ここにあるコードを自動で参照しているわけではない**。参照するには各ノードの
`platformio.ini` に 1 行足す（`node_01` には既に書いてある）。

## こんなときに使う

- 複数マイコン間で同じ通信プロトコル実装を共有したい
- 定数（プロトコル ID やパケットサイズ等）を 1 ヶ所で管理したい
- チームで「共通基盤」を 1 人が作って、他の人が利用したい

## 各ノードから参照する方法

使いたいノードの `platformio.ini` に以下を追加する。

```ini
[env:uno_r4_wifi]
platform = renesas-ra
board = uno_r4_wifi
framework = arduino

; 共通ライブラリを読み込む
lib_extra_dirs = ../common/lib
```

PlatformIO は `lib_extra_dirs` で指定したディレクトリ配下のサブディレクトリを
すべてライブラリとして自動検出する。`#include "LedModule.h"` のように
ヘッダ名を直接書けばインクルードできる。

## 現在同梱されているもの

| パス | 内容 |
|---|---|
| [`lib/ModuleCore/`](lib/ModuleCore/) | **EMA の骨格**。複数人でマイコンを分担開発するための設計パターン |
| `lib/LedModule/` | EMA の出力モジュールのサンプル |

詳細は [lib/README.md](lib/README.md) を参照。

## 不要な班は

共通ライブラリの仕組みを使わないなら `firmware/common/` ごと削除してよい。
その場合は `node_01/platformio.ini` の `lib_extra_dirs` 行と、
`node_01` の EMA サンプル（`include/` `lib/` `src/main.cpp`）も一緒に消す。
