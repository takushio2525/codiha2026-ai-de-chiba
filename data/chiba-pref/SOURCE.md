# 千葉県オープンデータサイト（data eye）から取得したデータ

- **取得元**: 千葉県オープンデータサイト（data eye） <https://opendata.pref.chiba.lg.jp/>
  （運営: 一般社団法人データクレイドル。千葉県デジタル改革推進局デジタル戦略課）
- **取得日**: 2026-08-24
- **取得方法**: `data/scripts/fetch_datasets.py`（`data/scripts/manifest.json` の URL を順に取得）
- **ライセンス**: **PDL1.0（公共データ利用規約 第1.0版）**。
  各リソースページの「ライセンス」欄で確認済み（例:
  <https://opendata.pref.chiba.lg.jp/resources/5349>）。
  営利・非営利を問わず二次利用・改変・再配布が可能で、**出典の記載が条件**。
  加工して使う場合は「加工した」旨も併記する。
  - 規約本文: <https://opendata.pref.chiba.lg.jp/pages/terms>
  - このリポジトリの図表はすべて図中に出典を書いている（`data/analysis/scripts/common.py` の `caption()`）
- **出典の書き方**（プレゼン資料・説明資料でもこの形式を使う）

  ```
  「○○」（千葉県オープンデータサイト）（データセットのURL）を加工して作成
  ```

## API について

このサイトは CKAN 互換 API を持つ（<https://opendata.pref.chiba.lg.jp/pages/developer>）。
データセットを探すときは `ckan_api/package_search?q=<キーワード>&rows=50` が速い。

```bash
curl -sG "https://opendata.pref.chiba.lg.jp/ckan_api/package_search" \
  --data-urlencode "q=高齢者" --data-urlencode "rows=20"
```

**注意**: 市川市など一部の組織のリソースは `resource_download/<id>` が HTTP 500 を返す。
その場合は各自治体の公式サイトの配布ファイルを直接取る（`../ichikawa-city/SOURCE.md` 参照）。

## 保管しているファイル（`raw/`）

| ファイル | 内容 | 形式 | サイズ | データセット |
|---|---|---|---|---|
| `population_by_municipality_2024.xlsx` | 第1表 市区町村別推計人口（令和6年）。総数・男女・外国人・増減数・人口密度・面積。シート `第1表` | XLSX | 23 KB | [240](https://opendata.pref.chiba.lg.jp/datasets/240) |
| `natural_change_by_municipality_2024.xlsx` | 第2表 市区町村別自然動態（出生・死亡・増減数）。シート `第2表` | XLSX | 20 KB | [240](https://opendata.pref.chiba.lg.jp/datasets/240) |
| `social_change_by_municipality_2024.xlsx` | 第3表 市区町村別社会動態（転入・転出・増減数）。シート `第3表` | XLSX | 23 KB | [240](https://opendata.pref.chiba.lg.jp/datasets/240) |
| `elderly_by_municipality_1995.xls` | 県内市町村別の高齢者人口（平成7年）。**左右2ブロック**の様式で、合併前の80市町村が載る。シート `Sheet1` | XLS | 28 KB | [813](https://opendata.pref.chiba.lg.jp/datasets/813) |
| `elderly_by_municipality_2015.xls` | 県内市町村別の高齢者人口（平成27年）。65〜74/75〜84/85歳以上の内訳あり。シート `高齢者人口` | XLS | 32 KB | [813](https://opendata.pref.chiba.lg.jp/datasets/813) |
| `elderly_by_municipality_2021.xlsx` | 県内市町村別の高齢者人口（令和3年）。**このデータセットの最新年**。シート `R３高齢者人口（集計）` | XLSX | 19 KB | [813](https://opendata.pref.chiba.lg.jp/datasets/813) |
| `licensed_nursery_schools_2023.xlsx` | 子育て施設一覧（認可保育所・令和5年6月）。市町村・公私区分・施設名・所在地・認可定員数。シート `千葉県保育所一覧` | XLSX | 98 KB | [421](https://opendata.pref.chiba.lg.jp/datasets/421) |
| `tourism_visitors_2019.xls` | 千葉県観光入込調査報告書の図表データ。24シート（地域別・市町村別・目的別など） | XLS | 861 KB | [793](https://opendata.pref.chiba.lg.jp/datasets/793) |

- **文字コード**: すべて Excel バイナリ（`.xls` は Composite Document / コードページ 932、`.xlsx` は OOXML）。
  `pandas.read_excel` で読める（`.xls` には `xlrd`、`.xlsx` には `openpyxl` が要る）
- **20 MB を超えるファイルは保管していない**（取得スクリプトが弾く）。今回は該当なし

## 使うときに気をつけること

- **第1〜3表には千葉市の 6 区が独立行で入る。** 市区町村単位で集計するときは
  中央区・花見川区・稲毛区・若葉区・緑区・美浜区と「県計」を除かないと二重計上になる
- **`elderly_by_municipality_1995.xls` は様式が違う。** 左右 2 ブロック構成で、高齢化率は
  すでに％（他の年は小数）。合併前の旧市町村が含まれるので、他年と突き合わせると
  名前が一致するのは 42 市町村だけ
- **`licensed_nursery_schools_2023.xlsx` は県が把握する認可保育所のみ。**
  千葉市・船橋市・柏市など 8 市町村は載らない（政令市・中核市は自前で公表している）。
  認定こども園・幼稚園・小規模保育も含まない
- **`tourism_visitors_2019.xls` はリソース名が「令和元年」だが、中身は令和3年の報告書**
  （令和3年・令和2年・令和元年の3か年比較）。名前を信じずシートを開いて確かめること

## 取得したが保存していない候補

- **千葉県年齢別・町丁字別人口（令和8年4月1日現在）第2表 / 第3表**
  （[2322](https://opendata.pref.chiba.lg.jp/datasets/2322) /
  [2323](https://opendata.pref.chiba.lg.jp/datasets/2323)）—
  市町村ごとに 1 ファイル（計 134 ファイル）に分かれており、必要になったら個別に取る
