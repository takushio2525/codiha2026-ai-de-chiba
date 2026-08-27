#!/usr/bin/env python3
"""`scenic_photo_credits.json` から `app/src/lib/scenicPhotos.ts` を起こす。

`fetch_scenic_photos.py --credits` を走らせたあとに実行する。
コモンズの作者欄には撮影機材の但し書きが混ざることがあるので、ここで落とす。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "scripts" / "scenic_photo_credits.json"
DEST = ROOT / "app" / "src" / "lib" / "scenicPhotos.ts"

# 作者欄の但し書きを落とす（コモンズは撮影機材などを同じ欄に書くことがある）
ARTIST_FIXES = {
    "The original uploader was Los688 at Japanese Wikipedia .": "Los688（日本語版ウィキペディア）",
}

# 市川市の外で撮られたものだけ、撮影地の断りを付ける
PLACE_NOTES = {
    "東京湾三番瀬": "ふなばし三番瀬海浜公園（千葉県船橋市）から撮影。三番瀬の干潟は市川市から船橋市にまたがる",
}


def clean_artist(raw: str) -> str:
    if raw in ARTIST_FIXES:
        return ARTIST_FIXES[raw]
    # 「This photo was taken with ...」以降を落とす
    return re.sub(r"\s*This photo was taken with.*$", "", raw).strip()


def ts_string(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main():
    credits = json.loads(SRC.read_text())
    lines = [
        "/** 景観スポット（景観100選・F-5）に付ける写真と、その出典。",
        " *",
        " * **このファイルは自動生成する。** 直接編集せず、",
        " * `python3 data/scripts/fetch_scenic_photos.py --credits` で写真と出典を取り直してから",
        " * `python3 data/scripts/build_scenic_photos_ts.py` を実行すること。",
        " *",
        " * 写真の実体は `app/public/images/scenic/<file>.jpg`。",
        " * **再利用が許されるもの（CC0 / パブリックドメイン / CC BY / CC BY-SA）だけ**を選んである。",
        " * CC BY と CC BY-SA は作者の表示が条件なので、ポップアップと `/about` の両方に作者名を出す。",
        " *",
        " * どの写真がどのスポットのものかは**目視で 1 枚ずつ確かめてある**。",
        " * 同名別所（愛知県日進市の弁天池公園・岐阜県北方町の北方小学校など）が検索に混ざるため、",
        " * 名前が一致しただけでは採らない。選定の記録は `data/wikimedia-commons/SOURCE.md`。",
        " */",
        "",
        "export type ScenicPhoto = {",
        "  /** `app/public/images/scenic/` のファイル名（拡張子は付けない） */",
        "  file: string;",
        "  artist: string;",
        "  license: string;",
        "  /** パブリックドメインのものには無い */",
        "  licenseUrl?: string;",
        "  /** ウィキメディア・コモンズの説明ページ（＝出典） */",
        "  page: string;",
        "  /** **撮影地が市川市の外のときだけ書く。** 画面にもそのまま出す */",
        "  placeNote?: string;",
        "};",
        "",
        "/** **スポット名 → 写真。**",
        " *",
        " * 鍵は `app/public/data/scenic_spots.geojson` の `properties.name` そのまま",
        " * （100 件で一意なことを確認済み）。写真が無いスポットは載っていない。",
        " */",
        "export const SCENIC_PHOTOS: Record<string, ScenicPhoto> = {",
    ]
    for c in sorted(credits, key=lambda x: x["file"]):
        artist = clean_artist(c["artist"])
        lines.append(f"  {ts_string(c['spot'])}: {{")
        lines.append(f"    file: {ts_string(c['file'])},")
        lines.append(f"    artist: {ts_string(artist)},")
        lines.append(f"    license: {ts_string(c['license'])},")
        if c["licenseUrl"]:
            lines.append(f"    licenseUrl: {ts_string(c['licenseUrl'])},")
        lines.append(f"    page: {ts_string(c['page'])},")
        note = PLACE_NOTES.get(c["spot"])
        if note:
            lines.append(f"    placeNote: {ts_string(note)},")
        lines.append("  },")
    lines += [
        "};",
        "",
        "/** public/ からのパス。 */",
        "export function scenicPhotoSrc(photo: ScenicPhoto): string {",
        "  return `/images/scenic/${photo.file}.jpg`;",
        "}",
        "",
        "/** スポット名から写真を引く。無ければ null（写真が無いスポットの方が多い）。 */",
        "export function scenicPhoto(name: string | undefined): ScenicPhoto | null {",
        "  if (!name) return null;",
        "  return SCENIC_PHOTOS[name] ?? null;",
        "}",
        "",
    ]
    DEST.write_text("\n".join(lines))
    print(f"{len(credits)} 件 → {DEST}")


if __name__ == "__main__":
    main()
