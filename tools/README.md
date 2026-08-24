# tools — 補助スクリプトの置き場（例）

> **`tools/` は提出 zip に含めない。** 提出するのは `app/` 配下だけ。
> 審査員が動かすのに必要なものは `app/` の中に置く。

本体のアプリケーションコードには含めないが、**開発や評価・検証に使う
スクリプト**を置く場所。ログ集計・ベンチマーク・データ変換・図の生成など。

## 構成

| 中身 | 用途 | 状態 |
|---|---|---|
| [`package_submission.sh`](package_submission.sh) | **提出アーカイブの生成と検証**（下記） | **動くスクリプト** |
| [`verification/`](verification/) | **評価・検証の型**（MOE/MOP の指標決め → 計測 → 判定 → 作図） | **動くスクリプト入り** |
| `example_benchmark/` | 性能測定スクリプトの書き方サンプル（Python 想定） | 置き方の例（中身は空） |
| `example_analysis/` | オープンデータの解析スクリプトの置き場（Python 想定） | 置き方の例（中身は空） |

## 提出アーカイブを作る

```bash
# リポジトリのルートで
bash tools/package_submission.sh          # dist/ai-de-chiba-map.7z ができる
```

`app/` をクリーンコピー（`node_modules/` `.next/` などは落とし、gitignore 済みだが提出必須の
`readme.txt` は入れる）して 7z で固め、**展開し直して**必須ファイル・日本語ファイル名・
キャッシュ混入・`docker compose config` を検査する。1 つでも落ちたらアーカイブを消して
非 0 で終了する。詳細は [`../app/README.md`](../app/README.md) の「提出アーカイブを作る」。

## まず読むもの

**[`verification/README.md`](verification/README.md)**

ハッカソンでは、ほぼ必ず「作ったものが要求を満たしたか」を定量的に示すことが求められる。
指標の決め方（MOE / MOP）と、計測から判定までの流れがそのまま動く形で入っている。

**評価は最後にやろうとすると必ず間に合わない。** 指標だけは開発を始める前に決めておく。

## 使い方

各スクリプトのディレクトリに `README.md` と実行ファイルを置く。依存する
ライブラリは `requirements.txt` や `pyproject.toml` 等で管理するとよい。

## 不要な班は

`example_benchmark/` `example_analysis/` は置き方の例なので、使わないなら削除してよい。

`verification/` も削除できるが、**消す前に「何で評価するか」だけはチームで決めておく**
ことを勧める。説明資料と発表で必ず必要になる。
