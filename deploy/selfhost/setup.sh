#!/usr/bin/env bash
# tako:cwd: ../..
# tako:run: bash deploy/selfhost/setup.sh
#
# setup.sh — CHIZUBA を自宅の Mac で常時稼働させ、Tailscale Funnel で公開する
#
#   bash deploy/selfhost/setup.sh [オプション]
#
#     --check-only     前提の確認だけして終わる（何も起動しない・何も変更しない）
#     --no-funnel      コンテナの起動までで止める（Funnel は触らない）
#     --no-pull        git pull を飛ばす（手元の変更を試したいとき）
#     --build          コードが変わっていなくてもイメージを作り直す
#     --project NAME   docker compose のプロジェクト名を変える（既定は compose.yaml の name）
#     --port N         公開するホスト側のポート（既定 3000。CHIZUBA_PORT として渡す）
#     --timeout SEC    起動を待つ秒数（既定 300）
#
# 何度実行しても同じ状態になる（冪等）。すでに動いていれば作り直さず、
# Funnel がすでに同じポートを向いていれば触らない。
#
# **このスクリプトはリポジトリを clone した後に、その中から実行する。**
# 最初の 1 回だけは手で clone する（deploy/selfhost/README.md の手順 4）。
#
# 手順の全体・Tailscale 側の準備・運用（停止 / 更新 / ログ）は
# deploy/selfhost/README.md にある。

set -uo pipefail

# --- 表示 ---------------------------------------------------------------
step() { printf '\n==> %s\n' "$1"; }
ok()   { printf '  [ OK ] %s\n' "$1"; }
warn() { printf '  [警告] %s\n' "$1"; }
info() { printf '         %s\n' "$1"; }
die()  {
    printf '\n  [ NG ] %s\n' "$1" >&2
    shift
    for line in "$@"; do printf '         %s\n' "$line" >&2; done
    printf '\n中断しました。上の [ NG ] を解消してからもう一度実行してください。\n' >&2
    exit 1
}

# --- 場所 ---------------------------------------------------------------
SELFHOST_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SELFHOST_DIR/../.." && pwd)"
APP_DIR="$REPO_ROOT/app"
OVERLAY="$SELFHOST_DIR/compose.prod.yaml"

# --- 引数 ---------------------------------------------------------------
CHECK_ONLY=0
DO_FUNNEL=1
DO_PULL=1
FORCE_BUILD=0
PROJECT=""
PORT=3000
TIMEOUT=300

while [ $# -gt 0 ]; do
    case "$1" in
        --check-only) CHECK_ONLY=1; shift ;;
        --no-funnel)  DO_FUNNEL=0; shift ;;
        --no-pull)    DO_PULL=0; shift ;;
        --build)      FORCE_BUILD=1; shift ;;
        # 値を取るオプションは、値が無いまま shift 2 すると shift が失敗して
        # 引数が減らず、そのまま無限ループになる。先に個数を確かめる
        --project)    [ $# -ge 2 ] || die "--project には名前を続けてください"; PROJECT="$2"; shift 2 ;;
        --project=*)  PROJECT="${1#--project=}"; shift ;;
        --port)       [ $# -ge 2 ] || die "--port には番号を続けてください"; PORT="$2"; shift 2 ;;
        --port=*)     PORT="${1#--port=}"; shift ;;
        --timeout)    [ $# -ge 2 ] || die "--timeout には秒数を続けてください"; TIMEOUT="$2"; shift 2 ;;
        --timeout=*)  TIMEOUT="${1#--timeout=}"; shift ;;
        # 先頭のコメント（4 行目から最初の非コメント行の手前まで）をそのまま使い方にする
        -h|--help)    awk 'NR>=4 && /^#/ {sub(/^# ?/, ""); print; next} NR>=4 {exit}' "$0"; exit 0 ;;
        *)            die "知らないオプションです: $1" "使い方は bash $0 --help" ;;
    esac
done

case "$PORT" in ''|*[!0-9]*) die "--port には数値を指定してください（指定: '$PORT'）" ;; esac
case "$TIMEOUT" in ''|*[!0-9]*) die "--timeout には数値を指定してください（指定: '$TIMEOUT'）" ;; esac

# 公開ポートは compose.yaml / compose.prod.yaml の `${CHIZUBA_PORT:-3000}` が読む。
# **一時ファイルのオーバーレイは作らない。** compose はコンテナに設定ファイルの
# 一覧をラベルとして焼き込むので、余分な -f を足すと「設定が変わった」と
# 見なされて実行のたびに web を作り直していた（実測で確認）。
export CHIZUBA_PORT="$PORT"

# compose の呼び出し方。**`docker compose`（プラグイン）とは限らない。**
# Homebrew の docker-compose は ~/.docker/config.json に cliPluginsExtraDirs を
# 書かないとプラグインとして見えず、`docker compose` が「そんなコマンドは無い」に
# なる（公式 formula の caveats）。単体コマンドとしては使えるので、
# 前提の確認（手順 1）で使えるほうを選んでここに入れる。
COMPOSE_BIN=(docker compose)

compose() {
    local args=(-f "$APP_DIR/compose.yaml" -f "$OVERLAY")
    [ -n "$PROJECT" ] && args=(-p "$PROJECT" "${args[@]}")
    "${COMPOSE_BIN[@]}" "${args[@]}" "$@"
}

# =========================================================================
step "1. 前提を確認する"
# =========================================================================

[ -f "$APP_DIR/compose.yaml" ] || die \
    "app/compose.yaml が見つかりません（探した場所: ${APP_DIR}）" \
    "このスクリプトは clone したリポジトリの中から実行してください。" \
    "  git clone <リポジトリの URL> && cd <リポジトリ名>" \
    "  bash deploy/selfhost/setup.sh"
[ -f "$OVERLAY" ] || die "deploy/selfhost/compose.prod.yaml が見つかりません（${OVERLAY}）"
ok "リポジトリの場所: $REPO_ROOT"

command -v git >/dev/null 2>&1 \
    || die "git が見つかりません" "Xcode Command Line Tools を入れてください: xcode-select --install"
ok "git: $(git --version)"

# **Docker Desktop でも colima でも動く。** 違うのは案内の文面だけで、
# 以降の docker / compose の使い方は同じ。SSH だけで完結させたい人（画面の無い
# Mac・リモートログインだけ）は colima を選ぶことになるので、そちらも通す。
# **SSH で入ると PATH が細い。** macOS の非対話 SSH の PATH は
# /usr/bin:/bin:/usr/sbin:/sbin だけのことがあり、**Docker Desktop（/usr/local/bin）も
# Homebrew（/opt/homebrew/bin）も入っていない**。tailscale と同じく実在するパスを
# 直接見に行き、見つけたら**その置き場を PATH の先頭に足す**
# （以降の docker / docker compose の呼び出しがそのまま通るようにするため）。
if ! command -v docker >/dev/null 2>&1; then
    for candidate in \
        /usr/local/bin/docker \
        /opt/homebrew/bin/docker \
        "$HOME/.docker/bin/docker"
    do
        if [ -x "$candidate" ]; then
            PATH="$(dirname "$candidate"):$PATH"
            export PATH
            info "docker を PATH の外で見つけました（${candidate}）。この実行の間だけ PATH に足します"
            break
        fi
    done
fi

command -v docker >/dev/null 2>&1 || die \
    "docker コマンドが見つかりません" \
    "画面のある Mac なら Docker Desktop:" \
    "  https://www.docker.com/products/docker-desktop/" \
    "SSH だけで済ませたいなら colima:" \
    "  brew install colima docker docker-compose && colima start" \
    "変わった場所に入れているなら PATH を通してから実行してください。" \
    "詳しい手順は deploy/selfhost/README.md の「手順 1」を見てください。"
ok "docker: $(docker --version)"

if ! docker info >/dev/null 2>&1; then
    DOCKER_HINTS=()
    command -v colima >/dev/null 2>&1 \
        && DOCKER_HINTS+=("colima を使っているなら起動する:" "  colima start")
    [ -d /Applications/Docker.app ] \
        && DOCKER_HINTS+=("Docker Desktop を使っているなら起動して、クジラが Running になるのを待つ:" "  open -a Docker")
    # どちらも見当たらないとき（PATH だけ通っている等）は両方を出す
    [ ${#DOCKER_HINTS[@]} -eq 0 ] \
        && DOCKER_HINTS+=("Docker Desktop なら:  open -a Docker" "colima なら:          colima start")
    die "Docker は入っていますが動いていません" "${DOCKER_HINTS[@]}"
fi
ok "Docker デーモンが動いている"

# compose は「プラグイン」と「単体コマンド」の 2 通りある。使えるほうを選ぶ。
# **v1（Python 版）は使えない。** compose.prod.yaml が `!override` を使っており、
# これは Compose Spec の機能なので v2 以降でないと読めない。
if docker compose version >/dev/null 2>&1; then
    COMPOSE_BIN=(docker compose)
elif command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
    COMPOSE_BIN=(docker-compose)
else
    die "docker compose（v2）が使えません" \
        "Docker Desktop なら、新しくしてください。" \
        "Homebrew で入れたなら、プラグインとして見えていない可能性があります:" \
        "  brew install docker-compose" \
        "  ~/.docker/config.json に cliPluginsExtraDirs を足す（公式 formula の案内）:" \
        "    { \"cliPluginsExtraDirs\": [\"$(brew --prefix 2>/dev/null || echo /opt/homebrew)/lib/docker/cli-plugins\"] }"
fi

COMPOSE_VERSION="$("${COMPOSE_BIN[@]}" version --short 2>/dev/null)"
case "$COMPOSE_VERSION" in
    1.*) die "compose が v1 です（検出: ${COMPOSE_VERSION}）" \
             "v2 以降が要ります（compose.prod.yaml の \`!override\` は v2 の機能）。" \
             "  brew install docker-compose" ;;
esac
ok "compose: ${COMPOSE_BIN[*]} ${COMPOSE_VERSION:-（版番号を取得できず）}"

# --- Tailscale ---
# JSON から値を取り出すのに jq は使わない（旧 Mac に入っていない前提）。
# `tailscale status --json` は**空白入りで整形された JSON** を返すので、
# grep する前に空白と改行を落としてから当てる（`"Key": "値"` と `"Key":"値"` の差で
# 一度取りこぼした）。値に空白が入るキーは使っていないので、これで安全。
json_value() { printf '%s' "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | sed 's/.*:"//; s/"$//'; }

TAILSCALE=""
TS_JSON=""
TAILSCALE_CANDIDATES=()
if [ "$DO_FUNNEL" -eq 1 ]; then
    if [ -n "${TAILSCALE_BIN:-}" ]; then
        # 変わった場所に入れている人向けの逃げ道
        command -v "$TAILSCALE_BIN" >/dev/null 2>&1 \
            || die "環境変数 TAILSCALE_BIN が指す場所に実行できるものがありません: $TAILSCALE_BIN"
        TAILSCALE="$TAILSCALE_BIN"
    else
        # PATH → Homebrew（Apple シリコン / Intel）→ standalone 版のランチャ →
        # App Store 版の本体、の順で探す。
        #
        # **SSH で入ると PATH に Homebrew が入っていないことがある**ので、
        # 実在するパスを直接並べておく。Homebrew の既定の置き場は
        # Apple シリコンが /opt/homebrew、Intel が /usr/local（公式ドキュメント）で、
        # tailscale formula は bin/tailscale と bin/tailscaled を入れる。
        # /usr/local/bin/tailscale は standalone 版のランチャと同じ場所でもある。
        # **見つかった候補を全部集める。** 1 つ目で打ち切らないのは、GUI アプリと
        # Homebrew 版の CLI が同居していると**版が食い違う**ことがあるため
        # （実測: brew 1.98.8 の CLI に対しアプリ本体の tailscaled が 1.102.3）。
        # どれがデーモンと一致するかは、このあと status --json を読んでから決める。
        for candidate in \
            tailscale \
            /opt/homebrew/bin/tailscale \
            /usr/local/bin/tailscale \
            /Applications/Tailscale.app/Contents/MacOS/Tailscale
        do
            if command -v "$candidate" >/dev/null 2>&1; then
                TAILSCALE_CANDIDATES+=("$candidate")
                [ -n "$TAILSCALE" ] || TAILSCALE="$candidate"
            fi
        done
    fi
    [ -n "$TAILSCALE" ] || die \
        "tailscale コマンドが見つかりません" \
        "SSH だけで済ませたいなら Homebrew 版を入れてください:" \
        "  brew install tailscale && sudo brew services start tailscale" \
        "App Store 版を使っている場合、CLI は次の場所にあります:" \
        "  /Applications/Tailscale.app/Contents/MacOS/Tailscale" \
        "PATH に通す方法は deploy/selfhost/README.md の手順 2 を見てください。" \
        "別の場所に入れているなら TAILSCALE_BIN=<パス> を付けて実行してください。" \
        "Funnel を使わずコンテナだけ起動するなら --no-funnel を付けてください。"
    ok "tailscale: $("$TAILSCALE" version 2>/dev/null | head -1)"

    TS_JSON="$("$TAILSCALE" status --json 2>/dev/null | tr -d ' \n')"
    # CLI があっても**デーモン（tailscaled）が動いていなければ何も返らない**。
    # GUI 版はアプリ自体がデーモンを抱えているが、Homebrew 版は別に起こす必要がある
    [ -n "$TS_JSON" ] || die \
        "tailscale と話せません（status --json が何も返しません）" \
        "Homebrew 版なら、tailscaled を起こしてください:" \
        "  sudo brew services start tailscale" \
        "GUI 版（App Store / standalone）なら、アプリが起動しているか確かめてください:" \
        "  open -a Tailscale"

    # **デーモンと版が一致する CLI に乗り換える。**
    # `status --json` の top-level `Version` は**デーモン側**の版で、どの CLI から
    # 読んでも同じ値が返る（実測）。食い違ったまま使うと Funnel の挙動が変わることが
    # あるので、候補のうち版が前方一致するものを採る。
    TS_DAEMON_VERSION="$(json_value "$TS_JSON" Version)"
    if [ -n "$TS_DAEMON_VERSION" ]; then
        # **空配列を素で展開しない。** macOS 標準の bash 3.2 は `set -u` のもとで
        # `"${ARR[@]}"` が空だと unbound variable で落ちる（実測）。
        # TAILSCALE_BIN を明示された経路では候補を集めていないのでここは空になる。
        for candidate in ${TAILSCALE_CANDIDATES[@]+"${TAILSCALE_CANDIDATES[@]}"}; do
            candidate_version="$("$candidate" version 2>/dev/null | head -1)"
            [ -n "$candidate_version" ] || continue
            case "$TS_DAEMON_VERSION" in
                "$candidate_version"*)
                    if [ "$candidate" != "$TAILSCALE" ]; then
                        info "tailscaled（${TS_DAEMON_VERSION}）と版が合う CLI に切り替えます: $candidate"
                        TAILSCALE="$candidate"
                    fi
                    break
                    ;;
            esac
        done

        # 乗り換えても合わなかったとき（候補が 1 つしか無い / TAILSCALE_BIN 指定）も
        # 黙って進めない。**止めるほどではない**ので警告に留める
        TS_CLI_VERSION="$("$TAILSCALE" version 2>/dev/null | head -1)"
        case "$TS_DAEMON_VERSION" in
            "$TS_CLI_VERSION"*) ;;
            *) warn "tailscale の CLI（${TS_CLI_VERSION}）と tailscaled（${TS_DAEMON_VERSION}）で版が違います"
               info "動きますが、食い違いが大きいと Funnel の挙動が変わることがあります"
               info "アプリ同梱の CLI を使うのが確実です（deploy/selfhost/README.md の手順 2）" ;;
        esac
    fi

    STATE="$(json_value "$TS_JSON" BackendState)"
    case "$STATE" in
        Running) ok "Tailscale にログイン済み（BackendState=Running）" ;;
        NeedsLogin|NoState|Starting|"") die \
            "Tailscale にログインしていません（BackendState=${STATE:-不明}）" \
            "次を実行してください。画面が無くても構いません" \
            "（端末に出る URL を手元のブラウザで開けば認証できます）:" \
            "  $TAILSCALE up" ;;
        Stopped) die "Tailscale が停止しています" "メニューバーの Tailscale から接続するか、$TAILSCALE up を実行してください。" ;;
        *) warn "Tailscale の状態が想定外です（BackendState=${STATE}）。このまま進めます" ;;
    esac
else
    info "--no-funnel が指定されたので Tailscale の確認は飛ばします"
fi

# --- 公開ホスト名を調べる ---
# CertDomains は tailnet で HTTPS 証明書が有効なときに入る。Funnel の前提でもあるので、
# ここが空なら「管理コンソールでの有効化がまだ」という手がかりになる。
PUBLIC_HOST=""
if [ -n "$TS_JSON" ]; then
    PUBLIC_HOST="$(printf '%s' "$TS_JSON" | grep -o '"CertDomains":\[[^]]*\]' \
        | grep -o '"[^"]*"' | tail -n +2 | head -1 | tr -d '"')"
    if [ -z "$PUBLIC_HOST" ]; then
        # 末尾の . を落とす（DNSName は "machine.tailnet.ts.net." の形）
        PUBLIC_HOST="$(json_value "$TS_JSON" DNSName | sed 's/\.$//')"
        [ -n "$PUBLIC_HOST" ] && warn "tailnet の HTTPS 証明書がまだ有効でないかもしれません（CertDomains が空）"
    fi
    if [ -n "$PUBLIC_HOST" ]; then
        ok "公開ホスト名: $PUBLIC_HOST"
    else
        warn "公開ホスト名を判定できませんでした。Funnel の実行後に表示される URL を使ってください"
    fi
fi

# --- 公開するなら行政ロールに PIN を掛ける ---
# デモログインは「一般 / 行政」を自己申告で選べる（docs/design/requirements.md 8-3）。
# 手元で動かすぶんには正しい建付けだが、**Funnel で公開すると通りすがりの誰でも
# 行政ユーザーになり、投稿の対応状況を書き換えられる**。
# app/.env に GOV_DEMO_PIN を 1 行足すと、行政を選ぶときだけ PIN を求めるようになる。
# 止めるほどではない（発表直前に弾かれると困る）ので警告に留める。
if [ "$DO_FUNNEL" -eq 1 ]; then
    if grep -qE '^[[:space:]]*GOV_DEMO_PIN=[^[:space:]]' "$APP_DIR/.env" 2>/dev/null; then
        ok "行政ロールに PIN が掛かっている（GOV_DEMO_PIN）"
    else
        warn "行政ロールに PIN が掛かっていません。公開すると誰でも行政ユーザーになれます"
        info "app/.env に 1 行足してください（値は自分で決める。6 桁程度の数字を推奨）:"
        info "  echo 'GOV_DEMO_PIN=<6 桁の数字>' >> $APP_DIR/.env"
        info "足したあとは、この設定を読み込ませるために起動し直す必要があります"
        info "詳しくは deploy/selfhost/README.md の「行政ロールに PIN を掛ける」"
    fi
fi

# --- ポートの空き ---
# 「動いているか」ではなく「**このポートを握っているのが自分か**」を見る。
# 同じ Mac で別の compose プロジェクトが動いていることがあるので、
# 起動中かどうかだけで判定すると他人が握ったポートを自分のものと誤認する。
port_is_ours() {
    local id ports
    id="$(compose ps -q web 2>/dev/null | head -1)"
    [ -n "$id" ] || return 1
    ports="$(docker inspect -f '{{range $p, $c := .NetworkSettings.Ports}}{{range $c}}{{.HostPort}} {{end}}{{end}}' "$id" 2>/dev/null)"
    printf '%s' " $ports " | grep -q " $PORT "
}

if command -v lsof >/dev/null 2>&1; then
    HOLDER="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1" (PID "$2")"}')"
    if [ -z "$HOLDER" ]; then
        ok "ポート $PORT は空いている"
    elif port_is_ours; then
        ok "ポート $PORT はこのスタックの web が使用中（起動済み）"
    else
        warn "ポート $PORT を別のプロセスが使っています: $HOLDER"
        info "そのプロセスを止めるか、--port で別のポートを指定してください"
        info "このまま進めると docker compose の起動に失敗します"
    fi
fi

# --- スリープ設定（公開したまま Mac が寝ると外から見えなくなる）---
# **`sleep 0` だけでは足りない。** これはアイドルスリープを止めるだけで、
# 画面スリープをきっかけに**ダークウェイク**へ入ると tailscaled ごと外から
# 見えなくなる（実測: `sleep 0` の Mac が画面スリープの直後に 8 分間 offline に
# なった。`pmset -g log` に powerd の darkwakelinger が出ていた）。
# 常時公開するなら `disablesleep 1` まで要る。
if command -v pmset >/dev/null 2>&1; then
    PM="$(pmset -g 2>/dev/null)"
    SLEEP_MIN="$(printf '%s\n' "$PM" | awk '$1=="sleep" {print $2; exit}')"
    DISABLE_SLEEP="$(printf '%s\n' "$PM" | awk '$1=="disablesleep" {print $2; exit}')"

    if [ -n "$SLEEP_MIN" ] && [ "$SLEEP_MIN" != "0" ]; then
        warn "この Mac は $SLEEP_MIN 分でスリープします。寝ると外から見えなくなります"
        info "常時公開するなら次を実行してください（sudo のパスワードが要ります）:"
        info "  sudo pmset -a sleep 0 disablesleep 1 displaysleep 0"
        info "詳しくは deploy/selfhost/README.md の「スリープさせない」"
    elif [ "${DISABLE_SLEEP:-0}" != "1" ]; then
        # ここが以前は「スリープしない設定になっている」と出ていた。実際には
        # ダークウェイクへ落ちて公開が止まるので、OK ではなく警告にする
        warn "アイドルスリープは止まっていますが、ダークウェイクで外から見えなくなることがあります"
        info "画面スリープをきっかけに落ちると tailscaled ごと圏外になります（実測）"
        info "常時公開するなら次を実行してください（sudo のパスワードが要ります）:"
        info "  sudo pmset -a sleep 0 disablesleep 1 displaysleep 0"
    else
        ok "スリープしない設定になっている（sleep=0・disablesleep=1）"
    fi
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
    printf '\n前提の確認だけ行いました（--check-only）。\n'
    exit 0
fi

if [ "$PORT" != "3000" ]; then
    ok "公開ポートを $PORT にする（CHIZUBA_PORT=$PORT を compose に渡す）"
fi

# =========================================================================
step "2. リポジトリを最新にする"
# =========================================================================

HEAD_BEFORE="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || true)"

if [ "$DO_PULL" -eq 0 ]; then
    info "--no-pull が指定されたので飛ばします"
elif ! git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    # -d "$REPO_ROOT/.git" では判定できない。git worktree だと .git は
    # ディレクトリではなくファイル（gitdir: … の 1 行）になる
    warn "git リポジトリではないので飛ばします"
elif [ -n "$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null)" ]; then
    warn "手元に変更があるので git pull を飛ばします（そのままのコードで起動します）"
    info "最新にするなら、変更を退避してから実行し直してください: git -C $REPO_ROOT stash"
elif git -C "$REPO_ROOT" pull --ff-only 2>&1 | sed 's/^/         /'; then
    ok "最新にしました（$(git -C "$REPO_ROOT" log --oneline -1)）"
else
    warn "git pull に失敗しました。いまのコードのまま起動します"
fi

# =========================================================================
step "3. 公開 URL の設定を確かめる"
# =========================================================================

# **ここでは何も書き込まない。** ログインのリダイレクト先は、リクエストの
# `X-Forwarded-Host` →（無ければ）`Host` から毎回導く（app/src/lib/publicOrigin.ts）。
# Tailscale Funnel は公開ホスト名を `X-Forwarded-Host` に、TLS 終端を
# `X-Forwarded-Proto: https` に入れてくれるので、設定は要らない。
#
# 見るのは 1 点だけ。**`AUTH_URL` が書いてあると Auth.js はそちらを優先する**ので、
# 古い値が残っていると Funnel の URL で開いてもそこへ飛ばされてしまう。
if ! grep -qE '^[[:space:]]*AUTH_URL=[^[:space:]]' "$APP_DIR/.env" 2>/dev/null; then
    ok "AUTH_URL は未設定（公開 URL はリクエストから自動で決まる）"
else
    CURRENT="$(grep -E '^[[:space:]]*AUTH_URL=' "$APP_DIR/.env" | head -1 | sed 's/^[^=]*=//')"
    if [ -n "$PUBLIC_HOST" ] && [ "$CURRENT" = "https://$PUBLIC_HOST" ]; then
        ok "AUTH_URL は公開 URL と一致しています"
    else
        warn "app/.env に AUTH_URL=$CURRENT が書かれています（自動判定より優先されます）"
        if [ -n "$PUBLIC_HOST" ]; then
            info "Funnel の URL は https://$PUBLIC_HOST です。食い違うとログインが壊れます"
        fi
        info "特に理由が無ければ app/.env の AUTH_URL の行を消してください"
    fi
fi

# =========================================================================
step "4. コンテナを起動する"
# =========================================================================

# **--build は必要なときだけ付ける。**
# compose は --build を付けると、設定もイメージも変わっていなくても
# web コンテナを毎回作り直す（実測で確認）。作り直すと数十秒使えなくなるので、
# 「何度実行しても同じ状態」にするために、次のどれかのときだけ付ける。
#
#   - まだコンテナが無い（初回）
#   - git pull でコードが変わった
#   - --build を明示された（手元でファイルを直したときなど）
#
# なお、イメージがそもそも無いときは --build を付けなくても compose が作る。
HEAD_AFTER="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || true)"
BUILD_ARGS=""
if [ "$FORCE_BUILD" -eq 1 ]; then
    BUILD_ARGS="--build"; info "--build が指定されたのでイメージを作り直します"
elif [ -z "$(compose ps -q web 2>/dev/null)" ]; then
    BUILD_ARGS="--build"; info "初回なのでイメージを作ります。数分〜十数分かかります（旧 Mac ではもっと）"
elif [ -n "$HEAD_BEFORE" ] && [ "$HEAD_BEFORE" != "$HEAD_AFTER" ]; then
    BUILD_ARGS="--build"; info "コードが更新されたのでイメージを作り直します"
else
    info "コードは変わっていないのでイメージはそのまま使います（作り直すなら --build）"
fi

# shellcheck disable=SC2086 -- BUILD_ARGS は空か --build のどちらか
if ! compose up -d $BUILD_ARGS 2>&1 | sed 's/^/         /'; then
    die "docker compose の起動に失敗しました" \
        "上のログを確認してください。よくある原因:" \
        "  - ディスクの空きが足りない（docker system prune で古いイメージを消す）" \
        "  - ネットワークに繋がらない（イメージの取得と npm install に必要）"
fi
ok "コンテナを起動した"

# =========================================================================
step "5. 起動が終わるまで待つ"
# =========================================================================

WEB_ID="$(compose ps -q web 2>/dev/null | head -1)"
[ -n "$WEB_ID" ] || die "web コンテナが見つかりません" "compose のログを確認してください: $0 のあと ${COMPOSE_BIN[*]} logs web"

WAITED=0
HEALTH=""
while [ "$WAITED" -lt "$TIMEOUT" ]; do
    HEALTH="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}健康診断なし{{end}}' "$WEB_ID" 2>/dev/null)"
    [ "$HEALTH" = "healthy" ] && break
    if [ "$(docker inspect -f '{{.State.Status}}' "$WEB_ID" 2>/dev/null)" = "exited" ]; then
        printf '\n'
        compose logs --tail 30 web 2>&1 | sed 's/^/         /'
        die "web コンテナが落ちました" "上のログを確認してください"
    fi
    sleep 5
    WAITED=$((WAITED + 5))
    printf '         待機中… %s 秒（状態: %s）\r' "$WAITED" "$HEALTH"
done
printf '\n'

[ "$HEALTH" = "healthy" ] || die \
    "$TIMEOUT 秒待っても起動が終わりませんでした（状態: ${HEALTH}）" \
    "ログを見てください: ${COMPOSE_BIN[*]} -f $APP_DIR/compose.yaml -f $OVERLAY logs web"
ok "web コンテナが healthy になった"

CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "http://127.0.0.1:$PORT/" 2>/dev/null)"
[ "$CODE" = "200" ] || die "http://127.0.0.1:$PORT/ が $CODE を返しました（200 を期待）"
ok "http://127.0.0.1:$PORT/ が 200 を返した"

# =========================================================================
step "6. Tailscale Funnel で公開する"
# =========================================================================

if [ "$DO_FUNNEL" -eq 0 ]; then
    info "--no-funnel が指定されたので飛ばします"
    printf '\n手元からは http://127.0.0.1:%s で見られます。\n' "$PORT"
    exit 0
fi

if "$TAILSCALE" funnel status 2>/dev/null | grep -q "127.0.0.1:$PORT\|localhost:$PORT"; then
    ok "Funnel はすでにポート $PORT を公開しています（何もしません）"
else
    info "tailscale funnel --bg --yes $PORT を実行します"
    FUNNEL_LOG="$(mktemp)"
    if "$TAILSCALE" funnel --bg --yes "$PORT" >"$FUNNEL_LOG" 2>&1; then
        sed 's/^/         /' "$FUNNEL_LOG"
        ok "Funnel を有効にした"
    else
        sed 's/^/         /' "$FUNNEL_LOG" >&2
        rm -f "$FUNNEL_LOG"
        die "Funnel の設定に失敗しました" \
            "上のメッセージに管理コンソールのリンクが出ていれば、それを開いて許可してください。" \
            "tailnet 側で次の 2 つが要ります（deploy/selfhost/README.md の手順 3）:" \
            "  - HTTPS 証明書の有効化   https://login.tailscale.com/admin/dns" \
            "  - ポリシーファイルへの funnel 属性の追加   https://login.tailscale.com/admin/acls"
    fi
    rm -f "$FUNNEL_LOG"
fi

URL="$("$TAILSCALE" funnel status 2>/dev/null | grep -o 'https://[A-Za-z0-9._-]*' | head -1)"
[ -n "$URL" ] || URL="https://${PUBLIC_HOST:-<マシン名>.<tailnet 名>.ts.net}"

# =========================================================================
printf '\n==> 完了\n\n'
printf '  公開 URL: %s\n' "$URL"
printf '  手元から: http://127.0.0.1:%s\n\n' "$PORT"
printf '  次にやること:\n'
printf '    1. 別のネットワーク（スマホの回線など）から公開 URL を開いて確かめる\n'
printf '    2. プレゼン用の QR を作る:\n'
printf '       python3 %s/make_qr.py "%s" -o chizuba-qr.png\n' "$SELFHOST_DIR" "$URL"
printf '    3. 止め方・更新の仕方は deploy/selfhost/README.md の「運用」を見る\n\n'
