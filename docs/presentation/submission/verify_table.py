#!/usr/bin/env python3
"""説明資料②（対応表）に書いた「どのファイルのどこか」を機械的に確かめる．

提出要件は「対応する実装はどのファイルのどこかを記す」と決めているので，
**書いたパスとシンボルが本当に実在するか**を毎回確かめられるようにしておく．
1 つでも欠けたら非 0 で終わる．

    python3 docs/presentation/submission/verify_table.py

やっていること:

1. `.typ` から `#PATH[…]` を全部拾い，ファイル（または glob）が実在するかを見る．
   `data/` `docs/` で始まるものは開発リポジトリのルート基準，それ以外は `app/` 基準
   （提出した作業ディレクトリからの相対パスで書いてあるため）
2. 同じ行にある `#SYM[…]` を，その行の `#PATH[…]` が指すファイルの中から grep する．
   識別子に見えないもの（`/privacy` や `?city=` のような画面の URL・記号）は飛ばす
3. 資料に書いた件数（避難場所 123 など）を，実データを数え直して突き合わせる

パスでもシンボルでもない `#PATH[…]`（ボリューム名など）は NOT_A_FILE に理由つきで並べてある．
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / "app"
TYP = Path(__file__).resolve().parent / "02-feature-implementation-table.typ"

# `#PATH[…]` に書いてあるがリポジトリのファイルではないもの（理由つき）
NOT_A_FILE = {
    "uploads/": "named volume の中（コンテナの中にしか無い）",
    "/app/uploads": "コンテナの中の置き場",
    "ai-de-chiba-map/src/lib/hazards.ts": "展開後のパスの例として書いている",
    "MapView.tsx": "直前の行と同じディレクトリを省略して書いている",
}

# 識別子として grep しないもの（画面の URL・記号・SQL の予約語など）
SKIP_SYMBOL = re.compile(r"^(?:[/?#<'].*|[-+=@]|.*[/?<>=].*|F-\d+)$")


def extract(typ: str) -> tuple[list[tuple[int, str]], list[tuple[int, str]]]:
    """`#PATH[…]` と `#SYM[…]` を行番号つきで取り出す（`\\[` `\\]` の入れ子に対応）."""
    paths: list[tuple[int, str]] = []
    syms: list[tuple[int, str]] = []
    for lineno, line in enumerate(typ.splitlines(), start=1):
        for kind, out in (("PATH", paths), ("SYM", syms)):
            i = 0
            token = f"#{kind}["
            while (i := line.find(token, i)) != -1:
                j = i + len(token)
                depth = 1
                buf = []
                while j < len(line) and depth:
                    c = line[j]
                    if c == "\\" and j + 1 < len(line):
                        buf.append(line[j + 1])  # `\[` `\]` `\*` はそのまま値にする
                        j += 2
                        continue
                    if c == "[":
                        depth += 1
                    elif c == "]":
                        depth -= 1
                        if not depth:
                            break
                    buf.append(c)
                    j += 1
                out.append((lineno, "".join(buf)))
                i = j + 1
    return paths, syms


def resolve(token: str) -> Path:
    """資料に書いたパスを実際の場所に直す."""
    base = ROOT if token.split("/")[0] in {"data", "docs", "tools", "app"} else APP
    return base / token


def check_paths(paths: list[tuple[int, str]]) -> list[str]:
    bad = []
    for lineno, token in paths:
        if token in NOT_A_FILE:
            continue
        target = resolve(token)
        if "*" in token:
            hits = list(target.parent.glob(target.name))
            if not hits:
                bad.append(f"{TYP.name}:{lineno} PATH が 1 件も当たらない: {token}")
            continue
        if not target.exists():
            bad.append(f"{TYP.name}:{lineno} PATH が実在しない: {token} → {target}")
    return bad


def check_symbols(paths: list[tuple[int, str]], syms: list[tuple[int, str]]) -> list[str]:
    """同じ行の `#PATH[…]` が指すファイルの中に，そのシンボルがあるかを見る."""
    by_line: dict[int, list[str]] = {}
    for lineno, token in paths:
        by_line.setdefault(lineno, []).append(token)

    bad = []
    for lineno, sym in syms:
        if lineno not in by_line or SKIP_SYMBOL.match(sym):
            continue
        targets = [resolve(t) for t in by_line[lineno] if t not in NOT_A_FILE]
        targets = [t for t in targets if t.is_file()]
        if not targets:
            continue
        needle = sym.split("(")[0].strip()
        if any(needle in t.read_text(encoding="utf-8", errors="replace") for t in targets):
            continue
        where = " / ".join(t.relative_to(ROOT).as_posix() for t in targets)
        bad.append(f"{TYP.name}:{lineno} シンボルが見つからない: {sym} （{where}）")
    return bad


def check_counts() -> list[str]:
    """資料に書いた件数を，実データから数え直して突き合わせる."""
    bad = []

    def geo(name: str) -> int:
        data = json.loads((APP / "public/data" / name).read_text(encoding="utf-8"))
        return len(data["features"])

    expected = {
        "evacuation_sites.geojson": 123,
        "aed_locations.geojson": 304,
        "childcare_facilities.geojson": 388,
        "scenic_spots.geojson": 100,
    }
    for name, want in expected.items():
        got = geo(name)
        if got != want:
            bad.append(f"件数が合わない: {name} は {want} と書いたが {got}")

    photos = len(list((APP / "public/images/scenic").glob("*.jpg")))
    if photos != 54:
        bad.append(f"件数が合わない: 景観スポットの写真は 54 と書いたが {photos}")

    seed_photos = len(list((APP / "db/seed-photos").glob("*.jpg")))
    if seed_photos != 17:
        bad.append(f"件数が合わない: デモ投稿の写真は 17 と書いたが {seed_photos}")

    seed = (APP / "db/init/003_seed_demo_reports.sql").read_text(encoding="utf-8")
    # 投稿は `INSERT INTO reports` の VALUES 行（`('hazard',` などで始まる）を数える
    reports = len(re.findall(r"^\s*\('(?:hazard|flood|spot)',", seed, flags=re.MULTILINE))
    if reports != 22:
        bad.append(f"件数が合わない: デモ投稿は 22 と書いたが {reports}")

    schema = (APP / "db/init/001_schema.sql").read_text(encoding="utf-8")
    tables = len(re.findall(r"CREATE TABLE", schema))
    indexes = len(re.findall(r"CREATE INDEX", schema))
    # 実測 6（app_instance / municipalities / users / reports / report_photos /
    # report_comments）．docs/spec/ が「5 テーブル」と書いているのは誤りで，資料は 6 に合わせてある
    if tables != 6:
        bad.append(f"件数が合わない: テーブルは 6 と書いたが {tables}")
    if indexes != 6:
        bad.append(f"件数が合わない: 索引は 6 と書いたが {indexes}")

    hazards = (APP / "src/lib/hazards.ts").read_text(encoding="utf-8")
    kinds = len(re.findall(r"^\s{2}\{\s*$", hazards[hazards.index("export const HAZARDS") :], flags=re.MULTILINE))
    if kinds != 4:
        bad.append(f"件数が合わない: ハザードは 4 種と書いたが {kinds}")

    return bad


def main() -> int:
    typ = TYP.read_text(encoding="utf-8")
    paths, syms = extract(typ)

    problems = check_paths(paths) + check_symbols(paths, syms) + check_counts()

    checked_paths = len({t for _, t in paths})
    checked_syms = len([s for ln, s in syms if not SKIP_SYMBOL.match(s)])
    print(f"パス {checked_paths} 種・シンボル {checked_syms} 件・件数 10 項目を確認した")

    if problems:
        print()
        for p in problems:
            print(f"[ NG ] {p}")
        print(f"\n{len(problems)} 件の不一致がある")
        return 1

    print("[ OK ] すべて実在する")
    return 0


if __name__ == "__main__":
    sys.exit(main())
