"""千葉県の人口動態（自然増減・社会増減）と保育の受け皿を見る。

出力
  fig03_chiba_natural_vs_social.png   市区町村別 自然増減 × 社会増減（令和6年）
  fig04_chiba_nursery_capacity.png    人口千人あたりの認可保育所定員（市町村別）

出典
  「令和6年千葉県毎月常住人口調査報告書(年報)」（千葉県オープンデータサイト）
  https://opendata.pref.chiba.lg.jp/datasets/240
  「子育て施設一覧（認可保育所）」（千葉県オープンデータサイト）
  https://opendata.pref.chiba.lg.jp/datasets/421 を加工して作成
"""
from __future__ import annotations

import warnings

import pandas as pd
import matplotlib.pyplot as plt

import common
from common import ACCENT, INK_MUTED, INK_SUB, SERIES

warnings.filterwarnings("ignore")

TARGET = "市川市"
WARDS = {"中央区", "花見川区", "稲毛区", "若葉区", "緑区", "美浜区"}   # 千葉市の区（二重計上を避ける）
SOURCE_POP = ("出典:「令和6年千葉県毎月常住人口調査報告書(年報)」（千葉県オープンデータサイト）\n"
              "https://opendata.pref.chiba.lg.jp/datasets/240 を加工して作成")
SOURCE_NUR = ("出典:「令和6年千葉県毎月常住人口調査報告書(年報)」「子育て施設一覧（認可保育所）」\n"
              "（千葉県オープンデータサイト）https://opendata.pref.chiba.lg.jp/datasets/240 ,"
              " /421 を加工して作成")


def _municipalities(df: pd.DataFrame) -> pd.DataFrame:
    """県計と政令市の区を落とし、市区町村だけにする。"""
    return df[~df["市町村"].isin(WARDS | {"県計"})].reset_index(drop=True)


def load_population() -> pd.DataFrame:
    raw = pd.read_excel(common.CHIBA_RAW / "population_by_municipality_2024.xlsx", header=None)
    df = raw.iloc[5:, [0, 1, 10, 12, 13]].copy()
    df.columns = ["市町村", "総人口", "人口増減数", "人口密度", "面積"]
    df = df.dropna(subset=["市町村"])
    for c in df.columns[1:]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return _municipalities(df)


def load_change() -> pd.DataFrame:
    nat = pd.read_excel(common.CHIBA_RAW / "natural_change_by_municipality_2024.xlsx", header=None)
    nat = nat.iloc[4:, [0, 1, 4, 7]].copy()
    nat.columns = ["市町村", "出生", "死亡", "自然増減"]
    soc = pd.read_excel(common.CHIBA_RAW / "social_change_by_municipality_2024.xlsx", header=None)
    soc = soc.iloc[5:, [0, 1, 8, 15]].copy()
    soc.columns = ["市町村", "転入", "転出", "社会増減"]
    df = nat.dropna(subset=["市町村"]).merge(soc.dropna(subset=["市町村"]), on="市町村")
    for c in df.columns[1:]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return _municipalities(df)


def fig_natural_vs_social(df: pd.DataFrame) -> None:
    """人口規模の差を消すため、いずれも人口 1,000 人あたりに直して比べる。"""
    d = df.copy()
    d["自然増減率"] = d["自然増減"] / d["総人口"] * 1000
    d["社会増減率"] = d["社会増減"] / d["総人口"] * 1000

    fig, ax = plt.subplots(figsize=(10, 8))
    ax.axhline(0, color=INK_MUTED, linewidth=1.0)
    ax.axvline(0, color=INK_MUTED, linewidth=1.0)
    ax.scatter(d["自然増減率"], d["社会増減率"], s=54, color=SERIES[0],
               edgecolor=common.SURFACE, linewidth=2, zorder=3)

    tgt = d[d["市町村"] == TARGET].iloc[0]
    ax.scatter([tgt["自然増減率"]], [tgt["社会増減率"]], s=150, color=ACCENT,
               edgecolor=common.SURFACE, linewidth=2, zorder=4)

    # ラベルは端と注目対象だけ。全点に付けると読めなくなる
    picks = set(d.nlargest(3, "社会増減率")["市町村"]) | set(d.nsmallest(3, "社会増減率")["市町村"]) \
        | set(d.nsmallest(3, "自然増減率")["市町村"]) | set(d.nlargest(2, "自然増減率")["市町村"]) | {TARGET}
    for _, r in d[d["市町村"].isin(picks)].iterrows():
        ax.annotate(r["市町村"], (r["自然増減率"], r["社会増減率"]),
                    textcoords="offset points", xytext=(9, 4), fontsize=10,
                    color=ACCENT if r["市町村"] == TARGET else INK_SUB)

    ax.set_xlabel("自然増減（出生 − 死亡）　人口 1,000 人あたり")
    ax.set_ylabel("社会増減（転入 − 転出）　人口 1,000 人あたり")
    ax.set_ylim(d["社会増減率"].min() - 3.2, d["社会増減率"].max() + 1.5)  # 下端に注記の場所をあける
    common.despine(ax)
    grew = d[d["自然増減"] > 0]["市町村"].tolist()
    common.titles(fig, ax,
                  f"千葉県で自然増なのは{'・'.join(grew)}だけ。人口が保てるかは転入で埋まるかで決まる",
                  f"令和 6 年・{len(d)} 市町村（千葉市は区に割らず市全体で 1 点）。橙は {TARGET}")
    ax.text(0.01, 0.03,
            "横の 0 線より上 ＝ 転入が転出を上回る（人口が保たれる）\n"
            "下 ＝ 転出が上回る（自然減と重なって人口が減る）",
            transform=ax.transAxes, ha="left", va="bottom", fontsize=10, color=INK_MUTED)
    common.caption(fig, SOURCE_POP)
    common.save(fig, "fig03_chiba_natural_vs_social.png")


def fig_nursery(pop: pd.DataFrame) -> None:
    raw = pd.read_excel(common.CHIBA_RAW / "licensed_nursery_schools_2023.xlsx", header=None)
    nur = raw.iloc[3:, [0, 8]].copy()
    nur.columns = ["市町村", "認可定員"]
    nur["認可定員"] = pd.to_numeric(nur["認可定員"], errors="coerce")
    nur = nur.dropna(subset=["市町村", "認可定員"])
    agg = nur.groupby("市町村", as_index=False).agg(定員=("認可定員", "sum"), 施設数=("認可定員", "size"))

    d = agg.merge(pop[["市町村", "総人口"]], on="市町村")
    missing = len(pop) - len(d)      # 県の一覧に認可保育所が載らない市町村（政令市・中核市など）
    d["千人あたり定員"] = d["定員"] / d["総人口"] * 1000
    d = d.sort_values("千人あたり定員")
    spread = d["千人あたり定員"].max() / d["千人あたり定員"].min()
    colors = [ACCENT if m == TARGET else SERIES[0] for m in d["市町村"]]

    fig, ax = plt.subplots(figsize=(9, 11))
    ax.barh(d["市町村"], d["千人あたり定員"], color=colors, height=0.72)
    ax.set_xlabel("人口 1,000 人あたりの認可保育所 定員（人）")
    ax.xaxis.grid(True); ax.yaxis.grid(False)
    common.despine(ax)
    tgt = d[d["市町村"] == TARGET].iloc[0]
    ax.text(tgt["千人あたり定員"] + 0.3, list(d["市町村"]).index(TARGET),
            f"{tgt['千人あたり定員']:.1f} 人（{int(tgt['定員']):,} 人／{int(tgt['施設数'])} 施設）",
            va="center", fontsize=10, color=ACCENT)
    common.titles(fig, ax, f"人口あたりの認可保育所の定員は自治体間で {spread:.1f} 倍の開きがある",
                  "令和 5 年 6 月時点。認可保育所のみ（認定こども園・幼稚園・小規模保育は含まない）。\n"
                  f"千葉市・船橋市・柏市など県の一覧に載らない {missing} 市町村は除いた（残り {len(d)} 市町村）")
    common.caption(fig, SOURCE_NUR)
    common.save(fig, "fig04_chiba_nursery_capacity.png")


def main() -> None:
    common.setup()
    pop = load_population()
    chg = load_change().merge(pop[["市町村", "総人口"]], on="市町村")
    print(f"市区町村数: 人口={len(pop)} 動態={len(chg)}")
    print("自然増減がプラスの市町村:", chg[chg["自然増減"] > 0]["市町村"].tolist() or "なし")
    fig_natural_vs_social(chg)
    fig_nursery(pop)


if __name__ == "__main__":
    main()
