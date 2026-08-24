"""千葉県の市町村別高齢化率を見る。

出力
  fig01_chiba_aging_rate_2021.png  令和3年の市町村別高齢化率ランキング
  fig02_chiba_aging_trend.png      平成7年→平成27年→令和3年の高齢化率の推移

出典
  「千葉県年齢別・町丁字別人口の結果」（千葉県オープンデータサイト）
  https://opendata.pref.chiba.lg.jp/datasets/813 を加工して作成
"""
from __future__ import annotations

import warnings

import pandas as pd
import matplotlib.pyplot as plt

import common
from common import ACCENT, INK_MUTED, INK_SUB, SERIES

warnings.filterwarnings("ignore")

SOURCE = "出典:「千葉県年齢別・町丁字別人口の結果」（千葉県オープンデータサイト）\n" \
         "https://opendata.pref.chiba.lg.jp/datasets/813 を加工して作成"
TARGET = "市川市"          # 1 日目の講義で題材として提示された自治体


def load_recent(path: str) -> pd.DataFrame:
    """平成27年・令和3年の様式（1 ブロック・列 1,2,3,7）を読む。"""
    raw = pd.read_excel(common.CHIBA_RAW / path, sheet_name=0, header=None)
    df = raw.iloc[3:, [1, 2, 3, 7]].copy()
    df.columns = ["市町村", "総人口", "高齢者人口", "高齢化率"]
    df = df.dropna(subset=["市町村"])                       # 末尾の県計・空行を落とす
    df["高齢化率"] = pd.to_numeric(df["高齢化率"], errors="coerce") * 100
    for c in ("総人口", "高齢者人口"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return df.dropna(subset=["高齢化率"]).reset_index(drop=True)


def load_1995() -> pd.DataFrame:
    """平成7年の様式（左右 2 ブロック・高齢化率は既に％）を読む。"""
    raw = pd.read_excel(common.CHIBA_RAW / "elderly_by_municipality_1995.xls",
                        sheet_name=0, header=None)
    blocks = []
    for cols in ([0, 1, 2, 3], [6, 7, 8, 9]):
        b = raw.iloc[4:, cols].copy()
        b.columns = ["市町村", "総人口", "高齢者人口", "高齢化率"]
        blocks.append(b)
    df = pd.concat(blocks, ignore_index=True).dropna(subset=["市町村"])
    for c in ("総人口", "高齢者人口", "高齢化率"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return df.dropna(subset=["高齢化率"]).reset_index(drop=True)


def fig_ranking(df: pd.DataFrame) -> None:
    d = df.sort_values("高齢化率").reset_index(drop=True)
    colors = [ACCENT if m == TARGET else SERIES[0] for m in d["市町村"]]

    fig, ax = plt.subplots(figsize=(9, 12))
    ax.barh(d["市町村"], d["高齢化率"], color=colors, height=0.72)
    ax.set_xlabel("高齢化率（65 歳以上／総人口・％）")
    ax.xaxis.grid(True)
    ax.yaxis.grid(False)
    ax.set_xlim(0, max(d["高齢化率"]) * 1.12)
    common.despine(ax)

    pref = df["高齢者人口"].sum() / df["総人口"].sum() * 100    # 県全体（人口で重み付け）
    ax.axvline(pref, color=INK_MUTED, linewidth=1.0)
    ax.text(pref, len(d) - 0.2, f" 千葉県全体 {pref:.1f}％",
            color=INK_SUB, fontsize=10, va="center")

    # 値のラベルは注目対象と両端だけに絞る
    for name in (TARGET, d.iloc[-1]["市町村"], d.iloc[0]["市町村"]):
        row = d[d["市町村"] == name].iloc[0]
        ax.text(row["高齢化率"] + 0.4, list(d["市町村"]).index(name),
                f"{row['高齢化率']:.1f}％", va="center", fontsize=10,
                color=ACCENT if name == TARGET else INK_SUB)

    rank_low = list(d["市町村"]).index(TARGET) + 1
    common.titles(fig, ax, "千葉県 市町村別の高齢化率（令和 3 年）",
                  f"{TARGET}は {len(d)} 市町村中 低いほうから {rank_low} 番目。県内では最も若い部類にある")
    common.caption(fig, SOURCE)
    common.save(fig, "fig01_chiba_aging_rate_2021.png")


def fig_trend(y1995: pd.DataFrame, y2015: pd.DataFrame, y2021: pd.DataFrame) -> None:
    years = [1995, 2015, 2021]
    wide = (y1995[["市町村", "高齢化率"]].rename(columns={"高齢化率": 1995})
            .merge(y2015[["市町村", "高齢化率"]].rename(columns={"高齢化率": 2015}), on="市町村")
            .merge(y2021[["市町村", "高齢化率"]].rename(columns={"高齢化率": 2021}), on="市町村"))

    fig, ax = plt.subplots(figsize=(9, 7))
    for _, row in wide.iterrows():                       # 背景の全市町村は灰色で薄く
        ax.plot(years, [row[y] for y in years], color=INK_MUTED, alpha=0.28, linewidth=1.0)

    pref = [y["高齢者人口"].sum() / y["総人口"].sum() * 100 for y in (y1995, y2015, y2021)]
    ax.plot(years, pref, color=SERIES[0], marker="o", markersize=8, label="千葉県全体",
            markeredgecolor=common.SURFACE, markeredgewidth=2)
    tgt = wide[wide["市町村"] == TARGET].iloc[0]
    ax.plot(years, [tgt[y] for y in years], color=ACCENT, marker="o", markersize=8, label=TARGET,
            markeredgecolor=common.SURFACE, markeredgewidth=2)

    for x, y in zip(years, pref):
        ax.annotate(f"{y:.1f}", (x, y), textcoords="offset points", xytext=(0, 10),
                    ha="center", fontsize=10, color=SERIES[0])
    for x in years:
        ax.annotate(f"{tgt[x]:.1f}", (x, tgt[x]), textcoords="offset points", xytext=(0, -18),
                    ha="center", fontsize=10, color=ACCENT)

    ax.set_xticks(years)
    ax.set_xticklabels(["平成 7 年\n(1995)", "平成 27 年\n(2015)", "令和 3 年\n(2021)"])
    ax.set_ylabel("高齢化率（％）")
    ax.xaxis.grid(False)
    common.despine(ax)
    ax.legend(loc="upper left")
    common.titles(fig, ax, "千葉県の高齢化率は 26 年で 2 倍以上になった",
                  f"細い灰色の線は 3 時点すべてに名前が残る {len(wide)} 市町村（合併で消えた旧市町村は除く）")
    common.caption(fig, SOURCE)
    common.save(fig, "fig02_chiba_aging_trend.png")


def main() -> None:
    common.setup()
    y2021 = load_recent("elderly_by_municipality_2021.xlsx")
    y2015 = load_recent("elderly_by_municipality_2015.xls")
    y1995 = load_1995()
    print(f"読み込み: 1995={len(y1995)} 2015={len(y2015)} 2021={len(y2021)} 市町村")
    fig_ranking(y2021)
    fig_trend(y1995, y2015, y2021)


if __name__ == "__main__":
    main()
