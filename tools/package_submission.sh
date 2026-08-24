#!/usr/bin/env bash
# tako:cwd: ..
# tako:run: bash tools/package_submission.sh
#
# package_submission.sh — CODIHA 2026 の提出アーカイブを作り、提出要件を満たすか検査する
#
#   bash tools/package_submission.sh [ベース名] [--smoke [--smoke-port N]]
#
#     ベース名     zip / 7z のベース名 ＝ 展開後のディレクトリ名。既定は ai-de-chiba-map
#     --smoke      展開先で実際に docker compose up して HTTP 200 が返るまで見る（既定は行わない）
#     --smoke-port 起動テストのホスト側ポート。既定 3000。塞がっているときに変える
#
# app/ を一時ディレクトリへクリーンコピーし（node_modules/ .next/ など gitignore 対象は
# 落とす。ただし gitignore 済みでも提出必須の readme.txt だけは入れる）、提出用の
# ベース名へリネームしてから 7z（無ければ zip）で固め、dist/ に置く。
# 固めたあと展開し直して、提出要件を満たすかをアーカイブそのものに対して検査する。
#
# 提出要件の正本: 課題/2026-09-09_CODIHA2026_提出要件.md
# 「提出物に著しい不備がある場合は採点されない」ので、検査に 1 つでも落ちたら
# 誤って提出しないようにアーカイブを消し、非 0 で終了する。
#
# このスクリプトは app/ の外に置く。提出アーカイブに混ざらないようにするため。

set -uo pipefail

BASE_NAME_DEFAULT="ai-de-chiba-map"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$REPO_ROOT/app"
DIST_DIR="$REPO_ROOT/dist"

# compose の操作にはこのスクリプト専用の一意なプロジェクト名を使う。
# compose.yaml は name: ichikawa-opendata-map を固定している（審査員が
# ディレクトリ名に左右されず起動できるようにするため）ので、そのまま
# docker compose を叩くと、同じマシンで誰かが起動中のコンテナを
# 作り直したり落としたりしてしまう。-p で名前を分けて隔離する。
COMPOSE_PROJECT="pkgtest-$$"

BASE_NAME=""
SMOKE=0
SMOKE_PORT=3000

# --- 検査結果の記録 -----------------------------------------------------
NG_COUNT=0
SKIP_COUNT=0
ok()     { printf '[ OK ] %s\n' "$1"; }
ng()     { printf '[ NG ] %s\n' "$1"; NG_COUNT=$((NG_COUNT + 1)); }
skip()   { printf '[SKIP] %s\n' "$1"; SKIP_COUNT=$((SKIP_COUNT + 1)); }
detail() { printf '       %s\n' "$1"; }
die()    { printf 'エラー: %s\n' "$1" >&2; exit 2; }

# --- 引数 ---------------------------------------------------------------
while [ $# -gt 0 ]; do
    case "$1" in
        --smoke)        SMOKE=1; shift ;;
        --smoke-port)   SMOKE=1; SMOKE_PORT="${2:-}"; shift 2 ;;
        --smoke-port=*) SMOKE=1; SMOKE_PORT="${1#--smoke-port=}"; shift ;;
        -h|--help)
            cat <<'USAGE'
bash tools/package_submission.sh [ベース名] [--smoke [--smoke-port N]]

  ベース名       zip / 7z のベース名 ＝ 展開後のディレクトリ名。既定は ai-de-chiba-map
  --smoke        展開先で実際に docker compose up して HTTP 200 が返るまで見る
  --smoke-port N 起動テストのホスト側ポート。既定 3000。塞がっているときに変える
USAGE
            exit 0 ;;
        -*) die "知らないオプションです: $1" ;;
        *)
            [ -z "$BASE_NAME" ] || die "引数が多すぎます: $1"
            BASE_NAME="$1"; shift ;;
    esac
done
[ -n "$BASE_NAME" ] || BASE_NAME="$BASE_NAME_DEFAULT"

case "$SMOKE_PORT" in
    ''|*[!0-9]*) die "--smoke-port には 1〜65535 の数値を指定してください（指定: '$SMOKE_PORT'）" ;;
esac
[ "$SMOKE_PORT" -ge 1 ] && [ "$SMOKE_PORT" -le 65535 ] \
    || die "--smoke-port には 1〜65535 の数値を指定してください（指定: '$SMOKE_PORT'）"

# --- 前提の確認 ---------------------------------------------------------
# ベース名はそのまま展開後のディレクトリ名になる。提出要件でファイル名に
# 日本語が使えないので、ここで弾いておく。
case "$BASE_NAME" in
    ''|.|..)        die "ベース名として使えません（指定: '$BASE_NAME'）" ;;
    *[!A-Za-z0-9._-]*)
        die "ベース名は英数字と . _ - だけにしてください（指定: '$BASE_NAME'）" ;;
esac

[ -d "$SRC_DIR" ] || die "$SRC_DIR がありません"
command -v git >/dev/null 2>&1 || die "git が必要です（除外リストの判定に使います）"
git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1 \
    || die "$REPO_ROOT が git リポジトリではありません"

# --- 作業場所 -----------------------------------------------------------
STAGE_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/codiha-package.XXXXXX")" || die "一時ディレクトリを作れません"

# 起動テストで立てたコンテナは、途中で止められても必ず落とす。
# 落とす相手は -p で分けた専用プロジェクトだけなので、他の人が動かしている
# ichikawa-opendata-map には触らない。
SMOKE_UP=0
SMOKE_OVERRIDE=""
cleanup_smoke() {
    [ "$SMOKE_UP" = "1" ] || return 0
    SMOKE_UP=0
    ( cd "$APP_ROOT" 2>/dev/null \
      && docker compose -p "$COMPOSE_PROJECT" -f compose.yaml -f "$SMOKE_OVERRIDE" \
             down -v --rmi local --remove-orphans ) > /dev/null 2>&1
}
cleanup() { cleanup_smoke; rm -rf "$STAGE_ROOT"; }
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM
STAGE_PARENT="$STAGE_ROOT/stage"
STAGE_DIR="$STAGE_PARENT/$BASE_NAME"
EXTRACT_DIR="$STAGE_ROOT/extract"
mkdir -p "$STAGE_DIR" "$EXTRACT_DIR" || die "一時ディレクトリを作れません"

printf '== 提出アーカイブを作る ==\n'
printf '  元: %s\n' "$SRC_DIR"
printf '  ベース名: %s\n\n' "$BASE_NAME"

# --- 1. app/ をクリーンコピー -------------------------------------------
# git に「追跡中のファイル」＋「未追跡だが gitignore 対象でないファイル」を出させる。
# これだけで node_modules/ .next/ tsconfig.tsbuildinfo public/maplibre/ は自動的に落ちる
# （落ちたものは Docker のビルド中に作り直されるので、提出物には要らない）。
FILE_LIST="$STAGE_ROOT/files.z"
git -C "$REPO_ROOT" ls-files -z --cached --others --exclude-standard -- app > "$FILE_LIST" \
    || die "git ls-files に失敗しました"

# readme.txt は氏名を書くため public リポジトリでは .gitignore 済み。
# だが提出必須なので、ここだけは明示的に足す（追跡済みで重複しても cp が上書きするだけ）。
if [ -f "$SRC_DIR/readme.txt" ]; then
    printf 'app/readme.txt\0' >> "$FILE_LIST"
fi

COPIED=0
while IFS= read -r -d '' rel; do
    case "$rel" in
        app/*) ;;
        *) continue ;;
    esac
    src="$REPO_ROOT/$rel"
    [ -f "$src" ] || continue          # index に残っているだけの削除済みファイルを飛ばす
    dst="$STAGE_DIR/${rel#app/}"
    mkdir -p "$(dirname "$dst")" || die "コピーに失敗しました: $rel"
    cp -p "$src" "$dst" || die "コピーに失敗しました: $rel"
    COPIED=$((COPIED + 1))
done < "$FILE_LIST"

[ "$COPIED" -gt 0 ] || die "コピー対象が 1 件もありません"
printf 'コピー: %d ファイル\n' "$COPIED"

# --- 2. 固める ----------------------------------------------------------
# 7z のほうが圧縮率が高く提出要件でも推奨されているので、あれば優先する。
SEVENZIP=""
for cand in 7zz 7z 7za; do
    if command -v "$cand" >/dev/null 2>&1; then SEVENZIP="$cand"; break; fi
done
if [ -z "$SEVENZIP" ]; then
    # zip で代用する。固めたものを展開し直して検査するので unzip も要る。
    command -v zip   >/dev/null 2>&1 || die "7z も zip も見つかりません（brew install sevenzip など）"
    command -v unzip >/dev/null 2>&1 || die "unzip が見つかりません（固めたあと展開して検査するので必要です）"
fi

mkdir -p "$DIST_DIR" || die "$DIST_DIR を作れません"
BUILD_LOG="$STAGE_ROOT/archive.log"

if [ -n "$SEVENZIP" ]; then
    ARCHIVE_KIND="7z"
    ARCHIVE="$DIST_DIR/$BASE_NAME.7z"
    rm -f "$ARCHIVE"                   # 既存があると追記されるので必ず消す
    ( cd "$STAGE_PARENT" && "$SEVENZIP" a -t7z -mx=9 "$ARCHIVE" "$BASE_NAME" ) > "$BUILD_LOG" 2>&1
    RC=$?
else
    ARCHIVE_KIND="zip"
    ARCHIVE="$DIST_DIR/$BASE_NAME.zip"
    rm -f "$ARCHIVE"
    ( cd "$STAGE_PARENT" && zip -q -r -X "$ARCHIVE" "$BASE_NAME" ) > "$BUILD_LOG" 2>&1
    RC=$?
fi
if [ "$RC" -ne 0 ] || [ ! -f "$ARCHIVE" ]; then
    cat "$BUILD_LOG" >&2
    die "アーカイブの作成に失敗しました"
fi
printf '作成: %s（%s）\n\n' "$ARCHIVE" "$ARCHIVE_KIND"

# --- 3. 展開し直す ------------------------------------------------------
if [ "$ARCHIVE_KIND" = "7z" ]; then
    ( cd "$EXTRACT_DIR" && "$SEVENZIP" x -y "$ARCHIVE" ) > "$STAGE_ROOT/extract.log" 2>&1
    RC=$?
    "$SEVENZIP" l -ba -slt "$ARCHIVE" 2>/dev/null | sed -n 's/^Path = //p' > "$STAGE_ROOT/list.txt"
else
    ( cd "$EXTRACT_DIR" && unzip -q -o "$ARCHIVE" ) > "$STAGE_ROOT/extract.log" 2>&1
    RC=$?
    unzip -Z1 "$ARCHIVE" > "$STAGE_ROOT/list.txt" 2>/dev/null
fi
if [ "$RC" -ne 0 ]; then
    cat "$STAGE_ROOT/extract.log" >&2
    rm -f "$ARCHIVE"
    die "アーカイブを展開できませんでした（$ARCHIVE は削除しました）"
fi

APP_ROOT="$EXTRACT_DIR/$BASE_NAME"
LIST_FILE="$STAGE_ROOT/list.txt"
README_TXT="$APP_ROOT/readme.txt"

# --- 4. 検査 ------------------------------------------------------------
printf '== 提出要件の検査（展開し直したアーカイブに対して）==\n'

# (1) readme.txt があるか
if [ -f "$README_TXT" ]; then
    ok "readme.txt が入っている"
else
    ng "readme.txt が入っていない（提出必須）"
    detail "app/readme.txt を作ってから実行してください。書式は app/README.md"
fi

# (2) readme.txt が UTF-8・BOM なしか
if [ ! -f "$README_TXT" ]; then
    skip "readme.txt が無いので UTF-8 / BOM を確認できない"
else
    BOM="$(od -An -N3 -tx1 < "$README_TXT" 2>/dev/null | tr -d ' \n')"
    if [ "$BOM" = "efbbbf" ]; then
        ng "readme.txt に UTF-8 BOM が付いている（提出要件は BOM なし）"
        detail "消し方: tail -c +4 app/readme.txt > /tmp/r && mv /tmp/r app/readme.txt"
    # 変換結果は /dev/null ではなく一時ファイルへ出す。環境によっては iconv が
    # /dev/null への書き出しで "Inappropriate ioctl for device" を返し、
    # 中身が正しい UTF-8 でも NG になってアーカイブを消してしまうため。
    elif ! iconv -f UTF-8 -t UTF-8 "$README_TXT" > "$STAGE_ROOT/readme-utf8-check" 2>/dev/null; then
        ng "readme.txt が UTF-8 として読めない（Shift_JIS などになっている）"
        detail "UTF-8 に変換し直してください"
    else
        ok "readme.txt が UTF-8（BOM なし）"
    fi
fi

# (3) Dockerfile / compose.yaml があるか
for required in Dockerfile compose.yaml; do
    if [ -f "$APP_ROOT/$required" ]; then
        ok "$required が入っている"
    else
        ng "$required が入っていない（提出必須）"
    fi
done

# (4) 展開すると作業ディレクトリ 1 つになるか（ベース名 = 作業ディレクトリ名）
TOP_COUNT="$(ls -A "$EXTRACT_DIR" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$TOP_COUNT" = "1" ] && [ -d "$APP_ROOT" ]; then
    ok "展開すると作業ディレクトリ $BASE_NAME/ が 1 つだけできる"
else
    ng "展開したときの最上位が $BASE_NAME/ 1 つになっていない（$TOP_COUNT 個）"
    ls -A "$EXTRACT_DIR" 2>/dev/null | while IFS= read -r e; do detail "$e"; done
fi

# 検査 (5)(6) はアーカイブの一覧に対して行う。一覧が取れていないと
# 「何も見つからない ＝ OK」になってしまうので、先に空でないことを確かめる。
if [ ! -s "$LIST_FILE" ]; then
    ng "アーカイブの中身を一覧できない（壊れている可能性がある）"
fi

# 最上位のベース名ディレクトリは検査 (6) の対象から外す
# （ベース名が dist などのとき、それ自体をキャッシュとして誤検知するため）。
INNER_LIST="$STAGE_ROOT/list-inner.txt"
while IFS= read -r line; do
    case "$line" in
        "$BASE_NAME")   continue ;;
        "$BASE_NAME"/*) printf '%s\n' "${line#"$BASE_NAME"/}" ;;
        *)              printf '%s\n' "$line" ;;
    esac
done < "$LIST_FILE" > "$INNER_LIST"

# (5) 日本語（非 ASCII）のファイル名が無いか
BAD_NAMES="$(LC_ALL=C grep '[^ -~]' "$LIST_FILE" 2>/dev/null)"
if [ -z "$BAD_NAMES" ]; then
    ok "日本語（非 ASCII）のファイル名が 1 つも無い"
else
    ng "日本語（非 ASCII）のファイル名が入っている（提出要件で禁止）"
    printf '%s\n' "$BAD_NAMES" | while IFS= read -r e; do detail "$e"; done
fi

# (6) キャッシュ・ビルド生成物が混ざっていないか
CACHE_RE='(^|/)(node_modules|\.next|\.nuxt|\.output|\.svelte-kit|\.turbo|\.parcel-cache|\.cache|__pycache__|\.venv|venv|dist|\.git)(/|$)'
CACHE_RE="$CACHE_RE"'|(^|/)(\.DS_Store|npm-debug\.log|Thumbs\.db)$|\.tsbuildinfo$|\.py[co]$'
JUNK="$(LC_ALL=C grep -E "$CACHE_RE" "$INNER_LIST" 2>/dev/null)"
if [ -z "$JUNK" ]; then
    ok "キャッシュ・ビルド生成物の混入が無い"
else
    ng "キャッシュ・ビルド生成物が混ざっている（提出要件で削除を指示されている）"
    printf '%s\n' "$JUNK" | head -20 | while IFS= read -r e; do detail "$e"; done
fi

# (7) 展開し直した中身が固める前と一致するか
list_tree() {
    ( cd "$1" 2>/dev/null || return 1
      find . -type f | LC_ALL=C sort | while IFS= read -r f; do
          printf '%s\t%s\n' "$(wc -c < "$f" | tr -d ' ')" "$f"
      done )
}
list_tree "$STAGE_DIR"  > "$STAGE_ROOT/tree-before.txt"
list_tree "$APP_ROOT"   > "$STAGE_ROOT/tree-after.txt"
if diff -u "$STAGE_ROOT/tree-before.txt" "$STAGE_ROOT/tree-after.txt" > "$STAGE_ROOT/tree.diff" 2>&1; then
    ok "展開し直した中身が固める前と一致する（$COPIED ファイル）"
else
    ng "展開し直した中身が固める前と一致しない"
    head -20 "$STAGE_ROOT/tree.diff" | while IFS= read -r e; do detail "$e"; done
fi

# (8) 展開先で compose の記述が妥当か
if ! command -v docker >/dev/null 2>&1; then
    skip "docker が無いので compose.yaml の妥当性を確認できない（手元で確認すること）"
elif [ ! -f "$APP_ROOT/compose.yaml" ]; then
    skip "compose.yaml が無いので妥当性を確認できない"
else
    ( cd "$APP_ROOT" && docker compose -p "$COMPOSE_PROJECT" config --quiet ) \
        > "$STAGE_ROOT/compose.log" 2>&1
    RC=$?
    if [ "$RC" -eq 0 ]; then
        ok "展開先で docker compose config が通る"
    else
        ng "展開先で docker compose config が通らない"
        head -10 "$STAGE_ROOT/compose.log" | while IFS= read -r e; do detail "$e"; done
    fi
fi

# (9) 展開先で実際に起動して応答するか（--smoke のときだけ）
# 立てるのは -p で分けた専用プロジェクト（$COMPOSE_PROJECT）。compose.yaml の
# name: ichikawa-opendata-map には触らないので、誰かが起動中でも巻き込まない。
if [ "$SMOKE" != "1" ]; then
    :
elif ! command -v docker >/dev/null 2>&1; then
    skip "docker が無いので起動テストができない"
elif ! command -v curl >/dev/null 2>&1; then
    skip "curl が無いので起動テストの応答を確認できない"
elif [ ! -f "$APP_ROOT/compose.yaml" ]; then
    skip "compose.yaml が無いので起動テストができない"
else
    # 起動テストの相手（サービス名とコンテナ側ポート）を compose.yaml から取る。
    # サービスが複数あるので「先頭のサービス」では選べない
    # （config --services はアルファベット順なので db が先に来る）。
    # **ホストにポートを公開しているサービス**を探して、それを相手にする。
    SMOKE_PAIR="$( ( cd "$APP_ROOT" \
        && docker compose -p "$COMPOSE_PROJECT" config ) 2>/dev/null | awk '
        $0 == "services:"                        { in_svc = 1; next }
        /^[^ ]/                                  { in_svc = 0 }
        in_svc && /^  [^ ][^:]*:[[:space:]]*$/   { svc = $1; sub(/:$/, "", svc); in_ports = 0; next }
        in_svc && /^    ports:[[:space:]]*$/     { in_ports = 1; next }
        in_svc && /^    [^ ]/                    { in_ports = 0 }
        in_ports && /^        target:/           { target = $2 }
        in_ports && /^        published:/        { print svc "\t" target; exit }
    ' )"
    SMOKE_SERVICE="${SMOKE_PAIR%%	*}"
    SMOKE_TARGET="${SMOKE_PAIR##*	}"
    case "$SMOKE_TARGET" in ''|*[!0-9]*) SMOKE_TARGET=3000 ;; esac

    if [ -z "$SMOKE_SERVICE" ]; then
        ng "起動テスト: ホストにポートを公開しているサービスが compose.yaml に無い"
        detail "審査員は localhost からアクセスするので、公開ポートが 1 つは要る"
    else
        # ホスト側のポートだけ差し替える。ports は既定だと追記マージなので !override で置き換える
        SMOKE_OVERRIDE="$STAGE_ROOT/compose.smoke.yaml"
        cat > "$SMOKE_OVERRIDE" <<YAML
services:
  $SMOKE_SERVICE:
    ports: !override
      - "$SMOKE_PORT:$SMOKE_TARGET"
YAML
        printf '       起動テスト中: docker compose -p %s up --build（localhost:%s）\n' \
            "$COMPOSE_PROJECT" "$SMOKE_PORT"
        # up が途中で失敗しても作りかけが残らないよう、叩く前に片付け対象にしておく
        SMOKE_UP=1
        ( cd "$APP_ROOT" && docker compose -p "$COMPOSE_PROJECT" \
            -f compose.yaml -f "$SMOKE_OVERRIDE" up -d --build ) > "$STAGE_ROOT/smoke.log" 2>&1
        RC=$?
        if [ "$RC" -ne 0 ]; then
            ng "起動テスト: docker compose up が失敗した"
            detail "ポートが塞がっているなら --smoke-port で変える"
            tail -8 "$STAGE_ROOT/smoke.log" | while IFS= read -r e; do detail "$e"; done
        else
            CODE=""
            i=0
            while [ "$i" -lt 90 ]; do
                CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$SMOKE_PORT/" 2>/dev/null)"
                [ "$CODE" = "200" ] && break
                i=$((i + 1))
                sleep 1
            done
            if [ "$CODE" = "200" ]; then
                ok "展開先で docker compose up が通り、http://localhost:$SMOKE_PORT/ が HTTP 200 を返す"
            else
                ng "起動テスト: 90 秒待っても HTTP 200 が返らない（最後の応答: ${CODE:-応答なし}）"
                ( cd "$APP_ROOT" && docker compose -p "$COMPOSE_PROJECT" \
                    -f compose.yaml -f "$SMOKE_OVERRIDE" logs --tail 8 ) 2>&1 \
                    | while IFS= read -r e; do detail "$e"; done
            fi
        fi
        cleanup_smoke
    fi
fi

# --- 5. 結果 ------------------------------------------------------------
printf '\n'
if [ "$NG_COUNT" -ne 0 ]; then
    rm -f "$ARCHIVE"
    printf '結果: NG %d 件。誤って提出しないよう %s は削除しました。\n' "$NG_COUNT" "$ARCHIVE" >&2
    printf '上の [ NG ] を直してから、もう一度実行してください。\n' >&2
    exit 1
fi

SIZE_MIB="$(wc -c < "$ARCHIVE" | awk '{ printf "%.1f", $1 / 1048576 }')"
printf '結果: すべて OK（SKIP %d 件）\n' "$SKIP_COUNT"
printf '提出アーカイブ: %s（%s MiB）\n' "$ARCHIVE" "$SIZE_MIB"
printf '\nここから先は手で確認する:\n'
if [ "$SMOKE" = "1" ]; then
    printf '  - このマシンでの起動は上で確認済み。「書いた本人以外の環境」でも動くか\n'
else
    printf '  - 展開して docker compose up が通るか（--smoke を付けると自動で確認する）\n'
    printf '    ＋ それを「書いた本人以外の環境」でも確認する\n'
fi
printf '  - Slack のチーム用プライベートチャンネルへ、先頭行に太字で「資料提出」と書いて\n'
printf '    このアーカイブと説明資料 PDF 2 種を、チーム代表者が投稿したか\n'
exit 0
