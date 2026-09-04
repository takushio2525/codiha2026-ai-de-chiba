# 01. 全体像と接続図

この章だけで「何が何と繋がっているか」が分かるようにする。個々の中身は次章以降。

---

## 1-1. ひとことで言うと

CHIZUBA は **Next.js のサーバー 1 つと PostgreSQL 1 つ**でできている。
コンテナは 2 個、それ以外に動いているものは無い。

- **地図に載る「行政のデータ」（避難場所・AED・子育て施設・景観100選）は
  GeoJSON ファイルとしてアプリに同梱してあり、データベースを通らない**
- **データベースを使うのは「住民と行政の投稿」だけ**
- 背景地図・ハザードマップ・徒歩経路・気象は**外部サービス**から取る。
  **どれも認証キーが要らない**

この 3 つが CHIZUBA の構造のすべて。以下の図はこれを詳しくしたもの。

---

## 1-2. ①コンテナ間と外部サービスの接続図

```mermaid
flowchart TB
    subgraph browser["利用者のブラウザ"]
        UI["CHIZUBA の画面<br/>（React / MapLibre GL JS）"]
    end

    subgraph host["審査員の PC（docker compose up）"]
        subgraph web["コンテナ web ｜ node:22-slim<br/>Next.js standalone（server.js）"]
            SSR["サーバーコンポーネント<br/>app/src/app/**/page.tsx"]
            API["API ルート<br/>app/src/app/api/**/route.ts"]
            STATIC["静的ファイル<br/>app/public/"]
        end
        subgraph db["コンテナ db ｜ postgres:17-alpine"]
            PG[("chizuba データベース<br/>6 テーブル")]
        end
        VOL1[("named volume<br/>db-data")]
        VOL2[("named volume<br/>uploads<br/>投稿写真の実体")]
    end

    subgraph ext["外部サービス（すべて認証キー不要）"]
        GSI["国土地理院 淡色地図タイル<br/>cyberjapandata.gsi.go.jp"]
        HAZ["重ねるハザードマップ タイル<br/>disaportaldata.gsi.go.jp"]
        JMA["気象庁 防災情報 JSON<br/>www.jma.go.jp/bosai"]
        OSRM["OSRM 徒歩経路<br/>routing.openstreetmap.de"]
        GOOGLE["Google OAuth<br/>（鍵を入れた環境だけ）"]
    end

    UI -->|"HTTP :3000"| SSR
    UI -->|"fetch /api/*"| API
    UI -->|"GET /data/*.geojson<br/>/images/scenic/*.jpg"| STATIC
    UI -.->|"タイルを直接読む<br/>（サーバーを経由しない）"| GSI
    UI -.->|"タイルを直接読む"| HAZ

    SSR -->|"pg（TCP 5432）"| PG
    API -->|"pg（TCP 5432）"| PG
    API -->|"ファイル読み書き<br/>/app/uploads"| VOL2
    API -->|"中継（UA 明示・キャッシュ）"| JMA
    API -->|"中継（1 秒 1 リクエスト）"| OSRM
    API <-->|"OAuth 2.0"| GOOGLE
    PG --- VOL1
```

読み方の要点。

- **ブラウザが直接叩く外部サービスは「地図タイル 2 種類」だけ**（点線）。
  画像なので中継する意味が薄く、ブラウザのキャッシュがそのまま効く
- **気象庁と OSRM はサーバーが中継する**（実線）。理由は
  「User-Agent を確実に名乗る」「サーバー側でキャッシュする」「1 秒 1 リクエストを守る」の 3 つ
  （`app/src/app/api/routing/route.ts` の冒頭コメント・`app/src/lib/jma.ts` の冒頭コメント）
- **`db` はホストにポートを公開していない**（`app/compose.yaml:91-93` のコメント）。
  審査員のマシンで 5432 番が埋まっていても起動できるようにするため。
  中を見るときは `docker compose exec db psql -U chizuba -d chizuba`

### コンテナの諸元

| | web | db |
|---|---|---|
| イメージ | `node:22-slim`（Docker 公式イメージ・multi-stage で自前ビルド） | `postgres:17-alpine`（Docker 公式イメージ） |
| 定義 | `app/Dockerfile`・`app/compose.yaml:26-65` | `app/compose.yaml:67-93` |
| 公開ポート | ホスト `${CHIZUBA_PORT:-3000}` → コンテナ 3000 | **公開しない**（コンテナ間ネットワークのみ） |
| 起動コマンド | `node server.js`（`Dockerfile:54`） | 公式イメージの entrypoint |
| 実行ユーザー | `node`（`Dockerfile:52`） | 公式イメージの既定 |
| ボリューム | `uploads:/app/uploads` | `db-data:/var/lib/postgresql/data`＋`./db/init:/docker-entrypoint-initdb.d:ro` |
| 起動順 | `db` の healthcheck が通ってから起動（`depends_on.condition: service_healthy`） | 先に起動 |

---

## 1-3. ②画面 → API → データの対応図

「画面のどの部品が、どの API を叩き、どのテーブル／外部サービスに行き着くか」。

```mermaid
flowchart LR
    subgraph screens["画面（app/src/app/）"]
        P0["/ = page.tsx<br/>地図 S-1/S-2"]
        P1["/reports = reports/page.tsx<br/>投稿一覧 S-5"]
        P2["/login = login/page.tsx<br/>ログイン S-6"]
        P3["/about = about/page.tsx<br/>出典 S-7"]
        P4["/privacy = privacy/page.tsx<br/>プライバシー S-8"]
    end

    subgraph comps["主なコンポーネント（app/src/components/）"]
        MEX["MapExplorer.tsx<br/>（状態の親）"]
        MV["MapView.tsx<br/>（MapLibre）"]
        CP["ControlPanel.tsx"]
        RP["ReportPanel.tsx<br/>詳細 S-3"]
        RF["ReportForm.tsx<br/>投稿 S-4"]
    end

    subgraph apis["API ルート（app/src/app/api/）"]
        A1["GET/POST /api/reports"]
        A2["GET/PATCH/DELETE /api/reports/:id"]
        A3["POST /api/reports/:id/comments"]
        A4["GET /api/reports/export"]
        A5["GET /api/photos/:id/:n"]
        A6["GET /api/weather"]
        A7["GET /api/routing"]
        A8["/api/auth/*"]
    end

    subgraph stores["データの実体"]
        T1[("reports")]
        T2[("report_comments")]
        T3[("report_photos")]
        T4[("users / municipalities / app_instance")]
        F1["public/data/*.geojson<br/>（同梱・DB を通らない）"]
        F2[("uploads ボリューム")]
        X1["気象庁 JSON"]
        X2["OSRM"]
        X3["Google OAuth"]
    end

    P0 --> MEX
    MEX --> MV & CP & RP & RF
    MEX -->|"fetchReports()"| A1
    MEX -->|"fetch(layer.file)"| F1
    MEX -->|"fetchWeather()"| A6
    MV -->|"fetchWalkingRoute()"| A7
    RF -->|"submitReport()"| A1
    RP -->|"fetchReportDetail()"| A2
    RP -->|"submitComment()"| A3
    RP -->|"patchReport() / deleteReport()"| A2
    RP -->|"img src=photoUrls"| A5
    CP -->|"リンク（a href）"| A4
    P1 -->|"サーバー側で直接 listReports()"| T1
    P2 --> A8
    P3 -.->|"credits.ts を読むだけ"| F1

    A1 & A2 & A4 --> T1
    A2 & A3 --> T2
    A1 & A2 & A5 --> T3
    A1 & A2 & A3 & A8 --> T4
    A5 --> F2
    A1 --> X1
    A6 --> X1
    A7 --> X2
    A8 --> X3
```

**注意すべき例外が 2 つある。**

1. **投稿一覧 `/reports` は API を経由しない。** サーバーコンポーネントなので、
   `app/src/app/reports/page.tsx:85` が `listReports()` を直接呼んで SQL を投げる。
   だから **JavaScript が無効でも一覧・絞り込み・書き出しが動く**（絞り込みはリンクと GET フォーム）
2. **浸水投稿に焼き込む雨量は `/api/weather` を通らない。**
   `POST /api/reports` が `lib/jma.ts` の `observeRainfall()` を直接呼ぶ
   （`app/src/app/api/reports/route.ts:84`）。
   自分自身へ HTTP を投げるとコンテナ内の自ホスト判定に引きずられて壊れやすいため
   （同ファイルの冒頭コメント）

---

## 1-4. ③認証フロー

```mermaid
sequenceDiagram
    participant B as ブラウザ
    participant L as /login（Server Component）
    participant SA as サーバーアクション<br/>lib/authActions.ts
    participant AJ as Auth.js<br/>lib/auth.ts
    participant G as Google
    participant DB as PostgreSQL

    Note over L: getSessionView() で<br/>authMode と現在のログイン状態を決める

    alt デモログイン（鍵の有無に関わらず常に使える）
        B->>SA: form action = demoLoginAction<br/>（表示名・ロール・PIN）
        SA->>SA: verifyGovPin()（GOV_DEMO_PIN 未設定なら素通り）
        SA->>AJ: signIn("demo", ...)
        AJ->>AJ: Credentials.authorize()<br/>表示名を検証・PIN を再確認
        AJ->>DB: upsertUser(provider='demo',<br/>provider_uid='<ロール>/<表示名>')
        DB-->>AJ: users の 1 行
    else Google ログイン（鍵が 2 つ揃った環境だけ）
        B->>SA: form action = googleSignInAction
        SA->>AJ: signIn("google")
        AJ-->>B: 302 accounts.google.com へ
        B->>G: 同意
        G-->>B: 302 /api/auth/callback/google
        B->>AJ: コールバック<br/>（route.ts が publicOriginFrom で URL を直す）
        AJ->>AJ: govCityCodeFor(email) で行政ロール判定
        AJ->>DB: upsertUser(provider='google',<br/>provider_uid=Google の sub)
        DB-->>AJ: users の 1 行
    end

    AJ->>DB: SELECT install_id FROM app_instance
    DB-->>AJ: このインストールの UUID
    Note over AJ: 署名鍵 = sha256("chizuba-session-key:" + install_id)<br/>（AUTH_SECRET があればそちらが優先）
    AJ-->>B: Set-Cookie: authjs.session-token（暗号化 JWT）<br/>中身 uid / displayName / role / govCityCode / inst

    Note over B,DB: 以降のリクエスト
    B->>AJ: Cookie 付きでアクセス
    AJ->>AJ: jwt コールバック：token.inst === install_id か？
    alt 一致しない（別インストールのトークン）
        AJ-->>B: null を返す＝未ログイン扱い
    end
```

要点は 3 つ。

- **デモログインは常に登録される。** Google の鍵は「Google を足すかどうか」だけに効く
  （`app/src/lib/auth.ts:90-151` の `providers()`）。
  鍵を入れた公開環境でも、Google アカウントを持たない人が投稿できる
- **セッションはこの DB に縛られている。** JWT に `inst`（インストール ID）を焼き込み、
  毎リクエストで突き合わせる（`auth.ts:183`）。
  だから `docker compose down -v` を打つと**全員ログアウトする**
- **公開 URL は設定値で持たない。** リクエストの `X-Forwarded-Host` →（無ければ）`Host`
  から毎回導く（`app/src/lib/publicOrigin.ts`）。詳細は [06 章](06-auth.md)

---

## 1-5. ④データパイプライン

```mermaid
flowchart LR
    subgraph src["元データ（外部）"]
        S1["市川市オープンデータ<br/>CSV・cp932<br/>CC BY 4.0"]
        S2["千葉県オープンデータ<br/>xls/xlsx・PDL1.0"]
        S3["ウィキメディア・コモンズ<br/>CC0 / CC BY / CC BY-SA"]
    end

    subgraph repo["リポジトリに保管（data/）"]
        R1["data/ichikawa-city/raw/*.csv<br/>9 ファイル"]
        R2["data/chiba-pref/raw/*.xls*<br/>8 ファイル"]
        R3["※画像は data/ に置かない<br/>（SOURCE.md に台帳だけ）"]
    end

    subgraph scripts["加工スクリプト（data/scripts/）"]
        C0["fetch_datasets.py<br/>manifest.json の URL を取得"]
        C1["build_geojson.py<br/>CSV → GeoJSON"]
        C2["fetch_scenic_photos.py<br/>コモンズから写真取得"]
        C3["build_scenic_photos_ts.py<br/>写真台帳を .ts に"]
        C4["fetch_seed_photos.py<br/>デモ投稿用の写真"]
        C5["data/analysis/scripts/0*.py<br/>分析図（アプリには載らない）"]
    end

    subgraph app["アプリに同梱（app/）"]
        A1["public/data/evacuation_sites.geojson（123）"]
        A2["public/data/aed_locations.geojson（304）"]
        A3["public/data/childcare_facilities.geojson（388）"]
        A4["public/data/scenic_spots.geojson（100）"]
        A5["public/images/scenic/*.jpg（54 枚）"]
        A6["src/lib/scenicPhotos.ts（自動生成）"]
        A7["db/seed-photos/*.jpg（17 枚）"]
    end

    subgraph read["アプリが読む場所"]
        L1["lib/layers.ts の LAYERS[].file<br/>→ MapExplorer が fetch"]
        L2["lib/scenic.ts の SCENIC_FILE<br/>→ MapExplorer が fetch"]
        L3["MapView.tsx の scenicPhoto()"]
        L4["db/init/003_seed_demo_reports.sql<br/>→ Dockerfile が uploads へ配る"]
    end

    S1 --> C0 --> R1 --> C1 --> A1 & A2 & A3 & A4
    S2 --> C0 --> R2 --> C5
    S3 --> C2 --> A5 --> C3 --> A6
    S3 --> C4 --> A7
    A1 & A2 & A3 --> L1
    A4 --> L2
    A6 --> L3
    A7 --> L4
```

**元データが直接アプリに入ることはない。** かならず `data/scripts/` のどれかを通る。
理由は「cp932 で読む」「市域外の座標を落とす」「列名を英字キーに直す」という
加工が要るため（`data/scripts/build_geojson.py` の docstring）。詳細は [09 章](09-data-pipeline.md)。

---

## 1-6. 依存の向き（`app/src/lib/` の層）

`lib/` の中は、**ブラウザからも読めるもの**と**サーバー専用**が混在している。
混ぜると壊れる（`pg` はブラウザで動かない）ので、各ファイルの冒頭コメントに
どちら向きかが必ず書いてある。

```mermaid
flowchart TB
    subgraph both["両方から読める（Node.js の API も DB も使わない）"]
        reports["reports.ts<br/>投稿の定義・上限・型"]
        reportRange["reportRange.ts<br/>日付範囲"]
        searchText["searchText.ts<br/>NFKC 正規化"]
        weather["weather.ts<br/>気象の型・注意案内の判定"]
        reportExport["reportExport.ts<br/>CSV / GeoJSON 生成"]
        displayName["displayName.ts"]
        geo["geo.ts / routing.ts / layers.ts<br/>scenic.ts / hazards.ts / basemap.ts<br/>mapModes.ts / credits.ts / scenicPhotos.ts"]
        reportsApi["reportsApi.ts<br/>（ブラウザ専用の fetch ラッパ）"]
    end

    subgraph server["サーバー専用（読み込むとブラウザ向けビルドが壊れる）"]
        db["db.ts（pg）"]
        installId["installId.ts"]
        users["users.ts"]
        municipalities["municipalities.ts"]
        reportStore["reportStore.ts"]
        photoStore["photoStore.ts（fs）"]
        reportInput["reportInput.ts"]
        auth["auth.ts / authMode.ts / authActions.ts / govPin.ts"]
        jma["jma.ts"]
        apiRoute["apiRoute.ts / apiResponse.ts"]
        publicOrigin["publicOrigin.ts"]
    end

    reportInput --> reports & reportRange & searchText & photoStore & municipalities
    reportStore --> db & reports & reportRange
    reportExport --> reports
    auth --> installId & users & govPin & displayName & municipalities & authMode
    installId --> db
    users --> db
    municipalities --> db
    apiRoute --> db & municipalities & reportInput & apiResponse
    jma --> weather
    photoStore --> reports
    reportsApi --> reports & reportRange
    routingLib["routing.ts"] --> geo
```

**このルールを破ると何が起きるか。** たとえば `reports.ts`（ブラウザからも読む）から
`db.ts` を import すると、ブラウザ向けのバンドルに `pg` が入り、ビルドが通っても実行時に壊れる。
だから `reports.ts` の冒頭に「ここに DB や Node.js の API を持ち込まないこと」と明記してある
（`app/src/lib/reports.ts:3-4`）。

---

## 1-7. 画面の重ね順（z-index）

地図の上に UI が重なる画面なので、重ね順は 1 か所で決めてある。
根拠は `app/src/app/globals.css:52-62` と各コンポーネントの `z-*` クラス。

| 重ね | 何 | 定義場所 |
|---|---|---|
| 40 | 通知（Toast） | `MapExplorer.tsx` の Toast を包む div |
| 30 | 投稿フォーム（S-4） | `ReportForm.tsx` の最外 div |
| 20 | 投稿の詳細（S-3） | `ReportPanel.tsx` の `aside` |
| **15** | **MapLibre のポップアップ** | `globals.css`（`.maplibregl-map .maplibregl-popup`） |
| 10 | 操作パネル（ControlPanel） | `ControlPanel.tsx` の `aside` |
| 0 | 地図そのもの | `MapView.tsx` |

**ポップアップの 15 は CSS で後付けしている。** MapLibre のポップアップは既定で
`z-index` を持たず、スマホでは操作パネル（下からせり上がるシート）の裏に完全に隠れていた
（実測。`.agent/progress.md` 2026-08-27 の項）。
