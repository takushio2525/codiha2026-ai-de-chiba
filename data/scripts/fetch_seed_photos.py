#!/usr/bin/env python3
"""デモ投稿に付ける写真を、ウィキメディア・コモンズから取得する。

出力先は **`app/db/seed-photos/`**（`data/` 配下ではない）。理由は
`data/wikimedia-commons/SOURCE.md` に書いてある。

    python3 data/scripts/fetch_seed_photos.py

**再利用が許されるライセンス（CC0 / CC BY / CC BY-SA）のものだけを落とす。**
NC・ND・ライセンス不明のものは、指定されていても弾く。

標準ライブラリだけで動く。縮小には macOS の `sips` を使う（無ければ原寸のまま
残して警告する）。取得は 1 回きりの作業なので、他 OS 向けの分岐は用意していない。
"""
import json
import shutil
import subprocess
import time
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://commons.wikimedia.org/w/api.php"
# ウィキメディアは **UA に連絡先を含めること**を求めていて、
# 満たさないと 429（robot policy）で弾かれる。書式は
# <名前>/<版> (<連絡先>) <ライブラリ>/<版>
# https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
UA = (
    "CHIZUBA-CODIHA2026/1.0 "
    "(https://github.com/takushio2525/codiha2026-ai-de-chiba) "
    "Python-urllib/3"
)
DEST = Path(__file__).resolve().parents[2] / "app" / "db" / "seed-photos"
# 長辺をここまで縮める。1 枚 500 KB 以下に収めるため（提出物の容量を抑える）
MAX_EDGE = 1000
JPEG_QUALITY = 68
# コモンズは連続で取りに行くと 429 を返す。**1 枚ごとに必ず間を空ける**
SLEEP_SEC = 1.0

# 再利用してよいライセンスの短縮名（前方一致）と、弾く語
OK_PREFIX = ("CC0", "CC BY", "CC-BY", "Public domain", "PD")
NG_WORDS = ("NC", "ND", "Fair use", "non-commercial")

# 保存名 → コモンズのファイル名。**この対応が出典表の並びの正本**
# （表そのものは data/wikimedia-commons/SOURCE.md）。
PHOTOS = {
    # 観光のデモ投稿用（すべて市川市内で撮影されたもの）
    "demo-spot-hokekyoji-pagoda": "File:Hokekyoji FiveStoryPagoda Ichikawa.JPG",
    "demo-spot-hokekyoji-sakura": "File:Cherry blossoms at Hokekyoji Temple, Ichikawa, 2018.jpg",
    "demo-spot-satomi-park": "File:SatomiKouen.jpg",
    "demo-spot-edogawa-bridge": "File:Ichikawa bridge Edo river 2023 Jan 26 07-21AM.jpeg",
    "demo-spot-hachimangu-icho": "File:Katsushika-hachimangu, icho.jpg",
    "demo-spot-hachimangu-gate": "File:Katsushika-hachimangu, zuishinmon.jpg",
    "demo-spot-guhoji-gate": "File:Mamasan Guhoji Niomon.JPG",
    "demo-spot-tekona": "File:Tekonareishindo gate.jpg",
    "demo-spot-junsaiike": "File:JunsaiikeRyokuchi.jpg",
    "demo-spot-mamagawa-sakura": "File:Cherry Blossom Mama-gawa ichikawa Chiba-Japan.jpg",
    # 梨だけは市外の写真。お土産のデモ投稿に「参考写真」として付ける
    "demo-spot-nashi-fruit": "File:Pyrus pyrifolia fruit on tree PS 2z LR.jpg",
    # 防災のデモ投稿用。**すべて市川市外で撮影された参考写真**で、
    # 市川市で実際に起きた被害の写真ではない
    "demo-ref-flooded-road-2": "File:Bickleigh - Flooded Road (geograph 2750554).jpg",
    "demo-ref-flooded-road-3": "File:Flooded road - geograph.org.uk - 4794313.jpg",
    "demo-ref-sandbag": "File:Donou.jpg",
    "demo-ref-river-swollen": "File:Flooded Tamagawa in aftermath of Typhoon Talas 2011.jpg",
    "demo-ref-pothole-1": "File:Lcb-1.jpg",
    "demo-ref-pothole-2": "File:Bache en la escuela.jpg",
}


def fetch_info(titles):
    """コモンズの API で、ファイルの URL とライセンス情報をまとめて引く。"""
    out = {}
    # titles は 1 リクエスト 50 件まで
    for i in range(0, len(titles), 40):
        chunk = titles[i:i + 40]
        params = {
            "action": "query", "titles": "|".join(chunk),
            "prop": "imageinfo", "iiprop": "url|extmetadata|mime",
            "iiurlwidth": str(MAX_EDGE), "format": "json", "formatversion": "2",
        }
        req = urllib.request.Request(
            API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA}
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
        for page in data.get("query", {}).get("pages", []):
            info = (page.get("imageinfo") or [{}])[0]
            out[page.get("title")] = info
    return out


def license_of(info):
    meta = info.get("extmetadata", {})
    return (meta.get("LicenseShortName", {}).get("value") or "").strip()


def download(url, dest):
    """1 枚落とす。429（レート制限）に当たったら間を空けて数回やり直す。"""
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r, dest.open("wb") as f:
                shutil.copyfileobj(r, f)
            return
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 3:
                raise
            wait = SLEEP_SEC * (attempt + 2)
            print(f"  429 なので {wait:.0f} 秒待ってやり直す: {dest.name}", file=sys.stderr)
            time.sleep(wait)


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
    DEST.mkdir(parents=True, exist_ok=True)
    info = fetch_info(list(PHOTOS.values()))
    ok = skipped = 0
    for slug, title in PHOTOS.items():
        item = info.get(title)
        if not item:
            print(f"  見つからない: {title}", file=sys.stderr)
            skipped += 1
            continue
        lic = license_of(item)
        # ライセンスの確認は落とす前に行う（弾いたものは手元にも残さない）
        if any(w in lic for w in NG_WORDS) or not lic.startswith(OK_PREFIX):
            print(f"  ライセンスが再利用不可なので飛ばす: {title}（{lic or '不明'}）", file=sys.stderr)
            skipped += 1
            continue
        # thumburl は MAX_EDGE 幅の版。元が小さければ原寸の URL が返る
        url = item.get("thumburl") or item.get("url")
        dest = DEST / f"{slug}.jpg"
        download(url, dest)
        shrink(dest)
        size = dest.stat().st_size
        print(f"  {slug}.jpg  {size // 1024} KB  {lic}")
        ok += 1
        time.sleep(SLEEP_SEC)
    print(f"取得 {ok} 枚 / 飛ばした {skipped} 枚 → {DEST}")
    print("出典表（作者・ライセンス・元ページ）は data/wikimedia-commons/SOURCE.md")


if __name__ == "__main__":
    main()
