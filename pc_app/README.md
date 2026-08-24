# pc_app — PC 側サブシステムの置き場（例）

このディレクトリは「**PC 側で動くサブシステムをリポジトリに同梱したいとき**」の例。
サンプルとして [Processing](https://processing.org/) のスケッチを置いているが、
中身は自分たちの技術スタックに合わせて自由に差し替えてよい。

ディレクトリ名も用途に合わせてリネーム可能
（例: `viewer/`, `desktop_app/`, `web/`, `frontend/` など）。

## こんなときに使う

- マイコンから PC へシリアルでデータを送って可視化したい
- PC 側で音・映像を生成したい
- 操作用の GUI を作りたい
- Web フロントエンドやデスクトップアプリを同梱したい

## 構成

| ディレクトリ / ファイル | 内容 |
|---|---|
| `example_sketch/` | 最小の Processing スケッチ（書き方のサンプル） |
| `example_viewer/` | マイコンから届いた値をグラフにするサンプル（`firmware/node_01` と対になっている） |
| `common/` | **複数スケッチで共有する部品の正本** |
| `sync_common.py` | `common/` の部品を各スケッチへ配るスクリプト |

## サンプルの実行方法（Processing の場合）

1. [Processing IDE](https://processing.org/download) をインストールする
2. `example_sketch/example_sketch.pde` を Processing IDE で開く
3. 「Run」ボタンを押す

マイコンとつないで動かすサンプルは `example_viewer/`。
実行するとコンソールにシリアルポートの一覧が出るので、
`example_viewer.pde` の `PORT_NAME` を書き換えてから再実行する。

> Processing 以外（Python / Unity / Electron 等）を使う場合は、
> `example_sketch/` を削除して自分たちのプロジェクトを配置する。

## スケッチを追加する（Processing 固有）

Processing のお約束として、スケッチのフォルダ名と `.pde` のファイル名は
**同じ名前**にする必要がある。

```
pc_app/
└── my_sketch/
    └── my_sketch.pde   # フォルダと同じ名前
```

## 複数スケッチでコードを共有する

Processing は「**スケッチフォルダの中にある `.pde` を全部まとめて 1 つのプログラムにする**」
仕様なので、フォルダをまたいでコードを共有できない。
2 つ目のスケッチを作った時点で、たいてい同じ処理をコピペすることになる。

**コピペすると必ず「片方だけ直して壊れる」事故が起きる。**
実戦でも、共通化されないまま同じコードが 3 か所に散らばり、後半で慌てて集約した。

そこでこのテンプレートでは、`common/` を**正本**にして配る方式にしてある。

```
pc_app/
├── common/
│   └── SerialCore.pde        ← ここを編集する（正本）
├── example_viewer/
│   ├── example_viewer.pde
│   └── SerialCore.pde        ← 配られたコピー。直接編集しない
└── sync_common.py
```

```bash
# common/ の変更を各スケッチへ配る
python pc_app/sync_common.py

# 配布済みと正本がズレていないか確認するだけ（CI でも使える）
python pc_app/sync_common.py --check
```

配られたファイルには「直接編集しないでください」という印が先頭に入る。
**編集するのは必ず `common/` 側。**

> 共通部品を使わないスケッチにもコピーが配られるが、Processing は
> 使わないクラスがあってもそのまま動くので問題ない。

### Processing 以外を使う場合

Python / Unity / Electron / Web など、普通に import やパッケージの仕組みがある
言語なら、こんな回りくどいことをする必要はない。**共通コードをモジュールに切り出して
import すればよい**。`sync_common.py` と `common/` は削除してよい。

## つなぎ目の形式に注意

`example_viewer` は `firmware/node_01` が送る `STATUS,<値>` を受け取る前提で書いてある。
**この形式を変えるときは、送る側と受け取る側の両方を同時に直す。**

形式は [`docs/design/interfaces.md`](../docs/design/interfaces.md) に書いておき、
変更は PR で行う（口頭で変えると必ず片方が置いていかれる）。

## 不要な班は

`pc_app/` ディレクトリを丸ごと削除してよい。
