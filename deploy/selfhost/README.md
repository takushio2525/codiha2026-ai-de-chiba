# CHIZUBA を自宅の Mac で公開する（Tailscale Funnel）

自宅に置いた Mac で CHIZUBA を動かし、**Tailscale Funnel** でインターネットに公開する手順。
公開後の URL は `https://<マシン名>.<tailnet 名>.ts.net` の形になり、
**見る人に Tailscale は要らない**（普通のウェブサイトとして開ける）。
プレゼン（2026-09-16）でリンクと QR コードから見せることを想定している。

外部のホスティングサービスは使わない。要るのは自宅の Mac と、無料の Tailscale アカウントだけ。

```
     スマホ / 審査員のPC
            |  https://<マシン名>.<tailnet 名>.ts.net
            v
     Tailscale の中継（TLS 終端）
            |
            v
      自宅の Mac ─ tailscaled ──> 127.0.0.1:3000
                                      |
                                 web コンテナ ──> db コンテナ
                                 (Next.js)        (PostgreSQL 17)
```

> **提出物には含まれない。** CODIHA に提出するのは `app/` 配下だけで、
> この `deploy/` は提出アーカイブに入らない（`tools/package_submission.sh` が `app/` しか固めない）。
> ここは「作ったものを審査員に触ってもらうため」の運用手順であって、提出要件とは別の話。

---

## 目次

1. [先に知っておくこと](#0-先に知っておくこと)
2. [手順 1: Docker Desktop を入れる](#手順-1-docker-desktop-を入れる)
3. [手順 2: Tailscale を入れてログインする](#手順-2-tailscale-を入れてログインする)
4. [手順 3: tailnet で Funnel を許可する](#手順-3-tailnet-で-funnel-を許可する)
5. [手順 4: リポジトリを取ってくる](#手順-4-リポジトリを取ってくる)
6. [手順 5: setup.sh を実行する](#手順-5-setupsh-を実行する)
7. [手順 6: 外から見えるか確かめる](#手順-6-外から見えるか確かめる)
8. [手順 7: Mac をスリープさせない](#手順-7-mac-をスリープさせない)
9. [プレゼン用の QR コードを作る](#プレゼン用の-qr-コードを作る)
10. [運用（停止・起動・更新・ログ）](#運用停止起動更新ログ)
11. [発表前チェックリスト](#発表前チェックリスト)
12. [困ったとき](#困ったとき)
13. [参照した公式ドキュメント](#参照した公式ドキュメント)

---

## 0. 先に知っておくこと

### 公開すると誰でも投稿できる

CHIZUBA は**鍵を設定しない環境ではデモログイン**で動く（`docs/design/requirements.md` §8）。
デモログインは表示名を入れて「一般 / 行政」を選ぶだけなので、**インターネットに出すと、
誰でも行政ロールでログインし、投稿の対応状況を書き換えられる**。写真の投稿にも回数制限が無い。

デモや発表のために短期間だけ公開するなら問題ないが、次を守る。

- **発表が終わったら Funnel を止める**（[運用](#運用停止起動更新ログ)の「公開を止める」）
- 消えて困るデータを入れない。中身はデモ投稿 22 件 + 当日入れたもの、という前提で扱う
- 荒らされたら作り直す（`docker compose down -v` で全部消えて初期状態に戻る）

なお、**投稿を削除できるのは投稿した本人だけ**なので、初期のデモ投稿 22 件が
他人に消される心配はない。書き換えられるのは対応状況（4 段階）とコメントに限られる。

### 必要なもの

| もの | 補足 |
|---|---|
| 常時つけておく Mac | 古い Mac で構わない。Docker Desktop が動く macOS であること |
| インターネット接続 | 地図タイル・徒歩経路・気象庁の取得に必要（アプリ側が外部を見る） |
| Tailscale アカウント | 無料プランで Funnel が使える |
| ディスクの空き 5 GB 程度 | Docker のイメージとビルドキャッシュ |

### Funnel の制限（公式）

- 公開に使えるポートは **443・8443・10000** の 3 つだけ（既定は 443 ＝ URL にポート番号が付かない）
- 使えるドメインは tailnet 自身の `*.ts.net` のみ
- 通信量に上限がある（値は非公開・変更不可）
- **Funnel はベータ機能**

---

## 手順 1: Docker Desktop を入れる

1. <https://www.docker.com/products/docker-desktop/> から macOS 版をダウンロードして入れる
   （Apple シリコンか Intel かを間違えないこと）
2. 一度起動して、メニューバーのクジラのアイコンが **Running** になるのを確認する
3. **Settings → General → 「Start Docker Desktop when you sign in」を ON にする**
   （Mac を再起動したときに自動で戻ってこないと、公開が止まったままになる）

確認:

```bash
docker --version
docker compose version
docker info > /dev/null && echo "Docker は動いています"
```

---

## 手順 2: Tailscale を入れてログインする

### 入れる

<https://tailscale.com/download/macos> から入れる。App Store 版と Standalone 版のどちらでもよい。

> **どちらでも Funnel でポートを公開できる。**
> 公式ドキュメントに *「You can only use Funnel to share ports if you installed Tailscale for
> macOS from the App Store or as a Standalone variant system extension」* とある。
> オープンソース版が要るのは**ファイルやディレクトリを共有するとき**だけで、
> 今回のようにポート（＝ローカルのサーバー）を公開する用途には関係ない。

### ログインする

アプリを起動して、メニューバーのアイコンからサインインする。
ログインすると `100.x.x.x` の IP が割り当たる。

### CLI（`tailscale` コマンド）を使えるようにする

`setup.sh` は `tailscale` コマンドを使う。**App Store 版は PATH に入らない**ので、
次のどちらかをする。

```bash
# 方法 A: シェルの設定にエイリアスを足す（公式が案内している方法）
echo 'alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale"' >> ~/.zshrc
source ~/.zshrc

# 方法 B: setup.sh に場所を教える（エイリアスはスクリプトから見えないので、こちらが確実）
export TAILSCALE_BIN="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
```

Standalone 版なら、アプリの **Settings → CLI integration → Show me how → Install Now**
で `/usr/local/bin/tailscale` にランチャが入る（macOS Ventura 13.0 以降）。
`setup.sh` はこの場所も自動で探すので、入れておけば何もしなくてよい。

確認:

```bash
tailscale status
```

> **バージョンのずれに注意。** Homebrew で `tailscale` CLI を入れていると、
> アプリ本体（tailscaled）とバージョンが食い違って
> `Warning: client version ... != tailscaled server version ...` が出る。
> 動きはするが、食い違いが大きいと Funnel の挙動が変わることがある。
> **アプリ側に付いてくる CLI を使うほうが安全**（上の方法 B）。

---

## 手順 3: tailnet で Funnel を許可する

Funnel は tailnet（あなたの Tailscale のネットワーク全体）の設定を 2 つ要求する。
**どちらもブラウザでの操作**で、1 回やれば以後は不要。

### 3-1. HTTPS 証明書を有効にする

<https://login.tailscale.com/admin/dns> を開き、**HTTPS Certificates** を **Enable** にする。

> CLI から Funnel を有効にすると Tailscale が証明書を自動で作るので、
> ここを触らなくても通ることがある。先に ON にしておくほうが確実。

### 3-2. ポリシーファイルに `funnel` 属性を足す

<https://login.tailscale.com/admin/acls> を開き、`nodeAttrs` に次を足して Save する。

```json
"nodeAttrs": [
  {
    "target": ["autogroup:member"],
    "attr":   ["funnel"],
  },
],
```

すでに `nodeAttrs` がある場合は、その配列に上のオブジェクトを 1 つ足す。

> `setup.sh` が Funnel の設定に失敗したときは、**管理コンソールへのリンクが
> エラーメッセージに出る**ことがある。出ていればそれを開いて許可すればよい。

### 3-3. MagicDNS

Funnel は MagicDNS が有効であることを前提にする。既定で有効なので、
<https://login.tailscale.com/admin/dns> で **MagicDNS** が ON になっていることだけ見ておく。

---

## 手順 4: リポジトリを取ってくる

```bash
cd ~
git clone https://github.com/takushio2525/codiha2026-ai-de-chiba.git
cd codiha2026-ai-de-chiba
```

---

## 手順 5: setup.sh を実行する

```bash
bash deploy/selfhost/setup.sh
```

これ 1 本で次をやる。**途中で落ちても、直してもう一度実行すればよい**（何度実行しても同じ状態になる）。

1. 前提の確認（git・Docker・Docker デーモン・Tailscale・ログイン状態・ポートの空き・スリープ設定）
2. `git pull`（手元に変更があるときは飛ばす）
3. 公開 URL を `app/.env` の `AUTH_URL` に書く（Google ログインを使うときだけ効く）
4. `docker compose -f app/compose.yaml -f deploy/selfhost/compose.prod.yaml up -d` でコンテナを起動
5. `web` が healthy になり、`http://127.0.0.1:3000/` が 200 を返すまで待つ
6. `tailscale funnel --bg --yes 3000` で公開し、URL を表示する

**初回はイメージのビルドに数分〜十数分かかる**（古い Mac ではもっと）。2 回目以降は数十秒。

### よく使うオプション

```bash
bash deploy/selfhost/setup.sh --check-only   # 前提の確認だけ。何も起動しない
bash deploy/selfhost/setup.sh --no-funnel    # コンテナの起動まで。まだ公開しない
bash deploy/selfhost/setup.sh --build        # コードが同じでもイメージを作り直す
bash deploy/selfhost/setup.sh --port 8080    # 3000 が塞がっているとき
bash deploy/selfhost/setup.sh --help
```

> 最初は `--check-only` → `--no-funnel` → 何も付けない、の順に進めると、
> どこで詰まったかが分かりやすい。

---

## 手順 6: 外から見えるか確かめる

**自宅の Wi-Fi を切ったスマホ**（モバイル回線）で、`setup.sh` が表示した URL を開く。
自宅の回線から見ても、Funnel を通らずに繋がってしまうことがあるので、**必ず別の回線から**確かめる。

```bash
# 手元から Funnel の状態を見る
tailscale funnel status
```

`https://<マシン名>.<tailnet 名>.ts.net` と、その下に `proxy http://127.0.0.1:3000` が出ていればよい。

初回のアクセスは HTTPS 証明書の発行で数十秒かかることがある。
**発表当日は事前に一度開いて温めておく**（[チェックリスト](#発表前チェックリスト)）。

---

## 手順 7: Mac をスリープさせない

**Mac が寝ると外から見えなくなる。** どちらかをやる。

### 方法 A: 一時的（発表の日だけ・sudo 不要）

ターミナルを 1 枚開いて置いておく。閉じるかCtrl-C で元に戻る。

```bash
caffeinate -dims
```

### 方法 B: 恒久的（常時公開する Mac 向け・sudo が要る）

```bash
sudo pmset -a sleep 0        # システムスリープしない
sudo pmset -a disksleep 0    # ディスクを止めない
sudo pmset -a womp 1         # ネットワークから起こせるようにする（対応機のみ）
sudo pmset -a autorestart 1  # 停電から復帰したら自動で起動する（デスクトップ機のみ）
```

> 最後の 2 つは機種によって存在しない（`autorestart` はデスクトップ機だけ、
> `womp` は有線 LAN か対応する Wi-Fi を持つ機種だけ）。
> 無い設定を指定するとエラーになるが、**無視して構わない**。
> いま何が設定できるかは `pmset -g custom` で見られる。

ノート型を**閉じたまま**使うなら、電源に繋いだうえで次も要る。

```bash
sudo pmset -b disablesleep 1
```

現在の設定を見る:

```bash
pmset -g | grep -E ' sleep| disksleep|autorestart'
```

`setup.sh` は `sleep` が 0 以外だと警告を出す。

> ディスプレイのスリープ（`displaysleep`）は切らなくてよい。画面が消えても公開は続く。

---

## プレゼン用の QR コードを作る

```bash
python3 deploy/selfhost/make_qr.py "https://<マシン名>.<tailnet 名>.ts.net" -o chizuba-qr.png
```

スライドに大きく載せるなら 1 モジュールの画素数を上げる:

```bash
python3 deploy/selfhost/make_qr.py "https://<URL>" -o chizuba-qr.png --scale 20 --ecc Q
```

| オプション | 意味 |
|---|---|
| `-o` | 出力ファイル名（既定 `chizuba-qr.png`） |
| `--scale` | 1 マスの画素数（既定 12）。スライド用は 16〜24 くらい |
| `--ecc` | 誤り訂正 `L`/`M`/`Q`/`H`（既定 `M`）。**会場で斜めから読ませるなら `Q`** |
| `--margin` | 余白のマス数（既定 4。規格の最小値。減らすと読めない機種が出る） |
| `--preview` | 端末にも表示して、その場で目視確認する |

**外部パッケージは要らない**（Python の標準ライブラリだけで動く）。
発表直前に `pip install` が失敗して詰む経路を消すために自前で実装してある。
実装が壊れていないかは次で確認できる。

```bash
bash deploy/selfhost/verify_qr.sh
```

---

## 運用（停止・起動・更新・ログ）

`deploy/selfhost/` からの相対で書いてあるので、**リポジトリの一番上で**実行する。

```bash
# 状態を見る
docker compose -f app/compose.yaml -f deploy/selfhost/compose.prod.yaml ps

# ログを見る（web だけ・追いかける）
docker compose -f app/compose.yaml -f deploy/selfhost/compose.prod.yaml logs -f web

# 止める（データは残る）
docker compose -f app/compose.yaml -f deploy/selfhost/compose.prod.yaml stop

# 起こす
docker compose -f app/compose.yaml -f deploy/selfhost/compose.prod.yaml start

# 最新のコードに更新する（git pull → 作り直し → 起動確認まで）
bash deploy/selfhost/setup.sh

# 全部消して初期状態に戻す（**投稿も写真も消える**）
docker compose -f app/compose.yaml -f deploy/selfhost/compose.prod.yaml down -v
```

### 公開を止める

```bash
tailscale funnel status   # いま何を公開しているか
tailscale funnel reset    # 公開をやめる（tailscale serve の設定も一緒に消える）
```

コンテナは動いたままなので、手元の `http://127.0.0.1:3000` では引き続き見られる。

### 再起動したあと

`compose.prod.yaml` が `restart: unless-stopped` を付けているので、
**Docker Desktop が起動すればコンテナは自動で戻る**。Funnel も `--bg` で設定してあるので
tailscaled が上がれば復活する。念のため `setup.sh` をもう一度流すと確実。

### `docker compose down -v` の副作用

- 投稿と写真が全部消える（`db-data` と `uploads` ボリュームが消えるため）
- **全員がログアウトになる**。セッションの署名鍵は DB に入っている
  インストール ID から作られていて、作り直すと ID が変わるため
  （`app/src/lib/installId.ts`）

---

## 発表前チェックリスト

発表の **30 分前**にここを上から順に。

- [ ] Mac が起きている（`caffeinate -dims` を走らせたターミナルが開いている）
- [ ] Docker Desktop が Running
- [ ] `bash deploy/selfhost/setup.sh --check-only` が全部 `[ OK ]`
- [ ] `docker compose -f app/compose.yaml -f deploy/selfhost/compose.prod.yaml ps` で web が `healthy`
- [ ] `tailscale funnel status` に公開 URL が出ている
- [ ] **スマホ（モバイル回線）から公開 URL を開いて地図が出た** ← 一番大事。証明書と初回起動を温める
- [ ] 地図のピンが出る・投稿一覧（`/reports`）が開く・ログインできる
- [ ] スライドの QR を実際にスマホで読んで、正しい URL に飛ぶ
- [ ] 会場の Wi-Fi でスマホから開ける（会場によっては外向き通信が制限されている）

### 保険: 公開が落ちたときのローカル起動

会場のネットワークや自宅の回線が死んでも、**発表する PC 単体で動かせる**ようにしておく。
事前にイメージをビルドしておけば、当日はオフラインでも起動する
（ただし背景地図・徒歩経路・気象は外部サービスなので、ネットが無いと出ない）。

```bash
# 発表用 PC で、事前に 1 回やっておく
git clone https://github.com/takushio2525/codiha2026-ai-de-chiba.git
cd codiha2026-ai-de-chiba/app
docker compose build          # ここまでを前日までに済ませる

# 当日、公開がダメだったら
docker compose up             # → http://localhost:3000
```

デモ投稿 22 件は初回起動時に自動で入るので、まっさらな環境でも見せるものはある。

---

## 困ったとき

| 症状 | 見るところ |
|---|---|
| `setup.sh` が「docker が見つかりません」 | Docker Desktop を入れて 1 回起動する |
| `setup.sh` が「Docker は入っていますが動いていません」 | `open -a Docker` してクジラが Running になるまで待つ |
| `setup.sh` が「tailscale コマンドが見つかりません」 | [手順 2](#手順-2-tailscale-を入れてログインする)の CLI 設定。`TAILSCALE_BIN` を使うのが確実 |
| `setup.sh` が「ログインしていません」 | `tailscale up` してブラウザでログイン |
| Funnel の設定で失敗する | [手順 3](#手順-3-tailnet-で-funnel-を許可する)の 2 つ（HTTPS 証明書・`funnel` 属性）。エラーに管理コンソールのリンクが出ていればそれを開く |
| 公開 URL が「接続できません」 | `tailscale funnel status` を見る。Mac が寝ていないか。Docker が動いているか |
| 公開 URL が 502 / 503 | コンテナが起動途中。`... ps` で `healthy` になるまで待つ |
| ポート 3000 が塞がっている | `lsof -nP -iTCP:3000 -sTCP:LISTEN` で犯人を探す。`--port 8080` でも逃げられる |
| ビルドが「no space left」 | `docker system prune -a` で古いイメージを消す |
| 地図は出るがピンが出ない | ネットに繋がっているか。`docker compose ... logs web` を見る |

---

## このリポジトリでの検証状況

この手順は開発機（macOS・Docker 29.7.2・Docker Compose 5.3.1）で次まで確認してある。

| 項目 | 状況 |
|---|---|
| `compose.prod.yaml` を重ねて起動 → `restart=unless-stopped` になる | **実測済み**（`docker inspect` で確認） |
| `web` の healthcheck が `healthy` になる・`/` が 200 | **実測済み** |
| ポートが `127.0.0.1` にだけ開く | **実測済み**（`lsof` で確認） |
| `setup.sh` が前提の欠如を検知する（docker 無し・デーモン停止・`TAILSCALE_BIN` 誤り） | **実測済み** |
| `setup.sh` を 2 回流しても作り直さない（冪等） | **実測済み** |
| `make_qr.py` の出力が実際に読める QR になっている | **実測済み**（`verify_qr.sh`） |
| **Tailscale Funnel で実際に公開する** | **未検証**。開発機からは公開していない。手順は公式ドキュメント（下記）に従って書いた |

**Funnel の部分だけは実機で通っていない。** 旧 Mac で最初に流すときは、
`--check-only` → `--no-funnel` → 本番、の順に進めて、どこで止まったか分かるようにすること。

---

## 参照した公式ドキュメント

すべて 2026-08-27 に参照。

- [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel) — 要件・制限・対応プラン・macOS の変種についての記述
- [tailscale funnel（CLI リファレンス）](https://tailscale.com/docs/reference/tailscale-cli/funnel) — `--bg` / `status` / `reset` / `off`
- [HTTPS 証明書を設定する](https://tailscale.com/docs/how-to/set-up-https-certificates)
- [ポリシーファイルの構文](https://tailscale.com/docs/reference/syntax/policy-file) — `nodeAttrs`
- [Tailscale CLI](https://tailscale.com/docs/reference/tailscale-cli) — macOS でのコマンドの場所
- [MagicDNS](https://tailscale.com/docs/features/magicdns)

コマンドの書式は、**手元の `tailscale` 1.98.8 の `tailscale funnel --help` の出力とも突き合わせてある**
（`tailscale funnel <target>` / `funnel status [--json]` / `funnel reset`、フラグ `--bg` `--yes` `--https` ほか）。
