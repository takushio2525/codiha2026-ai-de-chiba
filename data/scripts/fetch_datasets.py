#!/usr/bin/env python3
"""検討用のオープンデータを取得する。

manifest.json に書いた URL だけを落とす。サイトに負荷をかけないよう
1 ファイルごとに待ち時間を入れ、すでに取得済みのファイルはスキップする。

  python3 data/scripts/fetch_datasets.py            # 未取得のものだけ取得
  python3 data/scripts/fetch_datasets.py --force    # 取り直す

出典と利用条件は data/<ソース>/SOURCE.md に書いてある。
"""
import argparse
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

UA = {"User-Agent": "codiha2026-team-research/1.0 (dataset survey; contact via GitHub issues)"}
SLEEP_SEC = 2.0          # 同一サイトへの連続アクセス間隔
MAX_BYTES = 20 * 1024 * 1024  # これを超えるものはリポジトリに置かない

ROOT = pathlib.Path(__file__).resolve().parents[1]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.read()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="取得済みでも上書きする")
    args = ap.parse_args()

    manifest = json.loads((ROOT / "scripts" / "manifest.json").read_text(encoding="utf-8"))
    failed = []
    for source in manifest["sources"]:
        out_dir = ROOT / source["dir"] / "raw"
        out_dir.mkdir(parents=True, exist_ok=True)
        for r in source["resources"]:
            dest = out_dir / r["file"]
            if dest.exists() and not args.force:
                print(f"skip   {dest.relative_to(ROOT)}")
                continue
            try:
                body = fetch(r["url"])
            except (urllib.error.URLError, TimeoutError) as e:
                # 1 本落とせなくても残りは取りに行く（配布元が 500 を返すことがある）
                print(f"FAILED {r['file']}  {e}  <- {r['url']}")
                failed.append(r["file"])
                time.sleep(SLEEP_SEC)
                continue
            if len(body) > MAX_BYTES:
                print(f"SKIP(too large {len(body) / 1e6:.1f}MB) {r['title']} -> URL のみ SOURCE.md に記録")
                continue
            dest.write_bytes(body)
            print(f"saved  {dest.relative_to(ROOT)}  {len(body):,} bytes  <- {r['title']}")
            time.sleep(SLEEP_SEC)

    if failed:
        print(f"\n取得できなかったファイル {len(failed)} 本: {', '.join(failed)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
