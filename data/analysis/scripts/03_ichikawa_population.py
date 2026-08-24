"""市川市の年齢構成と、町丁字ごとの高齢化のばらつきを見る。

出力
  fig05_ichikawa_population_pyramid.png  市全体の人口ピラミッド（5 歳階級）
  fig06_ichikawa_area_aging_gap.png      町丁字別の高齢化率（上位・下位 15 地区）

出典
  「【市川市】地域・年齢別人口」（市川市オープンデータ／千葉県オープンデータサイト）
  https://opendata.pref.chiba.lg.jp/datasets/3282 を加工して作成
"""
from __future__ import annotations

import re

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

import common
from common import ACCENT, INK_MUTED, INK_SUB, SERIES

SOURCE = ("出典:「【市川市】地域・年齢別人口」（市川市オープンデータ／千葉県オープンデータサイト）\n"
          "https://opendata.pref.chiba.lg.jp/datasets/3282 を加工して作成")

AGE_BANDS = [f"{a}-{a + 4}歳" for a in range(0, 85, 5)] + ["85歳以上"]


def load() -> pd.DataFrame:
    """町丁字別・5 歳階級・男女別の人口を読む。

    文字コードは cp932。年齢階級の列は空欄混じりで文字列として読まれるので数値に直す。
    """
    df = pd.read_csv(common.ICHIKAWA_RAW / "population_by_area_and_age.csv", encoding="cp932")
    for band in AGE_BANDS:
        for sex in ("男性", "女性"):
            col = f"{band}の{sex}"
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    return df


def age_columns(df: pd.DataFrame) -> list[str]:
    return [b for b in AGE_BANDS if f"{b}の男性" in df.columns]


def add_aging(df: pd.DataFrame) -> pd.DataFrame:
    """65 歳以上人口と高齢化率、0〜4 歳人口を足す。"""
    bands = age_columns(df)
    elderly = [b for b in bands if int(re.match(r"(\d+)", b).group(1)) >= 65]
    cols_e = [f"{b}の{s}" for b in elderly for s in ("男性", "女性")]
    out = df.copy()
    out["高齢者人口"] = out[cols_e].sum(axis=1)
    out["高齢化率"] = out["高齢者人口"] / out["総人口"] * 100
    out["未就学児人口"] = out[["0-4歳の男性", "0-4歳の女性"]].sum(axis=1)
    return out


def fig_pyramid(df: pd.DataFrame) -> None:
    bands = age_columns(df)
    male = [df[f"{b}の男性"].sum() for b in bands]
    female = [df[f"{b}の女性"].sum() for b in bands]
    y = range(len(bands))

    fig, ax = plt.subplots(figsize=(9, 8))
    ax.barh(y, [-m for m in male], color=SERIES[0], height=0.76, label="男性")
    ax.barh(y, female, color=SERIES[1], height=0.76, label="女性")
    ax.set_yticks(list(y))
    ax.set_yticklabels([b.replace("歳", "") for b in bands])
    ax.set_ylabel("年齢（5 歳階級）")
    ax.set_xlabel("人口（人）")
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{abs(int(v)):,}"))
    ax.axvline(0, color=common.AXIS, linewidth=1.0)
    ax.yaxis.grid(False)
    common.despine(ax, keep=("bottom",))
    ax.legend(loc="upper right")

    total = df["総人口"].sum()
    peak = bands[int(pd.Series([m + f for m, f in zip(male, female)]).idxmax())]
    common.titles(fig, ax, f"市川市の人口は {int(total):,} 人。最も厚いのは {peak}層",
                  f"令和 8 年 3 月 31 日現在・住民基本台帳（{len(df)} 町丁字の合計）。"
                  "20 代後半にも山があり、単身の流入が多い街の形をしている")
    common.caption(fig, SOURCE)
    common.save(fig, "fig05_ichikawa_population_pyramid.png")


def fig_area_gap(df: pd.DataFrame, n: int = 15) -> None:
    """人口が少ない地区は率が跳ねるので、一定規模以上の町丁字に絞って比べる。"""
    d = df[df["総人口"] >= 500].copy()
    top = d.nlargest(n, "高齢化率").sort_values("高齢化率")
    bottom = d.nsmallest(n, "高齢化率").sort_values("高齢化率")
    city = df["高齢者人口"].sum() / df["総人口"].sum() * 100

    spread = top["高齢化率"].max() / bottom["高齢化率"].min()

    fig, axes = plt.subplots(1, 2, figsize=(14, 7.8), sharex=True)
    for ax, part, color, label in ((axes[0], top, ACCENT, f"高齢化率が高い {n} 地区"),
                                   (axes[1], bottom, SERIES[0], f"高齢化率が低い {n} 地区")):
        ax.barh(part["地域名"], part["高齢化率"], color=color, height=0.72)
        ax.axvline(city, color=INK_MUTED, linewidth=1.0)
        ax.set_title(label, loc="left", fontsize=12, color=INK_SUB)
        ax.set_xlabel("高齢化率（％）")
        ax.yaxis.grid(False)
        common.despine(ax)
        for i, (_, r) in enumerate(part.iterrows()):
            ax.text(r["高齢化率"] + 0.6, i, f"{r['高齢化率']:.0f}％（{int(r['総人口']):,}人）",
                    va="center", fontsize=9, color=INK_SUB)
    axes[0].set_xlim(0, max(top["高齢化率"]) * 1.28)

    fig.suptitle(f"同じ市川市でも、町丁字によって高齢化率は {spread:.1f} 倍ちがう",
                 x=0.0, ha="left", fontsize=16, color=common.INK)
    common.caption(fig, SOURCE +
                   f"\n※ 縦の細線は市全体の高齢化率 {city:.1f}％。"
                   "率が跳ねる小規模地区を避けるため、総人口 500 人以上の町丁字に限った")
    common.save(fig, "fig06_ichikawa_area_aging_gap.png")


def main() -> None:
    common.setup()
    df = add_aging(load())
    big = df[df["総人口"] >= 500]
    print(f"町丁字 {len(df)} 地区 / 総人口 {int(df['総人口'].sum()):,} 人 / "
          f"市全体の高齢化率 {df['高齢者人口'].sum() / df['総人口'].sum() * 100:.1f}％")
    print(f"500 人以上の {len(big)} 地区での高齢化率: "
          f"最高 {big['高齢化率'].max():.1f}％ 最低 {big['高齢化率'].min():.1f}％ "
          f"（{big['高齢化率'].max() / big['高齢化率'].min():.1f} 倍）")
    fig_pyramid(df)
    fig_area_gap(df)


if __name__ == "__main__":
    main()
