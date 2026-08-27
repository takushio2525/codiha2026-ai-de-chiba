---
format: progfocus.markdown.v1
exportedAt: 2026-08-27T09:00:00.000Z
projectId: chizuba-overview
projectName: CHIZUBA 現状アーキテクチャ解説
mode: direct
nodeCount: 38
connectionCount: 34
---

```json
{
  "project": {
    "id": "chizuba-overview",
    "name": "CHIZUBA 現状アーキテクチャ解説",
    "mode": "direct",
    "createdAt": 1787821200000,
    "updatedAt": 1787832000000,
    "rootNodeIds": ["feat-input", "feat-api", "feat-map", "feat-auth", "feat-weather", "feat-open"],
    "nodes": {
      "feat-input": {
        "id": "feat-input",
        "type": "feature_input",
        "title": "利用者の操作と入力",
        "memo": "地図の操作 / 現在地 / 投稿フォーム / 絞り込み\n閲覧はログイン不要・投稿だけログインが要る",
        "x": 100, "y": 180, "width": 256, "height": 160,
        "parentId": null,
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/components/MapExplorer.tsx",
          "moduleName": "MapExplorer",
          "exports": "モード切替 / レイヤー表示 / 投稿の取得と再取得 / 徒歩ナビ / 注意案内の判定",
          "description": "画面の状態を 1 つ持つクライアントコンポーネント。地図・操作パネル・投稿パネルはここから props で下りる"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "feat-api": {
        "id": "feat-api",
        "type": "feature_process",
        "title": "投稿 API（Next.js ルートハンドラ）",
        "memo": "GET は誰でも / POST・PATCH・DELETE はログイン必須\n3 カテゴリを 1 テーブル・1 API で扱う",
        "x": 620, "y": 180, "width": 256, "height": 160,
        "parentId": null,
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/app/api/reports/route.ts",
          "moduleName": "api/reports",
          "exports": "GET（一覧・GeoJSON）/ POST（作成・multipart）/ [id] の GET・PATCH・DELETE / [id]/comments / export",
          "description": "同一オリジンの API。city_code・rainfallMm・is_official はクライアントから受け取らずサーバーが決める"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "feat-map": {
        "id": "feat-map",
        "type": "feature_output",
        "title": "地図の描画（MapLibre GL JS）",
        "memo": "国土地理院タイル + ハザードタイル + 点レイヤー\n認証キーの要る地図サービスは使わない",
        "x": 1080, "y": 180, "width": 256, "height": 160,
        "parentId": null,
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/components/MapView.tsx",
          "moduleName": "MapView",
          "exports": "ソースとレイヤーの生成 / ポップアップ / 経路の線 / 注意の輪 / GeolocateControl",
          "description": "MapLibre の実体を持つ唯一の場所。モードを切り替えても地図インスタンスは作り直さない"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "feat-auth": {
        "id": "feat-auth",
        "type": "feature_process",
        "title": "認証とセッション",
        "memo": "Google OAuth 本線・鍵が無ければデモログイン\nJWT はこのインストールに縛る",
        "x": 620, "y": 440, "width": 256, "height": 160,
        "parentId": null,
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/auth.ts",
          "moduleName": "auth",
          "exports": "handlers / auth / signIn / signOut / getSessionView",
          "description": "Auth.js（NextAuth v5）の設定を関数で渡す遅延設定。署名鍵に DB のインストール ID が要るため"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "feat-weather": {
        "id": "feat-weather",
        "type": "feature_process",
        "title": "外部サービスの中継",
        "memo": "気象庁 防災情報 JSON / OSRM\nUser-Agent・キャッシュ・レート制限をサーバー側で守る",
        "x": 620, "y": 700, "width": 256, "height": 160,
        "parentId": null,
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/jma.ts",
          "moduleName": "jma",
          "exports": "observeRainfall / forecastRain",
          "description": "サーバー専用。アメダス実況 10 分・府県予報 30 分・定数表 24 時間でキャッシュし、失敗はキャッシュしない"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "feat-open": {
        "id": "feat-open",
        "type": "feature_output",
        "title": "蓄積したデータの出力",
        "memo": "注意案内（F-4）と CSV / GeoJSON の書き出し\n受け取ったものを返せて初めて一往復になる",
        "x": 1080, "y": 440, "width": 256, "height": 160,
        "parentId": null,
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/reportExport.ts",
          "moduleName": "reportExport",
          "exports": "toCsv / toGeoJson / exportUrl",
          "description": "出すのは画面で誰でも読める項目と座標だけ。デモ投稿の雨量は観測値ではないので書き出さない"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "in-map": {
        "id": "in-map",
        "type": "input",
        "title": "地図の操作・現在地",
        "memo": "ドラッグ / ズーム / ピンのタップ\nGeolocation の許可は任意",
        "x": 40, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-input",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/components/ControlPanel.tsx",
          "moduleName": "ControlPanel",
          "exports": "レイヤー ON/OFF / ハザードの不透明度 / 投稿ボタン / 凡例",
          "description": "操作パネル。375px 幅で先に成立させてから広い画面へ広げる（モバイルファースト）"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "in-form": {
        "id": "in-form",
        "type": "input",
        "title": "投稿フォーム（写真つき）",
        "memo": "位置 + 写真 3 枚まで + 本文\n危険箇所 / 浸水 / 観光おすすめ",
        "x": 40, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-input",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/components/ReportForm.tsx",
          "moduleName": "ReportForm",
          "exports": "カテゴリ固有の入力欄 / 写真の選択 / multipart の組み立て",
          "description": "入力欄は REPORT_CATEGORIES の detailFields から組み立てる。カテゴリを増やしてもフォームは書き換えない"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "in-filter": {
        "id": "in-filter",
        "type": "input",
        "title": "絞り込み（期間・キーワード）",
        "memo": "投稿日の範囲は JST の暦日で扱う\n語は NFKC + 小文字でそろえる",
        "x": 40, "y": 500, "width": 256, "height": 160,
        "parentId": "feat-input",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/searchText.ts",
          "moduleName": "searchText",
          "exports": "normalizeSearch / searchMatches / SEARCH_MAX_LENGTH",
          "description": "DB 側も SQL の normalize(text, NFKC) で同じ変換をする。半角カナで打っても当たる"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "in-api": {
        "id": "in-api",
        "type": "process",
        "title": "API 呼び出しの一本化",
        "memo": "失敗時は画面にそのまま出せる日本語を返す",
        "x": 560, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-input",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/reportsApi.ts",
          "moduleName": "reportsApi",
          "exports": "fetchReports / fetchReportDetail / submitReport / submitComment / patchReport / deleteReport",
          "description": "ブラウザ側の薄いラッパ。サーバーの reason をそのまま通し、通信自体が失敗したときだけ文を作る"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "in-out": {
        "id": "in-out",
        "type": "output",
        "title": "同一オリジンへの HTTP",
        "memo": "外部サービスへブラウザから直接は投げない\n（タイルだけは例外）",
        "x": 1000, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-input",
        "programDef": {
          "elementType": "interface",
          "fileName": "app/src/lib/reports.ts",
          "interfaceName": "ReportCollection",
          "methods": "type: FeatureCollection\nfeatures: ReportFeature[]",
          "description": "投稿は GeoJSON で返す。静的レイヤーと同じ形なので地図側のコードが 1 本で済む"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "api-in": {
        "id": "api-in",
        "type": "input",
        "title": "HTTP リクエスト",
        "memo": "GET は誰でも / 書き込みはログイン必須\n10 MB を超える本文は読む前に断る",
        "x": 40, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-api",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/app/api/reports/route.ts",
          "functionName": "POST",
          "args": "NextRequest",
          "returnValue": "Response（201 / 400 / 401 / 413 / 500 / 503）",
          "description": "content-length を先に見て大きすぎるものを読み込まない。formData を読めなければ 400 で返す"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "api-validate": {
        "id": "api-validate",
        "type": "process",
        "title": "入力の検証",
        "memo": "クライアントが決めてよい項目だけ通す\ndetails の未知のキーは捨てる",
        "x": 560, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-api",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/reportInput.ts",
          "functionName": "parseReportForm",
          "args": "FormData",
          "returnValue": "Parsed<NewReportInput>",
          "description": "どの項目が悪いか分かる日本語を返す。city_code・rainfallMm・isOfficial は受け取らない（詐称を防ぐ）"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "api-photo": {
        "id": "api-photo",
        "type": "process",
        "title": "写真の保存",
        "memo": "JPEG / PNG / WebP・1 枚 5 MB・3 枚まで\n申告 MIME を信じず先頭バイトも見る",
        "x": 560, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-api",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/photoStore.ts",
          "functionName": "sniffImageType",
          "args": "Uint8Array",
          "returnValue": "PhotoMimeType | null",
          "description": "実体は uploads ボリューム（/app/uploads）。DB にはファイル名だけ。INSERT に失敗したら保存済みの実体を消す"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "api-store": {
        "id": "api-store",
        "type": "process",
        "title": "SQL の読み書き",
        "memo": "3 カテゴリを 1 テーブルで扱う\n写真とコメントは LATERAL でまとめて引く",
        "x": 560, "y": 500, "width": 256, "height": 160,
        "parentId": "feat-api",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/reportStore.ts",
          "moduleName": "reportStore",
          "exports": "listReports / findReport / createReport / updateReport / deleteReport / resolveCityCode / listComments",
          "description": "メールアドレスと provider_uid は絶対に返さない。返すのは表示名とロールだけ"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "api-db": {
        "id": "api-db",
        "type": "output",
        "title": "PostgreSQL 17",
        "memo": "app_instance / municipalities / users\nreports / report_photos / report_comments",
        "x": 1000, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-api",
        "programDef": {
          "elementType": "module",
          "fileName": "app/db/init/001_schema.sql",
          "moduleName": "schema",
          "exports": "6 テーブル + 6 インデックス。CHECK 制約で値域を DB 側でも縛る",
          "description": "postgres イメージの /docker-entrypoint-initdb.d に置く。ボリュームが空のときだけ流れる。PostGIS は使わない"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "api-out": {
        "id": "api-out",
        "type": "output",
        "title": "GeoJSON の FeatureCollection",
        "memo": "地図がそのままソースとして読める形",
        "x": 1000, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-api",
        "programDef": {
          "elementType": "variable",
          "fileName": "app/src/lib/reports.ts",
          "variableName": "REPORT_CATEGORIES",
          "variableType": "ReportCategoryDef[]",
          "initialValue": "hazard（危険箇所）/ flood（浸水）/ spot（観光おすすめ）",
          "description": "3 種類統一モデルの実体。カテゴリを増やす作業はここに 1 行足すだけで、フォーム・地図・書き出しが追従する"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "map-in": {
        "id": "map-in",
        "type": "input",
        "title": "レイヤーとソースの定義",
        "memo": "避難場所 123 / AED 304 / 子育て施設 388\n景観100選 100（写真つきは 54）",
        "x": 40, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-map",
        "programDef": {
          "elementType": "variable",
          "fileName": "app/src/lib/layers.ts",
          "variableName": "LAYERS",
          "variableType": "LayerDef[]",
          "initialValue": "evacuation / aed / childcare（色は Okabe-Ito）",
          "description": "静的な GeoJSON は public/data/ に同梱してあり DB を経由しない。景観スポットだけ scenic.ts に分けてある"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "map-hazard": {
        "id": "map-hazard",
        "type": "input",
        "title": "ハザードタイル",
        "memo": "洪水 / 高潮 / 津波の浸水想定\nブラウザが直接取りに行く（中継しない）",
        "x": 40, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-map",
        "programDef": {
          "elementType": "variable",
          "fileName": "app/src/lib/hazards.ts",
          "variableName": "HAZARDS",
          "variableType": "HazardDef[]",
          "initialValue": "flood / hightide / tsunami（disaportaldata.gsi.go.jp の XYZ タイル）",
          "description": "凡例は洪水 6 段階・津波と高潮 8 段階で別物。同じ色でも表す深さが違うので分けてある"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "map-render": {
        "id": "map-render",
        "type": "process",
        "title": "MapLibre への反映",
        "memo": "ソース追加 → レイヤー追加 → 表示切替\nポップアップの高さと重なりは自分で決める",
        "x": 560, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-map",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/mapModes.ts",
          "moduleName": "mapModes",
          "exports": "MAP_MODES / layerVisibilityFor / hazardVisibilityFor / reportVisibilityFor",
          "description": "防災（S-1）と観光（S-2）で最初から表示する組だけを切り替える。決めるのは初期値だけで、あとから足し引きできる"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "map-out": {
        "id": "map-out",
        "type": "output",
        "title": "地図の画面",
        "memo": "背景は国土地理院「淡色地図」\n出典は地図の隅と /about の両方に出す",
        "x": 1000, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-map",
        "programDef": {
          "elementType": "variable",
          "fileName": "app/src/lib/basemap.ts",
          "variableName": "basemapStyle",
          "variableType": "StyleSpecification",
          "initialValue": "cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
          "description": "認証キー不要。出典の文言の正本は credits.ts で、地図の隅と /about が同じものを読む"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "map-route": {
        "id": "map-route",
        "type": "output",
        "title": "徒歩ナビの結果",
        "memo": "OSRM が落ちていれば直線の見積もりに切り替える\n（見積もりであることは画面に出す）",
        "x": 1000, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-map",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/routing.ts",
          "functionName": "fetchWalkingRoute",
          "args": "from: LngLat, destination: RouteTarget",
          "returnValue": "WalkingRoute（estimated フラグつき）",
          "description": "目的地は施設と景観スポットを NavCandidate にそろえて共通化。最寄り探索は geo.ts の haversineMeters"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "auth-in": {
        "id": "auth-in",
        "type": "input",
        "title": "ログイン操作",
        "memo": "デモは表示名 + ロール選択\nGoogle は OAuth のリダイレクト",
        "x": 40, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-auth",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/components/DemoLoginForm.tsx",
          "moduleName": "DemoLoginForm",
          "exports": "表示名の入力 / 一般・行政の選択 / PIN 欄（要る環境だけ）",
          "description": "PIN 欄の出し入れは peer-has-checked で CSS から行う。React 19 はフォームアクション後に reset するため"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "auth-mode": {
        "id": "auth-mode",
        "type": "process",
        "title": "モードの判定",
        "memo": "鍵が両方そろえば Google・欠ければデモ\n判定はサーバー側で 1 回だけ",
        "x": 560, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-auth",
        "programDef": {
          "elementType": "variable",
          "fileName": "app/src/lib/authMode.ts",
          "variableName": "AUTH_MODE",
          "variableType": "\"google\" | \"demo\"",
          "initialValue": "GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? \"google\" : \"demo\"",
          "description": "クライアント側で鍵の有無を見ない。判定結果だけを画面へ渡す。行政アカウントの割当は GOV_ACCOUNTS"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "auth-pin": {
        "id": "auth-pin",
        "type": "process",
        "title": "行政ロールの PIN",
        "memo": "未設定なら何も起きない（審査員の既定）\n公開時だけ行政ロールに PIN を要求する",
        "x": 560, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-auth",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/govPin.ts",
          "functionName": "verifyGovPin",
          "args": "raw: unknown",
          "returnValue": "GovPinResult（ok / 日本語の理由）",
          "description": "比較は SHA-256 に畳んでから timingSafeEqual。失敗ごとに待たせ（最大 8 秒）、連続 10 回で 60 秒断る"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "auth-inst": {
        "id": "auth-inst",
        "type": "process",
        "title": "インストール ID による縛り",
        "memo": "署名鍵を DB の ID から導き\nトークンにも同じ ID を焼き込んで毎回照合する",
        "x": 560, "y": 500, "width": 256, "height": 160,
        "parentId": "feat-auth",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/installId.ts",
          "functionName": "sessionSecretFor",
          "args": "installId: string",
          "returnValue": "sha256(\"chizuba-session-key:\" + installId)",
          "description": "users.id はただの連番で、Cookie はポートを区別しない。別インストールのトークンを通さないための二重の縛り"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "auth-origin": {
        "id": "auth-origin",
        "type": "process",
        "title": "公開 URL の導出",
        "memo": "X-Forwarded-Host →（無ければ）Host\nX-Forwarded-Port は見ない",
        "x": 560, "y": 720, "width": 256, "height": 160,
        "parentId": "feat-auth",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/publicOrigin.ts",
          "functionName": "publicOriginFrom",
          "args": "headers: Headers",
          "returnValue": "\"https://例.ts.net\" | null",
          "description": "AUTH_URL の固定値をやめた。ルートハンドラは req.url を見るので、Auth.js へ渡す前にオリジンを組み直す"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "auth-out": {
        "id": "auth-out",
        "type": "output",
        "title": "セッション（JWT）",
        "memo": "DB セッションを持たない\nメールアドレスと画像は画面へ渡さない",
        "x": 1000, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-auth",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/auth.ts",
          "functionName": "getSessionView",
          "args": "（なし）",
          "returnValue": "SessionView（authMode + user | null）",
          "description": "画面と API が受け取る唯一の形。uid・displayName・role・govCityCode と、発行元の inst を持つ"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "wx-in": {
        "id": "wx-in",
        "type": "input",
        "title": "市町村コード",
        "memo": "JIS X 0402 の 5 桁（市川市 = 12203）\n座標はコードに書かずマスタから引く",
        "x": 40, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-weather",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/municipalities.ts",
          "moduleName": "municipalities",
          "exports": "DEMO_CITY_CODE / findMunicipality",
          "description": "市町村を 1 つ増やす作業はマスタに 1 行足すだけ。初期表示・投稿の所属判定はすべてここを見る"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "wx-amedas": {
        "id": "wx-amedas",
        "type": "process",
        "title": "アメダス実況の取得",
        "memo": "最寄りで 1 時間降水量が正常な観測所を採る\n20 km より遠ければ使わない",
        "x": 560, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-weather",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/jma.ts",
          "functionName": "observeRainfall",
          "args": "lat: number, lon: number",
          "returnValue": "WeatherObservation | null",
          "description": "amedastable.json の緯度経度は [度, 分] の配列。観測値は [数値, 品質フラグ] でフラグ 0 以外は欠測"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "wx-forecast": {
        "id": "wx-forecast",
        "type": "process",
        "title": "府県天気予報の取得",
        "memo": "市町村コード → class20s → class15s\n→ class10s → offices と辿る",
        "x": 560, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-weather",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/jma.ts",
          "functionName": "forecastRain",
          "args": "cityCode: string",
          "returnValue": "WeatherForecast | null",
          "description": "予報区は市町村単位で取れない（千葉県は北西部・北東部・南部の 3 区分）。予報区名を必ず画面に出す"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "wx-route": {
        "id": "wx-route",
        "type": "process",
        "title": "OSRM の中継",
        "memo": "1 秒 1 リクエストを順番待ちで守る\nタイムアウト 8 秒",
        "x": 560, "y": 500, "width": 256, "height": 160,
        "parentId": "feat-weather",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/app/api/routing/route.ts",
          "moduleName": "api/routing",
          "exports": "GET（from / to の [経度, 緯度]）→ RouteResponse",
          "description": "ブラウザから直接叩かせない理由は 3 つ。User-Agent を確実に名乗る・レート制限を 1 箇所で守る・タイムアウトを効かせる"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "wx-out": {
        "id": "wx-out",
        "type": "output",
        "title": "雨量と予報",
        "memo": "観測所名と距離を必ず添える\nどちらも取れなかったときだけ失敗にする",
        "x": 1000, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-weather",
        "programDef": {
          "elementType": "interface",
          "fileName": "app/src/lib/weather.ts",
          "interfaceName": "WeatherSuccess",
          "methods": "ok: true\nobservation: WeatherObservation | null\nforecast: WeatherForecast | null",
          "description": "GET /api/weather の応答（I-6）。浸水投稿に焼き込む値は API を通さず lib/jma.ts を直接呼ぶ"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "open-in": {
        "id": "open-in",
        "type": "input",
        "title": "絞り込み条件そのまま",
        "memo": "投稿日の範囲は JST の暦日\n書き出しは画面と同じ条件を受け取る",
        "x": 40, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-open",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/lib/reportRange.ts",
          "moduleName": "reportRange",
          "exports": "EMPTY_RANGE / hasRange / normalizeRange / isDateKey",
          "description": "SQL では ::timestamp を明示する。date AT TIME ZONE は逆向きに解決され、境目が 9 時間ずれる"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "open-alert": {
        "id": "open-alert",
        "type": "process",
        "title": "注意案内の判定",
        "memo": "予報が取れている / 降水確率 30% 以上 /\n過去の浸水報告が 1 件以上、の 3 つすべて",
        "x": 560, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-open",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/weather.ts",
          "functionName": "buildFloodAlert",
          "args": "forecast: WeatherForecast | null, floodReportDates: string[]",
          "returnValue": "FloodAlert | null",
          "description": "出す・出さないの判定はここ 1 箇所。予報が取れないときは出さない（根拠のない警告になるため）"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "open-export": {
        "id": "open-export",
        "type": "process",
        "title": "CSV / GeoJSON の組み立て",
        "memo": "CSV は UTF-8 BOM + CRLF（RFC 4180）\nGeoJSON は RFC 7946",
        "x": 560, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-open",
        "programDef": {
          "elementType": "function",
          "fileName": "app/src/lib/reportExport.ts",
          "functionName": "toCsv",
          "args": "features: ReportFeature[]",
          "returnValue": "string（BOM 付き）",
          "description": "= + - @ で始まるセルは先頭に ' を足す（表計算ソフトが本文を数式として実行するのを止める）"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "open-card": {
        "id": "open-card",
        "type": "output",
        "title": "注意カード（F-4）",
        "memo": "事実 2 つを並べるだけ\n「浸水するでしょう」に類する予報表現は書かない",
        "x": 1000, "y": 60, "width": 256, "height": 160,
        "parentId": "feat-open",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/components/FloodAlertCard.tsx",
          "moduleName": "FloodAlertCard",
          "exports": "見出し / 浸水報告の件数 / 気象庁の降水確率 / 予測ではない旨",
          "description": "気象業務法は気象庁以外が予報を業として出すことを許可制にしている。文言の正本は requirements.md 3-1"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      },
      "open-file": {
        "id": "open-file",
        "type": "output",
        "title": "ダウンロード",
        "memo": "絞り込んだままの結果を書き出す\nデモ投稿の雨量は含めない",
        "x": 1000, "y": 280, "width": 256, "height": 160,
        "parentId": "feat-open",
        "programDef": {
          "elementType": "module",
          "fileName": "app/src/app/api/reports/export/route.ts",
          "moduleName": "api/reports/export",
          "exports": "GET（format=csv|geojson + 一覧と同じ絞り込み）",
          "description": "出すのは画面で誰でも読める項目と座標だけ。ユーザー ID・メールアドレス・provider_uid は出さない"
        },
        "createdAt": 1787821200000, "updatedAt": 1787832000000
      }
    },
    "connections": {
      "rc1": {
        "id": "rc1",
        "fromNodeId": "feat-input", "fromSide": "right",
        "toNodeId": "feat-api", "toSide": "left",
        "label": "• 投稿・取得の要求"
      },
      "rc2": {
        "id": "rc2",
        "fromNodeId": "feat-api", "fromSide": "right",
        "toNodeId": "feat-map", "toSide": "left",
        "label": "• 投稿の GeoJSON"
      },
      "rc3": {
        "id": "rc3",
        "fromNodeId": "feat-input", "fromSide": "bottom",
        "toNodeId": "feat-auth", "toSide": "left",
        "label": "• ログイン操作"
      },
      "rc4": {
        "id": "rc4",
        "fromNodeId": "feat-auth", "fromSide": "right",
        "toNodeId": "feat-api", "toSide": "bottom",
        "label": "• 本人とロールの判定"
      },
      "rc5": {
        "id": "rc5",
        "fromNodeId": "feat-weather", "fromSide": "right",
        "toNodeId": "feat-api", "toSide": "bottom",
        "label": "• 投稿時点の雨量"
      },
      "rc6": {
        "id": "rc6",
        "fromNodeId": "feat-api", "fromSide": "bottom",
        "toNodeId": "feat-open", "toSide": "left",
        "label": "• 蓄積した投稿"
      },
      "rc7": {
        "id": "rc7",
        "fromNodeId": "feat-weather", "fromSide": "bottom",
        "toNodeId": "feat-open", "toSide": "bottom",
        "label": "• 雨の予報"
      },
      "rc8": {
        "id": "rc8",
        "fromNodeId": "feat-open", "fromSide": "top",
        "toNodeId": "feat-map", "toSide": "bottom",
        "label": "• 注意の輪"
      },
      "in-c1": {
        "id": "in-c1",
        "fromNodeId": "in-map", "fromSide": "right",
        "toNodeId": "in-api", "toSide": "left",
        "label": ""
      },
      "in-c2": {
        "id": "in-c2",
        "fromNodeId": "in-form", "fromSide": "right",
        "toNodeId": "in-api", "toSide": "left",
        "label": ""
      },
      "in-c3": {
        "id": "in-c3",
        "fromNodeId": "in-filter", "fromSide": "right",
        "toNodeId": "in-api", "toSide": "left",
        "label": "• 絞り込み"
      },
      "in-c4": {
        "id": "in-c4",
        "fromNodeId": "in-api", "fromSide": "right",
        "toNodeId": "in-out", "toSide": "left",
        "label": "• fetch"
      },
      "api-c1": {
        "id": "api-c1",
        "fromNodeId": "api-in", "fromSide": "right",
        "toNodeId": "api-validate", "toSide": "left",
        "label": "• multipart / JSON"
      },
      "api-c2": {
        "id": "api-c2",
        "fromNodeId": "api-validate", "fromSide": "bottom",
        "toNodeId": "api-photo", "toSide": "top",
        "label": ""
      },
      "api-c3": {
        "id": "api-c3",
        "fromNodeId": "api-photo", "fromSide": "bottom",
        "toNodeId": "api-store", "toSide": "top",
        "label": ""
      },
      "api-c4": {
        "id": "api-c4",
        "fromNodeId": "api-store", "fromSide": "right",
        "toNodeId": "api-db", "toSide": "left",
        "label": "• SQL"
      },
      "api-c5": {
        "id": "api-c5",
        "fromNodeId": "api-store", "fromSide": "right",
        "toNodeId": "api-out", "toSide": "left",
        "label": "• properties"
      },
      "map-c1": {
        "id": "map-c1",
        "fromNodeId": "map-in", "fromSide": "right",
        "toNodeId": "map-render", "toSide": "left",
        "label": "• 点レイヤー"
      },
      "map-c2": {
        "id": "map-c2",
        "fromNodeId": "map-hazard", "fromSide": "right",
        "toNodeId": "map-render", "toSide": "left",
        "label": "• ラスタタイル"
      },
      "map-c3": {
        "id": "map-c3",
        "fromNodeId": "map-render", "fromSide": "right",
        "toNodeId": "map-out", "toSide": "left",
        "label": "• スタイル"
      },
      "map-c4": {
        "id": "map-c4",
        "fromNodeId": "map-render", "fromSide": "bottom",
        "toNodeId": "map-route", "toSide": "left",
        "label": "• 目的地"
      },
      "auth-c1": {
        "id": "auth-c1",
        "fromNodeId": "auth-in", "fromSide": "right",
        "toNodeId": "auth-mode", "toSide": "left",
        "label": "• 資格情報"
      },
      "auth-c2": {
        "id": "auth-c2",
        "fromNodeId": "auth-mode", "fromSide": "bottom",
        "toNodeId": "auth-pin", "toSide": "top",
        "label": ""
      },
      "auth-c3": {
        "id": "auth-c3",
        "fromNodeId": "auth-pin", "fromSide": "bottom",
        "toNodeId": "auth-inst", "toSide": "top",
        "label": ""
      },
      "auth-c4": {
        "id": "auth-c4",
        "fromNodeId": "auth-inst", "fromSide": "right",
        "toNodeId": "auth-out", "toSide": "left",
        "label": "• 署名と照合"
      },
      "auth-c5": {
        "id": "auth-c5",
        "fromNodeId": "auth-origin", "fromSide": "right",
        "toNodeId": "auth-out", "toSide": "bottom",
        "label": "• リダイレクト先"
      },
      "wx-c1": {
        "id": "wx-c1",
        "fromNodeId": "wx-in", "fromSide": "right",
        "toNodeId": "wx-amedas", "toSide": "left",
        "label": "• 中心座標"
      },
      "wx-c2": {
        "id": "wx-c2",
        "fromNodeId": "wx-amedas", "fromSide": "bottom",
        "toNodeId": "wx-forecast", "toSide": "top",
        "label": ""
      },
      "wx-c3": {
        "id": "wx-c3",
        "fromNodeId": "wx-forecast", "fromSide": "bottom",
        "toNodeId": "wx-route", "toSide": "top",
        "label": ""
      },
      "wx-c4": {
        "id": "wx-c4",
        "fromNodeId": "wx-amedas", "fromSide": "right",
        "toNodeId": "wx-out", "toSide": "left",
        "label": "• 実況と予報"
      },
      "open-c1": {
        "id": "open-c1",
        "fromNodeId": "open-in", "fromSide": "right",
        "toNodeId": "open-alert", "toSide": "left",
        "label": "• 期間・キーワード"
      },
      "open-c2": {
        "id": "open-c2",
        "fromNodeId": "open-alert", "fromSide": "right",
        "toNodeId": "open-card", "toSide": "left",
        "label": "• 事実 2 つ"
      },
      "open-c3": {
        "id": "open-c3",
        "fromNodeId": "open-alert", "fromSide": "bottom",
        "toNodeId": "open-export", "toSide": "top",
        "label": ""
      },
      "open-c4": {
        "id": "open-c4",
        "fromNodeId": "open-export", "fromSide": "right",
        "toNodeId": "open-file", "toSide": "left",
        "label": "• CSV / GeoJSON"
      }
    },
    "definitionRegistry": {
      "fileNames": [
        "app/src/components/MapExplorer.tsx",
        "app/src/app/api/reports/route.ts",
        "app/src/components/MapView.tsx",
        "app/src/lib/auth.ts",
        "app/src/lib/jma.ts",
        "app/src/lib/reportExport.ts",
        "app/src/components/ControlPanel.tsx",
        "app/src/components/ReportForm.tsx",
        "app/src/lib/searchText.ts",
        "app/src/lib/reportsApi.ts",
        "app/src/lib/reports.ts",
        "app/src/lib/reportInput.ts",
        "app/src/lib/photoStore.ts",
        "app/src/lib/reportStore.ts",
        "app/db/init/001_schema.sql",
        "app/src/lib/layers.ts",
        "app/src/lib/hazards.ts",
        "app/src/lib/mapModes.ts",
        "app/src/lib/basemap.ts",
        "app/src/lib/routing.ts",
        "app/src/components/DemoLoginForm.tsx",
        "app/src/lib/authMode.ts",
        "app/src/lib/govPin.ts",
        "app/src/lib/installId.ts",
        "app/src/lib/publicOrigin.ts",
        "app/src/lib/municipalities.ts",
        "app/src/app/api/routing/route.ts",
        "app/src/lib/weather.ts",
        "app/src/lib/reportRange.ts",
        "app/src/components/FloodAlertCard.tsx",
        "app/src/app/api/reports/export/route.ts"
      ],
      "classNames": [],
      "methodNames": [],
      "interfaceNames": ["ReportCollection", "WeatherSuccess"],
      "functionNames": ["POST", "parseReportForm", "sniffImageType", "fetchWalkingRoute", "verifyGovPin", "sessionSecretFor", "publicOriginFrom", "getSessionView", "observeRainfall", "forecastRain", "buildFloodAlert", "toCsv"],
      "variableNames": ["REPORT_CATEGORIES", "LAYERS", "HAZARDS", "basemapStyle", "AUTH_MODE"],
      "structNames": [],
      "enumNames": [],
      "moduleNames": ["MapExplorer", "api/reports", "MapView", "auth", "jma", "reportExport", "ControlPanel", "ReportForm", "searchText", "reportsApi", "reportStore", "schema", "mapModes", "DemoLoginForm", "municipalities", "api/routing", "reportRange", "FloodAlertCard", "api/reports/export"]
    }
  }
}
```
