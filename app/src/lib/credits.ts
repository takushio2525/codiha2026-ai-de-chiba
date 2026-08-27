/** 出典（クレジット）。地図の隅と /about の両方で同じ文言を使う。
 *
 * プレゼン資料でもデータの参照元の記載が必須なので、文言はここを正とする。
 * 課題/2026-09-09_CODIHA2026_提出要件.md を参照。
 */

export type Credit = {
  what: string;
  text: string;
  href: string;
  license: string;
};

export const DATA_CREDITS: Credit[] = [
  {
    what: "指定緊急避難場所・AED 設置箇所・子育て施設",
    text: "市川市オープンデータ（千葉県オープンデータサイトに登録）を加工して作成",
    href: "https://www.city.ichikawa.lg.jp/page/4744.html",
    license: "CC BY 4.0",
  },
  {
    what: "景観スポット（いちかわ景観100選）",
    text: "「【市川市】景観100選」（市川市オープンデータ）を加工して作成。"
      + "名称・解説（日本語・英語）・カテゴリ・アクセス方法は元データのまま表示している",
    href: "https://opendata.pref.chiba.lg.jp/datasets/3291",
    license: "CC BY 4.0",
  },
  {
    what: "背景地図",
    text: "国土地理院「淡色地図」タイル",
    href: "https://maps.gsi.go.jp/development/ichiran.html",
    license: "国土地理院コンテンツ利用規約",
  },
  {
    what: "ハザードマップ（洪水・高潮・津波の浸水想定）",
    text: "出典:「ハザードマップポータルサイト」（作成: 国土交通省各地方整備局等・都道府県）"
      + "が配信するタイルを重ねて表示",
    href: "https://disaportal.gsi.go.jp/",
    license: "公共データ利用規約（第 1.0 版）PDL1.0",
  },
  {
    what: "雨量の実況・雨の予報（浸水報告と注意案内）",
    // 気象庁の公共データ利用規約は「出典：気象庁ホームページ（URL）」の表記を求めており、
    // **編集・加工して使うときは、加工した旨も別に書く**ことになっている。
    // CHIZUBA は最寄り観測所の抽出と距離の計算をしているので、そこまで書く。
    text: "出典: 気象庁ホームページ（アメダス実況・府県天気予報）"
      + "。最寄りの観測所の抽出と距離の算出を行って表示している",
    href: "https://www.jma.go.jp/bosai/",
    license: "公共データ利用規約（第 1.0 版）PDL1.0",
  },
  {
    what: "徒歩経路の計算",
    text: "OSRM（FOSSGIS e.V. 提供）／道路データは OpenStreetMap contributors",
    href: "https://routing.openstreetmap.de/about.html",
    license: "ODbL（OpenStreetMap）",
  },
];


/** デモ投稿に付けた写真 1 枚ぶんの出どころ。 */
export type PhotoCredit = {
  /** `app/db/seed-photos/` のファイル名（拡張子は付けない） */
  file: string;
  /** 何が写っているか */
  what: string;
  /** 撮影地 */
  place: string;
  /** **市川市で撮られたものか。** false のものは防災のデモ投稿に付けた参考写真で、
   *  市川市で実際に起きた被害の写真ではない */
  inIchikawa: boolean;
  artist: string;
  license: string;
  licenseUrl: string;
  /** ウィキメディア・コモンズの説明ページ（＝出典） */
  page: string;
};

/** **デモ投稿の写真の出典。**
 *
 * 初回起動から投稿が入って見えるように用意したデモ投稿（`app/db/init/003_seed_demo_reports.sql`）
 * に付けている写真。**ウィキメディア・コモンズで再利用が許されているもの（CC0 / CC BY /
 * CC BY-SA）だけ**を選んである。CC BY と CC BY-SA は作者の表示が条件なので、
 * `/about` に全 17 枚ぶんを並べ、投稿の詳細パネルからもそこへ辿れるようにしている。
 *
 * 加工したのは長辺 1000 px への縮小と JPEG への再圧縮だけ（切り抜き・色調整はしていない）。
 * 取得の記録は `data/wikimedia-commons/SOURCE.md`、取り直しは
 * `data/scripts/fetch_seed_photos.py`。
 */
export const DEMO_PHOTO_CREDITS: PhotoCredit[] = [
  {
    file: "demo-spot-hokekyoji-pagoda",
    what: "中山法華経寺の五重塔",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "Kentagon",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Hokekyoji_FiveStoryPagoda_Ichikawa.JPG",
  },
  {
    file: "demo-spot-hokekyoji-sakura",
    what: "中山法華経寺の桜",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "t.kunikuni",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Cherry_blossoms_at_Hokekyoji_Temple,_Ichikawa,_2018.jpg",
  },
  {
    file: "demo-spot-satomi-park",
    what: "里見公園の花壇",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "麒麟坊",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:SatomiKouen.jpg",
  },
  {
    file: "demo-spot-edogawa-bridge",
    what: "江戸川と市川橋",
    place: "江戸川（東京都・千葉県市川市の境）",
    inIchikawa: true,
    artist: "Nesnad",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Ichikawa_bridge_Edo_river_2023_Jan_26_07-21AM.jpeg",
  },
  {
    file: "demo-spot-hachimangu-icho",
    what: "葛飾八幡宮の千本イチョウ",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "Saigen Jiro",
    license: "CC0",
    licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    page: "https://commons.wikimedia.org/wiki/File:Katsushika-hachimangu,_icho.jpg",
  },
  {
    file: "demo-spot-hachimangu-gate",
    what: "葛飾八幡宮の随神門",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "Saigen Jiro",
    license: "CC0",
    licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    page: "https://commons.wikimedia.org/wiki/File:Katsushika-hachimangu,_zuishinmon.jpg",
  },
  {
    file: "demo-spot-guhoji-gate",
    what: "真間山弘法寺の仁王門",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "Waka77",
    license: "CC0",
    licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    page: "https://commons.wikimedia.org/wiki/File:Mamasan_Guhoji_Niomon.JPG",
  },
  {
    file: "demo-spot-tekona",
    what: "手児奈霊神堂の入口",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "Myksrsw",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Tekonareishindo_gate.jpg",
  },
  {
    file: "demo-spot-junsaiike",
    what: "じゅん菜池緑地",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "麒麟坊",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:JunsaiikeRyokuchi.jpg",
  },
  {
    file: "demo-spot-mamagawa-sakura",
    what: "真間川の桜並木",
    place: "千葉県市川市",
    inIchikawa: true,
    artist: "Namazu-tron",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Cherry_Blossom_Mama-gawa_ichikawa_Chiba-Japan.jpg",
  },
  {
    file: "demo-spot-nashi-fruit",
    what: "木になっている和梨",
    place: "撮影地不明（市川市ではない）",
    inIchikawa: false,
    artist: "PumpkinSky",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Pyrus_pyrifolia_fruit_on_tree_PS_2z_LR.jpg",
  },
  {
    file: "demo-ref-flooded-road-2",
    what: "冠水した道路",
    place: "イギリス・デヴォン州 Bickleigh",
    inIchikawa: false,
    artist: "Lewis Clarke",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Bickleigh_-_Flooded_Road_(geograph_2750554).jpg",
  },
  {
    file: "demo-ref-flooded-road-3",
    what: "片側が冠水した道路",
    place: "イギリス（Geograph 収録）",
    inIchikawa: false,
    artist: "John Baker",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Flooded_road_-_geograph.org.uk_-_4794313.jpg",
  },
  {
    file: "demo-ref-sandbag",
    what: "積み上げた土のう",
    place: "日本（詳細不明）",
    inIchikawa: false,
    artist: "Shift（日本語版ウィキペディアの利用者）",
    license: "CC BY-SA 3.0",
    licenseUrl: "http://creativecommons.org/licenses/by-sa/3.0/",
    page: "https://commons.wikimedia.org/wiki/File:Donou.jpg",
  },
  {
    file: "demo-ref-river-swollen",
    what: "台風で増水した多摩川",
    place: "日本・東京都（2011 年台風 12 号）",
    inIchikawa: false,
    artist: "Kazuhiro Keino",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Flooded_Tamagawa_in_aftermath_of_Typhoon_Talas_2011.jpg",
  },
  {
    file: "demo-ref-pothole-1",
    what: "路面の陥没",
    place: "撮影地不明（市川市ではない）",
    inIchikawa: false,
    artist: "Wrleo",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Lcb-1.jpg",
  },
  {
    file: "demo-ref-pothole-2",
    what: "アスファルトの穴",
    place: "撮影地不明（市川市ではない）",
    inIchikawa: false,
    artist: "Nuggyland",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Bache_en_la_escuela.jpg",
  },
];

/* **景観スポットの写真の出典は `lib/scenicPhotos.ts` にある**（このファイルではない）。
 *
 * デモ投稿の写真（上の `DEMO_PHOTO_CREDITS`）と違い、景観スポットの写真は
 * **取得スクリプトが出典ごと自動生成する**ので、生成物をそのまま正本にしている
 * （`data/scripts/build_scenic_photos_ts.py`）。ここに写すと二重管理になる。
 *
 * 画面に出す場所は 2 つ。地図のポップアップ（作者とライセンスだけ）と、
 * `/about` の「景観100選のスポット写真」節（54 枚ぶんの全部）。
 */

/** 地図の隅（MapLibre の attribution）に出す短い版。HTML 断片として渡す。 */
export const MAP_ATTRIBUTION: string[] = [
  '<a href="https://www.city.ichikawa.lg.jp/page/4744.html" target="_blank" rel="noreferrer">市川市オープンデータ</a>を加工して作成',
  'ハザードマップ: <a href="https://disaportal.gsi.go.jp/" target="_blank" rel="noreferrer">ハザードマップポータルサイト</a>',
  '雨量・予報: <a href="https://www.jma.go.jp/bosai/" target="_blank" rel="noreferrer">気象庁</a>',
  '経路: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer">OSRM / FOSSGIS</a>',
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  // FOSSGIS の利用規約が求めている「地図を修正する」リンク
  '<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">地図の修正</a>',
];
