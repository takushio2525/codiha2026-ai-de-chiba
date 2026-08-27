#!/usr/bin/env python3
"""技術解説 PDF の原稿（*.typ）が，実装から離れていないか確かめる。

  python3 docs/presentation/verify_explainer.py docs/presentation/chizuba-tech-explainer.typ

見るのは 3 つ。

  1. バッククォートで囲んだ **ファイルパス** が実在するか
  2. バッククォートで囲んだ **URL のルート** が，対応する page.tsx / route.ts を持つか
  3. 句読点が全角の「，」「．」で統一されているか（提出資料の規約）

ファイルパスでも URL でもないもの（MIME タイプ・イメージ名・環境変数など）は
下の EXEMPT に列挙してある。**新しく足したくなったら，本当に例外か 1 度考えること。**

リポジトリのルートで実行する。
"""
import os
import re
import sys

# パスでも URL でもないもの（実在を確かめる対象にしない）
EXEMPT = {
    "multipart/form-data",   # MIME タイプ
    "postgis/postgis",       # 採用しなかった Docker イメージの名前
    "/app/uploads",          # コンテナの中のパス（ホストには無い）
    "/api/…",                # 総称
    "/api/auth/*",           # Auth.js が内部で持つ経路（[...nextauth] が受ける）
    "/api/auth/callback/google",
}

# URL のルート → 対応するソースを探す起点
APP_DIR = "app/src/app"


def is_pathish(token: str) -> bool:
    """パスらしい表記か。コマンド・環境変数・ヘッダー名を除く。"""
    if " " in token or token.startswith("<"):
        return False
    if "://" in token or "=" in token:  # 絶対 URL・環境変数の代入はパスではない
        return False
    if "/" in token:
        return True
    return token.endswith((".ts", ".tsx", ".sql", ".py", ".md", ".yaml", ".json"))


def resolve_file(token: str) -> bool:
    """リポジトリ内のファイル・ディレクトリとして解決できるか。"""
    base = token.rstrip("/")
    if "*" in base:  # glob はディレクトリの存在で代用する
        base = os.path.dirname(base)
    candidates = [base, f"app/src/{base}", f"app/{base}", f"docs/presentation/{base}"]
    return any(os.path.exists(c) for c in candidates)


def resolve_route(token: str) -> bool:
    """URL のルートに対応する page.tsx / route.ts があるか。"""
    rel = token.strip("/")
    for leaf in ("page.tsx", "route.ts"):
        if os.path.isfile(os.path.join(APP_DIR, rel, leaf)):
            return True
    return False


def main() -> int:
    if len(sys.argv) != 2:
        print(f"使い方: python3 {sys.argv[0]} <*.typ>", file=sys.stderr)
        return 2

    src = open(sys.argv[1], encoding="utf-8").read()
    errors: list[str] = []

    # 1・2. バッククォート表記の検査
    tokens = sorted({t for t in re.findall(r"`([^`\n]+)`", src) if is_pathish(t)})
    files, routes, exempt = 0, 0, 0
    for token in tokens:
        if token in EXEMPT:
            exempt += 1
        elif token.startswith("/"):
            routes += 1
            if not resolve_route(token):
                errors.append(f"URL に対応するソースが無い: {token}")
        else:
            files += 1
            if not resolve_file(token):
                errors.append(f"実在しないパス: {token}")
    print(f"バッククォート表記 {len(tokens)} 件（パス {files} / URL {routes} / 対象外 {exempt}）")

    # 3. 句読点（提出資料は全角の「，」「．」で統一する）
    bad = re.findall(r"[、。]", src)
    print(f"「、」「。」の混入: {len(bad)} 件")
    if bad:
        errors.append(f"句読点が全角の「，」「．」になっていない箇所が {len(bad)} 件ある")

    if errors:
        print("")
        for e in errors:
            print("■", e, file=sys.stderr)
        return 1
    print("■ すべて緑")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
