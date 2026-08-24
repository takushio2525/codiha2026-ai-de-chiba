# firmware — マイコン用ファームウェア（例）

このディレクトリは「**複数のマイコンを分担して開発するときのプロジェクト構成の例**」。

「ハッカソンで Arduino を何台か使い、それぞれ別の役割（センサ担当・表示担当・
通信担当など）をチームで分担したい」というケースを想定した雛形。ハードウェアを
使わない班は [`firmware/` ごと削除してよい](#使わない班は)。

## 構成

```
firmware/
├── common/                    # 全ノード共通のコード
│   └── lib/
│       ├── ModuleCore/        # EMA の骨格（IModule / ModuleTimer）
│       └── LedModule/         # 出力モジュールのサンプル
├── node_01/                   # ★ EMA を適用済みのサンプルノード
│   ├── platformio.ini         # ビルド設定（common/lib を参照する行つき）
│   ├── src/main.cpp           # 3 フェーズループ + applyPattern()
│   ├── include/               # SystemData.h / ProjectConfig.h
│   ├── lib/ButtonModule/      # このノード固有の入力モジュール
│   └── test/                  # ユニットテスト置き場
└── node_02〜05/               # まっさらな状態（自分たちで書き始める）
```

**`node_01` だけ EMA（Embedded Module Architecture）を適用した動くサンプル**に
してある（ボタンを押している間だけ LED が点滅する）。`node_02` 〜 `node_05` は
PlatformIO の新規プロジェクト直後と同じクリーンな状態。

## 複数人でマイコンを分担するなら EMA を読む

複数人が同じマイコンのコードを触ると、`loop()` に全員の処理が混ざって
数週間で読めなくなる。それを防ぐ設計パターンが **EMA**。

**→ [`common/lib/ModuleCore/README.md`](common/lib/ModuleCore/README.md) を最初に読む**

EMA を使わない班は `node_01` の中身を空の `setup()` / `loop()` に戻し、
`common/lib/ModuleCore/` を削除してよい。

## ノード数の調整

| 使う台数 | どうする |
|---|---|
| 5台 | そのまま |
| 3台 | `node_04/` `node_05/` を削除 |
| 1台 | `node_02/` 〜 `node_05/` を削除。`node_01/` を好きな名前にリネームしてもよい |
| 6台以上 | `node_05/` をコピーして `node_06/` などを作る |

## 役割分担表（記入する）

担当と役割が決まり次第、下の表を更新する。

| ノード | 役割 | ハードウェア | 担当者 | 備考 |
|---|---|---|---|---|
| node_01 | 未定 | 未定 | 未定 | |
| node_02 | 未定 | 未定 | 未定 | |
| node_03 | 未定 | 未定 | 未定 | |
| node_04 | 未定 | 未定 | 未定 | |
| node_05 | 未定 | 未定 | 未定 | |

## ビルド方法

PlatformIO は VSCode 拡張として入れるのが簡単。

```bash
# 例: node_01 をビルドする
cd firmware/node_01
pio run                 # ビルドのみ
pio run -t upload       # 書き込み
pio device monitor      # シリアルモニタ
```

各ノードの詳細は `firmware/node_XX/README.md` を参照。

## 共通ライブラリ

複数ノードで同じコードを共有したいときに [`common/lib/`](common/lib/) を使う。
詳細は [`common/README.md`](common/README.md)。

> **コピペ厳禁**: 2 台目で同じ処理が要るときに `node_02/lib/` へコピーすると、
> 片方だけ直して壊れる事故が必ず起きる。2 台以上で使うと分かった時点で
> `common/lib/` へ移す。

## 使わない班は

ハードウェアを使わない班・Arduino 以外を使う班は、**`firmware/` ディレクトリを
丸ごと削除してよい**。削除後に必要なら、自分たちの技術スタック用のフォルダを
作り直す（例: `app/`, `src/`, `backend/` など）。
