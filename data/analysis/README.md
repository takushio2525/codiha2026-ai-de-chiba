# `data/analysis/` — 探索的データ分析

**所見は [`findings.md`](findings.md)。** ここは再現手順だけ。

## 再現する

```bash
python3 -m venv data/analysis/.venv
data/analysis/.venv/bin/pip install -r data/analysis/requirements.txt

# 元データが無ければ先に取得する
python3 data/scripts/fetch_datasets.py

for s in data/analysis/scripts/0*.py; do data/analysis/.venv/bin/python "$s"; done
```

`figures/*.png` が上書きされる。Python 3.12.13 と 3.14.7 のクリーンな venv で
同じ PNG（バイト一致）が出ることを確認している。

## スクリプト

| ファイル | 出力する図 |
|---|---|
| `scripts/common.py` | 共通設定（パス・日本語フォント・配色・出典キャプション）。単体では動かない |
| `scripts/01_chiba_aging.py` | `fig01` 市町村別の高齢化率、`fig02` 高齢化率の推移 |
| `scripts/02_chiba_population_dynamics.py` | `fig03` 自然動態×社会動態、`fig04` 人口あたり認可保育所定員 |
| `scripts/03_ichikawa_population.py` | `fig05` 人口ピラミッド、`fig06` 町丁字別の高齢化率 |
| `scripts/04_ichikawa_facility_gap.py` | `fig07` AED 密度、`fig08` 最寄り施設までの距離、`fig09` 未就学児と保育施設 |

`04` は `03` の読み込み・集計関数を import して使う。ファイル名が数字で始まるので
`importlib.import_module("03_ichikawa_population")` で読んでいる。

## 図を足すときのきまり

- **日本語が豆腐にならないよう `common.setup()` を必ず呼ぶ**（`matplotlib-fontja` が
  IPAexGothic を登録する）。IPAexGothic に**ボールドは無い**ので `fontweight="bold"` は使わない
- **出典を図の中に必ず入れる**（`common.caption(fig, "出典: …")`）。
  プレゼン資料でデータの参照元の記載が必須なため
- 見出しは `common.titles(fig, ax, 見出し, 補足)`。見出しは**事実を 1 文で言い切る**
- 色は `common.SERIES`（8 スロット固定順）。1 系列のグラフは全部 `SERIES[0]` にして、
  注目対象だけ `ACCENT` で塗り分ける。**大小を色の濃淡で二重に表さない**
- 数値ラベルは全点に付けない。端と注目対象だけ
- **見出しに書いた数字はスクリプトで計算する**（手で書くとデータ更新時にズレる）
