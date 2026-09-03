#!/usr/bin/env python3
"""プレゼン資料に載せる数字を、元データから計算し直して確かめる。

`docs/presentation/審査基準_主張と根拠.md` に書いた数字は、すべてこのスクリプトで
再現できる。**リポジトリ内の md に書いてある数字を写すのではなく、元の CSV から数え直す**
ためのもの。審査で数字を聞かれたときに「その場で出せる」状態を保つ。

**pandas を使わない**（標準ライブラリだけで動く）。`data/analysis/scripts/` の分析は
pandas と matplotlib が要るが、数字の確認だけならその依存を入れずに済ませたい。
計算の手順は `data/analysis/scripts/04_ichikawa_facility_gap.py` と同じ
（NFKC 正規化・市域 BBOX での外れ値除去・施設座標の平均を重心とみなす・Haversine）。

    python3 data/scripts/verify_presentation_numbers.py            # 市川市ぶんだけ
    python3 data/scripts/verify_presentation_numbers.py --kashiwa  # 柏市の水害履歴も取得して集計

出典
  市川市: 「【市川市】地域・年齢別人口」「AED設置箇所一覧」「指定緊急避難場所一覧」
          「子育て施設一覧」「介護サービス事業所一覧」「公共施設一覧」「都市公園・都市緑地一覧」
          （市川市オープンデータ／千葉県オープンデータサイト・CC BY 4.0）
          https://opendata.pref.chiba.lg.jp/datasets/3282 ほか
  柏市:   「【柏市】水害履歴」（柏市オープンデータ・出典表記が条件）
          https://www.city.kashiwa.lg.jp/bosaianzen/shiseijoho/jouhoukoukai/opendate/flood_history.html
"""
from __future__ import annotations

import argparse
import collections
import csv
import io
import math
import pathlib
import re
import statistics
import unicodedata
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
ICHIKAWA_RAW = ROOT / "data" / "ichikawa-city" / "raw"

# 市川市の範囲。元データに経度を打ち間違えた行があるので、外れた座標は落とす
BBOX = {"lat": (35.60, 35.82), "lon": (139.84, 140.02)}
AGE_BANDS = [f"{a}-{a + 4}歳" for a in range(0, 85, 5)] + ["85歳以上"]
FACILITY_FILES = {
    "aed": "aed_locations.csv",
    "evac": "emergency_evacuation_sites.csv",
    "child": "childcare_facilities.csv",
    "care": "nursing_care_facilities.csv",
    "public": "public_facilities.csv",
    "park": "parks_and_green_spaces.csv",
}
NURSERY_KINDS = (
    "認可私立保育所", "認可公立保育所", "認可外保育所",
    "認定こども園（幼稚園型）", "認定こども園（保育所型）",
    "認定こども園（幼保連携型）", "認定こども園（地方裁量型）",
)
KASHIWA_CSV = "https://www.city.kashiwa.lg.jp/documents/30401/flood_history_20260625.csv"


def norm(value: str | None) -> str:
    """町字名の表記ゆれを吸収する（全角数字・空白・「市川市」の前置き）。"""
    if value is None:
        return ""
    s = unicodedata.normalize("NFKC", str(value)).replace(" ", "").replace("　", "")
    return s.removeprefix("市川市")


def num(value: object) -> float | None:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def rows(name: str) -> list[dict[str, str]]:
    """市川市の CSV は cp932。"""
    with open(ICHIKAWA_RAW / name, encoding="cp932", newline="") as f:
        return list(csv.DictReader(f))


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))


def in_city(lat: float | None, lon: float | None) -> bool:
    return (lat is not None and lon is not None
            and BBOX["lat"][0] <= lat <= BBOX["lat"][1]
            and BBOX["lon"][0] <= lon <= BBOX["lon"][1])


def verify_ichikawa() -> None:
    print("=" * 72)
    print("市川市オープンデータからの再計算")
    print("=" * 72)

    pop = []
    for r in rows("population_by_area_and_age.csv"):
        total = num(r.get("総人口")) or 0.0
        elderly = 0.0
        for band in AGE_BANDS:
            if int(re.match(r"(\d+)", band).group(1)) >= 65:
                for sex in ("男性", "女性"):
                    elderly += num(r.get(f"{band}の{sex}")) or 0.0
        kids = sum(num(r.get(f"0-4歳の{s}")) or 0.0 for s in ("男性", "女性"))
        pop.append({
            "name": r["地域名"], "key": norm(r["地域名"]), "total": total,
            "elderly": elderly, "kids": kids,
            "rate": (elderly / total * 100 if total else None),
        })

    total_pop = sum(p["total"] for p in pop)
    total_eld = sum(p["elderly"] for p in pop)
    print(f"町丁字 {len(pop)} 件 / 総人口 {int(total_pop):,} 人 "
          f"/ 市全体の高齢化率 {total_eld / total_pop * 100:.1f}%")

    facilities: dict[str, list[dict]] = {}
    points: list[dict] = []
    for key, name in FACILITY_FILES.items():
        data = [{"key": norm(r.get("所在地_町字")), "lat": num(r.get("緯度")),
                 "lon": num(r.get("経度")), "raw": r} for r in rows(name)]
        facilities[key] = data
        inside = [x for x in data if in_city(x["lat"], x["lon"])]
        points += inside
        print(f"  {name}: 全 {len(data)} 行 / 市域内の座標 {len(inside)} 件")

    # 町丁字にある全施設の座標平均を、その町丁字の位置の代用にする
    grouped: dict[str, list[tuple[float, float]]] = collections.defaultdict(list)
    for pt in points:
        grouped[pt["key"]].append((pt["lat"], pt["lon"]))
    centroid = {k: (sum(a for a, _ in v) / len(v), sum(b for _, b in v) / len(v))
                for k, v in grouped.items()}

    def count_by_key(items: list[dict]) -> dict[str, int]:
        c: dict[str, int] = collections.Counter()
        for x in items:
            c[x["key"]] += 1
        return c

    n_aed = count_by_key(facilities["aed"])
    n_nursery = count_by_key([x for x in facilities["child"]
                              if x["raw"].get("種別") in NURSERY_KINDS])
    for p in pop:
        p["aed"] = n_aed.get(p["key"], 0)
        p["nursery"] = n_nursery.get(p["key"], 0)
        p["centroid"] = centroid.get(p["key"])

    big = [p for p in pop if p["total"] >= 500 and p["rate"] is not None]
    hi = max(big, key=lambda p: p["rate"])
    lo = min(big, key=lambda p: p["rate"])
    print(f"\n高齢化率（総人口 500 人以上の {len(big)} 地区）: "
          f"最高 {hi['rate']:.1f}%（{hi['name']}）〜 最低 {lo['rate']:.1f}%（{lo['name']}）"
          f" = {hi['rate'] / lo['rate']:.1f} 倍")
    # **数え方で地区数と平均が変わる**ので、両方を出す。
    # 部分一致だと北部に「南大野」が、南部に「本行徳」「上妙典」「下妙典」が入る。
    # data/analysis/findings.md は北部を部分一致、南部を前方一致で数えていて統一されていない。
    # 資料に載せるときは、どちらで数えたかを必ず添える。
    for label, keys in (("北部（曽谷・大野・柏井・大町）", ("曽谷", "大野", "柏井", "大町")),
                        ("南部（妙典・行徳・南行徳）", ("妙典", "行徳", "南行徳"))):
        pre = [p for p in big if any(p["key"].startswith(k) for k in keys)]
        sub = [p for p in big if any(k in p["key"] for k in keys)]
        print(f"  {label}: 前方一致 {len(pre)} 地区 {statistics.mean(p['rate'] for p in pre):.1f}%"
              f" ／ 部分一致 {len(sub)} 地区 {statistics.mean(p['rate'] for p in sub):.1f}%")

    zero = [p for p in pop if p["aed"] == 0]
    print(f"\nAED が 0 箇所の地区 {len(zero)} / {len(pop)}"
          f"（うち高齢者 500 人以上 {sum(1 for p in zero if p['elderly'] >= 500)} 地区）")
    top25 = sorted(pop, key=lambda p: -p["elderly"])[:25]
    z25 = [p for p in top25 if p["aed"] == 0]
    print("  高齢者人口 上位 25 地区のうち AED 0: "
          + ", ".join(f"{p['name']}（{int(p['elderly']):,} 人）" for p in z25))

    for kind, label in (("evac", "指定緊急避難場所"), ("care", "介護サービス事業所")):
        targets = [(x["lat"], x["lon"]) for x in facilities[kind] if in_city(x["lat"], x["lon"])]
        dists = []
        for p in pop:
            if not p["centroid"] or p["total"] < 500 or not in_city(*p["centroid"]):
                continue
            dists.append((min(haversine_m(*p["centroid"], la, lo) for la, lo in targets), p["name"]))
        dists.sort()
        med = statistics.median(d for d, _ in dists)
        print(f"\n{label}までの距離（{len(dists)} 地区）: "
              f"中央値 {med:.2f} m / 最大 {dists[-1][0]:.2f} m（{dists[-1][1]}）")

    top20 = sorted(pop, key=lambda p: -p["kids"])[:20]
    none = [p for p in top20 if p["nursery"] == 0]
    print(f"\n0〜4 歳が多い上位 20 地区のうち保育系施設が 0: "
          + (", ".join(p["name"] for p in none) if none else "なし"))

    print("\n--- データの品質 ---")
    bad = [x for x in facilities["aed"]
           if x["lon"] is not None and not (BBOX["lon"][0] <= x["lon"] <= BBOX["lon"][1])]
    for x in bad:
        print(f"  AED の経度が市域外: {x['raw'].get('名称')} 経度={x['raw'].get('経度')}")
    child = rows("childcare_facilities.csv")
    filled = sum(1 for r in child if (r.get("収容定員") or "").strip())
    print(f"  子育て施設 {len(child)} 行のうち 収容定員が埋まっている行 {filled} 件")


def verify_kashiwa() -> None:
    """柏市の水害履歴から「浸水は同じ場所で繰り返す」を数える。

    **地点の定義で数字が大きく変わる**ので、3 通り出して必ず定義を添えられるようにする。
    """
    print("\n" + "=" * 72)
    print("柏市 水害履歴（オープンデータ）からの集計")
    print("=" * 72)
    print(f"取得: {KASHIWA_CSV}")
    req = urllib.request.Request(KASHIWA_CSV, headers={"User-Agent": "chizuba-verify/1.0"})
    with urllib.request.urlopen(req, timeout=60) as res:  # noqa: S310（URL は上の定数で固定）
        raw = res.read()
    text = raw.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(text))
    next(reader)  # 見出し
    # 列: 0 住所 / 1 カナ / 2 丁目 / 3 番地等 / 4 付近 / 5 原因 / 6 被害 / 7 発生年月日
    data = [r for r in reader if any(x.strip() for x in r)]
    years = [int(m.group(1)) for r in data if (m := re.match(r"(\d{4})", r[7]))]
    print(f"{len(data):,} 件（{min(years)} 年〜{max(years)} 年・{len(raw):,} バイト）")
    print("  被害の内訳: "
          + " / ".join(f"{k} {v}" for k, v in collections.Counter(r[6] for r in data).most_common()))

    for idx, label in (((0, 2, 3), "住所 + 丁目 + 番地"), ((0, 2), "住所 + 丁目"), ((0,), "住所（町名）のみ")):
        c = collections.Counter(tuple(r[i] for i in idx) for r in data)
        repeat_places = [n for n in c.values() if n >= 2]
        hits = sum(repeat_places)
        print(f"  {label}: 地点 {len(c)} / 2 回以上被害が出た地点 {len(repeat_places)} / "
              f"そこで起きた被害 {hits:,} 件 = 全体の {hits / len(data) * 100:.2f}%")

    odd = [r for r in data if r[6] not in ("道路冠水", "床下浸水", "床上浸水", "店舗浸水")]
    if odd:
        print(f"\n  [品質] 被害の列に想定外の値が入っている行 {len(odd)} 件: "
              + ", ".join(sorted({r[6] for r in odd})))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--kashiwa", action="store_true",
                    help="柏市の水害履歴も取得して集計する（ネットワークが要る）")
    args = ap.parse_args()
    verify_ichikawa()
    if args.kashiwa:
        verify_kashiwa()


if __name__ == "__main__":
    main()
