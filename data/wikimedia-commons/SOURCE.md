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

---

# 景観100選のスポット写真

- **取得元**: ウィキメディア・コモンズ <https://commons.wikimedia.org/>
- **取得日**: 2026-08-27
- **取得方法**: `data/scripts/fetch_scenic_photos.py`（コモンズの API で落として長辺 900 px の
  JPEG に縮小する）。出典表から `app/src/lib/scenicPhotos.ts` を起こすのは
  `data/scripts/build_scenic_photos_ts.py`
- **何に使うか**: **観光マップの景観スポット（F-5）のポップアップに出す写真**。
  いちかわ景観100選の元 CSV にも画像列があるが、**3 通りの URL すべてで 404** なので使えない
  （`data/ichikawa-city/SOURCE.md`）
- **実体の置き場**: `app/public/images/scenic/`（提出物に含める。54 枚で 11 MB）
- **アプリ内での出典表示**: 地図のポップアップに作者とライセンス、
  `/about` の「景観100選のスポット写真」節に 54 枚ぶんすべて

## ライセンスについて

**再利用が許されるものだけを選んである**（CC0・パブリックドメイン・CC BY・CC BY-SA）。
NC（非営利限定）・ND（改変禁止）・ライセンス不明の画像は 1 枚も使っていない。

内訳は CC BY-SA 3.0 が 15 枚・CC BY-SA 4.0 が 13 枚・CC BY 3.0 が 13 枚・CC BY 4.0 が 5 枚・
パブリックドメインが 5 枚・CC BY 2.0 が 2 枚・CC0 が 1 枚。

CC BY と CC BY-SA は**作者の表示が条件**なので、ポップアップと `/about` の両方に作者名を出し、
ライセンス名からその条文へリンクしている。**CC BY-SA には継承条項がある**が、
写真をそのまま表示しているだけで、写真を素材に別の作品を作ってはいないため、
アプリ本体がその条項に巻き込まれる使い方はしていない。

**加工した点**: 長辺 900 px への縮小と JPEG への再圧縮だけ。切り抜き・色調整・合成はしていない。

## 選び方（**重要**）

**スポット名で検索して名前が一致しただけでは採っていない。** 座標の近く（コモンズの
geosearch で半径 400 m 以内）に写っているか、その場所の専用カテゴリに入っているかで裏を取り、
最後に**全候補のサムネイルを目で見て**、本当にその場所が写っているものだけを選んだ。

同じ名前で別の土地にある場所の写真が、検索には大量に混ざる。実際に弾いたもの:

| 引っかかった語 | 混ざってきた別の場所 |
|---|---|
| 弁天池公園 | **愛知県日進市**の弁天池公園 |
| 北方小学校 | **岐阜県本巣郡北方町**の北方小学校 |
| 行徳小学校 | **福島県郡山市立**行徳小学校 |
| 徳願寺 | **静岡市駿河区**の徳願寺 |
| 曽谷 | **宗谷岬・砕氷船宗谷・宗谷海峡**（読みが同じ） |
| 八幡神社 | **埼玉県春日部市**の八幡神社 |
| 大門通り | **愛知県岡崎市**・**山口県下関市**の大門通り |
| 子之神社 | **神奈川県湯河原町**・**川崎市**・**東京都狛江市**の子之神社 |
| 市民プール | **岐阜県各務原市**・**埼玉県春日部市**の市民プール |
| 常夜灯 | **名古屋市熱田区**・**岡崎市**の常夜灯 |
| 妙行寺 | **埼玉県**の妙行寺 |
| 南大野 | **徳島県吉野町南大野**・**京都市小山南大野町** |
| 中川 | **東京都の中川**（塩浜橋の検索で混入） |

## 撮影地について

**53 枚は市川市内で撮影されたもの。** 唯一の例外が「東京湾三番瀬」で、
**ふなばし三番瀬海浜公園（千葉県船橋市）から撮った写真**を使っている。
三番瀬の干潟は市川市から船橋市にまたがる 1 つの地形で、写っているのはその干潟だが、
市川市側から撮られた再利用可能な写真は見つからなかった。
ポップアップに「船橋市側から撮影」と出し、`/about` にも事情を書いている。

## 一覧（写真があるスポット 54 / 100）

| # | スポット | ファイル（`app/public/images/scenic/`） | 作者 | ライセンス |
|---|---|---|---|---|
| 1 | 江戸川 | [edogawa-river.jpg](https://commons.wikimedia.org/wiki/File:Edogawa_railway_bridge_on_Keisei_main_line_seen_from_Ichikawa_city_Chiba_prefecture_Japan_20230120_152057.jpg) | LERK | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 2 | 江戸川からの眺め | [edogawa-view.jpg](https://commons.wikimedia.org/wiki/File:%E5%8D%83%E8%91%89%E7%9C%8C%E5%B8%82%E5%B7%9D%E5%B8%82%E5%A4%A7%E6%B4%B2%E3%81%AE%E6%B1%9F%E6%88%B8%E5%B7%9D%E6%B2%B3%E5%B7%9D%E6%95%B7.jpg) | くろふね | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 3 | 江戸川に架かる橋からの眺め | [edogawa-bridge-view.jpg](https://commons.wikimedia.org/wiki/File:%E6%B1%9F%E6%88%B8%E5%B7%9D%E6%94%BE%E6%B0%B4%E8%B7%AF%E3%81%AE%E5%B8%82%E5%B7%9D%E5%A4%A7%E6%A9%8B%E3%81%AE%E5%86%99%E7%9C%9F20190525-P1020033.jpg) | くろふね | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| 4 | 市民納涼花火大会 | [fireworks-festival.jpg](https://commons.wikimedia.org/wiki/File:Fireworks_at_Ichikawa_Fireworks_Festival,_2017.jpg) | Zengame | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| 9 | 大町自然観察園 | [omachi-nature-park.jpg](https://commons.wikimedia.org/wiki/File:20061026_100_0964_-_panoramio.jpg) | resource70 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 10 | 動植物園 | [zoological-botanical-garden.jpg](https://commons.wikimedia.org/wiki/File:Ichikawa_Zoo_Main_Gate_20170204.jpg) | 四葉亭四迷 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 11 | 市川霊園とイチョウ並木 | [ichikawa-cemetery-ginkgo.jpg](https://commons.wikimedia.org/wiki/File:Oonomachi4_1_Ichikawa-city.JPG) | Otherde | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 12 | 歴史博物館 | [history-museum.jpg](https://commons.wikimedia.org/wiki/File:Ichikawa_City_History_Museum.jpg) | Fred Cherrygarden | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 15 | じゅん菜池緑地 | [junsaiike-park.jpg](https://commons.wikimedia.org/wiki/File:Junsai-ike_park.jpg) | Tatsubou | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 17 | 万葉植物園 | [manyo-botanical-garden.jpg](https://commons.wikimedia.org/wiki/File:ManyoShokubutsuen20100606.jpg) | のどごし隊長 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 18 | 里見公園 | [satomi-park.jpg](https://commons.wikimedia.org/wiki/File:SatomiKouen.jpg) | 麒麟坊 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 21 | 和洋学園のラウンジからの眺め | [wayo-university.jpg](https://commons.wikimedia.org/wiki/File:Wayoujosidaigaku.jpg) | Los688（日本語版ウィキペディア） | Public domain |
| 22 | 下総国分寺周辺 | [shimosa-kokubunji.jpg](https://commons.wikimedia.org/wiki/File:%E4%B8%8B%E7%B7%8F%E5%9B%BD%E5%88%86%E5%AF%BA_%E5%A1%94%E7%A4%8E%E7%9F%B3.jpg) | Saigen Jiro | Public domain |
| 25 | 曽谷貝塚 | [soya-shell-mound.jpg](https://commons.wikimedia.org/wiki/File:Soya_Shell_Midden.JPG) | Abasaa | Public domain |
| 26 | 春日神社と周辺の街並み | [kasuga-shrine.jpg](https://commons.wikimedia.org/wiki/File:%E6%98%A5%E6%97%A5%E7%A5%9E%E7%A4%BE_-_panoramio.jpg) | Akeiro Torii | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 30 | 姥山貝塚公園 | [ubayama-shell-mound.jpg](https://commons.wikimedia.org/wiki/File:Ubayama20120519.jpg) | 三人日 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 31 | 大柏川と桜並木 | [okashiwa-river-sakura.jpg](https://commons.wikimedia.org/wiki/File:Okashiwariver1.jpg) | ゆりのき橋 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 33 | 大柏川第一調節池緑地 | [okashiwa-reservoir.jpg](https://commons.wikimedia.org/wiki/File:Ryokuti.jpg) | Mikagura | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 36 | 東山魁夷記念館 | [higashiyama-kaii-museum.jpg](https://commons.wikimedia.org/wiki/File:HigashiyamaKaiiMemorialHall20100724.jpg) | のどごし隊長 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 37 | 中山法華経寺 | [nakayama-hokekyoji.jpg](https://commons.wikimedia.org/wiki/File:%E4%B8%AD%E5%B1%B1%E6%B3%95%E8%8F%AF%E7%B5%8C%E5%AF%BA_-_panoramio_(28).jpg) | くろふね | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 38 | 中山参道と商店街 | [nakayama-sando.jpg](https://commons.wikimedia.org/wiki/File:%E4%B8%AD%E5%B1%B1%E6%B3%95%E8%8F%AF%E7%B5%8C%E5%AF%BA_-_panoramio_(25).jpg) | くろふね | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 41 | 白幡神社と高台からの眺め | [shirahata-shrine.jpg](https://commons.wikimedia.org/wiki/File:%E7%99%BD%E5%B9%A1%E7%A5%9E%E7%A4%BE_-_panoramio.jpg) | Akeiro Torii | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 42 | 真間川と桜並木 | [mamagawa-sakura.jpg](https://commons.wikimedia.org/wiki/File:%E7%9C%9F%E9%96%93%E5%B7%9D%E3%81%AE%E6%A1%9C20210327-IMG_2255.jpg) | くろふね | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| 43 | 昭和学院のオープンスペース | [showa-gakuin.jpg](https://commons.wikimedia.org/wiki/File:Showa_Gakuin_Junior_College.JPG) | Abasaa | Public domain |
| 44 | 白幡天神社と湯の花祭り | [shirahata-tenjinsha.jpg](https://commons.wikimedia.org/wiki/File:ShirahatatenJinja20111116.jpg) | 三人日 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 48 | 郭沫若記念館 | [guo-moruo-museum.jpg](https://commons.wikimedia.org/wiki/File:KakuMatsujyakuMemorialHall20110116.jpg) | 三人日 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 49 | 芳澤ガーデンギャラリー | [yoshizawa-garden-gallery.jpg](https://commons.wikimedia.org/wiki/File:YoshizawaGardenGallery20120401.jpg) | 三人日 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 51 | 木内ギャラリー | [kiuchi-gallery.jpg](https://commons.wikimedia.org/wiki/File:KiuchiGallery20100425.jpg) | 麒麟坊 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 52 | 真間山 | [mamasan-niomon.jpg](https://commons.wikimedia.org/wiki/File:%E7%9C%9F%E9%96%93%E5%B1%B1%E5%BC%98%E6%B3%95%E5%AF%BA%E4%BB%81%E7%8E%8B%E9%96%8020250323-P1065758.jpg) | くろふね | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| 53 | 弘法寺と伏姫桜 | [guhoji-fusehime-zakura.jpg](https://commons.wikimedia.org/wiki/File:%E5%BC%98%E6%B3%95%E5%AF%BA%E3%80%81%E8%87%A5%E5%A7%AB%E6%A1%9C_-_panoramio.jpg) | haya_sann | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 54 | 手児奈霊神堂とまつり | [tekona-reijindo.jpg](https://commons.wikimedia.org/wiki/File:Tekonareishindou.jpg) | Quatrogatos | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 57 | 市川駅周辺 | [ichikawa-station.jpg](https://commons.wikimedia.org/wiki/File:JR_Ichikawa_sta_003(cropped).jpg) | 東京特許許可局 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 58 | I-linkタウンいちかわ | [i-link-town.jpg](https://commons.wikimedia.org/wiki/File:%E5%B8%82%E5%B7%9D%E3%82%A2%E3%82%A4%E3%83%AA%E3%83%B3%E3%82%AF%E3%82%BF%E3%82%A6%E3%83%B3_-_panoramio.jpg) | くろふね | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 61 | 葛飾八幡宮と千本イチョウ | [katsushika-hachimangu.jpg](https://commons.wikimedia.org/wiki/File:%E5%8D%83%E6%9C%AC%E5%85%AC%E5%AD%AB%E6%A8%B9%E3%81%AE%E9%BB%84%E8%91%89%EF%BC%88%E8%91%9B%E9%A3%BE%E5%85%AB%E5%B9%A1%E5%AE%AE%EF%BC%8920251124-IMG_5281.jpg) | くろふね | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| 62 | 本八幡駅周辺 | [motoyawata-station.jpg](https://commons.wikimedia.org/wiki/File:Moto-Yawata_Station_N_20191129.jpg) | Xser21 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 63 | 八幡やぶしらず | [yawata-yabushirazu.jpg](https://commons.wikimedia.org/wiki/File:%E5%85%AB%E5%B9%A1%E3%81%AE%E8%97%AA%E7%9F%A5%E3%82%89%E3%81%9A_-_panoramio.jpg) | くろふね | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 64 | ニッケコルトンプラザ周辺 | [nikke-colton-plaza.jpg](https://commons.wikimedia.org/wiki/File:%E3%83%8B%E3%83%83%E3%82%B1%E3%82%B3%E3%83%AB%E3%83%88%E3%83%B3%E3%83%97%E3%83%A9%E3%82%B6_-_panoramio_-_%E3%81%8F%E3%82%8D%E3%81%B5%E3%81%AD_(1).jpg) | くろふね | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 65 | メディアパーク・現代産業科学館周辺 | [science-museum.jpg](https://commons.wikimedia.org/wiki/File:Chiba_Museum_of_Science_and_Industry,_outside_04.jpg) | 掬茶 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 66 | 文化会館前とプロムナード | [cultural-hall.jpg](https://commons.wikimedia.org/wiki/File:IchikawashiBunkakaikan.JPG) | ５１６ | [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/) |
| 67 | 原木山妙行寺 | [barakisan-myogyoji.jpg](https://commons.wikimedia.org/wiki/File:Myogyoji20120211.jpg) | 三人日 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 68 | 行徳橋（行徳可動堰） | [gyotoku-bridge.jpg](https://commons.wikimedia.org/wiki/File:Gy%C5%8Dtoku_bashi_-2020_2.jpg) | しんぎんぐきゃっと | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 70 | 徳願寺 | [tokuganji.jpg](https://commons.wikimedia.org/wiki/File:Tokuganji20101226.jpg) | 三人日 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 76 | 常夜灯（公園） | [joyato-park.jpg](https://commons.wikimedia.org/wiki/File:%E6%B1%9F%E6%88%B8%E5%B7%9D%E5%B7%A6%E5%B2%B8%E3%80%81%E5%B8%B8%E5%A4%9C%E7%81%AF%E5%85%AC%E5%9C%92_-_panoramio_(2).jpg) | resource70 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 78 | 旧江戸川 | [kyu-edogawa.jpg](https://commons.wikimedia.org/wiki/File:%E6%97%A7%E6%B1%9F%E6%88%B8%E5%B7%9D_Kyu-Edogawa_River_-_panoramio.jpg) | harumeki | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 80 | 妙典駅周辺 | [myoden-station.jpg](https://commons.wikimedia.org/wiki/File:Myoden-station-exit-may3-2017.jpg) | Nesnad | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 82 | イオン市川妙典店周辺 | [aeon-myoden.jpg](https://commons.wikimedia.org/wiki/File:AEON_Ichikawa-My%C5%8Dden_2.jpg) | Yobi | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 85 | 江戸川放水路 | [edogawa-waterway.jpg](https://commons.wikimedia.org/wiki/File:%E6%B1%9F%E6%88%B8%E5%B7%9D%E6%94%BE%E6%B0%B4%E8%B7%AF0km%E3%83%9D%E3%82%B9%E3%83%88_-_2006-11-26.jpg) | Kenichiro MATOHARA | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| 87 | 行徳駅前と商店街の街並み | [gyotoku-station.jpg](https://commons.wikimedia.org/wiki/File:Gy%C5%8Dtoku_Station_south_2024.jpg) | Archiroid21 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 88 | 行徳駅前公園 | [gyotoku-ekimae-park.jpg](https://commons.wikimedia.org/wiki/File:Gyotoku-Park(Ichikawa_Miniature_Train_Park)_-_panoramio.jpg) | Kaz Ish | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 89 | 今井橋 | [imai-bridge.jpg](https://commons.wikimedia.org/wiki/File:%E4%BB%8A%E4%BA%95%E6%A9%8B%E3%82%88%E3%82%8A%E6%B1%9F%E6%88%B8%E5%B7%9D%E4%B8%8A%E6%B5%81%E5%81%B4_-_panoramio.jpg) | resource70 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 91 | 南行徳公園（えんぴつ公園） | [minami-gyotoku-park.jpg](https://commons.wikimedia.org/wiki/File:Pencils_in_%22pencil%22_park_-_panoramio.jpg) | Masato OTA | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 94 | 行徳近郊緑地と野鳥観察舎 | [gyotoku-wildlife-sanctuary.jpg](https://commons.wikimedia.org/wiki/File:Gyotoku_Wildlife_Sanctuary.jpg) | resource70 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| 95 | 宮内庁新浜鴨場 | [shinhama-kamoba.jpg](https://commons.wikimedia.org/wiki/File:Shinhama_Kamoba.JPG) | あばさー | Public domain |
| 100 | 東京湾三番瀬（**船橋市側から撮影**） | [sanbanze.jpg](https://commons.wikimedia.org/wiki/File:%E3%81%B5%E3%81%AA%E3%81%B0%E3%81%97%E4%B8%89%E7%95%AA%E7%80%AC%E6%B5%B7%E6%B5%9C%E5%85%AC%E5%9C%92%E3%81%AE%E5%88%9D%E6%97%A5%E3%81%AE%E5%87%BA20220101-IMG_9036.jpg) | くろふね | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |

ファイル名のリンク先がコモンズの説明ページ（＝出典）。

## 写真が見つからなかったスポット（46 / 100）

**現地で撮ってくれば埋まる。** 下の表がその候補リスト。
「同名別所」と書いたものは、検索では大量に出てくるが**すべて市川市外**だったという意味で、
市川市のその場所の写真がコモンズに 1 枚も無い。

| # | スポット | 所在地 | 見つからなかった理由 |
|---|---|---|---|
| 5 | 江戸川沿いの桜並木 | 千葉県市川市 | 桜並木の写真が無い（建物・魚・水遊びのみ） |
| 6 | 大町周辺の森 | 千葉県市川市大町地先 | 松戸市泉丘の写真だった |
| 7 | 大町梨街道 | 千葉県市川市大町地先 | 道路標識のみで景観の写真が無い |
| 8 | 梨畑と梨作りの風景 | 千葉県市川市大町地先 | 梨畑の写真が無い |
| 13 | 小塚山公園 | 千葉県市川市北国分1丁目26 | 候補ゼロ |
| 14 | 国分川鯉のぼりフェティバル | 千葉県市川市東国分3丁目9 | 鯉のぼりフェスティバルの写真が無い |
| 16 | 弁天池公園 | 千葉県市川市曽谷2丁目33 | **愛知県日進市の弁天池公園**だった（同名別所） |
| 19 | 里見公園からの東京・江戸川の眺め | 千葉県市川市国府台3丁目9 | 18 と同じ里見公園の写真しか無く、眺めの写真が無い |
| 20 | 国府台斜面緑地 | 千葉県市川市国府台3丁目9 | 斜面緑地とわかる写真が無い |
| 23 | 曽谷の高台からの眺め | 千葉県市川市曽谷2丁目地先 | **宗谷岬・砕氷船宗谷・宗谷海峡**が集まった（「曽谷」の同名別所） |
| 24 | 曽谷小学校前の桜並木 | 千葉県市川市曽谷7丁目18-1 | 校名板のみで桜並木の写真が無い |
| 27 | こざと公園周辺 | 千葉県市川市南大野2丁目5、-6 | **名古屋・熱田**の常夜灯などで、こざと公園の写真が無い |
| 28 | 市川パークハイツと周辺の緑 | 千葉県市川市南大野2丁目3-3 | **徳島県吉野町南大野**が混ざり、市川の写真は工事中のマンションのみ |
| 29 | 南大野1丁目の街並み | 千葉県市川市南大野1丁目地先 | 街並みの写真が無い |
| 32 | 市民プール | 千葉県市川市北方町4丁目2270-3 | **各務原市民プール・春日部市民プール**だった（同名別所） |
| 34 | 北方小学校からの眺め | 千葉県市川市北方町4丁目1356-1 | **岐阜県本巣郡北方町の北方小学校**だった（同名別所） |
| 35 | 子之神社 | 千葉県市川市北方3丁目17-23 | **神奈川県湯河原町の子之神社**が混在。市川のものと確認できる写真が無い |
| 39 | 花の道オアシス（若宮）周辺 | 千葉県市川市若宮1丁目12-2 | 花の道オアシスの写真が無い |
| 40 | 高圓寺と藤まつり | 千葉県市川市宮久保4丁目5-1 | 藤まつり・高圓寺の写真が無い |
| 45 | クロマツと街並み | 千葉県市川市 | クロマツの写真が無い（市川真間駅ばかり） |
| 46 | 平田緑地 | 千葉県市川市平田2丁目23 | 平田緑地の写真が無い（菅野駅ばかり） |
| 47 | 文学の道 | 千葉県市川市真間3丁目5-3-1地先 | 文学の道（真間3丁目）と確認できる写真が無い |
| 50 | 須和田公園 | 千葉県市川市須和田2丁目34 | 須和田公園の写真が無い（弘法寺の写真だった） |
| 55 | 大門通り | 千葉県市川市市川1丁目地先 | **愛知県岡崎市の大門通り**だった（同名別所） |
| 56 | 国道14号のバラ | 千葉県市川市市川3丁目地先 | バラの写真が無い |
| 59 | パークシティ市川のオープンスペース | 千葉県市川市市川南3丁目12 | オープンスペースの写真が無い |
| 60 | 大洲防災公園 | 千葉県市川市大洲1丁目18 | 花火の写真で、公園そのものが写っていない |
| 69 | 江戸川妙典堤防 | 千葉県市川市妙典6丁目地先 | 堤防と確認できる写真が無い |
| 71 | 行徳寺町通り周辺の街並み | 千葉県市川市本行徳地先 | 寺町通りの写真が無い |
| 72 | 行徳の歴史・文化史ある建築物 | 千葉県市川市本行徳地先 | 建築物の写真が無い |
| 73 | 権現道 | 千葉県市川市本行徳地先 | 権現道の写真が無い |
| 74 | 八幡神社と桜 | 千葉県市川市本行徳25-20 | **春日部市の八幡神社**だった（同名別所） |
| 75 | 行徳みこしとまつり | 千葉県市川市本行徳地先 | みこし・まつりの写真が無い |
| 77 | 旧行徳街道 | 千葉県市川市 | 水神宮（299m 先）はあるが、旧行徳街道そのものではない |
| 79 | 行徳小学校周辺 | 千葉県市川市富浜1丁目1-40 | **福島県郡山市立行徳小学校**だった（同名別所） |
| 81 | 妙典公園 | 千葉県市川市妙典6丁目101 | 妙典公園の写真が無い |
| 83 | 妙典中央通りのけやき並木 | 千葉県市川市妙典5丁目地先 | けやき並木の写真が無い |
| 84 | クリーンスパ市川からの眺め | 千葉県市川市上妙典1554 | 車載の高速道路写真のみ |
| 86 | 中江川の桜並木（中江川緑道） | 千葉県市川市幸2丁目地先 | 桜並木の写真が無い（病院・倉庫） |
| 90 | 広尾防災公園 | 千葉県市川市広尾2丁目3-2 | 広尾防災公園の写真が無い |
| 92 | 丸浜川と遊歩道 | 千葉県市川市福栄4丁目地先 | 丸浜川と確認できる写真が無い |
| 93 | 江戸川第二終末処理場 | 千葉県市川市福栄4丁目32-2 | 処理場と確認できる写真が無い |
| 96 | 塩浜橋 | 千葉県市川市南行徳4丁目地先 | **東京の中川**の貨物列車が集まった |
| 97 | ハイタウン塩浜 | 千葉県市川市塩浜4丁目2 | 車載の高速道路写真のみ |
| 98 | 塩浜護岸からの眺め | 千葉県市川市塩浜1丁目6-1 | 候補ゼロ |
| 99 | 海の見える風景 | 千葉県市川市塩浜2丁目31 | 配送トラックの写真のみ |

とくに**中心的な観光スポットなのに写真が無い**のは、
小塚山公園（13）・須和田公園（50）・平田緑地（46）・妙典公園（81）・広尾防災公園（90）・
大洲防災公園（60）・こざと公園（27）・弁天池公園（16）の**公園 8 か所**と、
高圓寺と藤まつり（40）・行徳みこしとまつり（75）・国分川鯉のぼりフェスティバル（14）の
**祭り 3 件**。祭りは開催日に行かないと撮れないので、優先度を上げて計画したい。
