# 02. 起動から画面表示まで

`docker compose up` と打ってから、ブラウザに地図が出るまでに何が順番に起きるか。
「起動しない」と言われたときにどこを見ればいいかが分かるようにする。

---

## 2-1. 全体の流れ

```mermaid
sequenceDiagram
    participant U as 審査員
    participant C as docker compose
    participant DB as db コンテナ<br/>postgres:17-alpine
    participant BLD as Docker ビルド<br/>（web の初回だけ）
    participant W as web コンテナ<br/>node server.js
    participant B as ブラウザ

    U->>C: cd app && docker compose up
    C->>BLD: web のイメージが無ければビルド
    Note over BLD: ①deps: npm ci<br/>②builder: npm run build<br/>③runner: standalone を配置
    C->>DB: 起動
    Note over DB: db-data ボリュームが空なら<br/>/docker-entrypoint-initdb.d/*.sql を<br/>ファイル名順に流す
    DB->>DB: 001_schema.sql → 002_seed_municipalities.sql<br/>→ 003_seed_demo_reports.sql
    DB-->>C: pg_isready -U chizuba -d chizuba が通る
    C->>W: healthcheck 成功後に起動（depends_on）
    W->>W: node server.js（PORT=3000 HOSTNAME=0.0.0.0）
    U->>B: http://localhost:3000 を開く
    B->>W: GET /
    W->>DB: getSessionView() → install_id / users
    W-->>B: HTML（AuthBar + MapExplorer のシェル）
    B->>W: GET /data/*.geojson（3 本）＋ /data/scenic_spots.geojson
    B->>W: GET /api/reports?city=12203
    B->>W: GET /api/weather?city=12203
    B-->>B: MapLibre が地図を生成しタイルを取りに行く
```

---

## 2-2. Docker ビルドの 3 ステージ

`app/Dockerfile`。**イメージを小さくするため 3 段に分けてある**。

| ステージ | ベース | 何をするか | 出力 |
|---|---|---|---|
| `deps`（11-17 行） | `node:22-slim` | `package.json` と `package-lock.json` だけをコピーして `npm ci` | `/app/node_modules` |
| `builder`（19-25 行） | `node:22-slim` | `deps` の `node_modules` を持ってきて全ソースをコピー、`npm run build` | `.next/standalone` と `.next/static` |
| `runner`（27-54 行） | `node:22-slim` | `public/`・`.next/standalone`・`.next/static` だけをコピー | 実行イメージ |

**なぜ 3 段か。** `node_modules`（開発用の依存を含む）とソースを実行イメージに入れないため。
`next.config.ts:6` の `output: "standalone"` が「実行に必要なものだけ」を
`.next/standalone` に出すので、runner はそれをそのまま置いて `node server.js` で起動できる
（[Next.js 公式ドキュメント](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)）。

### ビルド中に自動で走るもの

`npm run build` の前に `prebuild` が走る（`app/package.json:8`）。

```
node scripts/copy-maplibre-worker.mjs
```

MapLibre GL JS v6 の **Web Worker**（地図データを裏で処理する仕組み）を
`node_modules` から `public/maplibre/` へコピーする。
これを忘れると**背景地図は出るのに GeoJSON が永久に読み込み中になる**。
理由は [07 章](07-map.md#7-3-worker-の罠) に書いた。

### 写真の配り方（順番が重要）

```dockerfile
RUN mkdir -p /app/uploads && chown node:node /app/uploads   # 44 行
COPY --chown=node:node db/seed-photos/ ./uploads/            # 50 行
```

- `mkdir` + `chown` を先にやるのは、**named volume が空のときイメージ側の
  ディレクトリの中身と所有者を引き継ぐ**ため。これを忘れるとボリュームが root 所有になり、
  `USER node` で書き込めなくなる（`Dockerfile:41-43` のコメント）
- `COPY` を **`mkdir` より後**に置くのも同じ理由。デモ投稿の写真 17 枚がここで
  `/app/uploads` に入り、`003_seed_demo_reports.sql` が `report_photos` に登録した
  ファイル名の実体になる

---

## 2-3. データベースの初期化

`app/compose.yaml:79-81` が `./db/init` を
`/docker-entrypoint-initdb.d` に読み取り専用でマウントしている。

PostgreSQL の公式イメージは、**データディレクトリが空のときだけ**
このディレクトリの `*.sql` をファイル名順に実行する
（[docker-library/docs の postgres README](https://github.com/docker-library/docs/blob/master/postgres/README.md)）。

| 順 | ファイル | 行数 | 何が入るか |
|---|---|---|---|
| 1 | `db/init/001_schema.sql` | 138 | 5 テーブル・6 索引・`app_instance` に 1 行 |
| 2 | `db/init/002_seed_municipalities.sql` | 18 | 市川市（`12203`）1 行 |
| 3 | `db/init/003_seed_demo_reports.sql` | 215 | デモユーザー 7・投稿 22・写真 17・コメント 6 |

**2 回目以降の `docker compose up` では流れない。** だからデモ投稿が二重に入ることはない。
入れ直すには `docker compose down -v`（ボリュームごと削除）が要る。
ただし **`-v` は `uploads` ボリュームも消す**ので、投稿写真と全員のログイン状態も消える
（[06 章](06-auth.md) のインストール ID）。

### healthcheck

```yaml
test: ["CMD-SHELL", "pg_isready -U chizuba -d chizuba"]
interval: 3s / timeout: 3s / retries: 20 / start_period: 15s
```

`-U` と `-d` を付けないと既定の `postgres` ユーザーで見に行き、
初期化 SQL の途中でも「通った」ことになってしまう（`compose.yaml:83-84` のコメント）。
`start_period: 15s` は初回のスキーマ流し込みの時間を見込んだもの。

---

## 2-4. 最初のリクエストが通る道

ブラウザで `http://localhost:3000/` を開いたときに通るファイルを、順番に並べる。

```
1. app/src/app/layout.tsx          ルートレイアウト。<html lang="ja"> と body を出す
   └ AuthBar（Server Component）   getSessionView() で DB を引く（users / app_instance）
2. app/src/app/page.tsx            トップ。dynamic = "force-dynamic"（キャッシュしない）
   ├ getSessionView()              lib/auth.ts → lib/installId.ts → lib/db.ts → PostgreSQL
   ├ parseMapMode(searchParams)    ?mode=tourism なら観光モード
   └ <MapExplorer session cityCode="12203" initialMode />
3. app/src/components/MapExplorer.tsx  "use client"。ここからブラウザ側
   ├ useEffect ①  LAYERS 3 本を fetch  → /data/evacuation_sites.geojson ほか
   ├ useEffect ②  景観スポットを fetch  → /data/scenic_spots.geojson
   ├ useEffect ③  loadReports()        → GET /api/reports?city=12203
   └ useEffect ④  fetchWeather()       → GET /api/weather?city=12203
4. app/src/components/MapView.tsx      data が揃ってから描画
   ├ await import("maplibre-gl")       ブラウザ専用なので動的 import
   ├ setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")
   ├ new maplibregl.Map({ style: basemapStyle, center: ICHIKAWA_CENTER, zoom: 12.4 })
   └ map.on("load") でソースとレイヤーを積む（[07 章](07-map.md)）
5. ブラウザが国土地理院・ハザードマップのタイルを直接取得
```

**`MapView` は `data`（施設 3 本）が揃うまで描画されない**
（`MapExplorer.tsx` の `{data ? <MapView .../> : <読み込み中の表示>}`）。
GeoJSON の取得に失敗すると `dataError` が立ち、
「オープンデータの読み込みに失敗しました。ページを再読み込みしてください。」と出る。

### DB が落ちていても画面は出る

これは意図した設計。`getSessionView()` の中で `getInstallId()` が
**例外を投げずに `null` を返す**（`app/src/lib/installId.ts:65-68`）。
`null` のときは jwt コールバックがセッションを通さないだけで、画面は出る。

同様に、投稿の API は DB に繋がらないと **503** を返し
（`lib/apiRoute.ts` の `withDb`）、画面側は「投稿だけ空」に落ちる。
地図・ハザードマップ・オープンデータのレイヤーはそのまま見える。

---

## 2-5. 起動を確かめる 3 つのコマンド

```bash
# ① コンテナが 2 つとも上がっているか
cd app && docker compose ps

# ② DB の中に初期データが入ったか（22 件出れば成功）
docker compose exec db psql -U chizuba -d chizuba -c "SELECT count(*) FROM reports;"

# ③ 写真の実体が uploads に配られたか（17 ファイル）
docker compose exec web ls -1 /app/uploads | wc -l
```

---

## 2-6. ポートを変えたいとき

3000 番が塞がっている環境だけ:

```bash
cd app && CHIZUBA_PORT=3100 docker compose up
```

**直すのはこれだけ。** ログインのリダイレクト先も Google のコールバック URL も
リクエストのホストから毎回導くので、他に書き換える設定は無い
（`app/compose.yaml:35-37` のコメント・`app/src/lib/publicOrigin.ts`）。

コンテナ側は常に 3000 のまま（`Dockerfile:32` の `PORT=3000` と対）。

---

## 2-7. 手元で開発するとき（`npm run dev`）

Docker を使わずホットリロードで動かす場合。

```bash
cd app && npm install && npm run dev
```

このとき違うのは 2 点。

1. **`DATABASE_URL` が渡らない。** そのままでも地図まわりは動き、`/login` に
   「データベースに接続できていません」と出るだけ。ログイン・投稿・コメントまで試すには、
   `compose.yaml` の `db` に一時的に `ports: - "5432:5432"` を足してから
   （`db` は既定でホストにポートを公開していないため）:

   ```bash
   docker compose up -d db
   DATABASE_URL=postgres://chizuba:chizuba_local_only@localhost:5432/chizuba npm run dev
   ```

   手順の正本は `app/README.md` の「9. 手元で開発する」（`:563-571`）
2. **投稿写真の置き場が `app/uploads/`（`.gitignore` 済み）になる。**
   `photoStore.ts` が `path.join(process.cwd(), "uploads", ...)` で決めているため。
   デモ投稿の写真は `Dockerfile` が配っているので `npm run dev` では出ない。
   出したければ手でコピーする（`app/README.md:577`）:

   ```bash
   mkdir -p uploads && cp db/seed-photos/*.jpg uploads/
   ```
