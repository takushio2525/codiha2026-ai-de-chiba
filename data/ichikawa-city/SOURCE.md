# 市川市オープンデータ

- **取得元**: 市川市 オープンデータ配布ページ
  <https://www.city.ichikawa.lg.jp/page/4744.html>
  （カタログとしては千葉県オープンデータサイトにも登録されている。組織「市川市」で 44 データセット）
- **取得日**: 2026-08-24
- **データの時点**: 令和8年4月1日公開（人口は令和8年3月31日現在）
- **取得方法**: `data/scripts/fetch_datasets.py`（`data/scripts/manifest.json` の URL を順に取得）
- **ライセンス**: **CC BY 4.0（クリエイティブ・コモンズ 表示 4.0 国際）**。
  千葉県オープンデータサイトの各リソースページの「ライセンス」欄に明記されている
  （例: <https://opendata.pref.chiba.lg.jp/resources/53961>）。
  市の利用規約: <https://www.city.ichikawa.lg.jp/uploaded/attachment/11819.pdf>
  **出典を書けば二次利用・改変・再配布が可能。**
- **出典の書き方**

  ```
  「【市川市】○○」（市川市オープンデータ）（データセットのURL）を加工して作成
  ```

## 取得先について

千葉県オープンデータサイト側の `resource_download/<id>` は市川市のリソースに対して
**HTTP 500 を返す**（2026-08-24 時点）。そのため市川市公式サイトの配布ファイル
（`https://www.city.ichikawa.lg.jp/uploaded/attachment/<番号>.csv`）を直接取得している。
カタログのメタデータ（ライセンス・更新日）は県サイト側を見る。

## 保管しているファイル（`raw/`）

すべて **CSV・cp932（Shift_JIS）・CRLF**。国の「自治体標準オープンデータセット」の
項目名に沿っており、施設系にはすべて `緯度` `経度` `所在地_町字` が入っている。

| ファイル | 内容 | 行数 | 列数 | サイズ | データセット |
|---|---|--:|--:|--:|---|
| `population_by_area_and_age.csv` | 町丁字別・5歳階級・男女別人口（0-4歳〜85歳以上）と世帯数 | 237 | 46 | 41 KB | [3282](https://opendata.pref.chiba.lg.jp/datasets/3282) |
| `childcare_facilities.csv` | 子育て施設一覧（保育所・こども園・幼稚園・児童館・放課後児童クラブなど12種別） | 388 | 53 | 109 KB | [3283](https://opendata.pref.chiba.lg.jp/datasets/3283) |
| `emergency_evacuation_sites.csv` | 指定緊急避難場所一覧（災害種別ごとの対応フラグ付き） | 129 | 39 | 27 KB | [3295](https://opendata.pref.chiba.lg.jp/datasets/3295) |
| `aed_locations.csv` | AED設置箇所一覧（設置位置・利用可能曜日・時間） | 305 | 39 | 73 KB | [3288](https://opendata.pref.chiba.lg.jp/datasets/3288) |
| `nursing_care_facilities.csv` | 介護サービス事業所一覧（実施サービス・定員） | 55 | 36 | 14 KB | [3287](https://opendata.pref.chiba.lg.jp/datasets/3287) |
| `public_facilities.csv` | 公共施設一覧（バリアフリー情報付き） | 330 | 60 | 84 KB | [3280](https://opendata.pref.chiba.lg.jp/datasets/3280) |
| `parks_and_green_spaces.csv` | 都市公園・都市緑地一覧 | 436 | 31 | 77 KB | [3293](https://opendata.pref.chiba.lg.jp/datasets/3293) |
| `medical_relief_stations.csv` | 医療救護所（災害時に開設する救護拠点） | 6 | 31 | 1 KB | [3297](https://opendata.pref.chiba.lg.jp/datasets/3297) |

**個人情報は含まない**（すべて施設・地域単位の集計または公開施設情報）。

## 地図アプリ向けの GeoJSON

`app/` の地図に載せている 3 本は、ここの CSV から
[`data/scripts/build_geojson.py`](../scripts/build_geojson.py) で変換して
`app/public/data/` に出力している（`python3 data/scripts/build_geojson.py`）。

| 出力 | 元 CSV | 件数 | 除外したもの |
|---|---|--:|---|
| `evacuation_sites.geojson` | `emergency_evacuation_sites.csv`（129 行） | **123** | 全列が空の行 6 |
| `aed_locations.geojson` | `aed_locations.csv`（305 行） | **304** | 経度が市域外の 1 件（下記） |
| `childcare_facilities.geojson` | `childcare_facilities.csv`（388 行） | **388** | なし |

除外の内訳は変換スクリプトが実行時に標準出力へ出す。
市域の判定に使う箱は `data/analysis/scripts/04_ichikawa_facility_gap.py` の `BBOX` と同じ値。

## 使うときに気をつけること

- **文字コードは cp932。** `pd.read_csv(path, encoding="cp932")` で読む。UTF-8 で開くと落ちる
- **年齢階級の列は空欄混じりで文字列として読まれる。** `pd.to_numeric(..., errors="coerce")` を通す。
  最上位の階級は `85歳以上`（100歳以上の列は無い）
- **町字名の表記ゆれがある。** 全角数字（`稲越３丁目`）・空白入り（`大野町 3丁目`）・
  `市川市` の前置きが混ざる。`unicodedata.normalize("NFKC", s)` ＋ 空白除去 ＋ `市川市` の除去で
  95〜100％ 突き合わせできる（実装は `data/analysis/scripts/04_ichikawa_facility_gap.py` の `norm()`）
- **座標に誤りが 1 件ある。** `aed_locations.csv` の「ローソンストア100市川南八幡三丁目店」は
  経度が `129.925207`（正しくは 139.9…）。市域の緯度経度の箱で外れ値を落とすこと
- **末尾に空行が混ざっている。** `emergency_evacuation_sites.csv` の 129 行のうち
  **最後の 6 行は全列が空**（施設ではない）。実データは **123 件**。
  「緯度経度が欠損した施設が 6 件ある」わけではないので、欠損として数えないこと。
  都市公園にも同様の空行が 6 行ある
- **`childcare_facilities.csv` の `収容定員` 列は全行空**（388 行すべて欠損）。定員では比較できないので
  施設数で見るしかない
- **町丁字のポリゴン（境界）は公開されていない。** 地図上で面として塗るには
  [国土数値情報の小地域境界](https://nlftp.mlit.go.jp/) など別のデータが要る
