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
  #set text(size: 8.2pt)
  - #text(weight: "bold")[「必要機能」は説明資料①（サービスの概要）2 ページ目と同じ 8 項目・同じ番号．]
  - #text(weight: "bold")[「対応する実装」は，提出した作業ディレクトリからの相対パスとシンボル名．]
    行番号はコードを 1 行足すだけでずれるので使っていない．
    全行のパスとシンボルは #PATH[docs/presentation/submission/verify_table.py] が機械的に照合している
  - #text(weight: "bold")[備考の末尾に「確かめ方」を書いた．] 起動した審査員が
    その場で 30 秒で動作を確認できる手順になっている
  - #text(weight: "bold")[ログインの仕組みは，すぐ下の囲みにまとめた．] 各行の「確かめ方」は，
    審査環境（認証キー未設定）で#text(weight: "bold")[デモログイン]をした状態を前提に書いてある
]

#v(5pt)

#note[
  #set text(size: 8.2pt)
  #text(font: FONT_SANS, weight: "bold", size: 8.8pt, fill: deep)[
    ログインについて　—　「デモログイン」は本人確認を省いた入り方という意味で，機能の制限ではない
  ]
  #v(3pt)
  - #text(weight: "bold")[ログインがしているのは 2 つだけ．]
    #text(weight: "bold")[「誰が投稿したか」を記録する]ことと，
    #text(weight: "bold")[一般ユーザーか行政ユーザーかの役割を決める]こと，の 2 つだけである．
    #text(weight: "bold")[地図・ハザードマップ・投稿の閲覧・投稿一覧・CSV / GeoJSON の書き出しは，
    ログインなしで全部できる．]ログインが要るのは投稿とコメントのときだけ
  - #text(weight: "bold")[ログイン方法は 2 つある．]
    #text(weight: "bold")[① Google ログイン]（本人確認を Google に任せる）と，
    #text(weight: "bold")[② デモログイン]（表示名を入れ，一般ユーザーか行政ユーザーかを選ぶだけ）
  - #text(weight: "bold")[2 つの違いは本人確認をするかしないかだけで，ログインした後にできることは
    まったく同じ．] 投稿・写真の添付・コメント・行政ユーザーとしての対応状況の更新と公式回答まで，
    #text(weight: "bold")[どちらで入っても同じように動く]．
    デモログインだから使えない機能というものは無い
  - #text(weight: "bold")[上の表の 8 機能は，すべてデモログインだけで確認できる．]
    各行の「確かめ方」のとおりに操作すれば，行政ユーザーの操作まで含めて全部その場で動く
  - #text(weight: "bold")[Google の認証キーがある環境では，同じログイン画面に「Google でログイン」が
    足されるだけ]で，デモログインは消えない．
    #text(weight: "bold")[クライアントシークレットは秘密情報なので提出物に同梱していない]ため，
    審査環境ではデモログインだけが表示される．
    #text(weight: "bold")[Google ログインは審査環境では検証できないので，この表の行にしていない]
]

#v(6pt)

#set table(
  stroke: (x, y) => (
    top: if y == 0 { 0.8pt + ink } else if y == 1 { 0.5pt + ink } else { 0.35pt + line-color },
    bottom: 0.35pt + line-color,
  ),
  inset: (x: 4.5pt, y: 5pt),
  align: top,
)
#show table.cell.where(y: 0): set text(font: FONT_SANS, size: 8pt, weight: "bold")
#show table: set text(size: 7.6pt)
#show table: set par(leading: 0.52em, spacing: 0.5em)

/// 「確かめ方」の見出し札
#let HOW = text(font: FONT_SANS, size: 7pt, weight: "bold", fill: deep)[確かめ方:]

#table(
  columns: (8mm, 34mm, 58mm, 1fr),

  table.header(
    align(center)[番号], [必要機能], [対応する実装（どのファイルのどこか）], [備考と，確かめ方],
  ),

  ..row(
    [ハザードマップの表示],
    [
      #PATH[src/lib/hazards.ts] … #SYM[HAZARDS]（4 種のタイル URL）・#SYM[HAZARD_LEGENDS]（凡例） \
      #PATH[src/components/MapView.tsx] … raster ソースとレイヤーの積み上げ \
      #PATH[src/components/HazardLegend.tsx] … 凡例の描画 \
      #PATH[src/components/ControlPanel.tsx] … 種類ごとの ON/OFF と不透明度
    ],
    [
      #OK　洪水・高潮・津波の浸水想定と土砂災害警戒区域（急傾斜地の崩壊）の #text(weight: "bold")[4 種]．
      タイルは国土交通省「重ねるハザードマップ」で，ブラウザが直接取得する．
      起動直後は洪水だけ ON（土砂災害は指定が北部に偏るため既定 OFF）
      #linebreak()
      #HOW 左の操作パネルを一番下まで送る →「土砂災害（急傾斜地の崩壊）」を ON →
      北部の斜面に赤と黄の帯が出て，凡例が 4 段階増える
    ],
  ),

  ..row(
    [市川市オープンデータの重ね合わせ],
    [
      #PATH[src/lib/layers.ts] … #SYM[LAYERS]（データの場所・色・ポップアップ項目） \
      #PATH[src/lib/scenic.ts] … #SYM[SCENIC_CATEGORIES]（景観100選の色分け） \
      #PATH[public/data/evacuation_sites.geojson]（123） \
      #PATH[public/data/aed_locations.geojson]（304） \
      #PATH[public/data/childcare_facilities.geojson]（388） \
      #PATH[public/data/scenic_spots.geojson]（100） \
      #PATH[src/components/MapExplorer.tsx] … 取得　/　#PATH[MapView.tsx] … 描画
    ],
    [
      #OK　指定緊急避難場所 123・AED 設置箇所 304・子育て施設 388・いちかわ景観100選 100．
      すべて市川市オープンデータ（CC BY 4.0）由来で，#text(weight: "bold")[DB を経由せず同梱してある]
      （データベースが落ちていても出る）
      #linebreak()
      #HOW 操作パネル「表示するデータ」で「AED 設置箇所 304 件」を ON / OFF →
      点が出入りする．点を押すと名称・所在地が出る
    ],
  ),

  ..row(
    [危険箇所の市民報告],
    [
      #PATH[src/lib/reports.ts] … #SYM[REPORT_CATEGORIES] のカテゴリ #SYM[hazard] \
      #PATH[src/app/api/reports/route.ts] … #SYM[POST]（投稿の受け口） \
      #PATH[src/lib/reportInput.ts] … #SYM[parseReportForm]（検証） \
      #PATH[src/components/ReportForm.tsx] … 投稿フォーム \
      #PATH[src/components/ReportPanel.tsx] … 詳細パネル（写真・本文・コメント） \
      #PATH[src/components/ReportEditForm.tsx] … 投稿者本人による本文の編集
    ],
    [
      #OK　位置＋写真（3 枚まで）＋説明で投稿でき，地図にピンが出る．
      #text(weight: "bold")[投稿の市町村は座標から決める]ので詐称できない．
      写真は先頭バイトまで確かめる
      #linebreak()
      #HOW 右上「ログイン」→ 表示名を入れて「デモログイン」→
      操作パネル「危険箇所を投稿する」→ 地図で位置を指定して送信 → 橙のピンが増える
    ],
  ),

  ..row(
    [浸水報告と，投稿時点の雨量の自動記録],
    [
      #PATH[src/lib/reports.ts] … #SYM[REPORT_CATEGORIES] のカテゴリ #SYM[flood] \
      #PATH[src/lib/jma.ts] … #SYM[observeRainfall]（アメダス実況の取得とキャッシュ） \
      #PATH[src/app/api/reports/route.ts] … 投稿時にサーバー側で雨量を焼き込む \
      #PATH[src/components/FloodRainfall.tsx] … 観測所名と距離つきの表示 \
      #PATH[src/lib/weather.ts] … #SYM[buildFloodAlert]（注意表示を出すかの判定） \
      #PATH[src/components/FloodAlertCard.tsx] … 注意表示
    ],
    [
      #OK　投稿した瞬間の 1 時間降水量が気象庁アメダス実況から自動で記録される．
      #text(weight: "bold")[投稿者は入力・改変できない]．
      #text(weight: "bold")[最寄りの観測所の値]であってその地点の実測値ではないため，
      観測所名と距離を必ず併記する（市川市の中心からは船橋・約 10 km）．
      過去に浸水報告のある地域への注意表示は，
      #text(weight: "bold")[気象庁の予報で降水確率が 30% 以上のときだけ]出る（浸水の予測はしない）
      #linebreak()
      #HOW ログインして「浸水を投稿する」→ 送信 → 詳細パネルに
      「投稿時の雨量 ◯ mm/h ／ 観測所名と距離」が入る
      （例: 船橋アメダス 約 10 km。#text(weight: "bold")[最寄りの観測所は投稿位置によって変わる]）
    ],
  ),

  ..row(
    [観光マップ（景観100選と徒歩ナビ）],
    [
      #PATH[src/lib/mapModes.ts] … #SYM[MAP_MODES]（防災／観光で出す組） \
      #PATH[src/components/MapModeTabs.tsx] … タブの切り替え \
      #PATH[src/lib/scenicPhotos.ts] … #SYM[SCENIC_PHOTOS]（54 か所の写真と出典） \
      #PATH[src/app/api/routing/route.ts] … OSRM への中継（1 秒 1 リクエスト） \
      #PATH[src/components/RouteCard.tsx] … 距離と所要時間の表示
    ],
    [
      #OK　景観スポット 100 か所を日本語と英語の解説つきで表示し，
      #text(weight: "bold")[100 か所のうち 54 か所に写真]が付く（作者とライセンスを併記）．
      そのまま徒歩ナビの目的地にできる．
      #text(weight: "bold")[経路サービス（OSRM）が落ちたら直線距離と徒歩 4.8 km/h の概算に自動で切り替わり]，
      概算である旨を画面に出す（無反応で止まらない）
      #linebreak()
      #HOW ヘッダー直下「観光マップ」→ 景観スポットの点を押す → 解説と写真 →
      「ここへナビ」→ 経路と距離・所要時間が出る
    ],
  ),

  ..row(
    [観光おすすめの市民投稿],
    [
      #PATH[src/lib/reports.ts] … #SYM[REPORT_CATEGORIES] のカテゴリ #SYM[spot] \
      #PATH[src/app/api/reports/route.ts] … 危険箇所・浸水と #text(weight: "bold")[同じ 1 経路] \
      #PATH[src/components/ReportForm.tsx] … #text(weight: "bold")[同じ 1 フォーム]
    ],
    [
      #OK　景観・お土産・飲食のおすすめを住民と行政の両方が投稿できる．
      3 種類の投稿を #text(weight: "bold")[1 テーブル・1 API・1 フォーム]に統一してあり，
      違いは #SYM[category] と #SYM[details]（jsonb）だけ
      #linebreak()
      #HOW 観光マップでログイン →「観光おすすめを投稿する」→ 送信 → 赤紫のピンが増える
    ],
  ),

  ..row(
    [行政からの応答],
    [
      #PATH[src/app/api/reports/\[id\]/route.ts] … #SYM[PATCH]（対応状況の更新） \
      #PATH[src/app/api/reports/\[id\]/comments/route.ts] … #SYM[POST]（公式コメント） \
      #PATH[src/lib/reports.ts] … #SYM[REPORT_STATUSES]（4 段階の定義） \
      #PATH[src/components/ReportStatusControl.tsx] … 更新の UI \
      #PATH[src/components/OfficialBadge.tsx] … 行政の投稿・発言の区別表示
    ],
    [
      #OK　公式コメントと対応状況 4 段階（未対応／受付／対応中／対応済）の更新．
      #text(weight: "bold")[更新できるのは担当する市町村の投稿だけ]で，
      一般ユーザーが変えようとすると HTTP 403 で断る
      #linebreak()
      #HOW ログイン画面で「行政ユーザー（市川市）」を選ぶ
      （#text(weight: "bold")[認証キー未設定の審査環境では PIN なしでそのまま選べる]）→
      投稿を開くと「行政の対応状況を更新する」が出る
    ],
  ),

  ..row(
    [投稿の一覧・絞り込みと，オープンデータとしての書き出し],
    [
      #PATH[src/app/reports/page.tsx] … 一覧の画面（#SYM[/reports]） \
      #PATH[src/lib/reportRange.ts] … #SYM[RANGE_PRESETS]・#SYM[normalizeRange]（期間） \
      #PATH[src/lib/searchText.ts] … #SYM[normalizeSearch]（NFKC + 小文字でそろえる） \
      #PATH[src/lib/reportExport.ts] … #SYM[toCsv]・#SYM[toGeoJson] \
      #PATH[src/app/api/reports/export/route.ts] … #SYM[GET]（書き出しの受け口）
    ],
    [
      #OK　カテゴリ・期間・キーワードで絞り込め，
      #text(weight: "bold")[絞り込んだそのままの条件で]書き出せる．
      CSV は UTF-8 BOM + CRLF + RFC 4180，GeoJSON は RFC 7946．
      出すのは画面で誰でも読める項目だけで，#text(weight: "bold")[アカウントの情報は含めない]．
      デモ投稿の雨量は観測値ではないので書き出さない
      #linebreak()
      #HOW ヘッダー「投稿一覧」→「7 日間」を押す → 件数が変わる →「CSV」を押すと
      その条件のまま落ちてくる
    ],
  ),
)

#v(8pt)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 10pt,
  note(fill: paper-tint, stroke-color: muted)[
    #set text(size: 8pt)
    #text(font: FONT_SANS, weight: "bold")[この表の確かめ方]
    #v(2pt)
    「対応する実装」に書いたファイルとシンボルは，#text(weight: "bold")[全行を機械的に照合してある]
    （#PATH[docs/presentation/submission/verify_table.py]．パスの存在と，シンボルがそのファイルに
    実在するかを確かめ，1 つでも欠ければ非 0 で終わる）．
    #linebreak()
    パスは#text(weight: "bold")[提出した作業ディレクトリからの相対]（例:
    #PATH[src/lib/hazards.ts] は #PATH[ai-de-chiba-map/src/lib/hazards.ts]）．
    #PATH[docs/] で始まるものだけは開発リポジトリ側を指していて，提出物には含まれない．
  ],
  note(fill: warn-tint, stroke-color: orange)[
    #set text(size: 8pt)
    #text(font: FONT_SANS, weight: "bold")[実装状況]
    #v(2pt)
    上の 8 機能は#text(weight: "bold")[すべて実装済みで，展開した提出物を起動して動作を確認している]．
  ],
)
