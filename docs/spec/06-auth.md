# 06. 認証と権限

**閲覧はログイン不要。** ログインが要るのは投稿・コメント・行政操作だけ。
防災情報をログインの壁の向こうに置かないという方針（`requirements.md` §8）。

使っているのは **Auth.js（旧 NextAuth）v5 beta**（`next-auth@5.0.0-beta.32`）。

---

## 6-1. 全体の構造

```mermaid
flowchart TB
    subgraph client["ブラウザ"]
        LOGIN["/login のフォーム"]
        COOKIE[("Cookie<br/>authjs.session-token")]
    end
    subgraph server["web コンテナ"]
        ACT["lib/authActions.ts<br/>（\"use server\"）"]
        AUTHCFG["lib/auth.ts<br/>NextAuth の設定"]
        MODE["lib/authMode.ts<br/>鍵の有無を判定"]
        PIN["lib/govPin.ts<br/>行政ロールの PIN"]
        INST["lib/installId.ts<br/>署名鍵の素"]
        USERS["lib/users.ts<br/>upsertUser"]
        ROUTE["api/auth/[...nextauth]/route.ts<br/>URL を公開ホストに直す"]
        ORIGIN["lib/publicOrigin.ts"]
    end
    DB[("users / app_instance")]
    GOOGLE["Google OAuth"]

    LOGIN -->|"form action"| ACT
    ACT --> AUTHCFG
    ACT --> PIN
    LOGIN -->|"/api/auth/*"| ROUTE
    ROUTE --> ORIGIN
    ROUTE --> AUTHCFG
    AUTHCFG --> MODE & PIN & INST & USERS
    AUTHCFG <--> GOOGLE
    INST --> DB
    USERS --> DB
    AUTHCFG -->|"Set-Cookie"| COOKIE
```

**入口が 2 系統ある**のがポイント。

| 経路 | 何が通るか | 公開 URL の決め方 |
|---|---|---|
| **サーバーアクション**（`signIn` / `signOut`） | `/login` のフォーム・`AuthBar` のログアウト | Auth.js の `createActionURL()` がヘッダーを見る。**`trustHost: true` だけで足りる** |
| **ルートハンドラ**（`/api/auth/*`） | Google のコールバック・`/api/auth/providers` など | `Auth()` が `req.url` を見るので、**自分で直す必要がある**（`route.ts` の `withPublicOrigin`） |

片方だけ直すと気づきにくい（実測。`.agent/progress.md` 2026-08-27）。

---

## 6-2. Google とデモの分岐条件

`app/src/lib/authMode.ts`。

```
GOOGLE_LOGIN_ENABLED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
AUTH_MODE            = GOOGLE_LOGIN_ENABLED ? "google" : "demo"
```

| 環境 | `/login` に出るもの | `providers()` が返す配列 |
|---|---|---|
| 鍵が 0 個または 1 個 | **デモログインだけ** | `[Credentials("demo")]` |
| 鍵が 2 個そろう | **Google ＋ デモ**（Google が上） | `[Google, Credentials("demo")]` |

**`AUTH_MODE === "google"` は「Google *も* 使える」の意味であって、
「Google *だけ*」ではない。** 誤読しやすいので、コードの分岐には
`GOOGLE_LOGIN_ENABLED`（真偽値）を使うようにしてある（`authMode.ts:31-38`）。

**なぜ排他をやめたか。** 以前は鍵を入れるとデモログインが消えていた。
それだと公開先で Google アカウントを持たない人が何も投稿できない。
鍵の有無は「Google を足すかどうか」だけに効かせる
（`feat/google-demo-coexist`・`.agent/progress.md` 2026-08-30）。
**鍵が無い環境＝審査員の環境の挙動は 1 ビットも変わらない。**

### 画面での見え方

`AuthBar.tsx` は `authMode === "demo"` のとき「**デモモードで動作中**」の帯を出し続ける。
これは要件（`requirements.md` §8-2）で、審査員が「本番の Google ログインではない」と
一目で分かるようにするため。この文言は縮められないので、狭い画面では他の要素を削って幅を作る。

---

## 6-3. デモログイン

`app/src/lib/auth.ts:103-148` の `Credentials` プロバイダ。

入力は 3 つ。

| 名前 | 内容 | 検証 |
|---|---|---|
| `displayName` | 表示名（本名でなくてよい） | `normalizeDisplayName()` で空白を整理 → 1〜30 字（`displayName.ts`） |
| `role` | `user` / `gov` | `raw?.role === "gov" ? "gov" : "user"`（知らない値は `user` に倒す） |
| `govPin` | 行政ロールの PIN | `GOV_DEMO_PIN` が設定された環境だけ要求 |

**ロールを自己申告できるのはデモログインだからこそ。**
Google で入った人には環境変数（`GOV_ACCOUNTS`）でしか行政ロールを付けない
（`requirements.md` §8-3）。**2 つの経路は独立している。**

作られるユーザー:

```
provider     = 'demo'
provider_uid = '<ロール>/<表示名>'   例: "gov/いちかわ たろう"
role         = user / gov
gov_city_code = role === 'gov' ? '12203' : null
```

同じ表示名 × 同じロールで入り直すと**同じユーザーになる**（`UNIQUE (provider, provider_uid)`）。

### PIN の検証は 2 か所で走る

| どこ | 何のため |
|---|---|
| `lib/authActions.ts:33-36`（サーバーアクション） | **画面に日本語の理由を返すため。** `signIn` に任せると「ログインできませんでした」としか言えない |
| `lib/auth.ts:129`（`authorize` の中） | **API を直接叩かれたときの最後の砦** |

**同じ入力で二度数えないよう**、画面経由の場合は `authorize` が正しい PIN を受け取る
形にしてある（`authActions.ts:39` が `govPin` をそのまま渡す）。

### 総当たり対策（`lib/govPin.ts`）

```
LOCKOUT_AFTER  = 10      連続 10 回失敗で
LOCKOUT_MS     = 60_000  60 秒は即座に断る
BASE_DELAY_MS  = 250     失敗のたびに 250ms × 2^n 待つ
MAX_DELAY_STEPS = 5      上限 250 × 2^5 = 8 秒
MIN_PIN_LENGTH  = 4      これ未満だと起動時に警告
```

- **① だけでは並列に投げられて意味が薄れる**（各リクエストが別々に待つだけ）。
  ② を足すと並列でも **60 秒あたり 10 回**までに絞れる。
  6 桁なら 10⁶ ÷ 10 × 60 秒 ≒ **69 日**かかる計算（`govPin.ts:44-56`）
- **IP 別には数えない。** Tailscale Funnel の背後ではクライアント IP が
  ヘッダー任せになり、詐称できる値で数えても意味がないため。
  代償として**攻撃者は行政ログインを妨害できる**が、
  一般ユーザーのログインと閲覧・投稿は止まらない
- 比較は `timingSafeEqual`。素の `===` は「何文字目まで合っているか」が
  応答時間から漏れるので、いったん SHA-256 に畳んでから比べる（長さの違いも隠れる）

### PIN 欄の出し入れは CSS でやる（React の罠）

`DemoLoginForm.tsx:99` の `peer-has-checked/gov:block`。

**React 19 はフォームアクションのあとフォームを reset する。**
入力欄の出し入れを `useState` でやると「ラジオは一般に戻ったのに PIN 欄は出たまま」になり、
そのまま送ると `role` が化ける（実測）。
CSS（直前の行政ラジオが checked のときだけ表示）にすると reset と必ず一致し、
JavaScript が無くても動く。

**`required` を付けていない**のも意図的。一般ユーザーを選んでいるとき
この欄は `display:none` で残っており、`required` だとブラウザが
「見えない必須項目」を理由に送信そのものを止める。

---

## 6-4. Google ログイン

`app/src/lib/auth.ts:192-210` の jwt コールバック。

```
① Google の同意画面から戻ってくる
② user.email（または token.email）を取り出す
③ govCityCodeFor(email) を引く
      → GOV_ACCOUNTS に "email:12203" があれば "12203"、無ければ null
④ upsertUser({ provider: "google",
                providerUid: account.providerAccountId,   ← Google の sub
                displayName: 表示名を 30 字に切る,
                role: govCityCode ? "gov" : "user",
                govCityCode })
```

**メールアドレスは行政ロールの判定にだけ使い、画面にもレスポンスにも出さない**
（`auth.ts:193-194`・`interfaces.md` I-8）。
`session` コールバックが `email: ""`・`image: null` に潰している（`auth.ts:226-228`）。

`GOV_ACCOUNTS` の書式は `メールアドレス:市町村コード` のカンマ区切り:

```
GOV_ACCOUNTS=staff@example.com:12203,other@example.com:12100
```

**市町村コードが 5 桁の数字でない行は黙って捨てる**（`authMode.ts:54`）。
メールは小文字化して比較する。

> 実運用なら自治体ごとの職員アカウント管理が要るが、ハッカソンのスコープ外なので
> 「仕組みとしては成立する」ことを示すに留めている（`authMode.ts:47-48`）。

---

## 6-5. セッション（JWT）の中身

**DB セッションは持たない。** `session: { strategy: "jwt" }`（`auth.ts:171`）。

### 載っている項目（`auth.ts:32-42` の `AppToken`）

| キー | 型 | 意味 |
|---|---|---|
| `uid` | number | `users.id` |
| `displayName` | string | 表示名 |
| `role` | `"user"` / `"gov"` | ロール |
| `govCityCode` | string / null | 担当市町村 |
| `inst` | string（UUID） | **このトークンを発行したインストールの ID** |

これに加えて、`@auth/core` の既定のトークンが持つ項目（`name`・`email`・`picture`・
`sub`・`iat`・`exp`・`jti`）も**暗号化されたまま Cookie の中に残る**。
Google で入った場合、そこには**メールアドレスと画像 URL が入っている**。
これは `/privacy` にも正直に書いてある（`.agent/progress.md` 2026-08-31）。

**Cookie の中身は暗号化されている**（JWE）ので、利用者や第三者が読むことはできない。
ただし「サーバーは読める」ので、消したいものは載せないのが本筋。

### Cookie の名前

Auth.js の既定に従う。HTTP では `authjs.session-token`、
HTTPS では `__Secure-authjs.session-token`。
**この名前をコードで指定している場所は無い**（Auth.js が決める）。

実ファイルで確認した定義（2026-09-03・`app/node_modules/@auth/core/lib/utils/cookie.js:44-56`）:

```js
export function defaultCookies(useSecureCookies) {
    const cookiePrefix = useSecureCookies ? "__Secure-" : "";
    return {
        sessionToken: {
            name: `${cookiePrefix}authjs.session-token`,
            options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
        },
        …
```

`httpOnly: true` なので **JavaScript から読めない**（`document.cookie` に出ない）。
`sameSite: "lax"` なので、他サイトからの POST には付かない。

### 署名鍵の決まり方（`auth.ts:65-80` の `resolveSecret`）

```
1. AUTH_SECRET が設定されていればそれ（運用者の意図が最優先）
2. 未設定なら sha256("chizuba-session-key:" + install_id)
3. install_id すら読めなければ固定文字列（このとき**セッションは必ず通らない**）
```

**2 があるので、鍵を 1 つも設定していない環境でも署名鍵は環境ごとに違う。**
以前は公開の固定値を書いていたので、リポジトリを読めば誰でもトークンを偽造できた。

3 の固定値（`FALLBACK_SIGNING_KEY`）が推測できても実害は無い。
`installId === null` のとき jwt コールバックが必ず `null` を返すため。
それでも例外を投げないのは、**認証がアプリの入り口で毎回通るので、
投げると DB が落ちた瞬間に画面ごと 500 になる**から。

### インストール ID の突き合わせ（`auth.ts:181-185`）

```ts
if (!user) {
  if (installId === null || app.inst !== installId) return null;
  return app;
}
```

ログイン直後（`user` が入っている）以外の**すべてのリクエスト**で、
トークンの `inst` と DB の `install_id` を突き合わせる。
一致しなければ `null` を返す＝**未ログイン扱い**。

**この二重の縛りが要る理由**は [05 章 5-2](05-database.md#5-2-app_instance--このインストールの識別子) の実測例。

**帰結**: `docker compose down -v` を打つと `install_id` が変わり、
**全員ログアウトする**（投稿も写真も消えているので当然ではある）。

**毎回 DB を引くわけではない。** `installId.ts` はプロセス内で値を使い回すので、
DB を読むのは実質 1 回だけ（`installId.ts:32`）。
**ロールを変えたらログインし直す必要がある**のもこのため（`auth.ts:179-180`）。

---

## 6-6. 公開 URL の導出

**設定値で持たない。** これが CHIZUBA の認証まわりで一番トリッキーな部分。

### なぜ要るか

Next.js を `output: "standalone"` で動かすと、リクエストの URL を
**待ち受けアドレスから組み立てる**。`Dockerfile:33` が `HOSTNAME=0.0.0.0` を渡しているので、
ルートハンドラが受け取る `req.nextUrl` は:

```
http://0.0.0.0:3000/api/auth/callback/google
```

になる。Auth.js はこの URL を土台にリダイレクト先と Google の `redirect_uri` を作るので、
**そのままだと利用者が開いていない住所へ飛ばす**。

### 以前の対処と、それをやめた理由

`compose.yaml` で `AUTH_URL=http://localhost:3000` を固定していた。
これだと **`CHIZUBA_PORT=3100` にした瞬間にログインが 3000 番へ飛んで壊れる**。
Tailscale Funnel のような外部公開では、設定し忘れたら必ず壊れる。

### いまの仕組み（`app/src/lib/publicOrigin.ts`）

```
① x-forwarded-host を見る（カンマ区切りなら先頭）
② 形が壊れていたら host に落ちる
③ どちらも SAFE_HOST 正規表現に通らなければ null（＝元の URL のまま）
④ スキームは x-forwarded-proto。無ければ http
```

```ts
const SAFE_HOST = /^[A-Za-z0-9._-]+(:[0-9]{1,5})?$|^\[[0-9A-Fa-f:.]+\](:[0-9]{1,5})?$/;
```

**`x-forwarded-port` は見ない。** Next.js がコンテナ内のポート（3000）を
無条件に入れてしまうので、当てにすると 3100 で開いた人を 3000 へ飛ばす。
ポートは `x-forwarded-host` 側に付いてくる。

**壊れた `X-Forwarded-Host` を弾いたあと `Host` に落とさないと `0.0.0.0` に戻る**
（実測で踏んだ。`.agent/progress.md` 2026-08-27）。だから候補を順に試して
**最初に形が通ったもの**を採る作りにしてある。

### どこで使うか

`app/src/app/api/auth/[...nextauth]/route.ts` の `withPublicOrigin()` が
`handlers.GET` / `handlers.POST` を包み、URL を差し替えてから渡す。

```ts
return handler(new NextRequest(origin + req.nextUrl.href.slice(current.length), req));
```

第 2 引数に元のリクエストを渡すとメソッド・ヘッダー・本文を引き継ぐ
（Auth.js 自身の `reqWithEnvURL` と同じ作り）。

### 信頼の線引き

`x-forwarded-host` は**リバースプロキシが居なければ利用者が偽装できる**。
このアプリは `trustHost: true` で動く前提なので、Auth.js の既定の割り切りに合わせている。
**偽装で起きるのは「偽装した本人が別の住所へ飛ぶ」ことで、他人のセッションは取れない。**

固定したい運用では `AUTH_URL` を設定すれば Auth.js 側が勝つ。
`AUTH_URL` を読むのは **next-auth 自身**（`node_modules/next-auth/lib/env.js:6`
の `process.env.AUTH_URL ?? process.env.NEXTAUTH_URL`。2026-09-03 に実ファイルで確認）で、
CHIZUBA のコードは読んでいない。

---

## 6-7. API ごとの認可チェック（一覧表）

**画面側の `role` は表示の出し分けにしか使わない。** 権限判定は必ず API 側で行う。

| API | メソッド | ログイン | 追加の権限判定 | 判定の場所 | 失敗時 |
|---|---|---|---|---|---|
| `/api/reports` | `GET` | **不要** | なし | — | — |
| `/api/reports` | `POST` | **必須** | なし（誰でも投稿できる） |  `route.ts:41-43` | 401 |
| `/api/reports/:id` | `GET` | **不要** | なし。セッションは `isAuthor` の計算にだけ使う | `[id]/route.ts:36` | — |
| `/api/reports/:id` | `PATCH`（`status` を含む） | **必須** | `role === "gov"` **かつ** `govCityCode === 投稿の cityCode` | `[id]/route.ts:79-83` | 401 / 403 |
| `/api/reports/:id` | `PATCH`（`title`/`body`/`details` を含む） | **必須** | `user.id === 投稿の authorId` | `[id]/route.ts:87-89` | 401 / 403 |
| `/api/reports/:id` | `DELETE` | **必須** | `user.id === 投稿の authorId`（SQL 側でも `AND user_id = $2`） | `reportStore.ts:deleteReport` | 401 / 403 / 404 |
| `/api/reports/:id/comments` | `POST` | **必須** | なし。ただし `isOfficial` は `role === "gov" && govCityCode === 投稿の cityCode` のときだけ true | `comments/route.ts:46-47` | 401 |
| `/api/reports/export` | `GET` | **不要** | なし | — | — |
| `/api/photos/:id/:n` | `GET` | **不要** | なし | — | — |
| `/api/weather` | `GET` | **不要** | なし | — | — |
| `/api/routing` | `GET` | **不要** | なし | — | — |
| `/api/auth/*` | `GET`/`POST` | — | Auth.js が処理 | — | — |

### PATCH は「含まれている項目ごと」に判定する

これが `PATCH /api/reports/:id` の要点。1 本のリクエストに
`status` と `title` の両方を入れることもできるので、**どちらを含むかを見て
それぞれの権限を確かめる**（`interfaces.md` I-5）。

```
status を含む      → 担当市町村の行政ユーザーか？
title/body/details を含む → 投稿者本人か？
```

**行政ユーザーでも他人の本文は書き換えられない。**

### 画面側の出し分け（権限ではない）

| 何 | 使う関数 | 場所 |
|---|---|---|
| 対応状況の操作を出すか | `canUpdateStatus(user, report)` | `ReportPanel.tsx` → `ReportStatusControl.tsx` |
| 編集・削除ボタンを出すか | API が返す `isAuthor` | `ReportPanel.tsx` |
| 投稿ボタンを出すか | `session.user !== null` | `ControlPanel.tsx` の `canPost` |

`canUpdateStatus` の定義（`lib/reports.ts:143-148`）にも
「**ここを信じて権限を決めてはいけない**」と明記してある。

---

## 6-8. 認証まわりを変えるときに一緒に直すもの

`AGENTS.md` の整合性表より。

| 変えたもの | 一緒に直すもの |
|---|---|
| 認証の作り | `docs/design/requirements.md` §8・`app/.env.example`・`app/README.md`・提出用 `readme.txt` の「ログイン情報」 |
| セッションの作り | `requirements.md` §8-6・`lib/installId.ts`・`.agent/architecture.md` |
| 公開 URL の決め方 | `lib/publicOrigin.ts`・`app/compose.yaml`・`app/.env.example`・`requirements.md` §8-7・`interfaces.md` I-8・`deploy/selfhost/`（3 ファイル） |
| 受け取る情報・保存先・外部送信 | **`app/src/app/privacy/page.tsx`（同じコミットで直す）** |
