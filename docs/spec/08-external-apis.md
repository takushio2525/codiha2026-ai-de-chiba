# 08. 外部 API

**CHIZUBA が使う外部サービスは 5 つ。認証キーが要るのは Google OAuth だけで、
それも任意**（未設定ならデモログインに落ちる）。

| # | サービス | 誰が呼ぶか | キー | 失敗したら |
|---|---|---|---|---|
| 1 | 国土地理院「淡色地図」タイル | **ブラウザが直接** | 不要 | 下地色のまま。点と経路は出る |
| 2 | 重ねるハザードマップ タイル | **ブラウザが直接** | 不要 | 何も描かれない（404 も同じ） |
| 3 | 気象庁 防災情報 JSON | サーバーが中継 | 不要 | 雨量なし・注意案内なし。投稿はできる |
| 4 | OSRM（徒歩経路） | サーバーが中継 | 不要 | 直線距離の概算に落とす |
| 5 | Google OAuth | サーバー | **任意** | デモログインだけになる |

**なぜ 3 と 4 だけサーバーが中継するのか。**
① User-Agent を確実に名乗る ② サーバー側でキャッシュする
③ 送信間隔（1 秒 1 リクエスト）を 1 か所で守る、の 3 つのため。
タイルは画像でブラウザのキャッシュがそのまま効くので、中継する意味が薄い。

---

## 8-1. 国土地理院タイル

| 項目 | 内容 |
|---|---|
| エンドポイント | `https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png` |
| 定義 | `app/src/lib/basemap.ts` |
| 呼び出し頻度 | MapLibre が表示範囲に応じて自動。ブラウザがキャッシュする |
| 認証 | 不要 |
| 規約 | [国土地理院タイル一覧](https://maps.gsi.go.jp/development/ichiran.html)。出典表示が条件 |
| 出典表示 | 地図右下の `AttributionControl`（`lib/basemap.ts:GSI_ATTRIBUTION`）と `/about` |
| 失敗時 | MapLibre は黙って描かない。`background` レイヤー（`#eeece5`）が残る |

**実測（2026-09-03）**: `…/xyz/pale/12/3637/1612.png` → HTTP 200・67,112 バイト。

---

## 8-2. 重ねるハザードマップ タイル

| 項目 | 内容 |
|---|---|
| エンドポイント | `https://disaportaldata.gsi.go.jp/raster/<データ名>/{z}/{x}/{y}.png` |
| データ名 | `01_flood_l2_shinsuishin_data`（洪水）／`03_hightide_l2_shinsuishin_data`（高潮）／`04_tsunami_newlegend_data`（津波） |
| 定義 | `app/src/lib/hazards.ts` の `HAZARDS` |
| 配信ズーム | 2〜17（**描画するのは 6 以上**） |
| 認証 | 不要 |
| 規約 | [ハザードマップポータルサイトのオープンデータ](https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html)。公共データ利用規約（PDL1.0） |
| 出典表示 | 凡例の下（`HazardLegend.tsx` の `withSource`）と `/about`。文言は `lib/credits.ts` |
| 失敗時 | **想定区域が無い場所は 404。** MapLibre は黙って描かない |

**実測（2026-09-03）**:
- 仕様ページを取得し、`01_flood_l2_shinsuishin_data` の記載を本文中に確認
- `…/raster/01_flood_l2_shinsuishin_data/12/3637/1612.png` → HTTP 200・16,951 バイト

**「色が付いていない＝安全」ではない。** 想定区域が公表されていない河川・地域があり、
そこはタイルそのものが配信されていない。この誤読を防ぐため、凡例に注意書きを常時出す
（`lib/hazards.ts:HAZARD_CAUTIONS`）:

> - 色が付いていない場所が安全とは限りません。想定区域が公表されていない河川・地域があります。
> - 最新かつ詳しい情報は、各市町村が作成しているハザードマップを確認してください。

---

## 8-3. 気象庁 防災情報 JSON

実装は `app/src/lib/jma.ts`（290 行）。**サーバー専用**。

### 使う JSON（4 種類 + 1）

| 用途 | URL | 実測サイズ | キャッシュ |
|---|---|---|---|
| 観測所の一覧 | `https://www.jma.go.jp/bosai/amedas/const/amedastable.json` | 187,742 B・**1,286 地点** | **24 時間** |
| 最新の観測時刻 | `https://www.jma.go.jp/bosai/amedas/data/latest_time.txt` | 25 B | 10 分 |
| 全国の実況（10 分値） | `https://www.jma.go.jp/bosai/amedas/data/map/<時刻>.json` | 約 245 KB | 10 分 |
| 市区町村と予報区の対応 | `https://www.jma.go.jp/bosai/common/const/area.json` | 262,108 B・**class20s に 1,805 件** | **24 時間** |
| 府県天気予報 | `https://www.jma.go.jp/bosai/forecast/data/forecast/120000.json`（千葉県） | 4,196 B | 30 分 |

サイズと件数は **2026-09-03 に実際に取得して数えた値**。

### 呼び出しの決まり

| 項目 | 値 | 場所 |
|---|---|---|
| User-Agent | `codiha2026-chizuba/0.1 (CODIHA 2026 hackathon prototype)` | `jma.ts:36` |
| タイムアウト | **5 秒**（`AbortSignal.timeout`） | `jma.ts:38` |
| `cache: "no-store"` | Next.js の fetch キャッシュを使わず、自前の Map で持つ | `jma.ts:71,81` |
| **失敗はキャッシュしない** | 気象庁が一時的に落ちたあと、TTL のあいだ復旧を見に行けなくなるのを防ぐ | `jma.ts:cached()` |
| 同時アクセス | 同じ URL への同時リクエストは **1 本にまとめる**（Promise を共有） | `jma.ts:cached()` |

### 呼び出し頻度の見積もり

- **`/api/weather` は画面を開いたときに 1 回**（`MapExplorer.tsx` の `useEffect`）
- キャッシュがあるので、**実況は 10 分に 1 回・予報は 30 分に 1 回・
  観測所一覧と予報区表は 24 時間に 1 回**しか気象庁へ行かない
- 何人が同時に開いても、web コンテナ 1 個につきこの頻度（プロセス内の Map なので）

### 実測した落とし穴

**① `lat` / `lon` は `[度, 分]` の配列**（小数の度ではない）

```json
"45212": { "kjName": "千葉", "lat": [35, 36.1], "lon": [140, 6.2], "alt": 3, … }
```

`jma.ts:toDegrees()` が `度 + 分/60` に直す。ここを忘れると全部の距離が壊れる。

**② 観測値は `[数値, 品質フラグ]` の 2 要素配列**

フラグが 0 でないもの（欠測・資料不足）は使わない。
風だけを測る観測所（`precipitation1h` を持たない）も飛ばす。

**③ 市川市にはアメダスが無い**

2026-09-03 に `amedastable.json` を取得し、市役所付近（35.7226, 139.9312）から
距離を計算した結果:

| 順 | 観測所 | コード | 距離 |
|---|---|---|---|
| 1 | 船橋 | 45106 | **10.2 km** |
| 2 | 江戸川臨海 | 44136 | 11.2 km |
| 3 | 東京 | 44132 | 16.7 km |
| 4 | 千葉 | 45212 | 20.6 km |

だから `WeatherObservation` は必ず `station` と `distanceKm` を持ち回り、
画面には「船橋アメダス（約 10.2 km）」と出す。
**20 km より遠い観測所しか無ければ雨量を出さない**（`AMEDAS_MAX_DISTANCE_KM = 20`）。

**④ 予報区は市町村単位では取れない**

`area.json` の親子を 3 段たどる（2026-09-03 に実測）:

```
市川市 "1220300" → 東葛飾 "120013" → 北西部 "120010" → 千葉県 "120000"
（class20s）        （class15s）       （class10s＝予報区） （発表元）
```

`class20s` のキーは**市町村コード 5 桁 + "00"** の 7 桁。そこだけ合わせる
（`jma.ts:resolveForecastArea`）。**画面には必ず予報区名（「北西部」）を出す。**

**⑤ `timeSeries` の番号を決め打ちしない**

`forecast/data/forecast/120000.json` の実測（2026-09-03 11:00 発表）:

| 番号 | 持っているキー | 予報区 |
|---|---|---|
| `[0]` | `weatherCodes` `weathers` `winds` `waves` | 北西部（120010） |
| `[1]` | `pops`（降水確率） | 北西部（120010） |
| `[2]` | `temps` | 千葉（45212） |

`jma.ts` は `pops` を持つ時系列を `find` で探す。気象庁側の並びが変わっても壊れない。

**⑥ 天気の文はそのまま引用する**

`tidyForecastSummary()` がやるのは**全角スペースを半角に寄せることだけ**。
語そのものは変えない（「加工して作成」に当たらない範囲に留める）。

### 出典表示

`lib/credits.ts` の `DATA_CREDITS`:

> 出典: 気象庁ホームページ（アメダス実況・府県天気予報）。最寄りの観測所の抽出と距離の算出を行って表示している

気象庁の公共データ利用規約は「出典：気象庁ホームページ（URL）」の表記を求めており、
**編集・加工して使うときは加工した旨も別に書く**ことになっている。
CHIZUBA は最寄り観測所の抽出と距離の計算をしているので、そこまで書いている。

---

## 8-4. OSRM（徒歩経路）

実装は `app/src/app/api/routing/route.ts`（108 行）。

| 項目 | 値 |
|---|---|
| エンドポイント | `https://routing.openstreetmap.de/routed-foot/route/v1/foot/<経度>,<緯度>;<経度>,<緯度>` |
| クエリ | `?overview=full&geometries=geojson&steps=false&alternatives=false` |
| 提供元 | FOSSGIS e.V. |
| 認証 | 不要 |
| User-Agent | `codiha2026-chizuba/0.1 (CODIHA 2026 hackathon prototype)` |
| タイムアウト | **8 秒**（サーバー側）／12 秒（ブラウザ側の保険・`lib/routing.ts`） |
| 送信間隔 | **1.1 秒に 1 本**（`MIN_INTERVAL_MS = 1_100`） |

### 利用規約と、それに合わせた実装

<https://routing.openstreetmap.de/about.html> の "Usage policy"
（2026-09-03 に取得して本文を確認）:

> - Display the required attribution and display a link to "fix the map".
> - Use a valid user agent and, if applicable, a correct referrer.
> - **One request per second max.**
> - No scraping, no heavy usage.

| 規約 | CHIZUBA の対応 |
|---|---|
| 出典表示と「地図の修正」リンク | `lib/credits.ts` の `MAP_ATTRIBUTION` → 地図右下の `AttributionControl` と `/about` |
| 正しい User-Agent | サーバーが中継して必ず付ける（ブラウザから直接叩かせない） |
| **1 秒 1 リクエスト** | `waitForSlot()` が **1.1 秒**の間隔で 1 本ずつ通す（少し余裕を持たせる） |
| 大量アクセスをしない | 「最寄りの地点」は**直線距離**で決める（候補の数だけ OSRM を叩かない） |

### 順番待ちの仕組み

```ts
let queue: Promise<void> = Promise.resolve();
let lastSentAt = 0;

function waitForSlot(): Promise<void> {
  const slot = queue.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastSentAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastSentAt = Date.now();
  });
  queue = slot.catch(() => undefined);
  return slot;
}
```

**Promise を数珠つなぎにして、1 本ずつ順番に通す。**
連続で押すと少し待たされるのはこのため。

### 実レスポンス（2026-09-03 実測）

市役所付近（139.9312,35.7226）→ 250 m ほど南西（139.9265,35.7195）:

```json
{ "code": "Ok",
  "routes": [{
    "distance": 669.2,          // メートル
    "duration": 535.2,          // 秒
    "geometry": { "type": "LineString",
                  "coordinates": [[139.931193, 35.722581], … 全 35 点] }
  }] }
```

**直線 250 m に対して経路 669 m。** 道なりに歩く距離が返ることが確認できる。

### 失敗時の挙動

| 何が起きたか | サーバーの応答 | 画面 |
|---|---|---|
| 座標が不正 | 400 | 「出発地点と目的地の座標が正しくありません。」 |
| OSRM が HTTP エラー | 502 | 直線距離の概算に切り替え、理由を通知 |
| 経路が見つからない（`code !== "Ok"`） | 502 | 同上 |
| 8 秒で応答なし | 504 | 同上 |
| 接続できない | 502 | 同上 |

**概算は「直線距離 ÷ 4.8 km/h」**（`lib/geo.ts:WALKING_SPEED_MPS`）。
`estimated: true` を立てて、画面にはっきり「概算」と出す（`RouteCard.tsx`）。
**無反応で止まることはない。**

---

## 8-5. Google OAuth

| 項目 | 内容 |
|---|---|
| 使うとき | `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` が**両方**設定されているときだけ |
| 実装 | `next-auth/providers/google`（`app/src/lib/auth.ts:96-99`） |
| コールバック URL | `<公開 URL>/api/auth/callback/google` |
| 取得する情報 | Google のプロフィール（表示名・メールアドレス・画像 URL） |
| 使う情報 | **表示名だけを画面に出す。** メールアドレスは行政ロールの判定にだけ使う |

**コールバック URL は Google Cloud Console に登録する必要がある。**
`CHIZUBA_PORT` を変えたならそのポートで、Tailscale Funnel なら
`https://<マシン名>.<tailnet 名>.ts.net/api/auth/callback/google` を登録する。

現在の OAuth アプリは **testing のまま**（`.agent/activeContext.md`）。
本番公開するには `/privacy` の URL を Console に入れる必要がある。

---

## 8-6. 外部サービスが全部落ちたらどうなるか

**「動かない機能」と「壊れる機能」を分けてある。**

| 落ちたもの | 動かなくなるもの | 動き続けるもの |
|---|---|---|
| 国土地理院タイル | 背景地図 | 施設の点・投稿・経路・凡例・投稿の作成 |
| ハザードタイル | ハザードの重ね | それ以外すべて |
| 気象庁 | 雨量の表示・注意案内（F-4） | **浸水報告の投稿はできる**（雨量が空欄になるだけ） |
| OSRM | 実際の道なりの経路 | 直線距離の概算（距離と所要時間は出る） |
| Google | Google ログイン | **デモログイン**（鍵が無い環境と同じ状態） |
| **PostgreSQL** | 投稿の閲覧・作成・コメント・ログイン | **地図・ハザード・オープンデータの点・徒歩ナビ** |
| インターネット全部 | 上記すべて | 画面の骨組みと同梱 GeoJSON（点は出る） |

これが「**動かない機能を積むより、動く機能を確実に仕上げる**」という
方針（`AGENTS.md`）の具体的な形。
