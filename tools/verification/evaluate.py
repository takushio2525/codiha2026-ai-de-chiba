#!/usr/bin/env python3
"""計測した CSV を読み、評価指標を計算して PASS / FAIL の表を出す。

`elapsed_ms, line` の 2 列を持つ CSV を想定している。
アプリのログから作っても、手で書いても、形式が合っていれば動く。

使い方:
    python evaluate.py --input results/run_001.csv
    python evaluate.py --input results/run_001.csv --report results/report_001.md
    python evaluate.py --input results/run_001.csv --plot          # 要 matplotlib

標準ライブラリだけで動く（--plot のときだけ matplotlib が要る）。

【自分たちの指標を足すには】
下の `build_metrics()` に 1 行足すだけ。計算処理は素の Python で書けばよい。
"""

import argparse
import csv
import statistics
import sys
from pathlib import Path


# ---------------------------------------------------------------- データ読み込み

def load_rows(path: Path):
    """CSV を読んで [(elapsed_ms, line), ...] を返す。"""
    rows = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if header is None:
            return rows
        # 1 行目がヘッダでなければデータとして扱う
        if header and header[0].strip().isdigit():
            f.seek(0)
            reader = csv.reader(f)
        for row in reader:
            if len(row) < 2:
                continue
            try:
                rows.append((int(row[0]), row[1]))
            except ValueError:
                continue  # 数値でない行は飛ばす
    return rows


# ---------------------------------------------------------------- 指標の定義

class Metric:
    """1 つの評価指標。目標値と比べて PASS / FAIL を出す。"""

    def __init__(self, mid, name, value, unit, target, ok, note=""):
        self.mid = mid
        self.name = name
        self.value = value
        self.unit = unit
        self.target = target
        self.ok = ok          # True / False / None（判定しない）
        self.note = note

    @property
    def verdict(self):
        if self.ok is None:
            return "—"
        return "PASS" if self.ok else "FAIL"


def build_metrics(rows, args):
    """CSV から指標を計算する。

    ===== ここに自分たちの指標を足す =====
    Metric(ID, 指標名, 実測値, 単位, 目標値の説明, 判定結果, 補足) を append するだけ。
    """
    metrics = []

    if not rows:
        return metrics

    times = [t for t, _ in rows]
    duration_ms = times[-1] - times[0] if len(times) > 1 else 0
    count = len(rows)

    # --- 受信件数 ---
    metrics.append(Metric(
        "M-1", "受信した行数", count, "行",
        f"{args.min_lines} 行以上" if args.min_lines else "—",
        (count >= args.min_lines) if args.min_lines else None,
    ))

    # --- 受信レート ---
    rate = (count / (duration_ms / 1000)) if duration_ms > 0 else 0.0
    metrics.append(Metric(
        "M-2", "受信レート", round(rate, 2), "行/秒",
        f"{args.min_rate} 行/秒以上" if args.min_rate else "—",
        (rate >= args.min_rate) if args.min_rate else None,
    ))

    # --- 受信間隔の安定性（周期送信している場合に効く）---
    if len(times) > 2:
        gaps = [b - a for a, b in zip(times, times[1:])]
        gap_mean = statistics.mean(gaps)
        gap_max = max(gaps)
        gap_sd = statistics.pstdev(gaps)

        metrics.append(Metric(
            "M-3", "受信間隔の平均", round(gap_mean, 1), "ms",
            f"{args.interval_ms} ms 前後" if args.interval_ms else "—",
            None,
        ))
        metrics.append(Metric(
            "M-4", "受信間隔の最大", gap_max, "ms",
            f"{args.max_gap_ms} ms 以下" if args.max_gap_ms else "—",
            (gap_max <= args.max_gap_ms) if args.max_gap_ms else None,
            "この値が大きい = たまに大きく遅れている",
        ))
        metrics.append(Metric(
            "M-5", "受信間隔のばらつき", round(gap_sd, 1), "ms",
            f"{args.max_jitter_ms} ms 以下" if args.max_jitter_ms else "—",
            (gap_sd <= args.max_jitter_ms) if args.max_jitter_ms else None,
            "標準偏差。小さいほど安定している",
        ))

        # --- 取りこぼしの推定（期待周期が分かっている場合）---
        if args.interval_ms:
            expected = int(duration_ms / args.interval_ms) + 1
            lost = max(0, expected - count)
            lost_rate = (lost / expected * 100) if expected else 0.0
            metrics.append(Metric(
                "M-6", "取りこぼし率（推定）", round(lost_rate, 2), "%",
                f"{args.max_loss_pct} % 以下" if args.max_loss_pct is not None else "—",
                (lost_rate <= args.max_loss_pct) if args.max_loss_pct is not None else None,
                f"期待 {expected} 行に対して実測 {count} 行",
            ))

    return metrics


# ---------------------------------------------------------------- 出力

def render_markdown(path, rows, metrics):
    times = [t for t, _ in rows]
    duration_s = (times[-1] - times[0]) / 1000 if len(times) > 1 else 0

    lines = []
    lines.append("# 評価結果")
    lines.append("")
    lines.append(f"- 入力: `{path}`")
    lines.append(f"- 記録時間: {duration_s:.1f} 秒")
    lines.append(f"- 行数: {len(rows)}")
    lines.append("")
    lines.append("> 計測条件（機器構成・環境・試行回数）は `metrics.md` に書き足すこと。")
    lines.append("> 条件が分からない数字は提出資料に使えない。")
    lines.append("")
    lines.append("| ID | 指標 | 実測値 | 目標 | 判定 | 備考 |")
    lines.append("|---|---|---|---|:---:|---|")
    for m in metrics:
        lines.append(
            f"| {m.mid} | {m.name} | {m.value} {m.unit} | {m.target} | {m.verdict} | {m.note} |")
    lines.append("")

    failed = [m for m in metrics if m.ok is False]
    if failed:
        lines.append(f"**FAIL: {len(failed)} 件**  "
                     "— 未達の指標は「なぜ届かなかったか」を説明資料に書く。")
        lines.append("原因を分析して書けば、FAIL でも評価は下がらない。")
    else:
        lines.append("**すべて PASS**（判定対象の指標のみ）")
    lines.append("")
    return "\n".join(lines)


def make_plot(rows, out_png):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib が入っていないのでグラフは作りません（pip install matplotlib）。",
              file=sys.stderr)
        return False

    times = [t for t, _ in rows]
    if len(times) < 3:
        print("データが少なすぎてグラフを作れません。", file=sys.stderr)
        return False

    gaps = [b - a for a, b in zip(times, times[1:])]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 6), tight_layout=True)
    ax1.plot(times[1:], gaps, linewidth=0.9)
    ax1.set_xlabel("elapsed (ms)")
    ax1.set_ylabel("interval (ms)")
    ax1.set_title("Receive interval over time")
    ax1.grid(alpha=0.3)

    ax2.hist(gaps, bins=30)
    ax2.set_xlabel("interval (ms)")
    ax2.set_ylabel("count")
    ax2.set_title("Interval distribution")
    ax2.grid(alpha=0.3)

    out_png.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_png, dpi=150)
    plt.close(fig)
    print(f"グラフを書き出しました: {out_png}")
    return True


# ---------------------------------------------------------------- エントリポイント

def main() -> int:
    p = argparse.ArgumentParser(description="計測 CSV から評価指標を計算して表にする")
    p.add_argument("--input", required=True, help="入力 CSV（elapsed_ms, line）")
    p.add_argument("--report", help="Markdown レポートの出力先（省略時は画面のみ）")
    p.add_argument("--plot", action="store_true", help="グラフ PNG も作る（要 matplotlib）")

    g = p.add_argument_group("目標値（指定したものだけ判定する）")
    g.add_argument("--min-lines", type=int, help="最低これだけの行数を受信していること")
    g.add_argument("--min-rate", type=float, help="最低これだけの受信レート（行/秒）")
    g.add_argument("--interval-ms", type=float, help="送信側の期待周期(ms)")
    g.add_argument("--max-gap-ms", type=float, help="受信間隔の最大値の上限(ms)")
    g.add_argument("--max-jitter-ms", type=float, help="受信間隔のばらつき(標準偏差)の上限(ms)")
    g.add_argument("--max-loss-pct", type=float, help="取りこぼし率の上限(%%)")
    args = p.parse_args()

    path = Path(args.input)
    if not path.exists():
        print(f"ファイルが見つかりません: {path}", file=sys.stderr)
        return 1

    rows = load_rows(path)
    if not rows:
        print(f"データがありません: {path}", file=sys.stderr)
        return 1

    metrics = build_metrics(rows, args)
    md = render_markdown(path, rows, metrics)
    print(md)

    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(md, encoding="utf-8")
        print(f"レポートを書き出しました: {report_path}")

    if args.plot:
        make_plot(rows, path.with_suffix(".png"))

    # 判定に失敗があれば終了コード 1（CI で使えるように）
    return 1 if any(m.ok is False for m in metrics) else 0


if __name__ == "__main__":
    sys.exit(main())
