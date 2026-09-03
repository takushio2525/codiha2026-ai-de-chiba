# 10. 環境変数

**CHIZUBA は環境変数を 1 つも設定しなくても `docker compose up` で全機能が動く。**
これが設計の前提（審査員の環境で追加設定を要らなくする）。

一覧のキーの正本は `app/.env.example`（**値は書かない。キーと説明だけ**）。
実際の値は `app/.env`（`.gitignore` 済み）。

---

## 10-1. 一覧

| 変数 | 必須 | 既定値 | 未設定時の挙動 | どこで読まれるか |
|---|---|---|---|---|
| `DATABASE_URL` | **実質必須**（compose が渡す） | `postgres://chizuba:chizuba_local_only@db:5432/chizuba` | `createPool()` が例外を投げる（設定ミスに早く気づくため） | `app/src/lib/db.ts:32` |
| `AUTH_SECRET` | 任意 | なし | **インストール ID から署名鍵を導く**（環境ごとに違う鍵になる） | `app/src/lib/auth.ts:66` |
| `CHIZUBA_PORT` | 任意 | **3000** | ホスト側 3000 番で公開 | **`app/compose.yaml:38`**（アプリのコードは読まない） |
| `AUTH_URL` | 任意 | なし | **リクエストのヘッダーから公開 URL を毎回導く**（推奨） | **next-auth 本体**（`node_modules/next-auth/lib/env.js:6`）。CHIZUBA のコードは読まない |
| `GOOGLE_CLIENT_ID` | 任意 | 空文字 | Google ログインを出さない | `app/src/lib/authMode.ts:28` |
| `GOOGLE_CLIENT_SECRET` | 任意 | 空文字 | 同上（**2 つ揃ったときだけ**有効） | `app/src/lib/authMode.ts:29` |
| `GOV_ACCOUNTS` | 任意 | 空文字 | Google ログインで行政ロールになる人が 0 人 | `app/src/lib/authMode.ts:60` |
| `GOV_DEMO_PIN` | 任意 | 空文字 | **デモログインの行政ロールを PIN で守らない**（審査員の既定） | `app/src/lib/govPin.ts:22` |
| `NODE_ENV` | — | `production` | Docker が渡す | `Dockerfile:30`・`compose.yaml:40` |
| `PORT` | — | `3000` | コンテナ内の待ち受けポート。**変えない** | `Dockerfile:32` |
| `HOSTNAME` | — | `0.0.0.0` | コンテナ内の待ち受けアドレス。**これが `publicOrigin.ts` が要る原因**（[06 章](06-auth.md#6-6-公開-url-の導出)） | `Dockerfile:33` |
| `NEXT_TELEMETRY_DISABLED` | — | `1` | Next.js の使用統計送信を止める | `Dockerfile:22,31` |
| `NEXT_PHASE` | — | Next.js が設定 | ビルド中だけ `phase-production-build` になる。**警告を出さない判定に使う** | `auth.ts:72`・`govPin.ts:34` |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | — | `chizuba` / `chizuba` / `chizuba_local_only` | `db` コンテナの初期化 | `compose.yaml:71-76` |

### `process.env` の実測

アプリのコード（`app/src`）が読む環境変数は**これだけ**
（2026-09-03 に `grep -rn "process\.env" app/src` を実行）:

```
app/src/lib/govPin.ts:22   process.env.GOV_DEMO_PIN
app/src/lib/govPin.ts:34   process.env.NEXT_PHASE
app/src/lib/db.ts:32       process.env.DATABASE_URL
app/src/lib/auth.ts:66     process.env.AUTH_SECRET
app/src/lib/auth.ts:72     process.env.NEXT_PHASE
app/src/lib/authMode.ts:25 process.env[name]   ← GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOV_ACCOUNTS
```

**`CHIZUBA_PORT` と `AUTH_URL` はアプリのコードに出てこない。**
前者は compose が、後者は next-auth 本体が読む。ここを取り違えると
「コードに無いから効いていない」と誤解する。

---

## 10-2. 個別の説明

### `DATABASE_URL`

```
postgres://chizuba:chizuba_local_only@db:5432/chizuba
```

`compose.yaml:44` が `environment:` で渡す。
**`environment:` は `env_file:` より優先される**ので、
利用者が `app/.env` に別の `DATABASE_URL` を書いても、
compose 環境では必ず `db` コンテナに繋がる（`compose.yaml:41-43` のコメント）。

パスワードが公開値なのは意図的。**`db` はホストにポートを公開していない**ので、
コンテナの外からは接続できない。審査員が何も設定せずに起動できることを優先した。

### `AUTH_SECRET`

**未設定でよい。** 未設定なら `sha256("chizuba-session-key:" + install_id)` を使う。

設定するのは「**複数の web コンテナで 1 つのセッションを共有したいとき**」だけ。
値は `openssl rand -base64 32` などで作る。

**注意**: 設定してもインストール ID の突き合わせ（`token.inst === install_id`）は
残るので、**DB が違えば通らない**（[06 章 6-5](06-auth.md#6-5-セッションjwtの中身)）。

### `CHIZUBA_PORT`

```bash
cd app && CHIZUBA_PORT=3100 docker compose up
# または app/.env に CHIZUBA_PORT=3100 と 1 行
```

**3000 が塞がっているときだけ使う。** コンテナ側は常に 3000。
**ポートを変えても他に直す設定は無い**（公開 URL はリクエストから導くため）。

Google ログインを使う環境では、**Google Cloud Console に登録する
リダイレクト URI をそのポートに合わせる**必要がある。

### `AUTH_URL`

**通常は書かない。** 書くのは「**ホスト名を書き換えてしまうリバースプロキシの後ろ**」など、
自動判定が効かない環境だけ。

書くと Auth.js がこの固定値を優先するので、**公開 URL が変わったら必ず直す**
（直し忘れるとログインが壊れる）。

以前は `compose.yaml` が `AUTH_URL=http://localhost:3000` を固定で渡していたが、
**ポートを変えた瞬間にログインが 3000 番へ飛んで壊れた**のでやめた
（PR: `fix/auth-redirect-host`）。`setup.sh` は古い `AUTH_URL` が
`app/.env` に残っていると**警告を出す**。

### `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

**2 つ揃ったときだけ** Google ログインが選べるようになる。片方でも欠ければデモのみ。
**揃えてもデモログインは消えない**（両方が並ぶ）。

取得先: <https://console.cloud.google.com/apis/credentials>

承認済みのリダイレクト URI には、**実際にブラウザで開く住所**に
`/api/auth/callback/google` を付けたものを登録する:

```
http://localhost:3000/api/auth/callback/google          （既定）
http://localhost:3100/api/auth/callback/google          （CHIZUBA_PORT=3100 のとき）
https://<マシン名>.<tailnet 名>.ts.net/api/auth/callback/google  （Funnel 公開時）
```

### `GOV_ACCOUNTS`

```
GOV_ACCOUNTS=staff@example.com:12203,other@example.com:12100
```

`メールアドレス:市町村コード` のカンマ区切り。市川市は `12203`。

- **Google ログインで入った人にだけ効く。** デモログインはロールを画面で選ぶので、
  この設定の影響を受けない（2 つの経路は独立）
- 市町村コードが 5 桁の数字でない行は**黙って捨てる**
- メールアドレスは小文字化して比較する

### `GOV_DEMO_PIN`

| 状態 | 挙動 |
|---|---|
| **未設定（審査員の既定）** | 何も変わらない。デモログインの画面で行政ユーザーをそのまま選べる |
| **設定済み（公開時）** | 行政ユーザーを選ぶときだけ PIN の入力を求める。**一般ユーザーのログインは変わらない** |

**インターネットに公開するときは設定する。**
これが無いと通りすがりの誰でも行政ロールで入り、対応状況を書き換えられる。

- 6 桁程度の数字を推奨（**4 文字未満だと起動時に警告**が出る）
- 値の作り方の例: `printf '%06d\n' $((RANDOM % 1000000))`
- 総当たり対策は [06 章 6-3](06-auth.md#6-3-デモログイン)
- **`compose.prod.yaml` には書かない。** ベースの `env_file: .env` が
  そのまま web コンテナへ渡すので、同じ設定を 2 か所に散らかさない
- 値そのものは秘密なので、当然リポジトリにも書かない

---

## 10-3. 設定ファイルの優先順位

```
① compose.yaml の environment:     ← いちばん強い（DATABASE_URL・NODE_ENV）
② app/.env（env_file・required: false）
③ Dockerfile の ENV                ← ①②が無いときの既定（PORT・HOSTNAME など）
```

`app/.env` は**無くても起動する**（`compose.yaml:52-54` の `required: false`）。

---

## 10-4. 公開運用（`deploy/selfhost/`）で追加される設定

`deploy/selfhost/compose.prod.yaml` はベースの `compose.yaml` に**差分だけ**重ねる。

```bash
cd app
docker compose -f compose.yaml -f ../deploy/selfhost/compose.prod.yaml up -d --build
```

| 差分 | 値 | 理由 |
|---|---|---|
| `restart` | `unless-stopped` | Mac や Docker の再起動後も自動で立ち上げ直す。`always` でないのは、明示的に `stop` したときは止まったままでいてほしいため |
| `ports` | `127.0.0.1:${CHIZUBA_PORT:-3000}:3000`（`!override`） | **loopback にだけ公開。** ベースは `0.0.0.0` に開くので、そのままだと同じ Wi-Fi の誰でも素の HTTP で入れる |

**`!override` を付けないと compose はリストを足し算する**（0.0.0.0 と 127.0.0.1 の
2 つを開こうとして衝突する）。

### 実際に踏んだ事故（2026-08-31）

反映のときに素の `docker compose up -d`（`-f` を 1 枚も付けない）を打ったところ、
**`restart` が `no` に戻り、公開ポートが `0.0.0.0` に開いた**（LAN から素の HTTP で
入れる状態）。`-f` を 2 枚重ねて打ち直して復旧した。
データはボリュームなので無事だった（投稿 23 件を確認）。
`deploy/selfhost/README.md` に警告を足してある。

---

## 10-5. 環境変数を足すときの手順

`AGENTS.md` の整合性表より。認証まわりの変数を足したら、
**同じコミットで**次を直す。

- `app/.env.example`（キーと説明。**値は書かない**）
- `app/README.md`（既知の制約）
- `docs/design/requirements.md` §8
- 提出用 `readme.txt` の「ログイン情報」
- 公開 URL・ポートに関わるなら `deploy/selfhost/` の 3 ファイルも

そして **`bash .github/scripts/secret_scan.sh` を実行してからコミットする**
（`.env` の値を誤って書いていないか）。
