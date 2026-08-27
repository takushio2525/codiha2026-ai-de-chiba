#!/usr/bin/env python3
"""景観100選（F-5）のスポット写真を、ウィキメディア・コモンズから取得する。

出力先は **`app/public/images/scenic/`**（ブラウザがそのまま読む静的ファイル）。
デモ投稿の写真（`data/scripts/fetch_seed_photos.py`）とは別物なので混ぜないこと。

    python3 data/scripts/fetch_scenic_photos.py

**再利用が許されるライセンス（CC0 / パブリックドメイン / CC BY / CC BY-SA）のものだけ**
を落とす。NC・ND・ライセンス不明のものは、指定されていても弾く。

`--credits` を付けると、`app/src/lib/scenicPhotos.ts` に書く出典（作者・ライセンス・
元ページ）を JSON で吐く。台帳を作り直すときに使う。

**どの写真がどのスポットのものかは、目視で 1 枚ずつ確かめてある。**
市川市の外で撮られた同名の場所（愛知県日進市の弁天池公園、岐阜県北方町の北方小学校、
福島県郡山市立行徳小学校、静岡市の徳願寺、宗谷岬 など）が検索に大量に混ざるので、
**名前が一致しただけで採らないこと。** 選定の記録は `data/wikimedia-commons/SOURCE.md`。

標準ライブラリだけで動く。縮小には macOS の `sips` を使う（無ければ原寸のまま
残して警告する）。取得は 1 回きりの作業なので、他 OS 向けの分岐は用意していない。
"""
import json
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://commons.wikimedia.org/w/api.php"
# ウィキメディアは **UA に連絡先を含めること**を求めていて、
# 満たさないと 429（robot policy）で弾かれる。
UA = (
    "CHIZUBA-CODIHA2026/1.0 "
    "(https://github.com/takushio2525/codiha2026-ai-de-chiba) "
    "Python-urllib/3"
)
ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "app" / "public" / "images" / "scenic"
# 長辺をここまで縮める。ポップアップの帯は 288 px 幅なので、
# 高解像度の画面（2 倍）でも 900 px あれば足りる。1 枚 200 KB 前後に収まる
MAX_EDGE = 900
JPEG_QUALITY = 70
SLEEP_SEC = 1.0

OK_PREFIX = ("CC0", "CC BY", "CC-BY", "Public domain", "PD")
NG_WORDS = ("NC", "ND", "Fair use", "non-commercial")

# **スポット名（GeoJSON の properties.name）→ (保存名, コモンズのファイル名)**
# スポット名は `app/public/data/scenic_spots.geojson` の値をそのまま使う（100 件で一意）。
SPOT_PHOTOS = {
    "江戸川": ("edogawa-river", "File:Edogawa railway bridge on Keisei main line seen from Ichikawa city Chiba prefecture Japan 20230120 152057.jpg"),
    "江戸川からの眺め": ("edogawa-view", "File:千葉県市川市大洲の江戸川河川敷.jpg"),
    "江戸川に架かる橋からの眺め": ("edogawa-bridge-view", "File:江戸川放水路の市川大橋の写真20190525-P1020033.jpg"),
    "市民納涼花火大会": ("fireworks-festival", "File:Fireworks at Ichikawa Fireworks Festival, 2017.jpg"),
    "大町自然観察園": ("omachi-nature-park", "File:20061026 100 0964 - panoramio.jpg"),
    "動植物園": ("zoological-botanical-garden", "File:Ichikawa Zoo Main Gate 20170204.jpg"),
    "市川霊園とイチョウ並木": ("ichikawa-cemetery-ginkgo", "File:Oonomachi4 1 Ichikawa-city.JPG"),
    "歴史博物館": ("history-museum", "File:Ichikawa City History Museum.jpg"),
    "じゅん菜池緑地": ("junsaiike-park", "File:Junsai-ike park.jpg"),
    "万葉植物園": ("manyo-botanical-garden", "File:ManyoShokubutsuen20100606.jpg"),
    "里見公園": ("satomi-park", "File:SatomiKouen.jpg"),
    "和洋学園のラウンジからの眺め": ("wayo-university", "File:Wayoujosidaigaku.jpg"),
    "下総国分寺周辺": ("shimosa-kokubunji", "File:下総国分寺 塔礎石.jpg"),
    "曽谷貝塚": ("soya-shell-mound", "File:Soya Shell Midden.JPG"),
    "春日神社と周辺の街並み": ("kasuga-shrine", "File:春日神社 - panoramio.jpg"),
    "姥山貝塚公園": ("ubayama-shell-mound", "File:Ubayama20120519.jpg"),
    "大柏川と桜並木": ("okashiwa-river-sakura", "File:Okashiwariver1.jpg"),
    "大柏川第一調節池緑地": ("okashiwa-reservoir", "File:Ryokuti.jpg"),
    "東山魁夷記念館": ("higashiyama-kaii-museum", "File:HigashiyamaKaiiMemorialHall20100724.jpg"),
    "中山法華経寺": ("nakayama-hokekyoji", "File:中山法華経寺 - panoramio (28).jpg"),
    "中山参道と商店街": ("nakayama-sando", "File:中山法華経寺 - panoramio (25).jpg"),
    "白幡神社と高台からの眺め": ("shirahata-shrine", "File:白幡神社 - panoramio.jpg"),
    "真間川と桜並木": ("mamagawa-sakura", "File:真間川の桜20210327-IMG 2255.jpg"),
    "昭和学院のオープンスペース": ("showa-gakuin", "File:Showa Gakuin Junior College.JPG"),
    "白幡天神社と湯の花祭り": ("shirahata-tenjinsha", "File:ShirahatatenJinja20111116.jpg"),
    "郭沫若記念館": ("guo-moruo-museum", "File:KakuMatsujyakuMemorialHall20110116.jpg"),
    "芳澤ガーデンギャラリー": ("yoshizawa-garden-gallery", "File:YoshizawaGardenGallery20120401.jpg"),
    "木内ギャラリー": ("kiuchi-gallery", "File:KiuchiGallery20100425.jpg"),
    "真間山": ("mamasan-niomon", "File:真間山弘法寺仁王門20250323-P1065758.jpg"),
    "弘法寺と伏姫桜": ("guhoji-fusehime-zakura", "File:弘法寺、臥姫桜 - panoramio.jpg"),
    "手児奈霊神堂とまつり": ("tekona-reijindo", "File:Tekonareishindou.jpg"),
    "市川駅周辺": ("ichikawa-station", "File:JR Ichikawa sta 003(cropped).jpg"),
    "I-linkタウンいちかわ": ("i-link-town", "File:市川アイリンクタウン - panoramio.jpg"),
    "葛飾八幡宮と千本イチョウ": ("katsushika-hachimangu", "File:千本公孫樹の黄葉（葛飾八幡宮）20251124-IMG 5281.jpg"),
    "本八幡駅周辺": ("motoyawata-station", "File:Moto-Yawata Station N 20191129.jpg"),
    "八幡やぶしらず": ("yawata-yabushirazu", "File:八幡の藪知らず - panoramio.jpg"),
    "ニッケコルトンプラザ周辺": ("nikke-colton-plaza", "File:ニッケコルトンプラザ - panoramio - くろふね (1).jpg"),
    "メディアパーク・現代産業科学館周辺": ("science-museum", "File:Chiba Museum of Science and Industry, outside 04.jpg"),
    "文化会館前とプロムナード": ("cultural-hall", "File:IchikawashiBunkakaikan.JPG"),
    "原木山妙行寺": ("barakisan-myogyoji", "File:Myogyoji20120211.jpg"),
    "行徳橋（行徳可動堰）": ("gyotoku-bridge", "File:Gyōtoku bashi -2020 2.jpg"),
    "徳願寺": ("tokuganji", "File:Tokuganji20101226.jpg"),
    "常夜灯（公園）": ("joyato-park", "File:江戸川左岸、常夜灯公園 - panoramio (2).jpg"),
    "旧江戸川": ("kyu-edogawa", "File:旧江戸川 Kyu-Edogawa River - panoramio.jpg"),
    "妙典駅周辺": ("myoden-station", "File:Myoden-station-exit-may3-2017.jpg"),
    "イオン市川妙典店周辺": ("aeon-myoden", "File:AEON Ichikawa-Myōden 2.jpg"),
    "江戸川放水路": ("edogawa-waterway", "File:江戸川放水路0kmポスト - 2006-11-26.jpg"),
    "行徳駅前と商店街の街並み": ("gyotoku-station", "File:Gyōtoku Station south 2024.jpg"),
    "行徳駅前公園": ("gyotoku-ekimae-park", "File:Gyotoku-Park(Ichikawa Miniature Train Park) - panoramio.jpg"),
    "今井橋": ("imai-bridge", "File:今井橋より江戸川上流側 - panoramio.jpg"),
    "南行徳公園（えんぴつ公園）": ("minami-gyotoku-park", 'File:Pencils in "pencil" park - panoramio.jpg'),
    "行徳近郊緑地と野鳥観察舎": ("gyotoku-wildlife-sanctuary", "File:Gyotoku Wildlife Sanctuary.jpg"),
    "宮内庁新浜鴨場": ("shinhama-kamoba", "File:Shinhama Kamoba.JPG"),
    "東京湾三番瀬": ("sanbanze", "File:ふなばし三番瀬海浜公園の初日の出20220101-IMG 9036.jpg"),
}


def api(params):
    params = dict(params, format="json", formatversion="2")
    req = urllib.request.Request(
        API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA}
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except Exception as e:
            if attempt == 3:
                print(f"  API 失敗: {e}", file=sys.stderr)
                return {}
            time.sleep(2 * (attempt + 1))
    return {}


def strip_html(s):
    import re
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or "")).strip()


def fetch_info(titles):
    """コモンズの API で、URL とライセンス情報をまとめて引く。"""
    out = {}
    for i in range(0, len(titles), 40):
        data = api({
            "action": "query", "titles": "|".join(titles[i:i + 40]),
            "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size",
        })
        for page in data.get("query", {}).get("pages", []):
            out[page.get("title")] = (page.get("imageinfo") or [{}])[0]
        time.sleep(0.3)
    return out


def download(title, dest):
    """1 枚落とす。

    **`Special:FilePath` に width を付けて取る。** imageinfo の `thumburl` は
    元画像が指定幅より小さいと原寸の URL を返してくるので、そのまま落とすと
    1 枚 10 MB を超えることがある（実測で 1 枚あたり 12 秒かかった）。
    """
    url = ("https://commons.wikimedia.org/wiki/Special:FilePath/"
           + urllib.parse.quote(title[5:].replace(" ", "_"))
           + f"?width={MAX_EDGE}")
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r, dest.open("wb") as f:
                shutil.copyfileobj(r, f)
            return True
        except Exception as e:
            if attempt == 4:
                print(f"  取得できない: {title}（{e}）", file=sys.stderr)
                return False
            time.sleep(3 * (attempt + 1))
    return False


def shrink(path):
    """長辺 MAX_EDGE の JPEG に縮める。macOS の sips が無ければ何もしない。"""
    if not shutil.which("sips"):
        print(f"  警告: sips が無いので縮小していない: {path.name}", file=sys.stderr)
        return
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(JPEG_QUALITY),
         "-Z", str(MAX_EDGE), str(path), "--out", str(path)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def main():
    want_credits = "--credits" in sys.argv
    DEST.mkdir(parents=True, exist_ok=True)
    info = fetch_info([t for _, t in SPOT_PHOTOS.values()])

    ok = skipped = 0
    total = 0
    credits = []
    for spot, (slug, title) in SPOT_PHOTOS.items():
        item = info.get(title)
        if not item:
            print(f"  見つからない: {title}", file=sys.stderr)
            skipped += 1
            continue
        em = item.get("extmetadata", {}) or {}
        g = lambda k: strip_html((em.get(k, {}) or {}).get("value") or "")
        lic = g("LicenseShortName")
        # ライセンスの確認は落とす前に行う（弾いたものは手元にも残さない）
        if any(w in lic for w in NG_WORDS) or not lic.startswith(OK_PREFIX):
            print(f"  再利用不可なので飛ばす: {title}（{lic or '不明'}）", file=sys.stderr)
            skipped += 1
            continue
        dest = DEST / f"{slug}.jpg"
        if not download(title, dest):
            skipped += 1
            continue
        shrink(dest)
        size = dest.stat().st_size
        total += size
        print(f"  {slug}.jpg  {size // 1024:4d} KB  {lic:14s} {spot}")
        credits.append({
            "spot": spot, "file": slug, "artist": g("Artist"),
            "license": lic,
            "licenseUrl": (em.get("LicenseUrl", {}) or {}).get("value") or "",
            "page": item.get("descriptionurl", ""),
        })
        ok += 1
        time.sleep(SLEEP_SEC)

    print(f"\n取得 {ok} 枚 / 飛ばした {skipped} 枚 / 合計 {total // 1024 // 1024} MB → {DEST}")
    if want_credits:
        out = ROOT / "data" / "scripts" / "scenic_photo_credits.json"
        out.write_text(json.dumps(credits, ensure_ascii=False, indent=1))
        print(f"出典を書き出した: {out}")
    print("出典表は data/wikimedia-commons/SOURCE.md、画面の正本は app/src/lib/credits.ts")


if __name__ == "__main__":
    main()
