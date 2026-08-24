#!/usr/bin/env bash
# secret_scan.sh — git 管理下のテキストファイルに個人情報・秘匿情報が
# 混ざっていないかを検査する。CI（.github/workflows/secret-scan.yml）から呼ばれる。
#
# 手元でも実行できる:
#   bash .github/scripts/secret_scan.sh
set -uo pipefail

PATTERNS="${PATTERNS:-.github/secret-scan-patterns.txt}"
ALLOWLIST="${ALLOWLIST:-.github/secret-scan-allowlist.txt}"

if [ ! -f "$PATTERNS" ]; then
    echo "エラー: $PATTERNS が見つかりません" >&2
    exit 1
fi

TMPDIR_SCAN="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SCAN"' EXIT

# --- 除外リストを path: と value: に振り分ける ---
SKIP_PATHS="$TMPDIR_SCAN/skip_paths.txt"
SKIP_VALUES="$TMPDIR_SCAN/skip_values.txt"
: > "$SKIP_PATHS"
: > "$SKIP_VALUES"
if [ -f "$ALLOWLIST" ]; then
    while IFS= read -r line; do
        case "$line" in
            ''|'#'*)   continue ;;
            path:*)    printf '%s\n' "${line#path:}" >> "$SKIP_PATHS" ;;
            value:*)   printf '%s\n' "${line#value:}" >> "$SKIP_VALUES" ;;
        esac
    done < "$ALLOWLIST"
fi

# --- 検査対象のファイル一覧を作る（テキストファイルのみ）---
FILES=()
while IFS= read -r f; do
    [ -f "$f" ] || continue
    skip=0
    while IFS= read -r allowed; do
        [ -n "$allowed" ] || continue
        case "$f" in "$allowed"*) skip=1; break ;; esac
    done < "$SKIP_PATHS"
    [ "$skip" -eq 1 ] && continue
    # バイナリファイルは検査しない
    grep -Iq . "$f" 2>/dev/null && FILES+=("$f")
done < <(git ls-files)

echo "検査対象: ${#FILES[@]} ファイル"

if [ "${#FILES[@]}" -eq 0 ]; then
    echo "検査対象のファイルがありません。"
    exit 0
fi

FOUND=0
while IFS= read -r pattern; do
    case "$pattern" in ''|'#'*) continue ;; esac

    hits="$(grep -nEH -- "$pattern" "${FILES[@]}" 2>/dev/null || true)"

    # value: 除外に当たる行を落とす
    while IFS= read -r ignore_re; do
        [ -n "$ignore_re" ] || continue
        hits="$(printf '%s' "$hits" | grep -vE -- "$ignore_re" || true)"
    done < "$SKIP_VALUES"

    if [ -n "$hits" ]; then
        FOUND=1
        echo ""
        echo "検知パターン: $pattern"
        # 値そのものを全部ログに出さないよう、先頭 20 件・各行 200 文字までに切る
        printf '%s\n' "$hits" | head -20 | cut -c1-200
    fi
done < "$PATTERNS"

echo ""
if [ "$FOUND" -eq 1 ]; then
    cat <<'MSG'
==========================================================
秘匿情報・個人情報の可能性がある記述を検知しました。

対処:
  1. 検知された箇所を確認する
  2. 個人情報・著作物なら  → private リポジトリへ移す
  3. 認証情報なら          → 環境変数か .env（.gitignore 済み）へ移す
  4. 誤検知なら            → .github/secret-scan-patterns.txt でパターンを絞るか、
                             .github/secret-scan-allowlist.txt に理由つきで追記する

判断ルール: 氏名・学籍番号・著作権物・評価情報が 1 つでも入るなら private。
            公開されて困るか 5 秒迷ったら private。
==========================================================
MSG
    exit 1
fi

echo "検知なし。"
