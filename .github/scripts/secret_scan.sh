#!/usr/bin/env bash
# secret_scan.sh — git 管理下のテキストファイルに個人情報・秘匿情報が
# 混ざっていないかを検査する。CI（.github/workflows/secret-scan.yml）から呼ばれる。
#
# 手元でも実行できる:
#   bash .github/scripts/secret_scan.sh
#
# ===== バイナリは検査しない（意図的）=====
#
# パターンは拡張正規表現なので、**バイナリを走査すると必ず誤検知する**。
# 圧縮されたバイトの並びが、学籍番号やトークンの形に偶然一致するため。
#
#   実測（2026-08-27）: docs/presentation/chizuba-tech-explainer.pdf を
#   コミットしたところ CI が落ちた。PDF のしおり（目次）の見出しは
#   UTF-16 を 16 進の文字列にして埋め込む決まりで、その桁の並びが
#   学籍番号のパターン（数字 2 桁 + 英大文字 + 数字 4 桁）に偶然一致していた。
#   16 進表記は 0-9 と A-F しか使わないので、この形の一致は避けられない。
#   （実例をここに書くと、このスクリプト自身が検知されてしまうので書かない）
#
# **バイナリの中身は、このスクリプトではなく目視で確かめる。**
# PDF・画像をコミットする前に、次の 2 つを実行する（PDF は作成者情報に
# ユーザー名が入りやすい。実測で確かめた手順）:
#
#   # ① 氏名・ホームパス・メールアドレス。**何も出なければよい**
#   strings -n 6 <ファイル> \
#     | grep -inE '<自分の姓>|/Users/|/home/|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
#
#   # ② 作成者情報。**道具の名前だけが出ること**（人名が出たら消す）
#   strings -n 6 <ファイル> | grep -oE '/(Creator|Producer|Author)\([^)]*\)'
#
# 学籍番号のパターンは PDF に対しては当てにならない（上のとおり 16 進表記に
# 偶然一致する）。**中身の文言は、PDF ではなく元原稿のテキストで見る。**
# 原稿（.typ / .md）はこのスクリプトが普通に検査するので、そちらで担保される。
#
# 判断ルールは docs/before_coding.md の線引き表に従う。
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

# --- バイナリかどうかを判定する ---
#
# **grep -I に任せない。** grep の -I は「先頭の一定量にヌルバイトがあるか」しか
# 見ないので、頭が ASCII で本体が後ろにあるファイルをテキストと誤認する。
# 実測では PDF の最初のヌルバイトが 356,831 バイト目にあり、テキスト扱いされた。
#
# 3 段で見る。①②で落ちなかったものだけ ③ に進む（③ は全体を読むので重い）。
BINARY_EXTENSIONS="pdf png jpg jpeg gif webp ico zip 7z gz tgz bz2 xz \
mp3 mp4 mov wav woff woff2 ttf otf eot bin elf hex xls xlsx doc docx ppt pptx"

is_binary() {
    f="$1"

    # ① .gitattributes の宣言（このリポジトリの正本。例: *.pdf binary）
    case "$(git check-attr binary -- "$f" 2>/dev/null)" in
        *': set') return 0 ;;
    esac

    # ② 拡張子（.gitattributes に書き漏れたとき用）
    ext="${f##*.}"
    if [ "$ext" != "$f" ]; then
        ext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
        case " $BINARY_EXTENSIONS " in
            *" $ext "*) return 0 ;;
        esac
    fi

    # ③ ファイル**全体**にヌルバイトがあるか（拡張子が無い・未知の形式のとき用）
    size="$(wc -c < "$f" | tr -d '[:space:]')"
    stripped="$(LC_ALL=C tr -d '\000' < "$f" | wc -c | tr -d '[:space:]')"
    [ "$size" != "$stripped" ] && return 0

    return 1
}

# --- 検査対象のファイル一覧を作る（テキストファイルのみ）---
FILES=()
BINARIES=()
while IFS= read -r f; do
    [ -f "$f" ] || continue
    skip=0
    while IFS= read -r allowed; do
        [ -n "$allowed" ] || continue
        case "$f" in "$allowed"*) skip=1; break ;; esac
    done < "$SKIP_PATHS"
    [ "$skip" -eq 1 ] && continue
    if is_binary "$f"; then
        BINARIES+=("$f")
        continue
    fi
    FILES+=("$f")
done < <(git ls-files)

echo "検査対象: ${#FILES[@]} ファイル"

# 除外したものは**黙って落とさず必ず出す**。
# 「スキャンが緑 = 全部見た」と読み違えられるのを防ぐため。
if [ "${#BINARIES[@]}" -gt 0 ]; then
    echo "バイナリのため除外: ${#BINARIES[@]} ファイル（中身は目視で確かめる。手順はこのスクリプトの頭）"
    printf '  - %s\n' "${BINARIES[@]}" | head -10
    [ "${#BINARIES[@]}" -gt 10 ] && echo "  …ほか $(( ${#BINARIES[@]} - 10 )) ファイル"
fi

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
