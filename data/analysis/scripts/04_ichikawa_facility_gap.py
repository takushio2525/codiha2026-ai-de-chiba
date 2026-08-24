"""市川市の「人はいるのに施設が無い」地区を探す。

町丁字別人口（地域・年齢別人口）に、各施設一覧を町字名で突き合わせて数える。
町丁字の位置は、その町丁字にある施設の緯度経度の平均を重心とみなして代用する
（市川市のオープンデータに町丁字ポリゴンが無いため）。

出力
  fig07_ichikawa_aed_per_elderly.png   高齢者が多い地区の AED 密度
  fig08_ichikawa_facility_reach.png    最寄り施設までの距離 × 高齢化率（避難場所／介護事業所）
  fig09_ichikawa_children_vs_facilities.png  未就学児が多い地区の保育系施設の有無

出典
  「【市川市】地域・年齢別人口」「【市川市】AED設置箇所一覧」「【市川市】指定緊急避難場所一覧」
  「【市川市】子育て施設一覧」（市川市オープンデータ／千葉県オープンデータサイト）
  https://opendata.pref.chiba.lg.jp/datasets/3282 , /3288 , /3295 , /3283 を加工して作成
"""
from __future__ import annotations

import math
import unicodedata

import pandas as pd
import matplotlib.pyplot as plt

import common
from common import ACCENT, INK_MUTED, INK_SUB, SERIES

import importlib
pop_mod = importlib.import_module("03_ichikawa_population")

SOURCE = ("出典:「【市川市】地域・年齢別人口」「AED設置箇所一覧」「指定緊急避難場所一覧」「子育て施設一覧」\n"
          "（市川市オープンデータ／千葉県オープンデータサイト）"
          "https://opendata.pref.chiba.lg.jp/datasets/3282 , /3288 , /3295 , /3283 を加工して作成")

FACILITY_FILES = {
    "aed": "aed_locations.csv",
    "evac": "emergency_evacuation_sites.csv",
    "child": "childcare_facilities.csv",
    "care": "nursing_care_facilities.csv",
    "public": "public_facilities.csv",
    "park": "parks_and_green_spaces.csv",
}
NURSERY_KINDS = ("認可私立保育所", "認可公立保育所", "認可外保育所",
                 "認定こども園（幼稚園型）", "認定こども園（保育所型）",
                 "認定こども園（幼保連携型）", "認定こども園（地方裁量型）")

# 市川市の範囲。元データに経度を打ち間違えた行があるため、外れた座標は落とす
BBOX = {"lat": (35.60, 35.82), "lon": (139.84, 140.02)}


def norm(value) -> str | float:
    """町字名の表記ゆれを吸収する（全角数字・空白・「市川市」の前置き）。"""
    if pd.isna(value):
        return value
    s = unicodedata.normalize("NFKC", str(value)).replace(" ", "").replace("　", "")
    return s.removeprefix("市川市")


def load_facilities() -> dict[str, pd.DataFrame]:
    out = {}
    for key, name in FACILITY_FILES.items():
        d = pd.read_csv(common.ICHIKAWA_RAW / name, encoding="cp932")
        d["key"] = d["所在地_町字"].map(norm)
        for c in ("緯度", "経度"):
            d[c] = pd.to_numeric(d[c], errors="coerce")
        out[key] = d
    return out


def in_city(df: pd.DataFrame, lat: str = "緯度", lon: str = "経度") -> pd.DataFrame:
    """市域の外に飛んでいる座標を落とす。"""
    d = df.dropna(subset=[lat, lon])
    return d[d[lat].between(*BBOX["lat"]) & d[lon].between(*BBOX["lon"])]


def centroids(fac: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """町丁字にある全施設の座標平均を、その町丁字の位置の代用にする。"""
    pts = pd.concat([in_city(d)[["key", "緯度", "経度"]] for d in fac.values()])
    return pts.groupby("key").agg(lat=("緯度", "mean"), lon=("経度", "mean"),
                                  地点数=("緯度", "size")).reset_index()


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def build() -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
    pop = pop_mod.add_aging(pop_mod.load())
    pop["key"] = pop["地域名"].map(norm)
    fac = load_facilities()

    counts = {
        "AED数": fac["aed"].groupby("key").size(),
        "避難場所数": fac["evac"].groupby("key").size(),
        "介護事業所数": fac["care"].groupby("key").size(),
        "保育系施設数": fac["child"][fac["child"]["種別"].isin(NURSERY_KINDS)].groupby("key").size(),
    }
    for name, series in counts.items():
        pop[name] = pop["key"].map(series).fillna(0).astype(int)

    pop = pop.merge(centroids(fac), on="key", how="left")
    return pop, fac


def fig_aed(pop: pd.DataFrame, n: int = 25) -> None:
    d = pop.nlargest(n, "高齢者人口").copy()
    d["千人あたりAED"] = d["AED数"] / d["高齢者人口"] * 1000
    d = d.sort_values("千人あたりAED")
    colors = [ACCENT if v == 0 else SERIES[0] for v in d["AED数"]]

    fig, ax = plt.subplots(figsize=(10, 9))
    ax.barh(d["地域名"], d["千人あたりAED"], color=colors, height=0.72)
    ax.set_xlabel("高齢者 1,000 人あたりの AED 設置数（箇所）")
    ax.yaxis.grid(False)
    common.despine(ax)
    for i, (_, r) in enumerate(d.iterrows()):
        ax.text(r["千人あたりAED"] + 0.08, i,
                f"AED {int(r['AED数'])} 箇所／高齢者 {int(r['高齢者人口']):,} 人",
                va="center", fontsize=9, color=ACCENT if r["AED数"] == 0 else INK_SUB)
    ax.set_xlim(0, max(d["千人あたりAED"].max(), 1) * 1.55)

    zero = int((d["AED数"] == 0).sum())
    common.titles(fig, ax,
                  f"高齢者が多い上位 {n} 地区のうち {zero} 地区は公開 AED が 1 箇所も無い",
                  "橙 ＝ AED が 0 箇所の地区。分母は各町丁字の 65 歳以上人口")
    common.caption(fig, SOURCE)
    common.save(fig, "fig07_ichikawa_aed_per_elderly.png")


def fig_reach(pop: pd.DataFrame, fac: dict[str, pd.DataFrame]) -> None:
    """同じ市内でも、施設の種類によって「近さ」がまるで違うことを見る。"""
    d = pop.dropna(subset=["lat", "lon"]).copy()
    d = d[d["lat"].between(*BBOX["lat"]) & d["lon"].between(*BBOX["lon"])]
    d = d[d["総人口"] >= 500]

    targets = [("evac", "指定緊急避難場所", SERIES[0]), ("care", "介護サービス事業所", SERIES[1])]
    for key, label, _ in targets:
        sites = in_city(fac[key])
        d[label] = [min(haversine_km(r.lat, r.lon, s.緯度, s.経度) for s in sites.itertuples()) * 1000
                    for r in d.itertuples()]

    fig, ax = plt.subplots(figsize=(10, 7.5))
    for _, label, color in targets:
        ax.scatter(d[label], d["高齢化率"], s=38, color=color,
                   edgecolor=common.SURFACE, linewidth=2, zorder=3, label=label)

    worst = d.nlargest(1, "介護サービス事業所").iloc[0]
    ax.annotate(f"{worst['地域名']}（介護事業所まで {worst['介護サービス事業所']:.0f}m）",
                (worst["介護サービス事業所"], worst["高齢化率"]),
                textcoords="offset points", xytext=(-14, -18), ha="right",
                fontsize=10, color=SERIES[1])

    city = pop["高齢者人口"].sum() / pop["総人口"].sum() * 100
    ax.axhline(city, color=INK_MUTED, linewidth=1.0)
    ax.set_xlabel("町丁字の重心から最寄り施設までの直線距離（m）")
    ax.set_ylabel("高齢化率（％）")
    ax.set_ylim(3, d["高齢化率"].max() * 1.16)     # 凡例と点が重ならないよう上に余白をとる
    common.despine(ax)
    ax.legend(loc="upper right")
    common.titles(fig, ax,
                  f"避難場所は全地区 {d['指定緊急避難場所'].max():.0f}m 以内。"
                  f"介護事業所は最大 {d['介護サービス事業所'].max():.0f}m と開きが大きい",
                  f"総人口 500 人以上の {len(d)} 町丁字。横の細線は市全体の高齢化率 {city:.1f}％")
    common.caption(fig, SOURCE +
                   "\n※ 町丁字の重心は、その町丁字にある施設の緯度経度の平均で代用した近似値")
    common.save(fig, "fig08_ichikawa_facility_reach.png")


def fig_children(pop: pd.DataFrame, n: int = 20) -> None:
    """未就学児が多い地区を並べ、保育系施設が 0 の地区を塗り分ける。"""
    d = pop.nlargest(n, "未就学児人口").sort_values("未就学児人口")
    colors = [ACCENT if v == 0 else SERIES[0] for v in d["保育系施設数"]]

    fig, ax = plt.subplots(figsize=(10, 8.5))
    ax.barh(d["地域名"], d["未就学児人口"], color=colors, height=0.72)
    ax.set_xlabel("0〜4 歳の人口（人）")
    ax.yaxis.grid(False)
    common.despine(ax)
    ax.set_xlim(0, d["未就学児人口"].max() * 1.35)
    for i, (_, r) in enumerate(d.iterrows()):
        k = int(r["保育系施設数"])
        ax.text(r["未就学児人口"] + 3, i,
                "保育系施設なし" if k == 0 else f"保育所・こども園 {k} 箇所",
                va="center", fontsize=9.5, color=ACCENT if k == 0 else INK_SUB)

    zero = int((d["保育系施設数"] == 0).sum())
    common.titles(fig, ax,
                  f"未就学児が多い上位 {n} 地区のうち {zero} 地区に保育所・こども園が無い",
                  "橙 ＝ 認可保育所・認可外保育所・認定こども園がいずれも 0 箇所の地区。"
                  "幼稚園と放課後児童クラブは数えていない")
    common.caption(fig, SOURCE)
    common.save(fig, "fig09_ichikawa_children_vs_facilities.png")


def main() -> None:
    common.setup()
    pop, fac = build()
    located = pop["lat"].notna().sum()
    print(f"町丁字 {len(pop)} 地区（うち重心が取れた地区 {located}）")
    print(f"AED {len(fac['aed'])} / 避難場所 {len(fac['evac'])} / "
          f"保育系 {int(pop['保育系施設数'].sum())} / 介護 {len(fac['care'])} 箇所")
    print("AED が 0 箇所の町丁字:", int((pop["AED数"] == 0).sum()))
    fig_aed(pop)
    fig_reach(pop, fac)
    fig_children(pop)


if __name__ == "__main__":
    main()
