# ウィキメディア・コモンズから取得したデモ投稿用の写真

- **取得元**: ウィキメディア・コモンズ <https://commons.wikimedia.org/>
- **取得日**: 2026-08-27
- **取得方法**: `data/scripts/fetch_seed_photos.py`（コモンズの API で検索し、
  再利用可能なライセンスのものだけを落として長辺 1000 px の JPEG に縮小する）
- **何に使うか**: **CHIZUBA のデモ投稿（`app/db/init/003_seed_demo_reports.sql`）に付ける写真**。
  審査員が `docker compose up` した直後から、投稿機能が動いている状態を見せるために置いている
- **実体の置き場**: `app/db/seed-photos/`（提出物に含める）。
  **この `data/` 配下には画像を置いていない**。同じ 4 MB を 2 か所に持たないため
- **アプリ内での出典表示**: `app/src/lib/credits.ts` の `DEMO_PHOTO_CREDITS` が正本で、
  `/about` の「デモ投稿の写真」節に全 17 枚の作者・ライセンス・元ページを出している

## ライセンスについて

**再利用が許されるものだけを選んである**（CC0・CC BY・CC BY-SA）。
NC（非営利限定）・ND（改変禁止）・ライセンス不明の画像は 1 枚も使っていない。

CC BY と CC BY-SA は**作者の表示が条件**なので、下の一覧と `/about` の両方に作者名を書いている。
CC BY-SA は継承条項があるが、**写真をそのまま表示しているだけ**で、
アプリ本体がその条項に巻き込まれる使い方（写真を素材に別の作品を作る等）はしていない。

**加工した点**: 長辺 1000 px への縮小と JPEG への再圧縮だけ。切り抜き・色調整・合成はしていない。

## 写真と実際の場所の関係（**重要**）

- **市川市で撮影された 10 枚**は、観光のデモ投稿でその場所の写真として使っている
- **市外で撮影された 7 枚**は、防災のデモ投稿に付けた**参考写真**である。
  **市川市で実際に起きた被害の写真ではない。**
  令和 8 年 8 月千葉豪雨をはじめとする実際の災害の記録として使ってはいけない

## 一覧

| ファイル（`app/db/seed-photos/`） | 内容 | 撮影地 | 作者 | ライセンス |
|---|---|---|---|---|
| [demo-spot-hokekyoji-pagoda.jpg](https://commons.wikimedia.org/wiki/File:Hokekyoji_FiveStoryPagoda_Ichikawa.JPG) | 中山法華経寺の五重塔 | 千葉県市川市 | Kentagon | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| [demo-spot-hokekyoji-sakura.jpg](https://commons.wikimedia.org/wiki/File:Cherry_blossoms_at_Hokekyoji_Temple,_Ichikawa,_2018.jpg) | 中山法華経寺の桜 | 千葉県市川市 | t.kunikuni | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| [demo-spot-satomi-park.jpg](https://commons.wikimedia.org/wiki/File:SatomiKouen.jpg) | 里見公園の花壇 | 千葉県市川市 | 麒麟坊 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| [demo-spot-edogawa-bridge.jpg](https://commons.wikimedia.org/wiki/File:Ichikawa_bridge_Edo_river_2023_Jan_26_07-21AM.jpeg) | 江戸川と市川橋 | 江戸川（東京都・千葉県市川市の境） | Nesnad | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| [demo-spot-hachimangu-icho.jpg](https://commons.wikimedia.org/wiki/File:Katsushika-hachimangu,_icho.jpg) | 葛飾八幡宮の千本イチョウ | 千葉県市川市 | Saigen Jiro | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| [demo-spot-hachimangu-gate.jpg](https://commons.wikimedia.org/wiki/File:Katsushika-hachimangu,_zuishinmon.jpg) | 葛飾八幡宮の随神門 | 千葉県市川市 | Saigen Jiro | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| [demo-spot-guhoji-gate.jpg](https://commons.wikimedia.org/wiki/File:Mamasan_Guhoji_Niomon.JPG) | 真間山弘法寺の仁王門 | 千葉県市川市 | Waka77 | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| [demo-spot-tekona.jpg](https://commons.wikimedia.org/wiki/File:Tekonareishindo_gate.jpg) | 手児奈霊神堂の入口 | 千葉県市川市 | Myksrsw | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| [demo-spot-junsaiike.jpg](https://commons.wikimedia.org/wiki/File:JunsaiikeRyokuchi.jpg) | じゅん菜池緑地 | 千葉県市川市 | 麒麟坊 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| [demo-spot-mamagawa-sakura.jpg](https://commons.wikimedia.org/wiki/File:Cherry_Blossom_Mama-gawa_ichikawa_Chiba-Japan.jpg) | 真間川の桜並木 | 千葉県市川市 | Namazu-tron | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| [demo-spot-nashi-fruit.jpg](https://commons.wikimedia.org/wiki/File:Pyrus_pyrifolia_fruit_on_tree_PS_2z_LR.jpg) | 木になっている和梨 | **撮影地不明（市川市ではない）** | PumpkinSky | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| [demo-ref-flooded-road-2.jpg](https://commons.wikimedia.org/wiki/File:Bickleigh_-_Flooded_Road_(geograph_2750554).jpg) | 冠水した道路 | **イギリス・デヴォン州 Bickleigh** | Lewis Clarke | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| [demo-ref-flooded-road-3.jpg](https://commons.wikimedia.org/wiki/File:Flooded_road_-_geograph.org.uk_-_4794313.jpg) | 片側が冠水した道路 | **イギリス（Geograph 収録）** | John Baker | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| [demo-ref-sandbag.jpg](https://commons.wikimedia.org/wiki/File:Donou.jpg) | 積み上げた土のう | **日本（詳細不明）** | Shift（日本語版ウィキペディアの利用者） | [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/) |
| [demo-ref-river-swollen.jpg](https://commons.wikimedia.org/wiki/File:Flooded_Tamagawa_in_aftermath_of_Typhoon_Talas_2011.jpg) | 台風で増水した多摩川 | **日本・東京都（2011 年台風 12 号）** | Kazuhiro Keino | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| [demo-ref-pothole-1.jpg](https://commons.wikimedia.org/wiki/File:Lcb-1.jpg) | 路面の陥没 | **撮影地不明（市川市ではない）** | Wrleo | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| [demo-ref-pothole-2.jpg](https://commons.wikimedia.org/wiki/File:Bache_en_la_escuela.jpg) | アスファルトの穴 | **撮影地不明（市川市ではない）** | Nuggyland | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |

ファイル名のリンク先がコモンズの説明ページ（＝出典）。
**撮影地が太字のものは市川市外**で、防災デモ投稿に付けた参考写真である。
