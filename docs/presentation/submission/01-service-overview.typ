// 説明資料① サービスの概要（CODIHA 2026 提出用・スライド形式・5 ページ以内）
//
//   typst compile --root ../../.. 01-service-overview.typ
//   （リポジトリのルートから: bash docs/presentation/submission/build.sh）
//
// 提出要件（`課題/2026-09-09_CODIHA2026_提出要件.md`「説明資料の仕様」1）が求める 3 項目:
//   ① サービスの目的 — 何をどのように解決するかを具体的に          → 1・2 ページ
//   ② コンテナの概要 — 図でコンテナ実行時の様子                    → 3 ページ
//   ③ コンテナ実行の手順と実行結果 — 実行結果はスクリーンショットで  → 4・5 ページ
//
// **readme.txt（提出 zip 同梱）の「1. 概要・主要機能」「4. 実行方法」と齟齬が無いこと**が
// 提出要件で明記されている．機能の並びと文言は readme.txt に合わせてある．
// readme.txt を直したら，このファイルの 2 ページと 4 ページも必ず一緒に直す．

#import "common.typ": *

#set document(
  title: "CHIZUBA サービスの概要",
  description: "CODIHA 2026 ハッカソン部門 提出用 説明資料① サービスの概要",
)

#set page(
  paper: "presentation-16-9",
  margin: (x: 13mm, top: 11mm, bottom: 9mm),
  footer: context {
    set text(font: FONT_SANS, size: 7.5pt, fill: muted)
    line(length: 100%, stroke: 0.4pt + line-color)
    v(-2pt)
    grid(
      columns: (1fr, auto),
      align: (left, right),
      [#PRODUCT ｜ #EVENT ｜ チーム #TEAM ｜ 説明資料① サービスの概要],
      [#counter(page).display("1") / 5],
    )
  },
)

#set text(font: FONT_SERIF, size: 9.5pt, lang: "ja", fill: ink)
#set par(justify: false, leading: 0.62em, spacing: 0.75em)
#set list(indent: 0.3em, body-indent: 0.4em, spacing: 0.55em, marker: text(fill: blue)[•])
#set enum(indent: 0.3em, body-indent: 0.4em, spacing: 0.55em)

#show link: it => text(fill: blue)[#it]
#show raw.where(block: false): it => box(
  fill: paper-tint,
  inset: (x: 3pt, y: 0pt),
  outset: (y: 2.5pt),
  radius: 2pt,
)[#text(font: FONT_MONO, size: 8pt)[#it]]

// ---- スライドの枠 -----------------------------------------------------------

#let slide-no = counter("slide")

/// スライド 1 枚．見出しの帯 + 本文
#let slide(title, lead, body) = {
  slide-no.step()
  block(above: 0pt, below: 9pt)[
    #grid(
      columns: (auto, 1fr),
      column-gutter: 8pt,
      align: horizon,
      box(
        fill: ink,
        inset: (x: 6pt, y: 3pt),
        radius: 3pt,
      )[#text(font: FONT_SANS, size: 10pt, weight: "bold", fill: white)[
          #context slide-no.display("1")
        ]],
      [
        #text(font: FONT_SANS, size: 16pt, weight: "bold")[#title]
        #h(8pt)
        #text(font: FONT_SANS, size: 9pt, fill: muted)[#lead]
      ],
    )
    #v(3pt)
    #line(length: 100%, stroke: 1.2pt + ink)
  ]
  body
}

/// 見出しつきの箱（図でも本文でも使う）
#let cbox(title, body, fill: white, accent: line-color, width: 100%) = block(
  width: width,
  fill: fill,
  inset: (x: 7pt, y: 6pt),
  radius: 3pt,
  stroke: 0.6pt + accent,
)[
  #text(font: FONT_SANS, size: 8.6pt, weight: "bold", fill: ink)[#title]
  #v(0.1em)
  #block(spacing: 0.55em)[#text(size: 8pt, fill: muted)[#body]]
]

/// 小見出し（本文中）
#let head(body, fill: ink) = text(font: FONT_SANS, size: 10pt, weight: "bold", fill: fill)[#body]

/// 出典の 1 行
#let src(body) = text(size: 7pt, fill: muted)[出典: #body]

// =============================================================================
// 1. サービスの目的
// =============================================================================

#slide(
  [サービスの目的],
  [オープンデータに，現場の「今」を書き足せる地図],
)[
  #grid(
    columns: (auto, 1fr),
    column-gutter: 10pt,
    align: horizon,
    image(LOGO, width: 14mm),
    [
      #text(font: FONT_SANS, size: 20pt, weight: "bold", tracking: 1pt)[CHIZUBA]
      #h(5pt)
      #text(font: FONT_SANS, size: 9.5pt, fill: muted)[（チズバ）]
      #h(8pt)
      #text(font: FONT_SANS, size: 11pt, fill: deep)[千葉の地図に，住民と行政の「いま」を重ねる]
      #linebreak()
      #text(size: 8.3pt, fill: muted)[
        対応範囲は千葉県全域（市町村コードでパラメータ化）．デモデータは市川市（#raw("12203")）．
        閲覧はログイン不要 ── 防災情報をログインの壁の向こうに置かない．
      ]
    ],
  )

  #v(4pt)

  #grid(
    columns: (1fr, 1fr),
    column-gutter: 11pt,
    // ---------------------------------------------------------------- 左
    [
      #head[解こうとしている課題]
      #h(4pt)#text(size: 8.3pt, fill: muted)[— 足りないのは箱ではなく，更新と往復]
      #v(3pt)
      #note(fill: warn-tint, stroke-color: orange)[
        #text(size: 9.5pt, weight: "bold")[オープンデータは，公開された時点で止まっている．]
        #linebreak()
        #text(size: 8.3pt)[
          避難場所も AED も景観スポットも「市が持っている静的な一覧」であり，
          #text(weight: "bold")[現場で今どうなっているか]（ガードレールが折れている・この道が冠水している・
          この時期はここが綺麗）は誰も更新できない．
        ]
      ]

      #v(5pt)
      #head[① オープンデータの活用 ── 課題の発見にも使った]
      #v(2pt)
      #set text(size: 8.1pt)
      #text(weight: "bold")[千葉県・市川市から 13 データセット 17 ファイルを取得して分析し，
      その結果が方針を変えた．]
      - 当初の切り口「避難場所が足りない」は#text(weight: "bold")[成り立たなかった] —
        町丁字の重心から最寄りの指定緊急避難場所まで
        #text(weight: "bold")[中央値 278 m・最大 839 m]（総人口 500 人以上の 201 地区・生 CSV から再計算）
      - 子育て施設一覧の「収容定員」は #text(weight: "bold")[388 行すべて空]．
        AED 一覧には座標の打ち間違いが 1 件（経度 #raw("129.925207")・市域外へ約 903 km）
      - 市川市の内水（雨水出水）浸水想定は指定・公表済みだが，公表形態は
        #text(weight: "bold")[30.73 MB の PDF だけ]で，地図に重ねられる形が無い

      #v(2pt)
      #text(size: 8.1pt)[
        #text(weight: "bold")[地図に載せた点はすべて市川市オープンデータ（CC BY 4.0）由来]（右の 1．に件数）．
        重ねているのは国土地理院「淡色地図」，国土交通省「重ねるハザードマップ」，気象庁 防災情報 JSON で，
        #text(weight: "bold", fill: deep)[認証キーが要る外部サービスは 1 つも使っていない．]
      ]
    ],
    // ---------------------------------------------------------------- 右
    [
      #head[どのように解決するか]
      #h(4pt)#text(size: 8.3pt, fill: muted)[— 重ねる → 書き足す → 返す]
      #v(3pt)
      #set text(size: 8.1pt)
      #stack(
        spacing: 4pt,
        cbox(
          [1. 重ねる ── 想定を 1 枚の地図に],
          [国のハザードマップ 4 種（洪水・高潮・津波・土砂災害警戒区域）と，市のオープンデータ
            （避難場所 123・AED 304・子育て施設 388・景観100選 100）を同じ地図に重ねる．],
          accent: blue,
          fill: blue-tint,
        ),
        cbox(
          [2. 書き足す ── 実績を住民が足す],
          [その場でスマホから位置・写真・説明を投稿できる．浸水報告には
            #text(weight: "bold", fill: ink)[投稿した瞬間の 1 時間降水量]が気象庁アメダス実況から自動で焼き込まれ，
            投稿者は改変できない．],
          accent: orange,
        ),
        cbox(
          [3. 返す ── 行政が応答し，データとして戻る],
          [行政ユーザーが公式コメントと#text(weight: "bold", fill: ink)[対応状況 4 段階]
            （未対応／受付／対応中／対応済）で応答する．集まった投稿は
            #text(weight: "bold", fill: ink)[CSV / GeoJSON] で誰でも持ち帰れる．],
          accent: green,
        ),
      )

      #v(5pt)
      #head[② 新規性 ── 個々の機能ではなく，組み合わせ]
      #v(2pt)
      #set text(size: 8.1pt)
      #text(fill: muted)[
        個々の機能に新規性は無い．#text(weight: "bold", fill: ink)[そこは正直に言い切ったうえで，
          新しいのは次の 3 つの組み合わせ．]
      ]
      #v(1pt)
      + #text(weight: "bold")[想定（ハザードマップ）と実績（住民の投稿）を同じ地図に重ねている]
      + #text(weight: "bold")[集めた実績をオープンデータとして書き出して返す] — 一往復を閉じる
      + #text(weight: "bold")[防災と観光を同じ地図・同じ投稿基盤で扱っている]
        （3 種類の投稿が 1 テーブル・1 API・1 フォーム）
    ],
  )

  #v(4pt)

  #grid(
    columns: (1fr, 1fr),
    column-gutter: 11pt,
    note(fill: warn-tint, stroke-color: orange)[
      #set text(size: 8.1pt)
      #set par(leading: 0.5em, spacing: 0.5em)
      #text(font: FONT_SANS, size: 9pt, weight: "bold")[③ 有効性 ── ニーズは，直近の実災害と隣の市の公開データで裏が取れている]
      #v(2pt)
      - 令和 8 年 8 月千葉豪雨で，被害報告の #text(weight: "bold")[55.7%] が
        低位地帯・浸水想定区域の#text(weight: "bold")[外]から．同じ 10 時間に住民から
        #text(weight: "bold")[9,938 件]．#text(weight: "bold")[住民は投稿する]
      - 柏市の水害履歴 #text(weight: "bold")[1,811 件]のうち #text(weight: "bold")[1,417 件（78.24%）]が，
        2 回以上被害の出た 249 地点に集中．#text(weight: "bold")[記録を残せば効く]
      #v(1pt)
      #text(size: 6.5pt, fill: muted)[
        出典: ウェザーニュース「2人に1人が浸水想定区域\"外\"で被災か」（2026-08-15）／柏市「水害履歴
        【オープンデータ】」を取得して集計．55.7% の母数は「被害を示すキーワードを含むウェザーリポート」で実数は非公開．
      ]
    ],
    note[
      #set text(size: 8.1pt)
      #set par(leading: 0.5em, spacing: 0.5em)
      #text(font: FONT_SANS, size: 9pt, weight: "bold")[④ 実現性 ── 「作れそう」ではなく「もう動いている」]
      #v(2pt)
      - #raw("docker compose up") だけで全機能が動く．#text(weight: "bold")[認証キーは 1 つも要らない]．
        コンテナは #text(weight: "bold")[2 つ]（#raw("node:22-slim") / #raw("postgres:17-alpine")．
        どちらも Docker 公式イメージ）
      - 起動直後から#text(weight: "bold")[デモ投稿 22 件]が入っていて，投稿機能がその場で動いて見える．
        外部が落ちても止まらない（経路は概算に切り替え，気象が取れなければ注意表示を出さない）
      - 公開デモ: #link("https://oldmac.tail5ed162.ts.net")[#text(size: 7.8pt)[oldmac.tail5ed162.ts.net]]
        （Google ログインはここで試せる）
    ],
  )
]

// =============================================================================
// 2. 主要機能
// =============================================================================

#pagebreak()

#slide(
  [主要機能 ── 必要機能 8 項目],
  [説明資料②の対応表・readme.txt「1. 概要・主要機能」と同じ 8 項目・同じ番号],
)[
  #let feat(no, id, id-color, title, body, how) = block(
    width: 100%,
    fill: white,
    inset: (x: 6pt, y: 5pt),
    radius: 3pt,
    stroke: 0.6pt + line-color,
  )[
    #grid(
      columns: (14pt, 1fr),
      column-gutter: 4pt,
      align: (right + top, left),
      text(font: FONT_SANS, size: 9.5pt, weight: "bold", fill: deep)[#no],
      [
        #text(font: FONT_SANS, size: 8.7pt, weight: "bold")[#title]
        #h(3pt)#chip(id, fill: id-color)
        #linebreak()
        #text(size: 7.9pt, fill: muted)[#body]
        #linebreak()
        #text(font: FONT_SANS, size: 7.2pt, weight: "bold", fill: deep)[確かめ方:]
        #h(2pt)#text(size: 7.6pt)[#how]
      ],
    )
  ]

  #grid(
    columns: (1fr, 1fr),
    column-gutter: 9pt,
    row-gutter: 5pt,

    feat(
      [1], "F-1", sky,
      [ハザードマップの表示],
      [洪水・高潮・津波の浸水想定と土砂災害警戒区域（急傾斜地の崩壊）の 4 種．
        種類ごとに ON/OFF と不透明度を変えられ，凡例と出典が出る．起動直後は洪水だけ ON],
      [操作パネルを一番下まで送り「土砂災害（急傾斜地の崩壊）」を ON → 北部の斜面に帯が出て凡例が増える],
    ),
    feat(
      [5], "F-5", green,
      [観光マップ（景観100選と徒歩ナビ）],
      [景観スポット 100 か所を日英の解説つきで表示．#text(weight: "bold")[54 か所に写真]．
        そのまま徒歩ナビの目的地にできる．経路サービスが落ちたら直線距離の概算に自動で切り替わる],
      [ヘッダー直下「観光マップ」→ 点を押す → 解説と写真 →「ここへナビ」],
    ),

    feat(
      [2], "基盤", muted,
      [市川市オープンデータの重ね合わせ],
      [避難場所 123・AED 304・子育て施設 388・景観100選 100．
        点を押すと名称・所在地が出る．#text(weight: "bold")[DB を経由せず同梱]してある],
      [操作パネル「表示するデータ」で「AED 設置箇所 304 件」を ON / OFF → 点が出入りする],
    ),
    feat(
      [6], "F-6", pink,
      [観光おすすめの市民投稿],
      [景観・お土産・飲食のおすすめを住民と行政の両方が投稿できる．
        3 種類の投稿は #text(weight: "bold")[1 テーブル・1 API・1 フォーム]に統一],
      [観光マップでログイン →「観光おすすめを投稿する」→ 赤紫のピンが増える],
    ),

    feat(
      [3], "F-2", orange,
      [危険箇所の市民報告],
      [位置＋写真（3 枚まで）＋説明で投稿でき，地図にピンが出る．
        #text(weight: "bold")[投稿の市町村は座標から決める]ので詐称できない],
      [右上「ログイン」→ 表示名を入れて「デモログイン」→「危険箇所を投稿する」→ 橙のピンが増える],
    ),
    feat(
      [7], "F-7", blue,
      [行政からの応答],
      [公式コメントと対応状況 4 段階（未対応／受付／対応中／対応済）の更新．
        更新できるのは担当する市町村の投稿だけで，一般ユーザーは HTTP 403],
      [ログイン画面で「行政ユーザー（市川市）」を選ぶ（#text(weight: "bold")[審査環境では PIN 不要]）→
        投稿を開くと「行政の対応状況を更新する」が出る],
    ),

    feat(
      [4], "F-3", sky,
      [浸水報告と，投稿時点の雨量の自動記録],
      [投稿した瞬間の 1 時間降水量が気象庁アメダス実況から自動で記録される．投稿者は改変できない．
        #text(weight: "bold")[最寄りの観測所の値]なので観測所名と距離を必ず併記．
        注意表示は#text(weight: "bold")[降水確率 30% 以上の予報があるときだけ]出る（予測はしない）],
      [ログインして「浸水を投稿する」→ 詳細に「投稿時の雨量 ◯ mm/h ／ 観測所名と距離」が入る
        （例: 船橋アメダス 約 10 km。#text(weight: "bold")[最寄りの観測所は投稿位置によって変わる]）],
    ),
    feat(
      [8], "F-2〜F-7", vermilion,
      [投稿の一覧・絞り込みと，オープンデータとしての書き出し],
      [カテゴリ・期間・キーワードで絞り込め，#text(weight: "bold")[絞り込んだそのままの条件で]
        CSV / GeoJSON を書き出せる．アカウントの情報は含めない],
      [ヘッダー「投稿一覧」→「7 日間」→ 件数が変わる →「CSV」でその条件のまま落ちてくる],
    ),
  )

  #v(5pt)

  #grid(
    columns: (1fr, 1fr),
    column-gutter: 10pt,
    note[
      #text(size: 8pt)[
        #text(weight: "bold")[閲覧にログインは要らない．]
        投稿・コメント・行政操作にだけログインが要る．
        #text(weight: "bold")[審査環境（認証キー未設定）ではデモログイン]（画面右上「ログイン」→
        表示名を入れるだけ）で上の 8 機能すべてを試せる．
        Google ログインも実装してあるが，#text(weight: "bold")[シークレットは秘密情報なので同梱していない]．
      ]
    ],
    note(fill: paper-tint, stroke-color: muted)[
      #text(size: 8pt)[
        #text(weight: "bold")[8 機能はすべて実装済みで，展開した提出物を起動して動作を確認している．]
        「どのファイルのどこか」は説明資料②の対応表にある．
        #text(weight: "bold")[8 機能の外に残っている制約と改善余地は，提出物の #raw("README.md")
        「8. 既知の制約とその理由」に全部書いてある．]
      ]
    ],
  )
]

// =============================================================================
// 3. コンテナの概要（図）
// =============================================================================

#pagebreak()

#slide(
  [コンテナの概要],
  [コンテナは 2 つだけ．外部サービスはすべて認証キー不要],
)[
  #let node(title, sub, accent: line-color, fill: white) = block(
    width: 100%,
    fill: fill,
    inset: (x: 6pt, y: 4.5pt),
    radius: 3pt,
    stroke: 0.7pt + accent,
  )[
    #set par(leading: 0.5em)
    #text(font: FONT_SANS, size: 8.4pt, weight: "bold")[#title]
    #linebreak()
    #text(font: FONT_MONO, size: 7pt, fill: muted)[#sub]
  ]

  #let frame(label, body, accent: muted, fill: none) = block(
    width: 100%,
    fill: fill,
    inset: (x: 7pt, y: 6pt),
    radius: 4pt,
    stroke: (paint: accent, thickness: 0.7pt, dash: "dashed"),
  )[
    #text(font: FONT_SANS, size: 7.6pt, weight: "bold", fill: accent)[#label]
    #v(3pt)
    #body
  ]

  #let flow(body) = align(center)[
    #text(font: FONT_SANS, size: 7.6pt, fill: deep)[#body]
  ]

  // ── 外部サービス①：ブラウザが直接読む ──
  #frame(
    [外部サービス①　ブラウザが直接読む（認証キー不要）],
    grid(
      columns: (1fr, 1fr),
      column-gutter: 7pt,
      node(
        [国土地理院　淡色地図タイル],
        [cyberjapandata.gsi.go.jp],
        accent: green,
      ),
      node(
        [重ねるハザードマップ　タイル（洪水・高潮・津波・土砂災害）],
        [disaportaldata.gsi.go.jp],
        accent: sky,
      ),
    ),
    accent: green,
  )

  #v(3pt)
  #flow[▲　画像タイルなのでサーバーを経由しない（ブラウザのキャッシュがそのまま効く）]
  #v(3pt)

  // ── ホスト ──
  #grid(
    columns: (44mm, 22mm, 1fr),
    column-gutter: 0pt,
    align: horizon,
    node(
      [利用者のブラウザ],
      [React / MapLibre GL JS],
      accent: ink,
      fill: paper-tint,
    ),
    align(center)[
      #text(font: FONT_SANS, size: 7.6pt, fill: deep)[HTTP :3000]
      #linebreak()
      #text(size: 11pt, fill: deep)[◀━━▶]
    ],
    frame(
      [審査員の PC　#raw("docker compose up")],
      [
        #grid(
          columns: (1fr, 23mm, 64mm),
          column-gutter: 0pt,
          align: horizon,
          node(
            [コンテナ web　Next.js standalone（#raw("node server.js")）],
            [node:22-slim ｜ ページ・API・静的ファイル],
            accent: blue,
            fill: blue-tint,
          ),
          align(center)[
            #text(font: FONT_SANS, size: 7.4pt, fill: deep)[pg（TCP 5432）]
            #linebreak()
            #text(size: 11pt, fill: deep)[◀━━▶]
          ],
          node(
            [コンテナ db　chizuba データベース（6 テーブル）],
            [postgres:17-alpine ｜ ホストに公開しない],
            accent: vermilion,
          ),
        )
        #grid(
          columns: (1fr, 23mm, 64mm),
          column-gutter: 0pt,
          align: (center, center, center),
          text(size: 9pt, fill: muted)[│], [], text(size: 9pt, fill: muted)[│],
        )
        #grid(
          columns: (1fr, 23mm, 64mm),
          column-gutter: 0pt,
          align: horizon,
          node([named volume　#raw("uploads")], [投稿写真の実体　/app/uploads], accent: line-color, fill: paper-tint),
          [],
          node([named volume　#raw("db-data")], [/var/lib/postgresql/data], accent: line-color, fill: paper-tint),
        )
      ],
      accent: ink,
    ),
  )

  #v(3pt)
  #flow[▼　web コンテナが中継する（User-Agent を明示・サーバー側でキャッシュ・OSRM は 1 秒 1 リクエスト）]
  #v(3pt)

  // ── 外部サービス②：web が中継する ──
  #frame(
    [外部サービス②　web コンテナが中継する（認証キー不要）],
    grid(
      columns: (1fr, 1fr, 1fr),
      column-gutter: 7pt,
      node([気象庁　防災情報 JSON（アメダス実況・府県予報）], [www.jma.go.jp/bosai], accent: sky),
      node([OSRM　徒歩経路（FOSSGIS e.V.）], [routing.openstreetmap.de], accent: orange),
      node([Google OAuth（鍵を入れた環境だけ）], [accounts.google.com], accent: muted),
    ),
    accent: blue,
  )

  #v(5pt)

  #grid(
    columns: (1fr, 1fr, 1fr),
    column-gutter: 9pt,
    note[#text(size: 8pt)[
        #text(weight: "bold")[起動順は固定．]
        #raw("web")は#raw("db")の healthcheck（#raw("pg_isready")）が通るまで起動しない
        （#raw("depends_on: service_healthy")）．テーブルは#raw("db")の初回起動時に
        #raw("db/init/*.sql")が自動で流れるので，データ投入の手順は無い．
      ]],
    note(fill: paper-tint, stroke-color: muted)[#text(size: 8pt)[
        #text(weight: "bold")[#raw("db")はホストにポートを公開していない．]
        審査員の環境で 5432 番が埋まっていても起動できるようにするため．
        中を見るときは#raw("docker compose exec db psql")で入れる．
      ]],
    note(fill: warn-tint, stroke-color: orange)[#text(size: 8pt)[
        #text(weight: "bold")[インターネット接続が要る．]
        つながらないときは地図が下地色になるが，#text(weight: "bold")[同梱の GeoJSON の点と投稿は出る]．
        経路サービスが落ちたときは直線距離からの概算に切り替え，その旨を画面に出す．
      ]],
  )
]

// =============================================================================
// 4. コンテナ実行の手順
// =============================================================================

#pagebreak()

#slide(
  [コンテナ実行の手順],
  [readme.txt「4. 実行方法」と同じ．用意するものは Docker とインターネット接続だけ],
)[
  // 端末の出力をそのまま貼る．文字列で渡すので Typst の記法に食われない
  #let term(body, size: 6.7pt) = block(
    width: 100%,
    fill: rgb("#16181d"),
    inset: (x: 8pt, y: 6pt),
    radius: 3pt,
  )[
    #set text(font: FONT_MONO, size: size, fill: rgb("#e8ebef"))
    #set par(leading: 0.42em, spacing: 0.42em)
    #raw(body, block: true)
  ]

  #grid(
    columns: (1fr, 1fr),
    column-gutter: 12pt,
    [
      #head[手順]
      #v(3pt)
      #set text(size: 8.4pt)
      + 配布した 7z（zip）を展開する．展開してできた#text(weight: "bold")[作業ディレクトリ]（#raw("readme.txt")がある場所）に移動する
      + #raw("docker compose up") と打つ．ビルドと起動が終わるまで待つ
      + ブラウザで #link("http://localhost:3000")[#raw("http://localhost:3000")] を開く
      + 止めるときは，そのターミナルで #raw("Ctrl-C")

      #v(5pt)
      #term(
        "$ cd ai-de-chiba-map
$ docker compose up",
        size: 8pt,
      )

      #v(5pt)
      #head[時間の目安（手元での実測）]
      #v(2pt)
      #set text(size: 8.2pt)
      #table(
        columns: (1fr, auto),
        stroke: (x, y) => (
          top: if y == 0 { 0.7pt + ink } else { 0.35pt + line-color },
          bottom: if y == 2 { 0.7pt + ink } else { 0.35pt + line-color },
        ),
        inset: (x: 4pt, y: 3.5pt),
        [ベースイメージの取得（初回のみ・合計約 760 MB）], [回線しだい],
        [#raw("docker compose up") のビルド], [約 15 秒],
        [起動 → #raw("http://localhost:3000") が応答], [約 7 秒],
      )

      #v(4pt)
      #note(fill: warn-tint, stroke-color: orange)[#text(size: 8.2pt)[
          #text(weight: "bold")[3000 番が塞がっているときだけ]，公開ポートを変えられる．
          #text(weight: "bold")[他に直す設定は無い]（ログインのリダイレクト先も
          Google のコールバック URL も，ブラウザが実際に開いた住所から毎回決まる）．
          #linebreak()
          #raw("CHIZUBA_PORT=3100 docker compose up") → #raw("http://localhost:3100")
        ]]

      #v(4pt)
      #note(fill: paper-tint, stroke-color: muted)[#text(size: 8.2pt)[
          #text(weight: "bold")[片付け．]
          #raw("docker compose down")で止めて片付ける（投稿は残る）．
          #raw("docker compose down -v")はデータベースと投稿写真も消し，最初の状態に戻る
          （デモ投稿が入り直す）．
        ]]

      #v(4pt)
      #note[#text(size: 8.2pt)[
          #text(weight: "bold")[ログインは追加設定なしで試せる．]
          画面右上の「ログイン」→ 表示名を入れる →
          #text(weight: "bold")[一般ユーザー／行政ユーザー（市川市）]を選ぶ → 「デモログイン」．
          行政ユーザーも PIN や承認なしでそのまま選べるので，対応状況の更新まで試せる．
        ]]
    ],
    [
      #head[実行結果（実際の出力）]
      #v(2pt)
      #text(size: 7.6pt, fill: muted)[
        ビルド → #raw("db")の初期化 → healthcheck 通過 → #raw("web")起動，の順に進む．
        #text(fill: ink)[2026-09-04 に実際に採取した出力]で，#text(fill: ink)[…]は紙面の都合で省いた箇所．
      ]
      #v(3pt)
      #term(
        "$ docker compose up
 Image ichikawa-opendata-map-web Building
#2 [internal] load build definition from Dockerfile
#3 [internal] load metadata for docker.io/library/node:22-slim
…（deps → builder → runner の 3 ステージ）
 Image ichikawa-opendata-map-web Built
 Network ichikawa-opendata-map_default Created
 Volume ichikawa-opendata-map_uploads Created
 Volume ichikawa-opendata-map_db-data Created
 Container ichikawa-opendata-map-db-1 Created
 Container ichikawa-opendata-map-web-1 Created
Attaching to db-1, web-1
 Container ichikawa-opendata-map-db-1 Started
 Container ichikawa-opendata-map-db-1 Waiting
db-1  | …/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/001_schema.sql
db-1  | CREATE TABLE
db-1  | …/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/002_seed_municipalities.sql
db-1  | INSERT 0 1
db-1  | …/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/003_seed_demo_reports.sql
db-1  | INSERT 0 7
db-1  | INSERT 0 22
db-1  | … LOG:  database system is ready to accept connections
 Container ichikawa-opendata-map-db-1 Healthy
 Container ichikawa-opendata-map-web-1 Started
web-1  | ▲ Next.js 16.3.2
web-1  | - Local:         http://localhost:3000
web-1  | ✓ Ready in 0ms",
      )

      #v(4pt)
      #head[起動を確かめる 3 つのコマンド]
      #v(2pt)
      #term(
        "# ① コンテナが 2 つとも上がっているか
$ docker compose ps
NAME                          SERVICE   STATUS
ichikawa-opendata-map-db-1    db        Up 5 minutes (healthy)
ichikawa-opendata-map-web-1   web       Up 5 minutes

# ② デモ投稿が入ったか（22 と出れば成功）
$ docker compose exec db psql -U chizuba -d chizuba -c \"SELECT count(*) FROM reports;\"
 count
-------
    22
(1 row)

# ③ 投稿写真の実体が配られたか（17 と出れば成功）
$ docker compose exec web sh -c 'ls -1 /app/uploads | wc -l'
17",
      )

    ],
  )
]

// =============================================================================
// 5. 実行結果（画面）
// =============================================================================

#pagebreak()

#slide(
  [実行結果（画面）],
  [すべて起動直後のデモデータのみ．実際に操作して撮影したもの],
)[
  #let shot(path, title, body, h: 45mm) = [
    #align(center)[
      #block(
        radius: 3pt,
        clip: true,
        stroke: 0.6pt + line-color,
      )[#image(path, height: h)]
    ]
    #v(2.5pt)
    #text(font: FONT_SANS, size: 8pt, weight: "bold")[#title]
    #linebreak()
    #text(size: 7.2pt, fill: muted)[#body]
  ]

  #grid(
    columns: (1fr, 1fr, 1fr),
    column-gutter: 8pt,
    shot(
      "/docs/manual/img/11-map-disaster-pc.jpg",
      [① 防災マップ（起動直後の画面）],
      [洪水の浸水想定が重なった市川市の地図に，避難場所・AED・子育て施設と住民の投稿のピンが載る．
        左上は注意案内（F-4）で，過去の浸水報告 5 件と気象庁の降水確率という#text(weight: "bold")[事実 2 つ]だけを並べている],
    ),
    shot(
      "/docs/manual/img/21-hazard-landslide-pc.jpg",
      [② ハザードマップと凡例（F-1）],
      [洪水・高潮・津波・土砂災害を種類ごとに ON/OFF・不透明度で調整できる．
        凡例は浸水が深さ・土砂災害が区域の種別と，系統ごとに出し分ける],
    ),
    shot(
      "/docs/manual/img/13-scenic-popup-pc.jpg",
      [③ 観光マップと景観100選（F-5）],
      [点を押すと日英の解説・アクセス方法・写真が出て，そのまま徒歩ナビの目的地にできる．
        100 か所のうち 54 か所に写真が付く],
    ),
  )

  #v(7pt)

  #grid(
    columns: (1fr, 1fr, 1fr),
    column-gutter: 8pt,
    shot(
      "/docs/manual/img/14-reports-pc.jpg",
      [④ 投稿一覧と書き出し（F-2・F-3・F-6）],
      [カテゴリ・期間・キーワードで絞り込み，絞り込んだ条件のまま CSV / GeoJSON で書き出せる．
        この画面は JavaScript が無効でも動く],
      h: 37mm,
    ),
    shot(
      "/docs/manual/img/08-gov-status-375.jpg",
      [⑤ 行政の応答（F-7・スマホ幅 375px）],
      [行政ユーザーで入ると対応状況を 4 段階で更新でき，コメントが「行政の公式回答」になる．
        更新できるのは担当する市町村の投稿だけ],
      h: 37mm,
    ),
    [
      #text(font: FONT_SANS, size: 8pt, weight: "bold")[画面と出典について]
      #v(2pt)
      #set text(size: 7.2pt)
      - 掲載した画面はすべて#text(weight: "bold")[起動直後のデモデータのみ]で，個人情報は写っていない
      - デモ投稿 22 件は実際の通報ではなく，場所は市内に散らした架空の地点．
        浸水投稿の雨量もダミー値で，観測値として扱わないよう画面表示と書き出しから除いている
      - 写真は再利用が許されたもの（ウィキメディア・コモンズの CC0 / CC BY / CC BY-SA）だけ．
        防災の写真は市外で撮られた参考写真

      #v(3pt)
      #block(
        width: 100%,
        fill: paper-tint,
        inset: (x: 6pt, y: 5pt),
        radius: 3pt,
      )[
        #set text(size: 6.9pt)
        #text(font: FONT_SANS, size: 7.4pt, weight: "bold")[主な出典（全件は画面の「出典とライセンス」#raw("/about")）]
        #v(1pt)
        - 市川市オープンデータ（CC BY 4.0）
        - 千葉県オープンデータサイト「【市川市】景観100選」（CC BY 4.0）
        - 国土地理院「淡色地図」タイル（国土地理院コンテンツ利用規約）
        - ハザードマップポータルサイト（公共データ利用規約 第1.0版 PDL1.0）
        - 気象庁ホームページ（公共データ利用規約 第1.0版 PDL1.0）
        - OSRM / FOSSGIS e.V.，道路データは OpenStreetMap contributors（ODbL）
      ]
    ],
  )
]
