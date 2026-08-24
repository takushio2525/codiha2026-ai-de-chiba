#!/usr/bin/env python3
"""シリアルポートから届く行を CSV に記録する。

マイコンが 1 行ずつ出力するログ（例: "STATUS,123"）を、時刻付きの CSV に落とす。
評価用の生データを取るための道具。

使い方:
    pip install pyserial                       # 初回のみ
    python serial_logger.py --list             # ポート一覧を見る
    python serial_logger.py --port /dev/ttyUSB0 --seconds 30 --out results/run_001.csv

出力される CSV:
    elapsed_ms,line
    0,STATUS 123
    102,STATUS 124
    ...

マイコンを使わない班は、このスクリプトを自分たちの計測方法に置き換えてよい。
大事なのは「時刻付きの CSV にすること」。そうすれば evaluate.py がそのまま使える。
"""

import argparse
import csv
import sys
import time
from pathlib import Path


def list_ports() -> int:
    """つながっているシリアルポートを一覧表示する。"""
    try:
        from serial.tools import list_ports as lp
    except ImportError:
        print("pyserial が入っていません。`pip install pyserial` を実行してください。",
              file=sys.stderr)
        return 1

    ports = list(lp.comports())
    if not ports:
        print("シリアルポートが見つかりません。")
        print("・USB ケーブルがつながっているか")
        print("・ドライバが入っているか")
        print("・他のソフト（Arduino IDE のシリアルモニタ等）が掴んでいないか  を確認してください。")
        return 1

    print(f"見つかったポート（{len(ports)} 件）:")
    for p in ports:
        print(f"  {p.device}\t{p.description}")
    return 0


def record(port: str, baud: int, seconds: float, out_path: Path,
           echo: bool) -> int:
    """指定時間だけシリアルを読み、CSV に書き出す。"""
    try:
        import serial
    except ImportError:
        print("pyserial が入っていません。`pip install pyserial` を実行してください。",
              file=sys.stderr)
        return 1

    out_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        ser = serial.Serial(port, baud, timeout=0.1)
    except Exception as e:  # ポートが無い / 権限が無い / 他のソフトが掴んでいる
        print(f"ポートを開けませんでした: {e}", file=sys.stderr)
        print("`--list` でポート名を確認し、シリアルモニタを閉じてから再実行してください。",
              file=sys.stderr)
        return 1

    count = 0
    start = time.monotonic()
    try:
        with ser, out_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["elapsed_ms", "line"])
            print(f"記録開始: {port} @ {baud}bps / {seconds:.0f} 秒 → {out_path}")

            while time.monotonic() - start < seconds:
                raw = ser.readline()
                if not raw:
                    continue
                line = raw.decode("utf-8", errors="replace").strip()
                if not line:
                    continue
                elapsed_ms = int((time.monotonic() - start) * 1000)
                writer.writerow([elapsed_ms, line])
                count += 1
                if echo:
                    print(f"  {elapsed_ms:>7} ms  {line}")
    except KeyboardInterrupt:
        print("\n中断しました（ここまでの分は保存されています）。")

    print(f"記録終了: {count} 行を {out_path} に保存しました。")
    if count == 0:
        print("1 行も受信できませんでした。ボーレートが合っているか確認してください。")
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="シリアルポートのログを CSV に記録する")
    parser.add_argument("--list", action="store_true",
                        help="つながっているシリアルポートを一覧表示して終了する")
    parser.add_argument("--port", help="シリアルポート名（例: /dev/ttyUSB0, COM3）")
    parser.add_argument("--baud", type=int, default=115200,
                        help="ボーレート（既定: 115200。マイコン側と合わせる）")
    parser.add_argument("--seconds", type=float, default=30.0,
                        help="記録する秒数（既定: 30）")
    parser.add_argument("--out", default="results/run.csv",
                        help="出力する CSV のパス（既定: results/run.csv）")
    parser.add_argument("--quiet", action="store_true",
                        help="受信した行を画面に表示しない")
    args = parser.parse_args()

    if args.list:
        return list_ports()

    if not args.port:
        parser.error("--port を指定してください（--list でポート名を確認できます）")

    return record(args.port, args.baud, args.seconds,
                  Path(args.out), echo=not args.quiet)


if __name__ == "__main__":
    sys.exit(main())
