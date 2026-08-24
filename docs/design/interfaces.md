# チーム間インターフェース定義書

コンポーネント同士の**つなぎ目**の仕様。**ここが確定するまでそのつなぎ目の実装を始めない。**
考え方は [`../before_coding.md`](../before_coding.md) の「② コンポーネント間のデータフォーマット」を読む。

> **このファイルの内容を変えるときは必ず PR にする。** 口頭やチャットで「変えたから」は禁止。
> 影響を受ける人全員に通知が飛ぶこと、変更の記録が残ることの 2 つが目的。

**何を作るかの正本は [`requirements.md`](requirements.md)。構成の正本は
[`../../.agent/architecture.md`](../../.agent/architecture.md)。**

---

## 共通の約束

この 4 つは全つなぎ目に効く。個別の節で繰り返さない。

1. **座標は `[経度, 緯度]` の順**（GeoJSON と MapLibre に合わせる）。
   DB のカラム（`lat` / `lon`）と Python 側だけが `緯度, 経度` の順。**行き来で間違えない**
2. **レスポンスの形は 2 通りだけ**
   - **地図が直接ソースとして読む `GET`** → **GeoJSON の `FeatureCollection` をそのまま返す**
     （MapLibre の `source.data` に URL を渡せる。変換コードが 1 段減る）
   - **それ以外すべて** → `{ ok: true, ... }` / `{ ok: false, reason: string }`
     （既存の `/api/routing` に合わせる）
3. **失敗時は HTTP ステータスも合わせる**（`400` 入力不正 / `401` 未ログイン /
   `403` 権限なし / `404` 無い / `413` 大きすぎ / `502` 外部サービス失敗 /
   `503` DB に繋がらない / `504` タイムアウト）。
   `reason` は**画面にそのまま出せる日本語**にする
4. **外部サービスを呼ぶつなぎ目には必ずタイムアウトを入れる。**
   落ちていても画面が固まらず、代わりに何が起きたか出せる形にする

---

## つなぎ目の一覧

| # | 送る側 | 受け取る側 | 何を渡すか | 経路 | 確定 |
|:-:|---|---|---|---|:---:|
| I-1 | `build_geojson.py` | 地図（MapLibre） | オープンデータの点（GeoJSON） | `app/public/data/*.geojson` | ☑ |
| I-2 | ブラウザ | 経路 API | 出発地・目的地 → 徒歩経路 | `GET /api/routing` | ☑ |
| I-3 | ブラウザ | 投稿 API | 絞り込み条件 → 投稿一覧（GeoJSON） | `GET /api/reports` | ☑ |
| I-4 | ブラウザ | 投稿 API | 新規投稿（位置・写真・本文） | `POST /api/reports` | ☑ |
| I-5 | ブラウザ | 投稿 API | 投稿の更新（対応状況・コメント） | `PATCH /api/reports/:id`・`POST /api/reports/:id/comments` | ☑ |
| I-6 | ブラウザ | 気象 API | 市町村コード → 雨量・雨予報 | `GET /api/weather` | ☑ |
| I-7 | `web` | `db` | SQL（投稿・ユーザー・市町村） | コンテナ間ネットワーク | ☑ |
| I-8 | サーバー | 画面 | ログイン状態と認証モード | セッション（JWT） | ☑ |
| I-9 | ブラウザ | ハザードタイル | 想定区域のラスタタイル | 外部 XYZ（直接） | ☑ |

**☑ = 仕様確定。実装済みかどうかとは別**（実装の進み方は `requirements.md` §9）。

---

## I-1: オープンデータの点（実装済み）

| 項目 | 内容 |
|---|---|
| バージョン | `v1` |
| 送る側 / 受け取る側 | `data/scripts/build_geojson.py` / `app/src/components/MapView.tsx` |
| 経路 | `app/public/data/*.geojson`（リポジトリにコミット済み。実行時に取りに行かない） |
| 頻度 | 元データを更新したときだけ手元で再生成 |

- 形式は GeoJSON の `FeatureCollection`。`geometry` は `Point`、座標は `[経度, 緯度]`
- **`properties` のキーは英字**（日本語キーにしない）。定義は `app/src/lib/layers.ts` の `FacilityProps`
- **値が空のキーは出力しない**（スクリプト側で落とす）。受け取る側は全キーを省略可能として扱う
- 市域外の座標はスクリプトが除外する

### 異常時の約束

- ファイルが取れなかったら → そのレイヤーだけ表示しない。**他のレイヤーと地図は出す**
- `properties` に知らないキーがあったら → 無視する（ポップアップに出さない）

---

## I-2: 徒歩経路（実装済み）

| 項目 | 内容 |
|---|---|
| バージョン | `v1` |
| 経路 | `GET /api/routing?from=<経度>,<緯度>&to=<経度>,<緯度>`（同一オリジン） |
| 実体 | `app/src/app/api/routing/route.ts`（型定義もここが正本） |
| 中継する理由 | User-Agent の明示・1 秒 1 リクエストの制限・タイムアウト |

```jsonc
// 成功
{ "ok": true, "distanceMeters": 1234, "durationSeconds": 890, "geometry": { /* LineString */ } }
// 失敗
{ "ok": false, "reason": "経路サービスに接続できませんでした" }
```

### 異常時の約束

- OSRM が落ちている / タイムアウト → `ok: false` を返し、**画面は直線距離の概算に切り替える**
- 座標が範囲外・パースできない → `400` と `ok: false`

---

## I-3: 投稿の一覧取得

| 項目 | 内容 |
|---|---|
| バージョン | `v1` |
| 経路 | `GET /api/reports`（同一オリジン） |
| 頻度 | 地図を開いたとき・カテゴリを切り替えたとき・投稿した直後 |
| ログイン | **不要**（未ログインでも読める。防災情報をログインの壁の向こうに置かない） |

### クエリパラメータ

| 名前 | 型 | 必須 | 既定 | 説明 |
|---|---|:---:|---|---|
| `city` | 5 桁の数字 | — | `12203`（市川市） | 市町村コード（JIS X 0402） |
| `category` | `hazard` \| `flood` \| `spot` | — | 全部 | カンマ区切りで複数指定できる |
| `bbox` | `西,南,東,北`（度） | — | 市町村の範囲 | 地図の表示範囲。範囲外の投稿を引かないため |
| `status` | `open` \| `ack` \| `in_progress` \| `done` | — | 全部 | 対応状況で絞る |
| `limit` | 整数 | — | `500` | 上限 `1000`。超えたら `400` |

### レスポンス（GeoJSON をそのまま返す）

```jsonc
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": { "type": "Point", "coordinates": [139.9310, 35.7218] },  // [経度, 緯度]
    "properties": {
      "id": 42,
      "category": "flood",
      "title": "○○交差点が冠水",
      "body": "膝下まで水が来ています",
      "cityCode": "12203",
      "status": "ack",
      "authorName": "たろう",        // 表示名のみ。メールアドレスは返さない
      "authorRole": "user",          // "user" | "gov"
      "createdAt": "2026-09-01T12:34:56+09:00",
      "photoCount": 1,
      "photoUrls": ["/api/photos/42/1"],
      "commentCount": 2,
      "hasOfficialComment": true,
      "details": { "rainfallMm": 18.5, "observedAt": "2026-09-01T12:30:00+09:00",
                   "amedasStation": "船橋", "depthLevel": "knee" }
    }
  }]
}
```

- **`details` はカテゴリごとに中身が変わる**（`requirements.md` §4 の表が正本）。
  受け取る側は**知らないキーを無視**する
- **メールアドレス・`provider_uid` は絶対に返さない。** 返すのは表示名とロールだけ

### 異常時の約束

- パラメータが不正 → `400` + `{ ok: false, reason }`（この経路だけ GeoJSON ではない）
- DB に繋がらない → `503` + `{ ok: false, reason: "投稿を読み込めませんでした" }`。
  **地図と静的レイヤーは出す**（投稿レイヤーだけ空にする）
- 該当 0 件 → `200` + `features: []`（エラーにしない）

---

## I-4: 投稿の作成

| 項目 | 内容 |
|---|---|
| バージョン | `v1` |
| 経路 | `POST /api/reports`（`multipart/form-data`） |
| ログイン | **必須**（未ログインは `401`） |
| 1 回あたりのサイズ | 写真込みで**最大 10 MB**。超えたら `413` |

### フィールド定義

| フィールド | 型 | 必須 | 範囲・制約 | 説明 |
|---|---|:---:|---|---|
| `category` | 文字列 | ○ | `hazard` \| `flood` \| `spot` | 投稿の種類 |
| `title` | 文字列 | ○ | 1〜60 文字 | 一覧に出る見出し |
| `body` | 文字列 | ○ | 1〜1000 文字 | 本文 |
| `lat` | 数値 | ○ | 34.8〜36.2 | 緯度（千葉県の範囲） |
| `lon` | 数値 | ○ | 139.7〜140.9 | 経度（同上） |
| `photos` | ファイル | — | 0〜3 枚・各 5 MB 以内・`image/jpeg` `image/png` `image/webp` | 写真 |
| `details` | JSON 文字列 | — | 下表 | カテゴリ固有の項目 |

**`details` の中身（カテゴリ別）**

| category | キー | 型 | 説明 |
|---|---|---|---|
| `hazard` | `hazardType` | `road` \| `light` \| `bank` \| `playground` \| `other` | 危険の種別 |
| `flood` | `depthLevel` | `ankle` \| `knee` \| `waist` | 冠水の深さ（体感） |
| `flood` | `rainfallMm` `observedAt` `amedasStation` | — | **クライアントから受け取らない。サーバーが I-6 を呼んで焼き込む** |
| `spot` | `spotType` | `scenery` \| `souvenir` \| `food` \| `other` | おすすめの種別（`souvenir` がお土産） |

- `city_code` は**クライアントから受け取らない**。サーバーが `lat` / `lon` を
  `municipalities.bbox` と突き合わせて決める（詐称を防ぐ）
- **`rainfallMm` も同じ理由でサーバーが決める。** F-4 の注意案内の根拠になる値なので、
  投稿者が自由に入れられてはいけない

### レスポンス

```jsonc
{ "ok": true, "report": { /* I-3 の properties と同じ形 */ } }
{ "ok": false, "reason": "写真は 5 MB 以内にしてください" }
```

### 異常時の約束

- 未ログイン → `401`。画面はログイン画面へ誘導する
- 検証に失敗 → `400`（または `413`）。**どの項目が悪いか分かる `reason`** を返す
- **写真の保存に成功して DB の INSERT に失敗したら、保存した写真を消す**
  （孤児ファイルを残さない）
- **I-6（気象）の取得に失敗しても投稿は成功させる。**
  `details.rainfallMm` を省略し、画面には「雨量を取得できませんでした」と出す。
  **雨量が取れないことを理由に浸水報告を弾かない**（現場で投稿できないほうが害が大きい）

---

## I-5: 投稿の更新とコメント

| 経路 | 誰が | 何を |
|---|---|---|
| `PATCH /api/reports/:id` | **投稿者本人**（`title` `body` `details`）／**行政ユーザー**（`status`） | 投稿の更新 |
| `DELETE /api/reports/:id` | 投稿者本人 | 投稿の削除（写真も消す） |
| `POST /api/reports/:id/comments` | ログイン済みの全員 | コメント |

### `PATCH` の本体

```jsonc
{ "status": "in_progress" }            // 行政ユーザーのみ
{ "title": "…", "body": "…", "details": { … } }   // 投稿者本人のみ
```

### `POST /comments` の本体

```jsonc
{ "body": "現地を確認しました。今週中に補修します" }   // 1〜500 文字
```

- **`isOfficial` はクライアントから受け取らない。** サーバーが投稿者のロールを見て決める。
  ここを信用すると、一般ユーザーが行政を騙れる
- **行政ユーザーが操作できるのは `gov_city_code` と一致する投稿だけ。**
  違えば `403`（市川市の職員が船橋市の投稿を閉じられてはいけない）

### 異常時の約束

- 権限がない → `403` + `{ ok: false, reason: "この投稿を変更する権限がありません" }`
- 投稿が無い / 削除済み → `404`
- `status` に定義外の値 → `400`

---

## I-6: 気象データ（雨量・雨予報）

| 項目 | 内容 |
|---|---|
| バージョン | `v1` |
| 経路 | `GET /api/weather?city=<市町村コード>`（同一オリジン） |
| 実体 | 気象庁 防災情報 JSON（アメダス実況・府県予報）。**認証キー不要** |
| 中継する理由 | User-Agent の明示・**サーバー側キャッシュ**・タイムアウト |
| キャッシュ | アメダス実況 **10 分**・府県予報 **30 分**。投稿数に比例して外部へ投げないため |

```jsonc
{
  "ok": true,
  "observation": { "rainfallMm": 18.5, "observedAt": "2026-09-01T12:30:00+09:00",
                   "station": "船橋", "distanceKm": 6.2 },   // 最寄りのアメダス
  "forecast":    { "rainExpected": true, "within": "24h",
                   "summary": "雨　所により雷を伴い激しく降る" }
}
{ "ok": false, "reason": "気象情報を取得できませんでした" }
```

### 異常時の約束

- 気象庁が落ちている / タイムアウト（**5 秒**）→ `ok: false`。
  **I-4 は投稿を成功させる**（雨量なしで記録する）。**F-4 の注意案内は出さない**
  （予報が取れないのに「注意」を出すと、根拠のない警告になる）
- 最寄りのアメダスが**20 km 以上離れている**場合は `observation` を返さない
  （その地点の雨量として使うには遠すぎる）

---

## I-7: `web` → `db`（データベース）

| 項目 | 内容 |
|---|---|
| バージョン | `v1` |
| 経路 | コンテナ間ネットワーク。接続先は環境変数 `DATABASE_URL` |
| クライアント | **`pg`（node-postgres）**。ORM・マイグレーションツールは入れない |
| スキーマの投入 | `app/db/init/*.sql` を `/docker-entrypoint-initdb.d` にマウント |
| 待ち合わせ | `depends_on: condition: service_healthy` + `pg_isready` の `healthcheck` |

テーブルの一覧と役割は [`requirements.md`](requirements.md) §5。ここには**約束**だけ書く。

- **位置は `lat` / `lon` の `double precision`。** 両方にインデックスを張り、
  範囲検索（`bbox`）で使う。**PostGIS は使わない**（理由は `architecture.md` の設計判断）
- **`details` は `jsonb`。** 検索条件には使わない。使いたくなったらその項目を列に昇格させる
- **時刻は `timestamptz`。** アプリ側は JST で表示する
- 削除は**物理削除**（論理削除フラグを持たない。テーブルと分岐が増えるため）
- **既知の制約**: `/docker-entrypoint-initdb.d` はボリュームが空のときだけ走る。
  スキーマを変えたら `docker compose down -v` で作り直す

### 異常時の約束

- 接続できない → API は `503` を返す。**地図と静的レイヤーは出す**（`architecture.md` 参照）
- `web` が `db` より先に起動しようとする → `healthcheck` で待つので起きない。
  それでも失敗したら `web` を再起動する（`restart: unless-stopped` は付けない。
  審査員がログでエラーに気づけなくなるため）

---

## I-8: セッション（ログイン状態）

| 項目 | 内容 |
|---|---|
| バージョン | `v1` |
| 経路 | Auth.js（NextAuth）の **JWT セッション**。DB セッションは持たない |
| 送る側 / 受け取る側 | サーバー（`app/src/lib/auth.ts`）/ 画面と API |

```jsonc
// 画面が受け取るもの
{
  "authMode": "demo",              // "google" | "demo" ← サーバーが起動時に 1 回決める
  "user": { "id": 7, "displayName": "たろう",
            "role": "gov", "govCityCode": "12203" }   // 未ログインなら null
}
```

- **`authMode` はサーバーが決めて画面に渡す。** クライアント側でキーの有無を判定しない
- **`role` を信じてよいのはサーバーだけ。** 画面の `role` は表示の出し分けにしか使わない。
  **権限判定は必ず API 側でセッションを見て行う**（I-5 の `403`）
- メールアドレス・`provider_uid` は画面に渡さない

### 異常時の約束

- `AUTH_SECRET` が未設定 → デモ用の固定値で起動し、**警告をログに出す**（止めない）
- セッションが期限切れ → `401`。画面はログイン画面へ誘導し、**入力中の投稿内容を捨てない**

---

## I-9: ハザードタイル（外部・直接）

| 項目 | 内容 |
|---|---|
| バージョン | `v1` |
| 経路 | ブラウザ → 国土地理院ハザードマップポータルの XYZ タイル（**中継しない**） |
| 形式 | `.../raster/<種別>/{z}/{x}/{y}.png` |
| 認証 | **不要** |

| 種別 | パス | 市川市（実測 2026-08-24・z=14） |
|---|---|:---:|
| 洪水浸水想定区域（想定最大規模） | `01_flood_l2_shinsuishin_data` | 200 |
| 高潮浸水想定区域 | `03_hightide_l2_shinsuishin_data` | 200 |
| 津波浸水想定 | `04_tsunami_newlegend_data` | 200 |
| 土砂災害警戒区域 | `05_dosekiryukeikaikuiki` | 404（市川市に該当区域が無い） |

### 異常時の約束

- タイルが `404` → **そのタイルを描かない**（エラーを出さない）。
  ただし**凡例に「この地域には該当する想定区域のデータがありません」と明示**する。
  **白紙を「危険なし」と誤読させない**
- タイルサーバーが落ちている → 背景地図と点は出す。ハザードの重ねだけ消える

---

## 変更履歴

| バージョン | 日付 | 変更内容 | PR |
|---|---|---|---|
| v1 | 2026-08-24 | 初版。CHIZUBA のつなぎ目 I-1〜I-9 を確定 | `docs/chizuba-requirements` |

---

## 関連ドキュメント

- 何を作るか（機能・ロール・実装順序）→ [`requirements.md`](requirements.md)
- システム構成・データフロー・設計判断 → [`../../.agent/architecture.md`](../../.agent/architecture.md)
- 誰が何を担当するか → [`assignments.md`](assignments.md)
- データファイルの形式 → [`../../assets/format_spec.md`](../../assets/format_spec.md)
