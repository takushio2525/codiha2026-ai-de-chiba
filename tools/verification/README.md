# verification — 評価・検証の型

**ハッカソンや PBL 型の授業では、ほぼ必ず「作ったものが要求を満たしたか」を
定量的に示すことが求められる。** ここはそのための計測・判定・作図をまとめる場所。

報告書の評価章は、この結果をそのまま貼れる状態にしておくのが理想。
発表前日に「評価データが無い」と気づくのがいちばん痛いので、**動くようになったら
すぐ 1 回計測してみる**のを勧める。

## 評価の型：MOE と MOP

授業でよく出てくる 2 つの言葉。

| 用語 | 意味 | 誰の視点か | 例 |
|---|---|---|---|
| **MOE**（Measure of Effectiveness） | **目的が達成できたか** | 使う人・依頼した人 | 「初見の人が説明なしで操作できた割合 80% 以上」 |
| **MOP**（Measure of Performance） | **システムがどう動いたか** | 作った人 | 「操作から反応までの遅延が 100ms 以下」 |

**MOP が良くても MOE が悪いことはよくある**（速いけど誰も使い方が分からない、など）。
両方を最初に決めておくと、「何を作るべきか」がブレなくなる。

## 進め方

```
① 指標を決める     → metrics.md に書く（目標値も一緒に決める）
② 生データを集める → serial_logger.py などで CSV に記録
③ 判定する         → evaluate.py で PASS / FAIL を出す
④ 図にする         → 報告書・発表資料へ
```

**①は開発を始める前にやる。** 目標値が無いと、計測しても「速い/遅い」が言えない。

## 同梱しているもの

| ファイル | 内容 |
|---|---|
| `metrics.md` | 評価指標の記入テンプレ（MOE / MOP と目標値） |
| `serial_logger.py` | シリアルポートのログを CSV に記録する（マイコンを使う班向け） |
| `evaluate.py` | CSV を読んで指標を計算し、目標値と比べて PASS / FAIL を出す |
| `results/` | 計測結果（CSV）と生成したグラフの置き場 |

## 使い方

### 1. 指標を決める

`metrics.md` を埋める。**目標値の欄を空けたまま先に進まない。**

### 2. ログを取る（マイコンを使う班）

マイコン側は、決めた形式で 1 行ずつシリアルに出す（例: `STATUS,123`）。
EMA を使っているなら、送信は出力モジュールの仕事になる。

```bash
# 必要なライブラリ（初回のみ）
pip install pyserial

# ポートを調べる
python tools/verification/serial_logger.py --list

# 30 秒ぶん記録する
python tools/verification/serial_logger.py \
    --port /dev/ttyUSB0 --baud 115200 --seconds 30 \
    --out tools/verification/results/run_001.csv
```

マイコンを使わない班は、この手順を自分たちの計測方法に置き換える
（アプリのログを CSV に吐く、手動でストップウォッチ計測して手入力する、など）。
**大事なのは形式を CSV に揃えること。**そうすれば次の判定がそのまま使える。

### 3. 判定する

```bash
python tools/verification/evaluate.py \
    --input tools/verification/results/run_001.csv \
    --report tools/verification/results/report_001.md
```

`metrics.md` の目標値と突き合わせて、PASS / FAIL の表を Markdown で出力する。
生成された表は、そのまま報告書に貼れる。

### 4. グラフにする

`matplotlib` があれば `--plot` を付けると PNG を生成する。

```bash
pip install matplotlib
python tools/verification/evaluate.py --input results/run_001.csv --plot
```

## 記録するときのコツ

- **条件を必ずメモする**。同じ CSV でも「何台つないだか」「電池かUSBか」で結果が変わる。
  ファイル名か `results/README.md` に条件を書く（例: `run_003_5台_電池駆動.csv`）
- **失敗した回のデータも捨てない**。「10 回中 2 回失敗した」は立派な評価結果
- **計測は 1 回で終わらせない**。最低 3 回は取って、ばらつきを見る

## 不要な班は

計測が要らないプロジェクトなら削除してよい。ただし
**「評価をどうするか」を考えずに進めると、報告書の評価章で必ず詰まる。**
消す前に、代わりに何で評価するかだけはチームで決めておくことを勧める。
