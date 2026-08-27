/** 景観スポット（景観100選・F-5）に付ける写真と、その出典。
 *
 * **このファイルは自動生成する。** 直接編集せず、
 * `python3 data/scripts/fetch_scenic_photos.py --credits` で写真と出典を取り直してから
 * `python3 data/scripts/build_scenic_photos_ts.py` を実行すること。
 *
 * 写真の実体は `app/public/images/scenic/<file>.jpg`。
 * **再利用が許されるもの（CC0 / パブリックドメイン / CC BY / CC BY-SA）だけ**を選んである。
 * CC BY と CC BY-SA は作者の表示が条件なので、ポップアップと `/about` の両方に作者名を出す。
 *
 * どの写真がどのスポットのものかは**目視で 1 枚ずつ確かめてある**。
 * 同名別所（愛知県日進市の弁天池公園・岐阜県北方町の北方小学校など）が検索に混ざるため、
 * 名前が一致しただけでは採らない。選定の記録は `data/wikimedia-commons/SOURCE.md`。
 */

export type ScenicPhoto = {
  /** `app/public/images/scenic/` のファイル名（拡張子は付けない） */
  file: string;
  artist: string;
  license: string;
  /** パブリックドメインのものには無い */
  licenseUrl?: string;
  /** ウィキメディア・コモンズの説明ページ（＝出典） */
  page: string;
  /** **撮影地が市川市の外のときだけ書く。** 画面にもそのまま出す */
  placeNote?: string;
};

/** **スポット名 → 写真。**
 *
 * 鍵は `app/public/data/scenic_spots.geojson` の `properties.name` そのまま
 * （100 件で一意なことを確認済み）。写真が無いスポットは載っていない。
 */
export const SCENIC_PHOTOS: Record<string, ScenicPhoto> = {
  "イオン市川妙典店周辺": {
    file: "aeon-myoden",
    artist: "Yobi",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:AEON_Ichikawa-My%C5%8Dden_2.jpg",
  },
  "原木山妙行寺": {
    file: "barakisan-myogyoji",
    artist: "三人日",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Myogyoji20120211.jpg",
  },
  "文化会館前とプロムナード": {
    file: "cultural-hall",
    artist: "５１６",
    license: "CC BY-SA 3.0",
    licenseUrl: "http://creativecommons.org/licenses/by-sa/3.0/",
    page: "https://commons.wikimedia.org/wiki/File:IchikawashiBunkakaikan.JPG",
  },
  "江戸川に架かる橋からの眺め": {
    file: "edogawa-bridge-view",
    artist: "くろふね",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:%E6%B1%9F%E6%88%B8%E5%B7%9D%E6%94%BE%E6%B0%B4%E8%B7%AF%E3%81%AE%E5%B8%82%E5%B7%9D%E5%A4%A7%E6%A9%8B%E3%81%AE%E5%86%99%E7%9C%9F20190525-P1020033.jpg",
  },
  "江戸川": {
    file: "edogawa-river",
    artist: "LERK",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Edogawa_railway_bridge_on_Keisei_main_line_seen_from_Ichikawa_city_Chiba_prefecture_Japan_20230120_152057.jpg",
  },
  "江戸川からの眺め": {
    file: "edogawa-view",
    artist: "くろふね",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:%E5%8D%83%E8%91%89%E7%9C%8C%E5%B8%82%E5%B7%9D%E5%B8%82%E5%A4%A7%E6%B4%B2%E3%81%AE%E6%B1%9F%E6%88%B8%E5%B7%9D%E6%B2%B3%E5%B7%9D%E6%95%B7.jpg",
  },
  "江戸川放水路": {
    file: "edogawa-waterway",
    artist: "Kenichiro MATOHARA",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    page: "https://commons.wikimedia.org/wiki/File:%E6%B1%9F%E6%88%B8%E5%B7%9D%E6%94%BE%E6%B0%B4%E8%B7%AF0km%E3%83%9D%E3%82%B9%E3%83%88_-_2006-11-26.jpg",
  },
  "市民納涼花火大会": {
    file: "fireworks-festival",
    artist: "Zengame",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Fireworks_at_Ichikawa_Fireworks_Festival,_2017.jpg",
  },
  "弘法寺と伏姫桜": {
    file: "guhoji-fusehime-zakura",
    artist: "haya_sann",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E5%BC%98%E6%B3%95%E5%AF%BA%E3%80%81%E8%87%A5%E5%A7%AB%E6%A1%9C_-_panoramio.jpg",
  },
  "郭沫若記念館": {
    file: "guo-moruo-museum",
    artist: "三人日",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:KakuMatsujyakuMemorialHall20110116.jpg",
  },
  "行徳橋（行徳可動堰）": {
    file: "gyotoku-bridge",
    artist: "しんぎんぐきゃっと",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Gy%C5%8Dtoku_bashi_-2020_2.jpg",
  },
  "行徳駅前公園": {
    file: "gyotoku-ekimae-park",
    artist: "Kaz Ish",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Gyotoku-Park(Ichikawa_Miniature_Train_Park)_-_panoramio.jpg",
  },
  "行徳駅前と商店街の街並み": {
    file: "gyotoku-station",
    artist: "Archiroid21",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Gy%C5%8Dtoku_Station_south_2024.jpg",
  },
  "行徳近郊緑地と野鳥観察舎": {
    file: "gyotoku-wildlife-sanctuary",
    artist: "resource70",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Gyotoku_Wildlife_Sanctuary.jpg",
  },
  "東山魁夷記念館": {
    file: "higashiyama-kaii-museum",
    artist: "のどごし隊長",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:HigashiyamaKaiiMemorialHall20100724.jpg",
  },
  "歴史博物館": {
    file: "history-museum",
    artist: "Fred Cherrygarden",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Ichikawa_City_History_Museum.jpg",
  },
  "I-linkタウンいちかわ": {
    file: "i-link-town",
    artist: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E5%B8%82%E5%B7%9D%E3%82%A2%E3%82%A4%E3%83%AA%E3%83%B3%E3%82%AF%E3%82%BF%E3%82%A6%E3%83%B3_-_panoramio.jpg",
  },
  "市川霊園とイチョウ並木": {
    file: "ichikawa-cemetery-ginkgo",
    artist: "Otherde",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Oonomachi4_1_Ichikawa-city.JPG",
  },
  "市川駅周辺": {
    file: "ichikawa-station",
    artist: "東京特許許可局",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:JR_Ichikawa_sta_003(cropped).jpg",
  },
  "今井橋": {
    file: "imai-bridge",
    artist: "resource70",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E4%BB%8A%E4%BA%95%E6%A9%8B%E3%82%88%E3%82%8A%E6%B1%9F%E6%88%B8%E5%B7%9D%E4%B8%8A%E6%B5%81%E5%81%B4_-_panoramio.jpg",
  },
  "常夜灯（公園）": {
    file: "joyato-park",
    artist: "resource70",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E6%B1%9F%E6%88%B8%E5%B7%9D%E5%B7%A6%E5%B2%B8%E3%80%81%E5%B8%B8%E5%A4%9C%E7%81%AF%E5%85%AC%E5%9C%92_-_panoramio_(2).jpg",
  },
  "じゅん菜池緑地": {
    file: "junsaiike-park",
    artist: "Tatsubou",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Junsai-ike_park.jpg",
  },
  "春日神社と周辺の街並み": {
    file: "kasuga-shrine",
    artist: "Akeiro Torii",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E6%98%A5%E6%97%A5%E7%A5%9E%E7%A4%BE_-_panoramio.jpg",
  },
  "葛飾八幡宮と千本イチョウ": {
    file: "katsushika-hachimangu",
    artist: "くろふね",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:%E5%8D%83%E6%9C%AC%E5%85%AC%E5%AD%AB%E6%A8%B9%E3%81%AE%E9%BB%84%E8%91%89%EF%BC%88%E8%91%9B%E9%A3%BE%E5%85%AB%E5%B9%A1%E5%AE%AE%EF%BC%8920251124-IMG_5281.jpg",
  },
  "木内ギャラリー": {
    file: "kiuchi-gallery",
    artist: "麒麟坊",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:KiuchiGallery20100425.jpg",
  },
  "旧江戸川": {
    file: "kyu-edogawa",
    artist: "harumeki",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E6%97%A7%E6%B1%9F%E6%88%B8%E5%B7%9D_Kyu-Edogawa_River_-_panoramio.jpg",
  },
  "真間川と桜並木": {
    file: "mamagawa-sakura",
    artist: "くろふね",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:%E7%9C%9F%E9%96%93%E5%B7%9D%E3%81%AE%E6%A1%9C20210327-IMG_2255.jpg",
  },
  "真間山": {
    file: "mamasan-niomon",
    artist: "くろふね",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:%E7%9C%9F%E9%96%93%E5%B1%B1%E5%BC%98%E6%B3%95%E5%AF%BA%E4%BB%81%E7%8E%8B%E9%96%8020250323-P1065758.jpg",
  },
  "万葉植物園": {
    file: "manyo-botanical-garden",
    artist: "のどごし隊長",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:ManyoShokubutsuen20100606.jpg",
  },
  "南行徳公園（えんぴつ公園）": {
    file: "minami-gyotoku-park",
    artist: "Masato OTA",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Pencils_in_%22pencil%22_park_-_panoramio.jpg",
  },
  "本八幡駅周辺": {
    file: "motoyawata-station",
    artist: "Xser21",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Moto-Yawata_Station_N_20191129.jpg",
  },
  "妙典駅周辺": {
    file: "myoden-station",
    artist: "Nesnad",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Myoden-station-exit-may3-2017.jpg",
  },
  "中山法華経寺": {
    file: "nakayama-hokekyoji",
    artist: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E4%B8%AD%E5%B1%B1%E6%B3%95%E8%8F%AF%E7%B5%8C%E5%AF%BA_-_panoramio_(28).jpg",
  },
  "中山参道と商店街": {
    file: "nakayama-sando",
    artist: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E4%B8%AD%E5%B1%B1%E6%B3%95%E8%8F%AF%E7%B5%8C%E5%AF%BA_-_panoramio_(25).jpg",
  },
  "ニッケコルトンプラザ周辺": {
    file: "nikke-colton-plaza",
    artist: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E3%83%8B%E3%83%83%E3%82%B1%E3%82%B3%E3%83%AB%E3%83%88%E3%83%B3%E3%83%97%E3%83%A9%E3%82%B6_-_panoramio_-_%E3%81%8F%E3%82%8D%E3%81%B5%E3%81%AD_(1).jpg",
  },
  "大柏川第一調節池緑地": {
    file: "okashiwa-reservoir",
    artist: "Mikagura",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Ryokuti.jpg",
  },
  "大柏川と桜並木": {
    file: "okashiwa-river-sakura",
    artist: "ゆりのき橋",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Okashiwariver1.jpg",
  },
  "大町自然観察園": {
    file: "omachi-nature-park",
    artist: "resource70",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:20061026_100_0964_-_panoramio.jpg",
  },
  "東京湾三番瀬": {
    file: "sanbanze",
    artist: "くろふね",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:%E3%81%B5%E3%81%AA%E3%81%B0%E3%81%97%E4%B8%89%E7%95%AA%E7%80%AC%E6%B5%B7%E6%B5%9C%E5%85%AC%E5%9C%92%E3%81%AE%E5%88%9D%E6%97%A5%E3%81%AE%E5%87%BA20220101-IMG_9036.jpg",
    placeNote: "船橋市側から撮影",
  },
  "里見公園": {
    file: "satomi-park",
    artist: "麒麟坊",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:SatomiKouen.jpg",
  },
  "メディアパーク・現代産業科学館周辺": {
    file: "science-museum",
    artist: "掬茶",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Chiba_Museum_of_Science_and_Industry,_outside_04.jpg",
  },
  "下総国分寺周辺": {
    file: "shimosa-kokubunji",
    artist: "Saigen Jiro",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File:%E4%B8%8B%E7%B7%8F%E5%9B%BD%E5%88%86%E5%AF%BA_%E5%A1%94%E7%A4%8E%E7%9F%B3.jpg",
  },
  "宮内庁新浜鴨場": {
    file: "shinhama-kamoba",
    artist: "あばさー",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File:Shinhama_Kamoba.JPG",
  },
  "白幡神社と高台からの眺め": {
    file: "shirahata-shrine",
    artist: "Akeiro Torii",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E7%99%BD%E5%B9%A1%E7%A5%9E%E7%A4%BE_-_panoramio.jpg",
  },
  "白幡天神社と湯の花祭り": {
    file: "shirahata-tenjinsha",
    artist: "三人日",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:ShirahatatenJinja20111116.jpg",
  },
  "昭和学院のオープンスペース": {
    file: "showa-gakuin",
    artist: "Abasaa",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File:Showa_Gakuin_Junior_College.JPG",
  },
  "曽谷貝塚": {
    file: "soya-shell-mound",
    artist: "Abasaa",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File:Soya_Shell_Midden.JPG",
  },
  "手児奈霊神堂とまつり": {
    file: "tekona-reijindo",
    artist: "Quatrogatos",
    license: "CC0",
    licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    page: "https://commons.wikimedia.org/wiki/File:Tekonareishindou.jpg",
  },
  "徳願寺": {
    file: "tokuganji",
    artist: "三人日",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Tokuganji20101226.jpg",
  },
  "姥山貝塚公園": {
    file: "ubayama-shell-mound",
    artist: "三人日",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Ubayama20120519.jpg",
  },
  "和洋学園のラウンジからの眺め": {
    file: "wayo-university",
    artist: "Los688（日本語版ウィキペディア）",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File:Wayoujosidaigaku.jpg",
  },
  "八幡やぶしらず": {
    file: "yawata-yabushirazu",
    artist: "くろふね",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:%E5%85%AB%E5%B9%A1%E3%81%AE%E8%97%AA%E7%9F%A5%E3%82%89%E3%81%9A_-_panoramio.jpg",
  },
  "芳澤ガーデンギャラリー": {
    file: "yoshizawa-garden-gallery",
    artist: "三人日",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:YoshizawaGardenGallery20120401.jpg",
  },
  "動植物園": {
    file: "zoological-botanical-garden",
    artist: "四葉亭四迷",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Ichikawa_Zoo_Main_Gate_20170204.jpg",
  },
};

/** public/ からのパス。 */
export function scenicPhotoSrc(photo: ScenicPhoto): string {
  return `/images/scenic/${photo.file}.jpg`;
}

/** スポット名から写真を引く。無ければ null（写真が無いスポットの方が多い）。 */
export function scenicPhoto(name: string | undefined): ScenicPhoto | null {
  if (!name) return null;
  return SCENIC_PHOTOS[name] ?? null;
}
