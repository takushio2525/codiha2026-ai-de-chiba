#!/usr/bin/env python3
"""pc_app/common/ の共通 .pde を各スケッチフォルダへ配る。

【なぜこれが要るか】
Processing は「スケッチフォルダの中にある .pde を全部まとめて 1 つのプログラムに
する」という仕様なので、フォルダをまたいでコードを共有できない。
そのため複数スケッチで同じ部品を使いたいとき、普通にやるとコピペになる。

コピペすると「片方だけ直して壊れる」事故が必ず起きるので、
common/ を正本にして、そこから配る方式にする。

使い方:
    python pc_app/sync_common.py            # common/ の .pde を全スケッチへ配る
    python pc_app/sync_common.py --check    # 配布済みと正本がズレていないか確認するだけ

--check は CI でも使える（ズレていたら終了コード 1）。
"""

import argparse
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
COMMON_DIR = HERE / "common"

# 配布したファイルの先頭に付ける印。手で編集させないための警告。
BANNER = (
    "// ===== このファイルは pc_app/common/{name} のコピーです =====\n"
    "// 直接編集しないでください。編集は common/ 側に行い、\n"
    "//   python pc_app/sync_common.py\n"
    "// を実行して配り直します。\n"
)


def find_sketches() -> list:
    """pc_app 直下のスケッチフォルダ（フォルダ名と同名の .pde を持つ）を探す。"""
    sketches = []
    for d in sorted(HERE.iterdir()):
        if not d.is_dir() or d.name == "common":
            continue
        if (d / f"{d.name}.pde").exists():
            sketches.append(d)
    return sketches


def expected_content(src: Path) -> str:
    return BANNER.format(name=src.name) + src.read_text(encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="common/ の .pde を各スケッチへ配る")
    ap.add_argument("--check", action="store_true",
                    help="配らずに、ズレていないか確認するだけ")
    args = ap.parse_args()

    if not COMMON_DIR.is_dir():
        print(f"{COMMON_DIR} がありません。共有する部品が無ければこのスクリプトは不要です。")
        return 0

    sources = sorted(COMMON_DIR.glob("*.pde"))
    if not sources:
        print("common/ に .pde がありません。何もしません。")
        return 0

    sketches = find_sketches()
    if not sketches:
        print("スケッチフォルダが見つかりません（フォルダ名と同じ .pde が必要です）。")
        return 0

    print(f"共通部品 {len(sources)} 個 → スケッチ {len(sketches)} 個")

    stale = []
    copied = 0
    for sketch in sketches:
        for src in sources:
            dst = sketch / src.name
            want = expected_content(src)
            have = dst.read_text(encoding="utf-8") if dst.exists() else None

            if have == want:
                continue

            if args.check:
                stale.append(f"{dst.relative_to(HERE.parent)}"
                             + ("（未配置）" if have is None else "（内容がズレています）"))
            else:
                dst.write_text(want, encoding="utf-8")
                print(f"  配布: {dst.relative_to(HERE.parent)}")
                copied += 1

    if args.check:
        if stale:
            print("\n次のファイルが正本と一致していません:")
            for s in stale:
                print(f"  - {s}")
            print("\n`python pc_app/sync_common.py` を実行してから、変更をコミットしてください。")
            return 1
        print("すべて正本と一致しています。")
        return 0

    if copied == 0:
        print("すべて最新です。")
    else:
        print(f"\n{copied} ファイルを配りました。忘れずにコミットしてください。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
