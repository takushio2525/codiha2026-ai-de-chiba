"""分析スクリプト共通の設定（パス・日本語フォント・配色）。

配色は「カテゴリ色は識別、連続色は大小」の原則に従い、系列数ぶんだけ固定順で使う。
1 系列のグラフは全バーを series1 にし、注目対象だけ accent で塗り分ける。
"""
from __future__ import annotations

import pathlib

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib_fontja  # noqa: F401  import した時点で日本語フォントが入る

DATA_DIR = pathlib.Path(__file__).resolve().parents[2]
CHIBA_RAW = DATA_DIR / "chiba-pref" / "raw"
ICHIKAWA_RAW = DATA_DIR / "ichikawa-city" / "raw"
FIG_DIR = DATA_DIR / "analysis" / "figures"

# カテゴリ配色（固定順・8 スロットまで。9 個目は「その他」にまとめる）
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100",
          "#e87ba4", "#008300", "#4a3aa7", "#e34948"]
ACCENT = SERIES[1]          # 注目対象（市川市など）の強調
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_SUB = "#52514e"
INK_MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"


def setup() -> None:
    """全図で共通の見た目。細い線・薄い罫線・余白を広めに。"""
    matplotlib_fontja.japanize()
    plt.rcParams.update({
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
        "axes.edgecolor": AXIS,
        "axes.linewidth": 0.8,
        "axes.labelcolor": INK_SUB,
        "axes.titlecolor": INK,
        "axes.titlesize": 11,
        "axes.titleweight": "normal",
        "axes.titlepad": 12,
        "axes.labelsize": 11,
        "axes.grid": True,
        "axes.axisbelow": True,
        "grid.color": GRID,
        "grid.linewidth": 0.8,
        "grid.linestyle": "-",
        "xtick.color": INK_MUTED,
        "ytick.color": INK_MUTED,
        "xtick.labelsize": 10,
        "ytick.labelsize": 10,
        "legend.frameon": False,
        "legend.fontsize": 10,
        "legend.labelcolor": INK_SUB,
        "lines.linewidth": 2.0,
        "figure.dpi": 130,
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.35,
    })


def despine(ax, keep=("left", "bottom")) -> None:
    for side in ("top", "right", "left", "bottom"):
        ax.spines[side].set_visible(side in keep)


def titles(fig, ax, headline: str, sub: str = "") -> None:
    """見出しを上、説明を下に固定して置く（IPAex にボールドが無いので太字は使わない）。"""
    fig.suptitle(headline, x=0.0, ha="left", fontsize=16, color=INK)
    ax.set_title(sub, loc="left", fontsize=11, color=INK_SUB)


def caption(fig, text: str) -> None:
    """出典を図の下に必ず入れる（プレゼンの出典明記要件のため）。"""
    fig.text(0.0, -0.02, text, ha="left", va="top", fontsize=8.5, color=INK_MUTED)


def save(fig, name: str) -> pathlib.Path:
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    path = FIG_DIR / name
    fig.savefig(path)
    plt.close(fig)
    print(f"wrote {path.relative_to(DATA_DIR.parent)}")
    return path
