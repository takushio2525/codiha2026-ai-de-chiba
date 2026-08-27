#!/usr/bin/env python3
"""prog-focus 図（*.progfocus.md）を検証する。

  python3 docs/presentation/verify_progfocus.py docs/presentation/chizuba-overview.progfocus.md

見るのは 4 つ。

  1. JSON ブロックが構文として妥当か（prog-focus に取り込めるか）
  2. frontmatter の nodeCount / connectionCount が実際の数と合っているか
  3. 接続と親の参照が切れていないか・rootNodeIds が parentId=null と一致するか
  4. **programDef の fileName が実在するか**（図が実装から離れていないか）

リポジトリのルートで実行すること（パスはルートからの相対で書いてある）。
"""
import json
import os
import re
import sys


def main() -> int:
    if len(sys.argv) != 2:
        print(f"使い方: python3 {sys.argv[0]} <*.progfocus.md>", file=sys.stderr)
        return 2

    path = sys.argv[1]
    src = open(path, encoding="utf-8").read()

    block = re.search(r"```json\n(.*?)\n```", src, re.S)
    if block is None:
        print("■ JSON ブロックが見つかりません", file=sys.stderr)
        return 1

    try:
        project = json.loads(block.group(1))["project"]
    except (json.JSONDecodeError, KeyError) as error:
        print(f"■ JSON を読めません: {error}", file=sys.stderr)
        return 1

    nodes = project["nodes"]
    connections = project["connections"]
    errors: list[str] = []
    print(f"JSON パース OK（ノード {len(nodes)} / 接続 {len(connections)}）")

    # 2. frontmatter の数と突き合わせる
    for key, actual in (("nodeCount", len(nodes)), ("connectionCount", len(connections))):
        declared = re.search(rf"^{key}: (\d+)$", src, re.M)
        if declared is None:
            errors.append(f"frontmatter に {key} がありません")
        elif int(declared.group(1)) != actual:
            errors.append(f"{key} が {declared.group(1)} だが実際は {actual}")

    # 3. 参照の整合性
    ids = set(nodes)
    for c in connections.values():
        for side in ("fromNodeId", "toNodeId"):
            if c[side] not in ids:
                errors.append(f"接続 {c['id']} の {side} が存在しない: {c[side]}")
    for n in nodes.values():
        if n["parentId"] is not None and n["parentId"] not in ids:
            errors.append(f"ノード {n['id']} の parentId が存在しない: {n['parentId']}")

    roots = sorted(n["id"] for n in nodes.values() if n["parentId"] is None)
    if roots != sorted(project["rootNodeIds"]):
        errors.append(f"rootNodeIds と parentId=null が食い違う: {roots} / {project['rootNodeIds']}")

    # 4. fileName の実在（図が実装から離れていないか）
    paths = {
        n["programDef"]["fileName"]
        for n in nodes.values()
        if n["programDef"].get("fileName")
    }
    paths |= set(project.get("definitionRegistry", {}).get("fileNames", []))
    missing = sorted(f for f in paths if not (os.path.isfile(f) or os.path.isdir(f)))
    print(f"fileName を {len(paths)} 本検査しました")
    errors.extend(f"実在しないパス: {f}" for f in missing)

    if errors:
        print("")
        for e in errors:
            print("■", e, file=sys.stderr)
        return 1

    print("■ すべて緑")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
