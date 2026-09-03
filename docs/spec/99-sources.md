# 99. 出典検証台帳

この仕様書と[利用説明書](../manual/README.md)で引用した**外部 URL をすべて実取得し、
本文に書いた数字・文言が実在するかを確認した記録**。

**検証方法**（HEAD ではなく本文まで取得する）:

```bash
curl -sSL --max-time 30 -A "chizuba-doc-linkcheck/1.0" -o <本文> -w "%{http_code}\t%{url_effective}" <URL>
grep -iF -- "<照合する文言>" <本文>
```

**検証日時: 2026-09-03（JST）。**
「最終到達 URL」が「同一」でない行は**リダイレクトが起きている**ので、
本文に書くときはリダイレクト後の URL を使うか、その旨を添える。

---

## 99-1. 台帳（全 39 件）

| # | URL | HTTP | 最終到達 URL | 照合した文言 | 結果 |
|---|---|---|---|---|---|
| 1 | <https://maps.gsi.go.jp/development/ichiran.html> | 200 | 同一 | `淡色地図` | **OK** |
| 2 | <https://cyberjapandata.gsi.go.jp/xyz/pale/12/3637/1612.png> | 200 | 同一 | （画像・67,112 B を取得） | **OK** |
| 3 | <https://disaportal.gsi.go.jp/> | 200 | 同一 | `重ねるハザードマップ` | **OK** |
| 4 | <https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html> | 200 | 同一 | `01_flood_l2_shinsuishin_data` | **OK** |
| 5 | <https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/12/3637/1612.png> | 200 | 同一 | （画像・16,951 B を取得） | **OK** |
| 6 | <https://www.jma.go.jp/bosai/> | 200 | 同一 | （991,517 B を取得） | **OK** |
| 7 | <https://www.jma.go.jp/bosai/amedas/const/amedastable.json> | 200 | 同一 | `kjName`（187,742 B・**1,286 地点**） | **OK** |
| 8 | <https://www.jma.go.jp/bosai/amedas/data/latest_time.txt> | 200 | 同一 | （25 B・`2026-09-03T15:10:00+09:00`） | **OK** |
| 9 | <https://www.jma.go.jp/bosai/common/const/area.json> | 200 | 同一 | `class20s`（262,108 B・**1,805 件**） | **OK** |
| 10 | <https://www.jma.go.jp/bosai/forecast/data/forecast/120000.json> | 200 | 同一 | `pops`（4,196 B・reportDatetime `2026-09-03T11:00:00+09:00`） | **OK** |
| 11 | <https://routing.openstreetmap.de/about.html> | 200 | 同一 | `One request per second max.` | **OK** |
| 12 | <https://www.openstreetmap.org/copyright> | 200 | 同一 | `Open Data Commons Open Database License` | **OK** |
| 13 | <https://www.city.ichikawa.lg.jp/page/4744.html> | 200 | 同一 | `オープンデータ` | **OK** |
| 14 | <https://www.city.ichikawa.lg.jp/uploaded/attachment/53552.csv> | 200 | 同一 | （27,378 B。**手元 CSV と SHA-256 一致**） | **OK** |
| 15 | <https://opendata.pref.chiba.lg.jp/pages/terms> | 200 | 同一 | `公共データ利用規約` | **OK** |
| 16 | <https://opendata.pref.chiba.lg.jp/datasets/240> | 200 | 同一 | `人口調査報告書(年報)`（タイトルは「【千葉県】令和6年千葉県毎月常住人口調査報告書(年報)」） | **OK**（※1） |
| 17 | <https://opendata.pref.chiba.lg.jp/datasets/421> | 200 | 同一 | `保育所` | **OK** |
| 18 | <https://opendata.pref.chiba.lg.jp/datasets/793> | 200 | 同一 | `観光` | **OK** |
| 19 | <https://opendata.pref.chiba.lg.jp/datasets/813> | 200 | 同一 | `高齢者` | **OK** |
| 20 | <https://opendata.pref.chiba.lg.jp/datasets/3283> | 200 | 同一 | `子育て` | **OK** |
| 21 | <https://opendata.pref.chiba.lg.jp/datasets/3288> | 200 | 同一 | `AED` | **OK** |
| 22 | <https://opendata.pref.chiba.lg.jp/datasets/3291> | 200 | 同一 | `景観` | **OK** |
| 23 | <https://opendata.pref.chiba.lg.jp/datasets/3295> | 200 | 同一 | `避難場所` | **OK** |
| 24 | <https://opendata.pref.chiba.lg.jp/resource_download/53961> | **500** | 同一 | — | **意図的に落ちている**（※2） |
| 25 | <https://opendata.pref.chiba.lg.jp/resource_download/53977> | **500** | 同一 | — | **意図的に落ちている**（※2） |
| 26 | <https://commons.wikimedia.org/> | 200 | `https://commons.wikimedia.org/wiki/Main_Page` | （251,912 B） | **OK**（リダイレクトあり） |
| 27 | <https://www.rfc-editor.org/rfc/rfc4180.txt> | 200 | 同一 | `CRLF` | **OK** |
| 28 | <https://www.rfc-editor.org/rfc/rfc7946.txt> | 200 | 同一 | `Bounding Box`（5 章）・`longitude, latitude`（680 行目） | **OK** |
| 29 | <https://www.postgresql.org/docs/17/functions-string.html> | 200 | 同一 | `normalize` | **OK** |
| 30 | <https://nextjs.org/docs/app/api-reference/config/next-config-js/output> | 200 | 同一 | `standalone` | **OK** |
| 31 | <https://authjs.dev/reference/nextjs> | 200 | 同一 | `trustHost` | **OK** |
| 32 | <https://maplibre.org/maplibre-gl-js/docs/API/> | 200 | 同一 | `setWorkerUrl` | **OK** |
| 33 | <https://jfly.uni-koeln.de/color/> | 200 | 同一 | `barrier-free` | **OK** |
| 34 | <https://www.soumu.go.jp/denshijiti/code.html> | 200 | 同一 | `全国地方公共団体コード`（**Shift_JIS。UTF-8 のままでは grep に当たらない**） | **OK**（※3） |
| 35 | <https://laws.e-gov.go.jp/law/327AC0000000165> | 200 | 同一 | — （**本文 800 B の SPA。条文は JS で描画される**） | **要注意**（※4） |
| 36 | <https://laws.e-gov.go.jp/api/2/law_data/327AC0000000165> | 200 | 同一 | `気象業務法`・第十七条第一項の条文全文 | **OK**（※4） |
| 37 | <https://console.cloud.google.com/apis/credentials> | 200 | `https://accounts.google.com/v3/signin/...` | — | **ログイン要求**（※5） |
| 38 | <https://github.com/docker-library/docs/blob/master/postgres/README.md> | 200 | 同一 | `docker-entrypoint-initdb.d` | **OK** |
| 39 | <https://tailscale.com/kb/1223/funnel> | 200 | `https://tailscale.com/docs/features/tailscale-funnel` | `Funnel` | **OK**（リダイレクトあり・※6） |

`hub.docker.com/_/node` と `hub.docker.com/_/postgres` も 200 を確認したが、
どちらも JavaScript で描画するページなので**本文照合はできていない**。
Docker 公式イメージ（DOI）であることの根拠としては、
`hub.docker.com/_/<名前>`（アンダースコア付きの名前空間）が公式イメージの URL 形式であることに拠っている。

---

## 99-2. 注記

### ※1 `datasets/240` の名前

当初「市区町村別推計人口（令和6年）」で照合したが本文に見つからなかった。
実際のデータセット名は
「**【千葉県】令和6年千葉県毎月常住人口調査報告書(年報)**」で、
`data/scripts/manifest.json` に書いてある「第1表 市区町村別推計人口（令和6年）」は
**その中のリソース名**だった。
[09 章](09-data-pipeline.md#9-3-元データの対応表)の表記をデータセット名＋リソース名に直した。

### ※2 `resource_download/<id>` の 500 は「壊れている」ことの証拠

**この 2 件は「リンク切れ」ではなく、本文で主張している事実そのもの。**
千葉県オープンデータサイトの `resource_download/<id>` は市川市のリソースに対して
HTTP 500 を返す。`data/ichikawa-city/SOURCE.md` に 2026-08-24 時点の記録があり、
**2026-09-03 も同じ**なので一時的な障害ではない。

だから実ファイルは市川市公式サイトから取っている。
**同一性は SHA-256 で確認済み**:

```
手元 data/ichikawa-city/raw/emergency_evacuation_sites.csv
市公式 https://www.city.ichikawa.lg.jp/uploaded/attachment/53552.csv
→ 両方とも 9482bf10f7abd7f6aa26924f975c54209ee3055312e2c14bd0541f7406283b96
```

詳細は [09 章 9-2](09-data-pipeline.md#9-2-取得先が-2-段になっている理由重要)。

### ※3 総務省のページは Shift_JIS

`<?xml version="1.0" encoding="Shift_JIS"?>` で始まる。
UTF-8 として grep すると当たらないので、`iconv -f SHIFT_JIS -t UTF-8` を通してから照合した。
確認できた文言: `総務省｜地方行政のデジタル化｜全国地方公共団体コード`。

### ※4 気象業務法は API から条文を取った

`https://laws.e-gov.go.jp/law/327AC0000000165` は
**本文 800 バイトの SPA（JavaScript で描画するページ）**なので、
`curl` で取っても条文が入っていない。**HEAD 200 では検証にならない典型例。**

そこで **e-Gov 法令 API v2** から条文そのものを取得した:

```
https://laws.e-gov.go.jp/api/2/law_data/327AC0000000165?response_format=json&law_full_text_format=json
```

取得できた内容（2026-09-03）:

- `law_info.law_num`: `昭和二十七年法律第百六十五号`
- `law_info.promulgation_date`: `1952-06-02`
- `law_title`: **`気象業務法`**
- **第十七条**（原文のまま）:

> （予報業務の許可）**第十七条** 気象庁以外の者が気象、地象、津波、高潮、波浪又は洪水の
> 予報の業務（以下「予報業務」という。）を行おうとする場合は、
> 気象庁長官の許可を受けなければならない。

**人が読むリンクとしては `laws.e-gov.go.jp/law/327AC0000000165` を示してよい**
（ブラウザで開けば条文が表示される）が、
**根拠として引用するときは API で取った条文を使う**。

### ※5 Google Cloud Console はログインを要求する

`https://console.cloud.google.com/apis/credentials` は
`accounts.google.com` のサインイン画面へリダイレクトされる。
**リンク切れではなく、ログインしないと見られないページ**。
`app/.env.example` が案内している取得先なので、そのまま残す。

### ※6 Tailscale のドキュメントは URL が移動している

`https://tailscale.com/kb/1223/funnel` → `https://tailscale.com/docs/features/tailscale-funnel`
にリダイレクトされる。**本文に書くときは移動先の URL を使う**。

---

## 99-3. リポジトリ内で実測した値（外部 URL 以外の根拠）

外部 URL ではないが、本文で数字を出したものはすべてこの方法で確かめた。

| 主張 | 確かめ方 | 結果 |
|---|---|---|
| 追跡ファイル 269 件 | `git ls-tree -r --name-only main \| wc -l` | 269 |
| 避難場所 123 / AED 304 / 子育て 388 / 景観 100 | 各 GeoJSON の `features` を Python で数える | 一致 |
| 景観スポットの写真 54 枚 | `ls app/public/images/scenic/*.jpg \| wc -l` | 54 |
| デモ写真 17 枚 | `ls app/db/seed-photos/*.jpg \| wc -l` | 17 |
| デモ投稿 22 件 | `003_seed_demo_reports.sql` の VALUES を数える | 22（危険 7・浸水 5・観光 10） |
| 景観のカテゴリ内訳（65/39/26/14） | GeoJSON の `categories` を Counter で集計 | 一致 |
| `access` を持つ 73 件 | 同上 | 73 |
| `build_geojson.py` が再現可能 | 再実行 → `git status --porcelain app/public/data/` | **差分なし** |
| 市川市の最寄りアメダスは船橋 10.2 km | `amedastable.json` を取得して Haversine で計算 | 船橋 10.2 km（次点 江戸川臨海 11.2 km） |
| 予報区は 市川市 → 東葛飾 → 北西部 → 千葉県 | `area.json` の `parent` を 3 段たどる | `1220300` → `120013` → `120010` → `120000` |
| OSRM が経路を返す | 実際に 2 点で呼ぶ | `code: "Ok"`・distance 669.2 m・duration 535.2 s・35 点 |
| `AUTH_URL` を読むのは next-auth | `grep -n "AUTH_URL" app/node_modules/next-auth/lib/env.js` | 6 行目に `process.env.AUTH_URL ?? process.env.NEXTAUTH_URL` |
| Cookie 名は `authjs.session-token` | `app/node_modules/@auth/core/lib/utils/cookie.js:44-56` | `${cookiePrefix}authjs.session-token`（`httpOnly: true`・`sameSite: "lax"`） |
| 秘匿情報スキャンが通る | `bash .github/scripts/secret_scan.sh` | 検査 185 ファイル・**検知なし** |
| `app/src` は 11,240 行 | `find … \| xargs wc -l` | components 4,454 / lib 4,700 / app+types 2,070 |
| `process.env` を読む箇所 | `grep -rn "process\.env" app/src` | 6 か所（[10 章](10-config.md)に全部載せた） |
| API は 8 ルート・11 メソッド | `find app/src/app/api -name route.ts` ＋ `grep "^export"` | [03 章 3-1-5](03-files.md#3-1-5-api-ルートappsrcappapi)と一致 |

---

## 99-4. この台帳を更新するとき

1. 新しい外部 URL を本文に足したら、**必ずこの表に 1 行足す**
2. `curl -sSL` で**本文まで取得**し、引用した文言を `grep` で確かめる。
   **HEAD の 200 だけでは足りない**（※4 の e-Gov が実例）
3. リダイレクトが起きたら「最終到達 URL」に書き、本文はリダイレクト後の URL に直す
4. 404・ログイン要求・SPA で本文が取れないものは、**そう明記して代替を探す**
5. 検証日を更新する（データは変わる。特に気象庁の JSON は 10 分ごとに変わる）
