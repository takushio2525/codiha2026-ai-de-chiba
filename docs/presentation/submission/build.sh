#!/usr/bin/env bash
# CODIHA 2026 提出用・説明資料 2 種を組み直す．
#
#   bash docs/presentation/submission/build.sh
#
# 出力（どちらもこのディレクトリに置く。PDF はリポジトリにコミットする）:
#   01-service-overview.pdf              説明資料① サービスの概要（16:9・5 ページ以内）
#   02-feature-implementation-table.pdf  説明資料② 必要機能の一覧と実装の対応表（A4）
#
# --root にリポジトリのルートを渡しているのは，資料がロゴ（app/src/app/icon.svg）と
# スクリーンショット（docs/manual/img/）を読むため。Typst は既定で
# 「入力ファイルの親ディレクトリ」より上を読めない。
#
# 必要なもの: typst（brew install typst）・python3

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${HERE}/../../.." && pwd)"

# サービスの概要は 5 ページ以内が提出要件（超えたら採点されない可能性がある）
MAX_PAGES_OVERVIEW=5

fail() {
    printf '\033[31m[ NG ]\033[0m %s\n' "$*" >&2
    exit 1
}
ok() { printf '\033[32m[ OK ]\033[0m %s\n' "$*"; }

command -v typst >/dev/null 2>&1 || fail "typst が見つかりません（brew install typst）"

cd "${ROOT}"

# ---- ① 対応表に書いたパスとシンボルが実在するか -------------------------------
python3 "${HERE}/verify_table.py" || fail "対応表の実装先に実在しないものがあります"

# ---- ② 組む -----------------------------------------------------------------
for name in 01-service-overview 02-feature-implementation-table; do
    typst compile --root . "docs/presentation/submission/${name}.typ" \
        || fail "${name}.typ のコンパイルに失敗しました"
    ok "組んだ: docs/presentation/submission/${name}.pdf"
done

# ---- ③ ページ数の上限（提出要件） ---------------------------------------------
pages() { python3 -c "
import re, sys
data = open(sys.argv[1], 'rb').read()
print(max(int(m.group(1)) for m in re.finditer(rb'/Count\s+(\d+)', data)))
" "$1"; }

n=$(pages "${HERE}/01-service-overview.pdf")
if [ "${n}" -gt "${MAX_PAGES_OVERVIEW}" ]; then
    fail "サービスの概要が ${n} ページ（提出要件は ${MAX_PAGES_OVERVIEW} ページ以内）"
fi
ok "サービスの概要は ${n} ページ（上限 ${MAX_PAGES_OVERVIEW}）"
ok "対応表は $(pages "${HERE}/02-feature-implementation-table.pdf") ページ（上限なし）"

# ---- ④ PDF に個人情報が混ざっていないか --------------------------------------
# 秘匿情報スキャン（.github/scripts/secret_scan.sh）はバイナリを検査しないので，
# PDF はここで見る。氏名は readme.txt が担うもので，資料には入れない約束。
for pdf in "${HERE}"/*.pdf; do
    if strings -n 6 "${pdf}" \
        | grep -inE '/Users/|/home/|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' >/dev/null; then
        fail "$(basename "${pdf}") にホームパスかメールアドレスらしき文字列があります"
    fi
    creator=$(strings -n 6 "${pdf}" | grep -oE '/(Creator|Producer|Author)\([^)]*\)' | sort -u | tr '\n' ' ')
    ok "$(basename "${pdf}") の作成者情報: ${creator:-なし}"
done

ok "できあがり: ${HERE}"
