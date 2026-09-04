// 説明資料② 必要機能の一覧と実装の対応表（CODIHA 2026 提出用・表形式）
//
//   typst compile --root ../../.. 02-feature-implementation-table.typ
//   （リポジトリのルートから: bash docs/presentation/submission/build.sh）
//
// 提出要件（`課題/2026-09-09_CODIHA2026_提出要件.md`「説明資料の仕様」2）:
//   ・列は「番号／必要機能／対応する実装／備考」
//   ・必要機能はサービス概要（説明資料①）と対応した機能を簡潔に．行分けを適切に
//   ・対応する実装は「どのファイルのどこか」を記す
//   ・**未実装の機能も割愛せず「未実装」と書く（過少申告しない）**
//
// 「どこか」は行番号ではなく **ファイル名 + シンボル名**で書いてある．
// 行番号はコードを 1 行足すだけでずれるが，シンボル名はずれないため．
// 全行の実在は `verify_table.py` が機械的に確かめる（パスの存在 + シンボルの grep）．
//
// 未実装の一覧は `docs/spec/13-limitations.md` と `docs/design/requirements.md` §10-1 が正本．
// あちらを直したらこの表も直す．

#import "common.typ": *

#set document(
  title: "CHIZUBA 必要機能の一覧と実装の対応表",
  description: "CODIHA 2026 ハッカソン部門 提出用 説明資料② 必要機能の一覧と実装の対応表",
)

#set page(
  paper: "a4",
  margin: (top: 16mm, bottom: 14mm, left: 14mm, right: 14mm),
  header: context {
    if counter(page).get().first() == 1 { return }
    set text(font: FONT_SANS, size: 7.5pt, fill: muted)
    grid(
      columns: (1fr, auto),
      align: (left, right),
      [#PRODUCT ｜ 必要機能の一覧と実装の対応表],
      [#EVENT ｜ チーム #TEAM],
    )
    v(-4pt)
    line(length: 100%, stroke: 0.4pt + line-color)
  },
  footer: context {
    set text(font: FONT_SANS, size: 7.5pt, fill: muted)
    line(length: 100%, stroke: 0.4pt + line-color)
    v(-2pt)
    grid(
      columns: (1fr, auto),
      align: (left, right),
      [説明資料② 必要機能の一覧と実装の対応表],
      [#counter(page).display("1") / #context counter(page).final().first()],
    )
  },
)

#set text(font: FONT_SERIF, size: 8.6pt, lang: "ja", fill: ink)
#set par(justify: false, leading: 0.6em, spacing: 0.8em)
#set list(indent: 0.3em, body-indent: 0.4em, spacing: 0.4em, marker: text(fill: blue)[•])

#show link: it => text(fill: blue)[#it]
#show raw: it => text(font: FONT_MONO, size: 7.2pt)[#it]

// ---- 表の部品 ---------------------------------------------------------------

#let PATH = (c) => text(font: FONT_MONO, size: 6.9pt, fill: rgb("#243444"))[#c]
#let SYM = (c) => text(font: FONT_MONO, size: 6.9pt, fill: blue)[#c]

/// 「未実装」の印
#let NG = box(
  fill: rgb("#fbe9e4"),
  inset: (x: 3pt, y: 1pt),
  outset: (y: 2pt),
  radius: 2pt,
)[#text(font: FONT_SANS, size: 7pt, weight: "bold", fill: rgb("#a33a13"))[未実装]]

/// 「実装済」の印
#let OK = box(
  fill: rgb("#e4f2ea"),
  inset: (x: 3pt, y: 1pt),
  outset: (y: 2pt),
  radius: 2pt,
)[#text(font: FONT_SANS, size: 7pt, weight: "bold", fill: rgb("#0b6b46"))[実装済]]

/// 「作らない」の印（要件に無いと決めたもの）
#let NA = box(
  fill: paper-tint,
  inset: (x: 3pt, y: 1pt),
  outset: (y: 2pt),
  radius: 2pt,
)[#text(font: FONT_SANS, size: 7pt, weight: "bold", fill: muted)[作らない]]

#let no = counter("row")

/// 表の 1 行．番号は自動で振る（並べ替えても振り直される）
#let row(feature, impl, remark) = (
  {
    no.step()
    align(center)[#text(font: FONT_SANS, size: 7.6pt, weight: "bold")[#context no.display("1")]]
  },
  feature,
  impl,
  remark,
)

/// 節の見出し行（4 列ぶちぬき）
#let section(label) = table.cell(
  colspan: 4,
  fill: rgb("#e7ecf1"),
  inset: (x: 5pt, y: 4pt),
)[#text(font: FONT_SANS, size: 8.4pt, weight: "bold", fill: rgb("#1f2b38"))[#label]]

// =============================================================================

#block(above: 0pt, below: 8pt)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 8pt,
    align: horizon,
    image(LOGO, width: 12mm),
    [
      #text(font: FONT_SANS, size: 15pt, weight: "bold")[必要機能の一覧と実装の対応表]
      #linebreak()
      #text(font: FONT_SANS, size: 9pt, fill: muted)[
        #PRODUCT（チズバ）　｜　#EVENT　｜　チーム #TEAM　｜　説明資料②
      ]
    ],
  )
]

#note[
  #set text(size: 8pt)
  - #text(weight: "bold")[「必要機能」は説明資料①（サービスの概要）と対応している．]
    括弧の中の #text(font: FONT_MONO, size: 7.2pt)[F-1] 〜 #text(font: FONT_MONO, size: 7.2pt)[F-8] は，
    チームで決めた要件をそのまま機能 ID に落としたもの（正本は開発リポジトリの
    #PATH[docs/design/requirements.md] §3）
  - #text(weight: "bold")[「対応する実装」は，提出した作業ディレクトリからの相対パスとシンボル名で書いてある．]
    行番号はコードを 1 行足すだけでずれるので使っていない
  - #text(weight: "bold")[未実装のものも割愛せずに並べてある]（#NG の行．下の #text(weight: "bold")[Ｆ節]）．
    #NA は「要件に無いので作らないと決めたもの」
]

#v(6pt)

#set table(
  stroke: (x, y) => (
    top: if y == 0 { 0.8pt + ink } else if y == 1 { 0.5pt + ink } else { 0.35pt + line-color },
    bottom: 0.35pt + line-color,
  ),
  inset: (x: 4.5pt, y: 4pt),
  align: top,
)
#show table.cell.where(y: 0): set text(font: FONT_SANS, size: 8pt, weight: "bold")
#show table: set text(size: 7.6pt)
#show table: set par(leading: 0.52em, spacing: 0.5em)

#table(
  columns: (8mm, 37mm, 62mm, 1fr),

  table.header(
    align(center)[番号], [必要機能], [対応する実装（どのファイルのどこか）], [備考],
  ),

  // ---------------------------------------------------------------- 防災
  section[Ａ．防災 ── ハザードマップと，住民からの報告],

  ..row(
    [ハザードマップの表示　#chip("F-1", fill: sky)],
    [
      #PATH[src/lib/hazards.ts] … #SYM[HAZARDS]（4 種のタイル URL）・#SYM[HAZARD_LEGENDS]（凡例の定義） \
      #PATH[src/components/MapView.tsx] … raster ソースとレイヤーの積み上げ \
      #PATH[src/components/HazardLegend.tsx] … 凡例の描画 \
      #PATH[src/components/ControlPanel.tsx] … 種類ごとの ON/OFF と不透明度
    ],
    [
      #OK　洪水・高潮・津波の浸水想定と土砂災害警戒区域（急傾斜地の崩壊）の 4 種．
      タイルは国土交通省「重ねるハザードマップ」で，#text(weight: "bold")[ブラウザが直接取得する]．
      起動直後は洪水だけ ON（土砂災害は指定が北部に偏るため既定 OFF）．ズーム 6 未満では描画しない
    ],
  ),

  ..row(
    [施設のオープンデータの重ね合わせ　#chip("基盤", fill: muted)],
    [
      #PATH[src/lib/layers.ts] … #SYM[LAYERS]（データの場所・色・ポップアップ項目） \
      #PATH[public/data/evacuation_sites.geojson]（123） \
      #PATH[public/data/aed_locations.geojson]（304） \
      #PATH[public/data/childcare_facilities.geojson]（388） \
      #PATH[src/components/MapExplorer.tsx] … 取得　/　#PATH[MapView.tsx] … 描画
    ],
    [
      #OK　指定緊急避難場所・AED 設置箇所・子育て施設．レイヤーごとに表示を切り替えられ，
      点を押すと名称・所在地・種別ごとの詳細が出る．
      CSV → GeoJSON の変換は#text(weight: "bold")[開発リポジトリ側]の
      #PATH[data/scripts/build_geojson.py]（提出物には含まれない）
    ],
  ),

  ..row(
    [危険箇所の市民報告　#chip("F-2", fill: orange)],
    [
      #PATH[src/lib/reports.ts] … #SYM[REPORT_CATEGORIES] のカテゴリ #SYM[hazard] \
      #PATH[src/app/api/reports/route.ts] … #SYM[POST] \
      #PATH[src/lib/reportStore.ts] … #SYM[createReport] \
      #PATH[src/components/ReportForm.tsx] … 投稿フォーム \
      #PATH[db/init/001_schema.sql] … #SYM[reports] テーブル
    ],
    [
      #OK　位置＋写真（3 枚まで）＋説明．投稿にはログインが要る．
      #text(weight: "bold")[#SYM[city_code] はクライアントから受け取らず，サーバーが座標から決める]．
      入力欄はカテゴリ定義から組み立てるので，カテゴリを増やすと自動で増える
    ],
  ),

  ..row(
    [投稿の閲覧・詳細・コメント　#chip("F-2", fill: orange)],
    [
      #PATH[src/app/api/reports/route.ts] … #SYM[GET]（GeoJSON で返す） \
      #PATH[src/app/api/reports/\[id\]/route.ts] … #SYM[GET] \
      #PATH[src/app/api/reports/\[id\]/comments/route.ts] … #SYM[POST] \
      #PATH[src/lib/reportStore.ts] … #SYM[listReports]・#SYM[listComments]・#SYM[addComment] \
      #PATH[src/components/ReportPanel.tsx] … 詳細パネル
    ],
    [
      #OK　#text(weight: "bold")[閲覧は未ログインでもできる]（防災情報をログインの壁の向こうに置かない）．
      コメントの投稿にだけログインが要る．一覧は新着順 500 件で打ち切り
    ],
  ),

  ..row(
    [投稿写真の保存と配信],
    [
      #PATH[src/lib/photoStore.ts] … #SYM[savePhoto]・#SYM[sniffImageType]・#SYM[readPhoto] \
      #PATH[src/app/api/photos/\[reportId\]/\[index\]/route.ts] … 1 枚ずつ配信 \
      #PATH[compose.yaml] … #SYM[uploads] ボリューム（実体の置き場）
    ],
    [
      #OK　#text(weight: "bold")[先頭バイトで画像形式を判定する]（申告された MIME を信じない）．
      ファイル名は #SYM[path.basename] で #PATH[uploads/] に閉じ込める．
      #text(weight: "bold")[写真の Exif は除去していない]（Ｆ節）
    ],
  ),

  ..row(
    [投稿の編集・削除（投稿者本人）　#chip("F-2", fill: orange)],
    [
      #PATH[src/app/api/reports/\[id\]/route.ts] … #SYM[PATCH]・#SYM[DELETE] \
      #PATH[src/lib/reportStore.ts] … #SYM[updateReport]・#SYM[deleteReport] \
      #PATH[src/components/ReportEditForm.tsx]
    ],
    [
      #OK　直せるのは#text(weight: "bold")[本文と固有項目だけ]．
      #SYM[details] は丸ごと置き換えず重ねるので，サーバーが焼き込んだ雨量が消えない．
      #text(weight: "bold")[位置と写真は後から変えられない]（Ｆ節・意図的）
    ],
  ),

  ..row(
    [浸水（冠水）報告　#chip("F-3", fill: sky)],
    [
      #PATH[src/lib/reports.ts] … #SYM[REPORT_CATEGORIES] のカテゴリ #SYM[flood]（固有項目に浸水深・継続時間） \
      投稿の基盤は #text(weight: "bold")[3 番]と共通
    ],
    [
      #OK　3 種類の投稿を#text(weight: "bold")[1 テーブル・1 API・1 フォーム]に統一し，
      違いを #SYM[category] と #SYM[details]（jsonb）だけで表している
    ],
  ),

  ..row(
    [投稿時点の雨量の自動記録　#chip("F-3", fill: sky)],
    [
      #PATH[src/app/api/reports/route.ts] … #SYM[POST] が #SYM[observeRainfall()] を直接呼ぶ \
      #PATH[src/lib/jma.ts] … #SYM[observeRainfall]（気象庁アメダス実況・キャッシュつき） \
      #PATH[src/components/FloodRainfall.tsx] … 観測所名と距離つきの表示
    ],
    [
      #OK　#text(weight: "bold")[投稿者は入力も改変もできない]（#SYM[details] はカテゴリ定義にあるキーしか通さない）．
      最寄りのアメダスの値なので#text(weight: "bold")[観測所名と距離を必ず併記]し，
      20 km 以上離れていれば記録しない
    ],
  ),

  ..row(
    [蓄積データ × 雨予報にもとづく注意案内　#chip("F-4", fill: sky)],
    [
      #PATH[src/lib/weather.ts] … #SYM[buildFloodAlert]（発報条件の判定） \
      #PATH[src/lib/jma.ts] … #SYM[forecastRain]（府県天気予報） \
      #PATH[src/components/FloodAlertCard.tsx] … 表示 \
      #PATH[src/app/api/weather/route.ts] … 気象庁 JSON の中継
    ],
    [
      #OK　発報条件は「予報が取れている」「降水確率 30% 以上」「過去の浸水報告が 1 件以上」の
      #text(weight: "bold")[3 つすべて]．出すのは事実 2 つだけで
      #text(weight: "bold")[浸水の予測はしない]（気象業務法第 17 条の線）．
      予報は市町村単位ではないので予報区名を併記する
    ],
  ),

  // ---------------------------------------------------------------- 観光
  section[Ｂ．観光 ── 景観スポットと，住民のおすすめ],

  ..row(
    [観光マップ（景観100選の表示と解説）　#chip("F-5", fill: pink)],
    [
      #PATH[src/lib/scenic.ts] … #SYM[SCENIC_FILE]・カテゴリの色 \
      #PATH[public/data/scenic_spots.geojson]（100 件） \
      #PATH[src/components/MapView.tsx] … ポップアップ（日本語・英語の解説） \
      #PATH[src/lib/mapModes.ts]・#PATH[src/components/MapModeTabs.tsx] … 防災／観光の切り替え
    ],
    [
      #OK　モードを切り替えても#text(weight: "bold")[地図は作り直さない]．
      お土産は独立したデータセットが公開されていないため，#text(weight: "bold")[13 番]の投稿カテゴリとして集める
    ],
  ),

  ..row(
    [景観スポットの写真],
    [
      #PATH[src/lib/scenicPhotos.ts] … #SYM[scenicPhotoSrc]（自動生成のファイル） \
      #PATH[public/images/scenic/\*.jpg]（54 枚） \
      出典の表示は #PATH[src/app/about/page.tsx]
    ],
    [
      #OK（#text(weight: "bold")[100 か所中 54 か所]）．
      残り 46 か所はウィキメディア・コモンズに適切な写真が見つからなかった（同名別所を除外した結果）．
      作者とライセンスを写真ごとに表示している
    ],
  ),

  ..row(
    [徒歩ナビ（経路・距離・所要時間）　#chip("F-5", fill: pink)],
    [
      #PATH[src/app/api/routing/route.ts] … OSRM の中継（1 秒 1 リクエストの待ち行列） \
      #PATH[src/lib/routing.ts] … #SYM[fetchWalkingRoute] \
      #PATH[src/components/RouteCard.tsx] … 距離・所要時間の表示
    ],
    [
      #OK　現在地（または地図で指定した地点）から，表示中のレイヤーで最も近い地点まで．
      #text(weight: "bold")[OSRM に繋がらないときは直線距離 ÷ 4.8 km/h の概算に落ち]，
      「概算」と画面に出す（無反応で止まらない）
    ],
  ),

  ..row(
    [観光おすすめの市民投稿（お土産を含む）　#chip("F-6", fill: pink)],
    [
      #PATH[src/lib/reports.ts] … #SYM[REPORT_CATEGORIES] のカテゴリ #SYM[spot]（固有項目にお土産の別） \
      投稿の基盤は #text(weight: "bold")[3 番]と共通
    ],
    [
      #OK　住民と行政の両方が投稿できる．行政の投稿には「行政の公式投稿」バッジが付き，
      地図ではピンの輪が公式色になる
    ],
  ),

  // ------------------------------------------------------- 双方向性・認証
  section[Ｃ．双方向性と認証 ── 行政の応答と，ログイン],

  ..row(
    [行政の公式コメント　#chip("F-7", fill: blue)],
    [
      #PATH[src/app/api/reports/\[id\]/comments/route.ts] … #SYM[isOfficial] をサーバーがロールから決める \
      #PATH[src/lib/reportStore.ts] … #SYM[addComment] \
      #PATH[src/components/OfficialBadge.tsx] … 公式の印
    ],
    [
      #OK　#text(weight: "bold")[#SYM[isOfficial] はクライアントから受け取らない]．
      行政の発言と住民の発言が混ざると防災上の誤解を生むため，必ず視覚的に区別する
    ],
  ),

  ..row(
    [対応状況の 4 段階更新　#chip("F-7", fill: blue)],
    [
      #PATH[src/lib/reports.ts] … #SYM[REPORT_STATUSES]・#SYM[canUpdateStatus] \
      #PATH[src/app/api/reports/\[id\]/route.ts] … #SYM[PATCH] \
      #PATH[src/components/ReportStatusControl.tsx] … 4 段階の操作
    ],
    [
      #OK　未対応／受付／対応中／対応済．
      更新できるのは#text(weight: "bold")[担当する市町村（#SYM[govCityCode]）が投稿の #SYM[city_code] と一致する行政ユーザーだけ]．
      権限の判定は必ず API 側でセッションを見て行う
    ],
  ),

  ..row(
    [行政の投稿・発言の区別表示　#chip("F-7", fill: blue)],
    [
      #PATH[src/components/OfficialBadge.tsx] … バッジ 2 種 \
      #PATH[src/components/MapView.tsx] … ピンの輪を公式色 #SYM[\#0072b2] にする
    ],
    [
      #OK　一覧・詳細・地図の 3 か所すべてで区別する．
      観光おすすめは住民と行政の両方が投稿するので，ここが混ざると出どころが分からなくなる
    ],
  ),

  ..row(
    [Google アカウントによるログイン　#chip("F-8", fill: blue)],
    [
      #PATH[src/lib/auth.ts] … #SYM[providers()]（Google を足すかどうかの分岐） \
      #PATH[src/app/api/auth/\[...nextauth\]/route.ts] … Auth.js のエンドポイント \
      #PATH[src/lib/publicOrigin.ts] … #SYM[publicOriginFrom]（公開 URL をヘッダーから導く） \
      #PATH[.env.example] … 必要な環境変数の一覧
    ],
    [
      #OK　#text(weight: "bold")[認証キーが未設定の環境では自動でデモログインだけになる]ので，
      審査は #SYM[docker compose up] だけで完結する．
      キーは秘密情報なので提出物に同梱していない．
      リダイレクト先は設定値で持たず，リクエストのホストから毎回導く
    ],
  ),

  ..row(
    [デモログイン（ロールの選択つき）　#chip("F-8", fill: blue)],
    [
      #PATH[src/lib/auth.ts] … #SYM[Credentials] プロバイダ（表示名と PIN の検証） \
      #PATH[src/components/DemoLoginForm.tsx] … フォーム \
      #PATH[src/lib/authActions.ts]・#PATH[src/lib/govPin.ts]
    ],
    [
      #OK　#text(weight: "bold")[鍵の有無に関わらず常に使える]．一般ユーザーと行政ユーザーを選べる．
      公開環境向けに #SYM[GOV_DEMO_PIN] を設定すると行政ロールに PIN を要求する（未設定なら不要）
    ],
  ),

  ..row(
    [セッションの管理],
    [
      #PATH[src/lib/installId.ts] … このインストールを識別する UUID \
      #PATH[src/lib/auth.ts] … #SYM[jwt] コールバック（#SYM[inst] を毎回突き合わせる） \
      #PATH[src/lib/users.ts] … #SYM[upsertUser]
    ],
    [
      #OK　署名鍵をインストール ID から導き，JWT にも焼き込む．
      #text(weight: "bold")[別インストールで発行されたトークンは通さない]．
      その代わり #SYM[docker compose down -v] を打つと全員ログアウトになる
    ],
  ),

  // ---------------------------------------------- 要件から足したもの
  section[Ｄ．設計に落とす過程で足した機能（開発リポジトリ #PATH[docs/design/requirements.md] §3-4 に明記）],

  ..row(
    [投稿一覧の画面（#SYM[/reports]）],
    [
      #PATH[src/app/reports/page.tsx] … サーバー側で #SYM[listReports()] を直接呼ぶ
    ],
    [
      #OK　地図だけだと画面外の投稿に気づけないため足した．
      API を経由しないので#text(weight: "bold")[JavaScript が無効でも動く]（絞り込みはリンクと GET フォーム）
    ],
  ),

  ..row(
    [投稿日の範囲での絞り込み（浸水実績の遡り）],
    [
      #PATH[src/lib/reportRange.ts] … #SYM[normalizeRange]・#SYM[RANGE_PRESETS] \
      #PATH[src/components/DateRangeFilter.tsx] \
      #PATH[src/lib/reportStore.ts] … #SYM[listReports] の SQL
    ],
    [
      #OK　JST の暦日で扱う．
      #text(weight: "bold")[注意案内（9 番）は絞り込みの影響を受けない]
      ── 絞ったせいで「過去に浸水報告はありません」になると防災の判断を誤らせるため，
      根拠の浸水報告だけ全期間で引き直している
    ],
  ),

  ..row(
    [キーワード検索],
    [
      #PATH[src/lib/searchText.ts] … #SYM[normalizeSearch]・#SYM[searchMatches] \
      #PATH[src/components/SearchBox.tsx] … 入力欄と候補（最大 8 件） \
      #PATH[src/lib/reportStore.ts] … SQL 側も #SYM[normalize()] で同じ変換をかける
    ],
    [
      #OK　両側を NFKC ＋ 小文字にそろえるので半角カナでも当たる．
      #SYM[LIKE] のワイルドカードは打ち消す．
      #text(weight: "bold")[索引は効かない]ので，数万件規模では遅くなる（Ｆ節）
    ],
  ),

  ..row(
    [オープンデータとしての書き出し（CSV / GeoJSON）],
    [
      #PATH[src/lib/reportExport.ts] … #SYM[toCsv]・#SYM[toGeoJson]・#SYM[exportHref] \
      #PATH[src/app/api/reports/export/route.ts] … 絞り込み条件を一覧と共通で受ける \
      #PATH[src/components/ExportLinks.tsx] … #SYM[\<a href\>] だけ（JS 不要）
    ],
    [
      #OK　CSV は UTF-8 BOM ＋ CRLF ＋ RFC 4180，GeoJSON は RFC 7946．
      利用者が書いた文字列が #SYM[=] #SYM[+] #SYM[-] #SYM[\@] で始まるときは先頭に #SYM[']
      を足す（表計算ソフトが本文を数式として実行するのを止める）．
      #text(weight: "bold")[デモ投稿の雨量は書き出さない]（観測値ではないため）．1000 件で打ち切り
    ],
  ),

  ..row(
    [現在地ボタン],
    [
      #PATH[src/components/MapView.tsx] … MapLibre の #SYM[GeolocateControl]
    ],
    [
      #OK　「まず自分がどこにいるか」だけを見たい場面のために足した．
      ブラウザの仕様で #SYM[localhost] か HTTPS でのみ動く
    ],
  ),

  ..row(
    [出典とライセンスの表示],
    [
      #PATH[src/lib/credits.ts] … #SYM[DATA_CREDITS]・#SYM[MAP_ATTRIBUTION]・#SYM[DEMO_PHOTO_CREDITS] \
      #PATH[src/app/about/page.tsx] … 全件の一覧
    ],
    [
      #OK　地図の隅に短い版，#SYM[/about] に全件（データ・外部サービス・写真 54 枚と 17 枚）．
      出典の正本を 1 ファイルに置き，2 か所が同じものを見る
    ],
  ),

  ..row(
    [プライバシーポリシー],
    [
      #PATH[src/app/privacy/page.tsx]（静的ページ）
    ],
    [
      #OK　#text(weight: "bold")[実装を読んで書いた]．
      暗号化セッション Cookie に Google のメールと画像 URL が残ること，
      写真の Exif が消えないこと，退会画面が無いことも正直に書いてある
    ],
  ),

  // ---------------------------------------------------------------- 基盤
  section[Ｅ．動かすための基盤],

  ..row(
    [コンテナ 2 つでの起動],
    [
      #PATH[Dockerfile] … 3 ステージ（#SYM[deps] / #SYM[builder] / #SYM[runner]） \
      #PATH[compose.yaml] … #SYM[web]・#SYM[db] とボリューム 2 つ \
      #PATH[next.config.ts] … #SYM[output: "standalone"]
    ],
    [
      #OK　#SYM[docker compose up] だけで起動する．ベースイメージは Docker 公式イメージで，
      タグは固定（#SYM[node:22-slim] / #SYM[postgres:17-alpine]）．
      公開ポートは #SYM[CHIZUBA_PORT]（既定 3000）で変えられる
    ],
  ),

  ..row(
    [データベースのスキーマと初期化],
    [
      #PATH[db/init/001_schema.sql] … 6 テーブル・6 索引 \
      #PATH[db/init/002_seed_municipalities.sql] … 市町村マスタ \
      #PATH[src/lib/db.ts] … 接続プール（10）
    ],
    [
      #OK　#SYM[db] の初回起動時にだけ流れるので，デモ投稿が二重に入ることはない．
      #text(weight: "bold")[PostGIS も ORM もマイグレーションツールも使っていない]
      （緯度経度は数値カラム・SQL は素の #SYM[pg]）
    ],
  ),

  ..row(
    [デモデータ（投稿 22 件・写真 17 枚）],
    [
      #PATH[db/init/003_seed_demo_reports.sql] … ユーザー 7・投稿 22・写真 17・コメント 6 \
      #PATH[db/seed-photos/\*.jpg] … 写真の実体 \
      #PATH[Dockerfile] … #PATH[/app/uploads] へ配る \
      #PATH[src/components/DemoBadge.tsx] … 「デモ投稿」の印
    ],
    [
      #OK　危険箇所 7・浸水 5・観光おすすめ 10．
      #text(weight: "bold")[実際の通報ではない]ので画面で区別し，浸水の雨量はダミー値として表示し，
      書き出しからは除いている．写真は再利用が許されたものだけ
    ],
  ),

  ..row(
    [入力の検証とエラーの表示],
    [
      #PATH[src/lib/reportInput.ts] … #SYM[parseReportForm]・#SYM[parseListQuery]・#SYM[parseReportPatch] \
      #PATH[src/lib/apiRoute.ts] … DB 落ちの共通処理（503）・一覧の絞り込み \
      #PATH[src/components/Toast.tsx] … 画面上部の通知
    ],
    [
      #OK　検証は#text(weight: "bold")[日本語の理由]を返す．
      SQL はすべてプレースホルダで組む．
      DB に繋がらないときは投稿だけ空になり，地図とハザードマップはそのまま見える
    ],
  ),

  ..row(
    [スマートフォンでの表示（モバイルファースト）],
    [
      #PATH[src/app/globals.css] … 重ね順（ポップアップの #SYM[z-index: 15]）・レンジ入力の当たり判定 \
      #PATH[src/components/ControlPanel.tsx] … 375px では下から引き上げるシート
    ],
    [
      #OK　375px 幅で先に決めてから広い画面へ広げている．320px でも溢れない．
      実機（iOS シミュレータ）と Chromium / WebKit で実際に操作して確かめた
    ],
  ),

  // ------------------------------------------------------------ 未実装
  section[Ｆ．未実装 ── 割愛せずに全件並べる],

  ..row(
    [投稿の通報導線・非表示フラグ・行政による削除],
    [—],
    [
      #NG　開発リポジトリの #PATH[docs/design/requirements.md] §10-1 で
      「#text(weight: "bold")[実装せず，設計として答えを用意する]」と決めた．
      期間内に確実に動かすことを優先した
    ],
  ),

  ..row([投稿・コメントのレート制限], [—], [#NG　同上．1 人がいくらでも連投できる]),

  ..row(
    [自動テスト],
    [—],
    [
      #NG（#text(weight: "bold")[0 本]）．期間が 2 週間強で，テストを書く時間を機能の動作確認に振った．
      代わりに毎フェーズ #SYM[npm run typecheck]・実操作・提出アーカイブの起動確認・
      秘匿情報スキャンの 4 つを通している
    ],
  ),

  ..row(
    [内水（雨水出水）の浸水想定の重ね],
    [—],
    [
      #NG　市川市は水防法第14条の2 にもとづき#text(weight: "bold")[指定・公表している]が，
      公表形態が 30.73 MB の PDF だけで，地図に重ねられるタイルも GIS データも無い．
      #text(weight: "bold")[区域が無いからではない]
    ],
  ),

  ..row(
    [土石流・地すべりの警戒区域の重ね],
    [—],
    [
      #NG　#text(weight: "bold")[市川市に指定が無い]（土砂災害警戒区域 142 区域はすべて急傾斜地の崩壊）．
      出典: 千葉県「土砂災害警戒区域等の一覧」
    ],
  ),

  ..row(
    [投稿写真の Exif の除去],
    [
      #PATH[src/lib/photoStore.ts] … 受け取ったバイト列をそのまま保存している
    ],
    [
      #NG　#text(weight: "bold")[位置情報や撮影日時が写真に残る]．
      #SYM[/privacy] に正直に書いてある
    ],
  ),

  ..row([アカウントの削除（退会）画面], [—], [#NG　退会・データ削除の UI が無い．#SYM[/privacy] に明記]),

  ..row(
    [コメントの編集・削除],
    [—],
    [#NG　#SYM[report_comments] に UPDATE / DELETE の経路を作っていない],
  ),

  ..row(
    [投稿の位置・写真の後からの変更],
    [
      #PATH[src/lib/reportInput.ts] … #SYM[parseReportPatch] が受け付ける項目から外してある
    ],
    [
      #NG（#text(weight: "bold")[意図的]）．位置を動かせると写真と現場が食い違う．
      間違えたときは消して投稿し直す
    ],
  ),

  ..row([行政への新着通知], [—], [#NG　行政は自分で投稿一覧を見に行く．通知の仕組みが無い]),

  ..row(
    [投稿の並べ替え・ページ送り],
    [—],
    [#NG　新着順 500 件（書き出しは 1000 件）で打ち切り．それ以上は取れない],
  ),

  ..row(
    [市町村の切り替え UI],
    [
      #PATH[src/app/page.tsx] … #SYM[?city=] で URL からの指定はできる
    ],
    [
      #NG　画面に選択肢が無い．設計は千葉県全域に対応しているが，
      #SYM[municipalities] に入っているのは市川市の 1 行だけ
    ],
  ),

  ..row(
    [UI の多言語対応],
    [
      #PATH[public/data/scenic_spots.geojson] … 景観スポットの解説だけ日本語と英語がある
    ],
    [#NG　画面そのものは日本語のみ],
  ),

  ..row(
    [投稿件数・同時アクセス数の性能],
    [—],
    [
      #NG（#text(weight: "bold")[未測定]）．負荷試験をしていない．
      分かっているのは「接続プールが 10」「Node.js は単一プロセス」「#SYM[web] コンテナは 1 個」だけ．
      地図の点 915 個（123+304+388+100）はクラスタリングしていない
    ],
  ),

  ..row(
    [投稿写真のリサイズ・容量の上限],
    [—],
    [#NG　5 MB の写真は 5 MB のまま保存・配信する．#SYM[uploads] の総容量に上限も自動削除も無い],
  ),

  ..row(
    [監査ログ（誰がいつ何を変えたか）],
    [—],
    [
      #NG　#SYM[updated_at] を持つだけで，変更の履歴を残していない．
      対応状況を誰が変えたかは追えない
    ],
  ),

  ..row(
    [通知・SNS 連携・ランキング],
    [—],
    [#NA　要件に無いので作らないと決めた（#PATH[docs/design/requirements.md] §3-4）],
  ),
)

#v(8pt)

#note(fill: paper-tint, stroke-color: muted)[
  #set text(size: 8pt)
  #text(font: FONT_SANS, weight: "bold")[この表の確かめ方]
  #v(2pt)
  「対応する実装」に書いたファイルとシンボルは，#text(weight: "bold")[全行を機械的に照合してある]
  （#PATH[docs/presentation/submission/verify_table.py]．パスの存在と，シンボルがそのファイルに
  実在するかを確かめ，1 つでも欠ければ非 0 で終わる）．
  #linebreak()
  パスは#text(weight: "bold")[提出した作業ディレクトリからの相対]（例:
  #PATH[src/lib/hazards.ts] は #PATH[ai-de-chiba-map/src/lib/hazards.ts]）．
  #PATH[data/] や #PATH[docs/] で始まるものだけは開発リポジトリ側を指していて，提出物には含まれない．
]
