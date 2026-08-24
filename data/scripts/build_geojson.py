#!/usr/bin/env python3
"""市川市オープンデータの CSV を、地図アプリが読む GeoJSON に変換する。

  python3 data/scripts/build_geojson.py

出力先は app/public/data/。app/ 配下は提出 zip にそのまま入るので、
ファイル名は英数字だけにしてある（提出要件）。

変換でやっていること:

- cp932（Shift_JIS）で読む。市川市の CSV は UTF-8 では開けない
- 中身が空の行を落とす（CSV の末尾にパディングの空行が入っているファイルがある）
- 緯度経度が空の行を落とす
- 市域の外に飛んでいる座標を落とす（元データに経度の打ち間違いが 1 件ある。
  詳細は data/ichikawa-city/SOURCE.md）
- 列名を英字のキーに正規化する（アプリ側の型定義を素直にするため）

外部ライブラリは使わない。python3 だけで動く。
"""
import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "ichikawa-city" / "raw"
OUT = ROOT / "app" / "public" / "data"

# 市川市の範囲。この箱から外れた座標は元データの誤りとみなして落とす。
# 値は data/analysis/scripts/04_ichikawa_facility_gap.py の BBOX と同じ。
BBOX_LAT = (35.60, 35.82)
BBOX_LON = (139.84, 140.02)

# 指定緊急避難場所の CSV は、災害種別ごとに「1 なら対応」の列を持つ
DISASTER_COLUMNS = {
    "災害種別_洪水": "洪水",
    "災害種別_崖崩れ、土石流及び地滑り": "崖崩れ・土石流・地滑り",
    "災害種別_高潮": "高潮",
    "災害種別_地震": "地震",
    "災害種別_津波": "津波",
    "災害種別_大規模な火事": "大規模な火事",
    "災害種別_内水氾濫": "内水氾濫",
    "災害種別_火山現象": "火山現象",
}


def text(row: dict, column: str) -> str:
    """列を文字列で取る。空欄と前後の空白を揃える。"""
    return (row.get(column) or "").strip()


def evacuation_props(row: dict) -> dict:
    """指定緊急避難場所。対応する災害種別を配列にまとめる。"""
    disasters = [label for column, label in DISASTER_COLUMNS.items()
                 if text(row, column) == "1"]
    return {
        "capacity": text(row, "想定収容人数"),
        "disasters": disasters,
        "tel": text(row, "電話番号"),
        "url": text(row, "URL"),
    }


def aed_props(row: dict) -> dict:
    """AED 設置箇所。いつ・どこで使えるかが分かる列だけ拾う。"""
    return {
        "spot": text(row, "設置位置"),
        "days": text(row, "利用可能曜日"),
        "hours": " - ".join(t for t in (text(row, "開始時間"), text(row, "終了時間")) if t),
        "note": text(row, "利用可能日時特記事項"),
        "tel": text(row, "電話番号"),
        "url": text(row, "URL"),
    }


def childcare_props(row: dict) -> dict:
    """子育て施設。種別（保育所・幼稚園など）で塗り分けられるようにする。"""
    return {
        "category": text(row, "種別"),
        "ages": text(row, "受入年齢"),
        "hours": " - ".join(t for t in (text(row, "開始時間"), text(row, "終了時間")) if t),
        "tel": text(row, "電話番号"),
        "url": text(row, "URL"),
    }


def scenic_props(row: dict) -> dict:
    """いちかわ景観100選。日本語と英語の解説をそのまま持つ（F-5）。

    `備考` 列がカテゴリ（まち並み／自然／歴史・文化／生活風景）。複数該当するものは
    **読点「、」区切りの 1 セル**にまとまっている（半角カンマは 1 件も使われていない）。
    地図で色分けするため配列に開き、**先頭を主カテゴリ**として扱う。

    `画像` `画像2` 列は `ATTACH/...` の相対パスで、配信先が見つからない
    （市サイトの想定される 3 通りの URL すべてで 404 を実測）。**使わない**。
    区切りがバックスラッシュの行が 69 件あり、表記も揃っていない。
    """
    categories = [c.strip() for c in text(row, "備考").split("、") if c.strip()]
    return {
        "nameEn": text(row, "名称_英語"),
        "description": text(row, "説明"),
        "descriptionEn": text(row, "説明_英語"),
        "access": text(row, "アクセス方法"),
        "categories": categories,
        # MapLibre は GeoJSON の配列プロパティを文字列に畳んでしまい、地図の
        # 色分け式（match）やフィルタから配列として読めない。色を決める主カテゴリは
        # **文字列の別キー**で持たせる
        "categoryPrimary": categories[0] if categories else "",
        "tel": text(row, "連絡先電話番号"),
        "url": text(row, "URL"),
    }


DATASETS = [
    {
        "src": "emergency_evacuation_sites.csv",
        "out": "evacuation_sites.geojson",
        "label": "指定緊急避難場所",
        "dataset_url": "https://opendata.pref.chiba.lg.jp/datasets/3295",
        "props": evacuation_props,
    },
    {
        "src": "aed_locations.csv",
        "out": "aed_locations.geojson",
        "label": "AED 設置箇所",
        "dataset_url": "https://opendata.pref.chiba.lg.jp/datasets/3288",
        "props": aed_props,
    },
    {
        "src": "childcare_facilities.csv",
        "out": "childcare_facilities.geojson",
        "label": "子育て施設",
        "dataset_url": "https://opendata.pref.chiba.lg.jp/datasets/3283",
        "props": childcare_props,
    },
    {
        "src": "scenic_spots.csv",
        "out": "scenic_spots.geojson",
        "label": "景観100選",
        "dataset_url": "https://opendata.pref.chiba.lg.jp/datasets/3291",
        "props": scenic_props,
    },
]


def to_float(value: str):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def convert(spec: dict) -> dict:
    """CSV 1 本を GeoJSON にする。落とした行は種類ごとに数えて返す。"""
    path = RAW / spec["src"]
    with path.open(encoding="cp932", newline="") as f:
        rows = list(csv.DictReader(f))

    features, blank, missing, outside = [], 0, [], []
    for i, row in enumerate(rows, start=2):     # 2 は CSV の行番号（1 行目はヘッダ）
        if not any((v or "").strip(" .") for v in row.values()):
            blank += 1                          # 末尾のパディング。施設ではない
            continue
        name = text(row, "名称")
        lat, lon = to_float(text(row, "緯度")), to_float(text(row, "経度"))
        if lat is None or lon is None:
            missing.append(name or f"{i} 行目")
            continue
        if not (BBOX_LAT[0] <= lat <= BBOX_LAT[1] and BBOX_LON[0] <= lon <= BBOX_LON[1]):
            outside.append(f"{name}（{lat}, {lon}）")
            continue
        props = {
            "name": name,
            "address": text(row, "所在地_連結表記"),
            "area": text(row, "所在地_町字"),
            **spec["props"](row),
        }
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {k: v for k, v in props.items() if v not in ("", [], None)},
        })

    collection = {
        "type": "FeatureCollection",
        # 出典はデータ本体に埋め込んでおく。アプリ側のクレジット表示がずれないようにするため
        "attribution": (f"「【市川市】{spec['label']}」（市川市オープンデータ）"
                        f"（{spec['dataset_url']}）を加工して作成"),
        "features": features,
    }
    return {"collection": collection, "rows": len(rows), "blank": blank,
            "missing": missing, "outside": outside}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in DATASETS:
        r = convert(spec)
        out = OUT / spec["out"]
        out.write_text(json.dumps(r["collection"], ensure_ascii=False, indent=1) + "\n",
                       encoding="utf-8")
        n = len(r["collection"]["features"])
        print(f"{spec['out']}: {n} 件 / CSV {r['rows']} 行"
              f"（空行 {r['blank']} 件・緯度経度なし {len(r['missing'])} 件"
              f"・市域外 {len(r['outside'])} 件を除外）")
        for name in r["outside"]:
            print(f"    市域外として除外: {name}")
        if r["missing"]:
            print(f"    緯度経度なしとして除外: {'、'.join(r['missing'])}")


if __name__ == "__main__":
    sys.exit(main())
