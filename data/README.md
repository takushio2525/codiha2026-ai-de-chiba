# `data/` — オープンデータの検討用アーカイブ

アイデア出しのために取得した**元データと、その探索的な分析**を置く。

> **このディレクトリは提出物ではない。**
> 提出する zip は `app/` 配下だけ（`AGENTS.md` の「提出 zip の中身に日本語ファイル名を使わない」参照）。
> ここのデータをサービスで使うなら、必要な分だけ `app/` 側にコピーする。
> 地図アプリが使う 4 本は `data/scripts/build_geojson.py` が
> `app/public/data/*.geojson` に書き出している。

## 構成

```
data/
├── scripts/            取得スクリプト・取得対象の一覧（manifest.json）・GeoJSON 変換
├── chiba-pref/
│   ├── SOURCE.md       取得元・取得日・ライセンス・各ファイルの中身と注意点
│   └── raw/            千葉県オープンデータサイトから取得した Excel 8 本
├── ichikawa-city/
│   ├── SOURCE.md       同上
│   └── raw/            市川市オープンデータから取得した CSV 9 本
└── analysis/
    ├── README.md       再現手順
    ├── requirements.txt
    ├── findings.md     ★ 所見（アイデア出しはここから読む）
    ├── scripts/        分析スクリプト
    └── figures/        出力したグラフ PNG 9 枚
```

## データを取り直す

```bash
python3 data/scripts/fetch_datasets.py          # 未取得のものだけ
python3 data/scripts/fetch_datasets.py --force  # 取り直す
```

- 取得先は `data/scripts/manifest.json`。追加するときはここに 1 行足す
- 同一サイトへの連続アクセスは 2 秒あける。**大量クロールはしない**
- **1 ファイル 20 MB を超えるものは保存しない**（スクリプトが弾く）。URL だけ `SOURCE.md` に書く

## 地図アプリ用の GeoJSON を作り直す

```bash
python3 data/scripts/build_geojson.py           # app/public/data/ に 4 本出力
```

市川市の CSV（cp932）を読み、空行・緯度経度なし・市域外の座標を落として GeoJSON にする。
除外した行は実行時に標準出力へ出る。諸元は `data/ichikawa-city/SOURCE.md`。

## プレゼン資料に載せる数字を確かめ直す

```bash
python3 data/scripts/verify_presentation_numbers.py            # 市川市ぶんだけ
python3 data/scripts/verify_presentation_numbers.py --kashiwa  # 柏市の水害履歴も取得して集計
```

`docs/presentation/審査基準_主張と根拠.md` に書いた数字を、**元の CSV から数え直す**。
`analysis/findings.md` の数字を写すのではなく毎回計算するので、資料の数字が元データとずれたら気づける。
**pandas を使わない**ので `analysis/` の依存を入れずに動く。

`--kashiwa` は柏市の水害履歴（オープンデータ）を取得して「浸水は同じ場所で繰り返す」を数える。
**地点の定義で割合が大きく変わる**（78.24% / 96.02% / 98.84%）ので 3 通りとも出す。
資料に載せるときは、どの定義で数えたかを必ず添える。

## 守ること

- **このリポジトリは public。** 個票・氏名入りのデータは置かない。統計と公開施設情報だけ
- **二次配布できるライセンスのものだけコミットする。**
  今のところ千葉県分は PDL1.0、市川市分は CC BY 4.0 で、いずれも出典を書けば再配布できる。
  ライセンスが不明なものは**ファイルを置かず URL だけ**記録する
- **出典を必ず `SOURCE.md` と `analysis/findings.md` に書く。**
  プレゼン資料でもデータの参照元（クレジット）の記載が必須（`課題/2026-09-09_CODIHA2026_提出要件.md`）

## 他の候補データソース（まだ取得していない）

提出要件で「必要に応じて国のデータも可」とされているもの。
利用条件を確認してから取る。

| ソース | URL | 利用条件 |
|---|---|---|
| e-Stat（政府統計の総合窓口） | <https://www.e-stat.go.jp/> | 政府標準利用規約（第2.0版）。API は appId の取得が要る |
| 国土数値情報 | <https://nlftp.mlit.go.jp/ksj/> | 国土数値情報利用約款。**小地域の境界ポリゴンはここにある** |
| G空間情報センター | <https://www.geospatial.jp/> | データセットごとに異なる。個別に確認 |

千葉県オープンデータサイトには市川市以外の 50 市町村も登録されている。
全 3,457 データセットの一覧は CKAN 互換 API で取れる（`chiba-pref/SOURCE.md` 参照）。

## 既知のつまずき

- **市川市のリソースは県サイト経由でダウンロードできない**（HTTP 500）。市の公式サイトの直リンクを使う
- **市川市の CSV は cp932。** UTF-8 で開くと落ちる
- **市川市の防災データ（液状化・建物被害など）と通学路は zip で、中のファイル名が日本語。**
  `app/` に入れるならリネームが要る（提出要件でファイル名の日本語が禁止されているため）
