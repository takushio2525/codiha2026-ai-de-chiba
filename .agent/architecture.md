# アーキテクチャ

> **AI 向けの記述。** 図や背景の説明は `docs/` に書き、ここには
> **作業に必要な事実**を簡潔に書く。
> 「何を作るか」の正本は [`../docs/design/requirements.md`](../docs/design/requirements.md)。

## 大前提

- サービス本体は **`app/` 配下**に置き、**`docker compose up` で起動できる**こと
- `app/` 配下のファイル名・ディレクトリ名は**すべて英数字**（提出 zip の要件）
- ベースイメージは可能な限り **Docker 公式イメージ（DOI）** を使い、**タグを固定**する
- **認証キーが無いと動かない構成にしない。** Google OAuth だけが例外で、
  キー未設定時はデモログインに落ちる（後述の「認証フロー」）

## システム構成

**コンテナは 2 つ（`web` と `db`）。** 投稿機能（住民・行政の書き込み）のために
PostgreSQL を持つ。オープンデータ由来の静的なレイヤーは今までどおり
GeoJSON として `app/public/data/` に同梱してあり、起動時に取りに行かない。

```
                                       ┌─ 国土地理院タイル（背景地図・キー不要）
                                       ├─ 重ねるハザードマップ タイル（キー不要）
[ブラウザ] --localhost:3000--> [web] ──┼─ /api/routing   --> OSRM（FOSSGIS・キー不要）
                                       ├─ /api/weather   --> 気象庁 防災情報 JSON（キー不要）
                                       ├─ /api/reports   --> [db] PostgreSQL 17（投稿・コメント）
                                       └─ /api/photos    --> uploads ボリューム（投稿写真）
                                                 │
                          depends_on: condition: service_healthy
                                                 ▼
                                              [db] pg_isready で待つ

[市川市 CSV] --build_geojson.py（手元で実行）--> [app/public/data/*.geojson]（コミット済み）
```

- 背景地図タイルと**ハザードマップタイルはブラウザが直接**取りに行く
  （画像タイルなので中継する意味が無く、中継すると `web` が詰まる）
- **徒歩経路と気象データは `web` コンテナ経由**にする。理由は 3 つ:
  ① 利用規約が求める User-Agent を確実に付ける
  ② レート制限（OSRM は 1 秒 1 リクエスト）をサーバー側 1 箇所で守る
  ③ タイムアウトを入れて、外部が落ちていても画面が固まらないようにする
- **気象データはサーバー側でキャッシュ**する（アメダスは 10 分・予報は 30 分）。
  投稿のたびに気象庁へ取りに行くと、投稿数に比例してリクエストが増えるため
- 外部サービスが落ちていても**施設の点と投稿は表示できる**
  （データが同梱＋ DB にあるので）。経路は直線距離の概算に切り替わる

### コンテナの構成

| サービス | イメージ | ポート | 永続化 |
|---|---|---|---|
| `web` | `node:22-slim`（DOI）の multi-stage ビルド | `${CHIZUBA_PORT:-3000}:3000` | — |
| `db` | `postgres:17-alpine`（DOI） | 公開しない（コンテナ間のみ） | named volume `db-data` |
| （`web` の写真置き場） | — | — | named volume `uploads` → `/app/uploads` |

- **`db` のポートはホストに公開しない。** 公開すると審査員のマシンで
  5432 が埋まっていたときに起動しなくなる。ホストから覗く必要があるときだけ
  一時的に `ports` を足す
- `depends_on` に `condition: service_healthy` を付け、`db` の `healthcheck`
  （`pg_isready`）が通るまで `web` を起動しない。配布資料の作成例 2 と同じ作法
- **スキーマは `app/db/init/*.sql`** を `postgres` イメージの
  `/docker-entrypoint-initdb.d` にマウントして流す。マイグレーションツールを入れない
  （依存を 1 つ減らし、審査員の初回起動で確実にスキーマができる）
- **既知の制約**: `/docker-entrypoint-initdb.d` はボリュームが**空のときだけ**走る。
  スキーマを変えたら `docker compose down -v` でボリュームごと作り直す

## データフロー

### 静的なオープンデータ（読むだけ）

```
市川市 CSV（cp932）
  → data/scripts/build_geojson.py（手元で実行・市域外座標を除外）
  → app/public/data/*.geojson（リポジトリにコミット）
  → ブラウザが fetch して MapLibre のソースにする
```

DB を経由しない。**審査員の環境で「データが入っていない」事故が起きない**のが利点。

### 投稿（書き込み）

```
[ブラウザ] 位置・写真・本文・カテゴリ
  → POST /api/reports（multipart）
      ├── 写真: 形式とサイズを検査 → uploads ボリュームへ保存 → ファイル名を DB に記録
      ├── category='flood' なら /api/weather を内部で呼び、投稿時点の雨量を details に焼き込む
      └── reports / report_photos に INSERT
  → GET /api/reports?city=12203&category=...&bbox=... で GeoJSON として返す
  → ブラウザが MapLibre のソースに流す（静的レイヤーと同じ扱いになる）
```

**投稿は GeoJSON で返す。** 静的レイヤーと同じ形式にすることで、
地図側のコードを 1 本に保つ（`app/src/lib/layers.ts` の定義を共有する）。

### 注意案内（F-4・実装済み）

```
[ブラウザ] 起動後の定期処理ではなく、地図を開いたときに 1 回だけ評価する
  ① GET /api/weather?city=… の forecast.rainExpected を見る
       （降水確率が今後 24 時間で 30% 以上あるか。判定は I-6・サーバー側）
  ② 地図に載せている投稿のうち category='flood' の件数を数える
       （投稿は GET /api/reports で既に取ってあるので、専用の API を足さない）
  ③ 両方そろったときだけ、操作パネルの先頭に注意カードを出し、
     地図の該当地点に輪を描く（app/src/components/FloodAlertCard.tsx）
```

**予測ではない。** 過去の投稿という事実と、気象庁の予報という事実を
並べて出すだけ。モデルも推定も持たない（理由は `requirements.md` §3-1）。
**予報が取れなかったときは注意を出さない**（根拠のない警告になるため）。
出す・出さないの判定は `app/src/lib/weather.ts` の `buildFloodAlert` 1 箇所にある。

## 認証フロー

```
起動時（サーバー側で 1 回だけ判定）
GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET が両方ある？
├── YES → authMode = "google"
│          /login → Google OAuth → users(provider='google') に upsert
│          role は環境変数 GOV_ACCOUNTS（メール:市町村コード）で付与
└── NO  → authMode = "demo"   ← 審査員の既定はこちら
           /login → 表示名 + ロール選択（一般 / 行政デモ）→ users(provider='demo')
           画面上部に「デモモードで動作中」を常時表示
```

- セッションは **JWT**（DB セッションを持たない）。テーブルとコードが 1 つ減る。
  ただし**このインストールを識別する 1 行**（`app_instance`）だけは DB に置き、
  **署名鍵をそこから導いてトークンにも焼き込む**。別の場所で動いている CHIZUBA の
  ログイン状態を通さないため（`docs/design/requirements.md` §8-6・`src/lib/installId.ts`）
- **デモモードでも投稿・写真・コメント・行政操作まで全部動く**。ここは要件
- `authMode` の判定結果はサーバーから画面に渡す。**クライアント側でキーの有無を見ない**
- 詳細と環境変数の一覧は `docs/design/requirements.md` §8

## 公開 URL の決め方（設定値ではなくリクエストから導く）

**ログイン系のリダイレクト先と Google のコールバック URL は、環境変数で持たず、
リクエストが名乗ったホストから毎回導く。** ホストは `X-Forwarded-Host` →
（無ければ）`Host`、プロトコルは `X-Forwarded-Proto` →（無ければ）`http`。
`X-Forwarded-Port` は見ない（Next.js がコンテナ内の 3000 を無条件に入れるため）。

**なぜ固定値をやめたか。** 以前は `compose.yaml` が
`AUTH_URL=http://localhost:3000` を渡していた。この方式は
**「公開する住所を変えたら設定も直す」を人間が覚えている前提**で、
実際に破れた（`ports` を 3100 に変えたらログイン後に 3000 番へ飛んだ）。
Tailscale Funnel で外に出す運用では、設定し忘れが即「ログインできない公開サイト」
になる。**設定し忘れで壊れる方式を採らない**、が判断。

**どこで直しているか。** 2 経路あり、直す場所が違う。

| 経路 | 何が URL を決めるか | 対応 |
|---|---|---|
| サーバーアクション（`signIn` / `signOut` / `auth()`） | Auth.js の `createActionURL()` がヘッダーを見る | `trustHost: true` だけでよい（`src/lib/auth.ts`） |
| ルートハンドラ `/api/auth/*`（OAuth コールバック・csrf・session） | `Auth()` が **`req.url`** を見る | `req.url` を組み直してから渡す（`src/app/api/auth/[...nextauth]/route.ts`） |

後者が要るのは、`output: "standalone"` の Next.js が**待ち受けアドレスから
リクエスト URL を組む**ため。`HOSTNAME=0.0.0.0` なので、素のままだと
`http://0.0.0.0:3000/api/auth/...` が渡り、リダイレクト先も `0.0.0.0` になる
（実測。`docs/design/requirements.md` §8-7 に測定結果）。

**逃げ道は残してある。** ホスト名を書き換えてしまうプロキシの後ろに置くなど
自動判定が効かない環境では、`AUTH_URL` を設定すれば Auth.js がそちらを優先する
（こちらのコードは何もしない）。既定では**誰も設定しない**。

**公開ポートも同じ考え方。** `compose.yaml` の `ports` は
`${CHIZUBA_PORT:-3000}:3000`。既定の 3000 は審査員の体験のために動かさず、
塞がっている環境だけ `CHIZUBA_PORT=3100 docker compose up` で逃がす。
**ポートを変えても他に直す設定は無い**（上のとおり URL は自動で追従する）。

## 千葉県全域対応の建付け

**対応は千葉県全域、初期データとデモシナリオは市川市。**
「市川市専用に作ってあとで広げる」のではなく、**最初から市町村をパラメータにする**。

| 何を | どうする |
|---|---|
| 市町村の識別 | **JIS X 0402 の 5 桁コード**（市川市 = `12203`） |
| 初期表示の座標・ズーム・範囲 | `municipalities` テーブルから引く。**コードに座標を書かない** |
| 投稿の所属 | `reports.city_code`。投稿された座標を市町村の `bbox` で判定して決める |
| 画面の持ち回り | URL の `?city=12203`。**未指定なら市川市**（デモの既定） |
| 静的 GeoJSON | ファイル名に市町村コードを含める（`12203_*.geojson`）か、`city_code` を properties に持つ |

**市町村を 1 つ増やす作業 = マスタに 1 行足す + その市の CSV を GeoJSON 化する。**
コードの変更を伴わないことが、この建付けの目的。

## コンポーネントと担当

詳細は `../docs/design/assignments.md`。ここには**コードの置き場所**を書く。

| コンポーネント | 置き場所 | 単独で動かす方法 |
|---|---|---|
| 画面全体（地図・操作パネル） | `app/src/components/` | `cd app && npm run dev` |
| 地図の描画（MapLibre） | `app/src/components/MapView.tsx` | 同上 |
| レイヤー定義（静的・投稿の両方） | `app/src/lib/layers.ts` | — |
| ハザードの重ねと浸水深の凡例 | `app/src/lib/hazards.ts`・`app/src/components/HazardLegend.tsx` | — |
| 経路の中継 API | `app/src/app/api/routing/route.ts` | `curl 'localhost:3000/api/routing?from=139.93,35.72&to=139.92,35.75'` |
| 気象の中継 API | `app/src/app/api/weather/route.ts`・`app/src/lib/jma.ts` | `curl 'localhost:3000/api/weather?city=12203'` |
| 注意案内の判定と文言 | `app/src/lib/weather.ts`・`app/src/components/FloodAlertCard.tsx` | — |
| 投稿 API | `app/src/app/api/reports/` | `curl 'localhost:3000/api/reports?city=12203'` |
| 写真の配信 | `app/src/app/api/photos/` | `curl -I 'localhost:3000/api/photos/1/1'` |
| 投稿の定義（カテゴリ・上限・型） | `app/src/lib/reports.ts` | — |
| 投稿の読み書き（SQL） | `app/src/lib/reportStore.ts`・`app/src/lib/photoStore.ts` | — |
| 投稿の画面 | `app/src/components/ReportForm.tsx`（S-4）・`ReportPanel.tsx`（S-3）・`app/src/app/reports/`（S-5） | `npm run dev` |
| 認証 | `app/src/lib/auth.ts` | `/login` を開く |
| 公開 URL の導出 | `app/src/lib/publicOrigin.ts`・`app/src/app/api/auth/[...nextauth]/route.ts` | `curl -H 'X-Forwarded-Host: example.test' -H 'X-Forwarded-Proto: https' ...` で Location を見る |
| DB スキーマ | `app/db/init/*.sql` | `docker compose exec db psql -U chizuba -d chizuba` |
| CSV → GeoJSON 変換 | `data/scripts/build_geojson.py` | `python3 data/scripts/build_geojson.py` |

## コンポーネント間のデータ形式

**正本は `../docs/design/interfaces.md`。** ここには要点だけ書く。

| つなぎ目 | 形式 | 経路 |
|---|---|---|
| 市川市 CSV → 地図 | GeoJSON（`FeatureCollection`・properties のキーは英字） | `app/public/data/*.geojson`（コミット） |
| ブラウザ → 経路 API | `GET /api/routing?from=<経度>,<緯度>&to=<経度>,<緯度>` | 同一オリジン |
| ブラウザ → 投稿 API | `POST /api/reports`（multipart）／`GET /api/reports`（GeoJSON で返す） | 同一オリジン |
| ブラウザ → 気象 API | `GET /api/weather?city=<市町村コード>` | 同一オリジン |
| `web` → `db` | SQL（`pg` クライアント）。接続先は `DATABASE_URL` | コンテナ間ネットワーク |

**座標はすべて `[経度, 緯度]` の順**（GeoJSON と MapLibre に合わせている）。
`data/analysis/` の Python 側と DB のカラム（`lat` / `lon`）は `緯度, 経度` の順なので、混ぜない。

**この形式を変える変更は影響が広い。** 送る側と受け取る側を必ず同時に直す。

## 使うオープンデータ・外部サービス

**参照元（クレジット）は必ず記録する。** プレゼン資料への記載が要件になっている。

**文言の正本は `app/src/lib/credits.ts`。** 地図の隅と `/about` の両方がここを読む。

| データ・サービス | 出典 | 取得方法 | ライセンス・規約 |
|---|---|---|---|
| 指定緊急避難場所（123 件） | 市川市オープンデータ | CSV → `build_geojson.py` | CC BY 4.0 |
| AED 設置箇所（304 件） | 市川市オープンデータ | 同上 | CC BY 4.0 |
| 子育て施設（388 件） | 市川市オープンデータ | 同上 | CC BY 4.0 |
| いちかわ景観100選（100 件・**予定**） | 市川市オープンデータ | 同上 | CC BY 4.0 |
| 背景地図 | 国土地理院「淡色地図」タイル | XYZ タイル（キー不要） | 国土地理院コンテンツ利用規約 |
| **ハザードマップ（洪水・高潮・津波）** | **国土交通省 ハザードマップポータルサイト「重ねるハザードマップ」** | XYZ タイル（キー不要） | 公共データ利用規約（第 1.0 版）PDL1.0 |
| 徒歩経路 | OSRM（FOSSGIS e.V.）／道路データは OpenStreetMap | HTTP API（キー不要） | ODbL |
| **雨量・雨予報** | **気象庁 防災情報 JSON**（アメダス実況・府県予報） | HTTP（キー不要） | 公共データ利用規約（第 1.0 版）PDL1.0 |

### ハザードタイルの疎通（2026-08-24 実測・市川市 z=14）

| 種別 | パス | 市川市 | 実装 |
|---|---|:---:|:---:|
| 洪水浸水想定区域（想定最大規模） | `01_flood_l2_shinsuishin_data` | 200 | ○ |
| 高潮浸水想定区域 | `03_hightide_l2_shinsuishin_data` | 200 | ○ |
| 津波浸水想定 | `04_tsunami_newlegend_data` | 200 | ○ |
| 土砂災害警戒区域 | `05_dosekiryukeikaikuiki` | 404（市川市は平地で該当区域が無い） | — |

**配信されているズームは 2〜17**（ハザードマップポータルの記載どおり）。
それより拡大したときは MapLibre が z=17 のタイルを引き伸ばす。

**タイルが無い＝安全ではない。** 想定区域が公表されていない河川・地域では
その場所のタイルが 404 になり、地図には何も描かれない。凡例に注意書きを常時出し、
白紙を「危険なし」と誤読させない。

### 浸水深の凡例は 2 種類ある（2026-08-24・千葉県内 20 タイルの画素を数えて確認）

| 使うレイヤー | 段階 | 色 |
|---|:---:|---|
| 洪水浸水想定区域 | 6 | `#f7f5a9`(〜0.5m) `#ffd8c0`(0.5〜3m) `#ffb7b7`(3〜5m) `#ff9191`(5〜10m) `#f285c9`(10〜20m) `#dc7adc`(20m〜) |
| 津波浸水想定・高潮浸水想定区域 | 8 | 上に `#ffffb3`(〜0.3m) `#f8e1a6`(0.5〜1m) が加わり、`#f7f5a9` は 0.3〜0.5m、`#ffd8c0` は 1〜3m を表す |

**同じ色でも表す深さが違う。** 1 つの凡例にまとめると誤読するので、
`app/src/lib/hazards.ts` で 2 つに分け、重ねている想定に合わせて出し分けている。

## 設計判断の記録

大きな判断（言語選定・コンテナ構成・ライブラリ採否）は
`../docs/decisions/` に ADR として残す。ここには結論だけ書く。

| 判断 | 結論 | 理由 |
|---|---|---|
| 実装言語・フレームワーク | Next.js（App Router）+ TypeScript | 地図 UI とサーバー側の中継 API を 1 コンテナに収められる |
| 地図ライブラリ | MapLibre GL JS | 認証キー不要。ネイティブ拡張を持たない純 JS |
| 背景地図 | 国土地理院「淡色地図」 | 無認証・出典明記のみ。国内で安定 |
| ハザードマップ | 国土地理院の**ラスタタイルを重ねる** | 無認証。ポリゴンを DB に入れずに済み、実装が最小になる |
| 経路サービス | OSRM（FOSSGIS） | 無認証。徒歩プロファイルあり（実測で確認済み） |
| 気象データ | 気象庁 防災情報 JSON | 無認証。一次情報であり出典として強い |
| CSS | Tailwind CSS v4 | 提出までの期間が短く、書き足しの速度を優先 |
| アイコン | lucide-react | 依存ゼロの SVG コンポーネント。**絵文字は UI に使わない** |
| 配色 | Okabe-Ito | 色覚多様性に配慮した配色として国内で実績がある |
| **DB** | **PostgreSQL 17（`postgres:17-alpine`・DOI）を追加** | 住民・行政の投稿を保存するため。**方針変更**（従来は「使わない」） |
| **PostGIS** | **使わない**（緯度経度の数値カラム + Haversine） | DOI ではない。必要なのは矩形検索と距離だけで、投稿は 1 市数百件の規模 |
| **DB クライアント** | **`pg`（node-postgres）** | 純 JS。ORM もマイグレーションツールも入れず、依存とビルドリスクを増やさない |
| **スキーマ投入** | `/docker-entrypoint-initdb.d` に SQL をマウント | 審査員の初回起動で確実にスキーマができる。追加の手順が要らない |
| **投稿写真の保存** | **named volume にファイル、DB にはファイル名** | DB の行が軽く、一覧の取得が速い。**`Dockerfile` で `/app/uploads` を作って `node` 所有にしておく**（そうしないと volume が root 所有になり、`USER node` で書けない） |
| **写真の置き場のパス** | **`process.cwd()/uploads` に固定**（環境変数で差し替えない） | Next のビルドはファイル操作のパスを静的に追う。追えないと「プロジェクト全体を出力に同梱する」動きになり、実行イメージが膨らむ（実測でビルド警告 3 件） |
| **投稿写真の形式の検査** | **申告された MIME に加えて先頭バイトも見る** | 拡張子と Content-Type は書き換えられる。画像でないものを画像として置かれるのを防ぐ最低限（`requirements.md` §10-1） |
| **認証** | Auth.js（NextAuth）+ Google OAuth、**キー未設定時はデモログイン** | 審査員が `docker compose up` だけで投稿機能まで試せるようにするため |
| **セッション** | JWT（DB セッションを持たない）＋ インストール ID による縛り | テーブルとコードが 1 つ減る。ID を混ぜるのは、`users.id` がただの連番で、別の DB で発行されたトークンを見分けられないため（実測で行政権限が通った） |
| **投稿モデル** | **危険箇所・浸水・観光おすすめを 1 テーブルに統一**（`category` + `details` JSON） | API・フォーム・地図レイヤーが 3 倍にならない。詳細は `requirements.md` §4 |
| **公開 URL** | **リクエストのヘッダーから毎回導く**（`AUTH_URL` を既定で渡さない） | 固定値は「住所を変えたら設定も直す」を人間が覚えている前提で、実際に破れた（3100 番で開くとログイン後に 3000 番へ飛んだ）。Funnel 公開では設定し忘れが即「ログインできない公開サイト」になる |
| **公開ポート** | **`${CHIZUBA_PORT:-3000}`**（既定 3000 は動かさない） | 審査員の `docker compose up` の体験を変えずに、塞がっている環境だけ逃がせる。ポートを変えても URL は自動で追従するので直す設定が他に無い |
