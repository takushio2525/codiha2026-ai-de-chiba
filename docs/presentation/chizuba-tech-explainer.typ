// CHIZUBA 技術解説（プレゼン質疑応答対策）
//
//   typst compile chizuba-tech-explainer.typ
//
// 日本語フォントは macOS 標準の Hiragino を第一候補にしてある．
// 別の環境で組むときは FONT_SANS / FONT_SERIF を書き換える．
//
// 句読点は全角「，」「．」で統一する（提出資料の規約）．
// 引用した画面の文言だけは原文のままにしてある．

// macOS 標準のフォントだけを並べてある（無いものを書くと組むたびに警告が出るため）．
// Linux で組むときは，たとえば次のように置き換える:
//   FONT_SERIF → ("Noto Serif CJK JP",)  FONT_SANS → ("Noto Sans CJK JP",)
//   FONT_MONO  → ("DejaVu Sans Mono",)
#let FONT_SERIF = ("Hiragino Mincho ProN", "Hiragino Mincho Pro")
#let FONT_SANS = ("Hiragino Kaku Gothic ProN", "Hiragino Sans")
#let FONT_MONO = ("Menlo",)

// Okabe-Ito（色覚多様性に配慮した配色）．アプリ本体と同じ色を使う
#let ink = rgb("#1a1d21")
#let muted = rgb("#5b626b")
#let line-color = rgb("#d3d8de")
#let blue = rgb("#0072b2")       // 避難場所・まち並み
#let orange = rgb("#e69f00")     // 危険箇所
#let sky = rgb("#56b4e9")        // 浸水
#let green = rgb("#009e73")      // 子育て施設
#let vermilion = rgb("#d55e00")  // AED
#let pink = rgb("#cc79a7")       // 観光おすすめ
#let paper-tint = rgb("#f4f6f8")
#let blue-tint = rgb("#eaf3fa")
#let warn-tint = rgb("#fdf3e3")

#set document(
  title: "CHIZUBA 技術解説",
  description: "CODIHA 2026 プレゼン質疑応答のための技術解説",
)

#set page(
  paper: "a4",
  margin: (top: 20mm, bottom: 18mm, left: 19mm, right: 19mm),
  footer: context {
    set text(font: FONT_SANS, size: 8pt, fill: muted)
    grid(
      columns: (1fr, auto),
      align: (left, right),
      [CHIZUBA 技術解説],
      [#counter(page).display("1")],
    )
  },
)

#set text(font: FONT_SERIF, size: 9.7pt, lang: "ja", fill: ink)
#set par(justify: true, leading: 0.78em, spacing: 1.15em, first-line-indent: 0em)
#set list(indent: 0.6em, body-indent: 0.5em, spacing: 0.85em)
#set enum(indent: 0.6em, body-indent: 0.5em, spacing: 0.85em)

// レベル 1 だけ番号を持たせる（カウンタを回すため）．表示は show 規則側で行う
#set heading(numbering: (..n) => if n.pos().len() == 1 { numbering("1", ..n) })
#show heading: set text(font: FONT_SANS)
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  block(above: 0pt, below: 1.1em)[
    #set text(size: 8.5pt, fill: blue, weight: "bold")
    #box(width: 100%, stroke: (bottom: 0.6pt + line-color), inset: (bottom: 3pt))[
      #context [第 #counter(heading).get().first() 章]
    ]
    #v(0.2em)
    #set text(size: 17pt, fill: ink, weight: "bold")
    #it.body
  ]
}
#show heading.where(level: 2): it => block(above: 1.5em, below: 0.7em)[
  #set text(size: 12pt, weight: "bold")
  #box(fill: blue, width: 3pt, height: 0.95em, baseline: 0.13em)
  #h(0.45em) #it.body
]
#show heading.where(level: 3): it => block(above: 1.15em, below: 0.5em)[
  #set text(size: 10.2pt, weight: "bold", fill: rgb("#243444"))
  #it.body
]

#show link: it => text(fill: blue)[#it]
#show raw.where(block: false): it => box(
  fill: paper-tint, inset: (x: 3pt, y: 0pt), outset: (y: 3pt), radius: 2pt,
)[#text(font: FONT_MONO, size: 8.4pt)[#it]]
#show raw.where(block: true): it => block(
  fill: paper-tint, inset: 9pt, radius: 3pt, width: 100%,
  stroke: 0.5pt + line-color,
)[#text(font: FONT_MONO, size: 8pt)[#it]]

#set table(
  stroke: (x, y) => (
    top: if y == 0 { 0.8pt + ink } else if y == 1 { 0.5pt + ink } else { 0.4pt + line-color },
    bottom: 0.4pt + line-color,
  ),
  inset: (x: 6pt, y: 5pt),
)
#show table.cell.where(y: 0): set text(font: FONT_SANS, size: 8.6pt, weight: "bold")
#show table: set text(size: 8.8pt)
#show table: set par(justify: false, leading: 0.62em)

// ---- 部品 -------------------------------------------------------------------

/// 覚えておくべき要点．見出し + 本文
#let point(title, body) = block(
  width: 100%, fill: blue-tint, inset: (x: 10pt, y: 8pt), radius: 3pt,
  stroke: (left: 2.5pt + blue),
  breakable: true,
)[
  #text(font: FONT_SANS, size: 9pt, weight: "bold", fill: rgb("#0b4c76"))[#title]
  #v(-0.35em)
  #block(spacing: 0.8em)[#body]
]

/// 質疑で踏んではいけない線
#let caution(title, body) = block(
  width: 100%, fill: warn-tint, inset: (x: 10pt, y: 8pt), radius: 3pt,
  stroke: (left: 2.5pt + orange),
  breakable: true,
)[
  #text(font: FONT_SANS, size: 9pt, weight: "bold", fill: rgb("#8a5a00"))[#title]
  #v(-0.35em)
  #block(spacing: 0.8em)[#body]
]

/// 図の見出し
#let figtitle(body) = block(above: 1.3em, below: 0.5em)[
  #text(font: FONT_SANS, size: 8.8pt, weight: "bold", fill: muted)[#body]
]

/// 想定質疑 1 問
#let qa(num, q, ..a) = block(breakable: false, above: 1.25em, below: 0pt)[
  #block(spacing: 0.45em)[
    #box(fill: blue, radius: 2pt, inset: (x: 4pt, y: 2pt))[
      #text(font: FONT_SANS, size: 7.6pt, weight: "bold", fill: white)[Q#num]
    ]
    #h(0.4em)
    #text(font: FONT_SANS, size: 10pt, weight: "bold")[#q]
  ]
  #block(inset: (left: 1.2em))[
    #for item in a.pos() [#item]
  ]
]

/// 用語 1 つ
#let term(word, body) = block(above: 0.6em, below: 0.6em)[
  #text(font: FONT_SANS, size: 9.2pt, weight: "bold")[#word] #h(0.4em) #body
]

// ---- 図を描く小道具 ---------------------------------------------------------

#let dbox(x, y, w, h, title, sub, fill: white, border: line-color, tcolor: ink) = place(
  dx: x, dy: y,
  rect(width: w, height: h, fill: fill, stroke: 0.7pt + border, radius: 3pt, inset: 5pt)[
    #set align(center + horizon)
    #stack(
      spacing: 3pt,
      text(font: FONT_SANS, size: 8.2pt, weight: "bold", fill: tcolor)[#title],
      if sub != none { text(font: FONT_SANS, size: 6.9pt, fill: muted)[#sub] },
    )
  ],
)

#let head-r(x, y, c) = place(dx: x - 5pt, dy: y - 2.6pt,
  polygon(fill: c, (0pt, 0pt), (5.2pt, 2.6pt), (0pt, 5.2pt)))
#let head-d(x, y, c) = place(dx: x - 2.6pt, dy: y - 5pt,
  polygon(fill: c, (0pt, 0pt), (5.2pt, 0pt), (2.6pt, 5.2pt)))
#let head-l(x, y, c) = place(dx: x, dy: y - 2.6pt,
  polygon(fill: c, (5.2pt, 0pt), (0pt, 2.6pt), (5.2pt, 5.2pt)))

/// 右向きの矢印
#let arr(x, y, len, c: ink, dash: none) = {
  place(dx: x, dy: y, line(length: len, stroke: (paint: c, thickness: 0.7pt, dash: dash)))
  head-r(x + len, y, c)
}
/// 下向きの矢印
#let arrd(x, y, len, c: ink, dash: none) = {
  place(dx: x, dy: y, line(length: len, angle: 90deg, stroke: (paint: c, thickness: 0.7pt, dash: dash)))
  head-d(x, y + len, c)
}
/// 上向きの矢印（(x, y) から上へ len だけ伸ばす）
#let arru(x, y, len, c: ink, dash: none) = {
  place(dx: x, dy: y, line(start: (0pt, 0pt), end: (0pt, -len),
    stroke: (paint: c, thickness: 0.7pt, dash: dash)))
  place(dx: x - 2.6pt, dy: y - len, polygon(fill: c, (0pt, 5.2pt), (5.2pt, 5.2pt), (2.6pt, 0pt)))
}
/// 折れ線の直線部分（矢印の頭は付けない）
#let seg(x1, y1, x2, y2, c: ink, dash: none) = place(dx: x1, dy: y1,
  line(start: (0pt, 0pt), end: (x2 - x1, y2 - y1),
    stroke: (paint: c, thickness: 0.7pt, dash: dash)))

/// 左向きの矢印
#let arrl(x, y, len, c: ink, dash: none) = {
  place(dx: x - len, dy: y, line(length: len, stroke: (paint: c, thickness: 0.7pt, dash: dash)))
  head-l(x - len, y, c)
}
/// シーケンスの「誰が」を表すチップ
#let who(name, c) = box(
  fill: c.lighten(86%), stroke: 0.5pt + c.lighten(35%), radius: 2pt,
  inset: (x: 4pt, y: 1.6pt), baseline: 0.15em,
)[#text(font: FONT_SANS, size: 7.3pt, fill: c.darken(22%), weight: "bold")[#name]]

/// リクエストの流れ．(番号, 誰が, 何が起きるか) を並べる
#let flow(..rows) = table(
  columns: (auto, auto, 1fr),
  align: (right + top, left + top, left + top),
  stroke: (x, y) => (bottom: 0.35pt + line-color),
  inset: (x: 5pt, y: 4.5pt),
  ..rows,
)

/// 図の中の小さなラベル
#let lab(x, y, body, c: muted) = place(dx: x, dy: y,
  text(font: FONT_SANS, size: 6.8pt, fill: c)[#body])

// ============================================================================
// 表紙
// ============================================================================

#page(footer: none, margin: (top: 34mm, bottom: 24mm, left: 24mm, right: 24mm))[
  #align(left)[
    #text(font: FONT_SANS, size: 8.5pt, fill: blue, weight: "bold")[
      ちばオープンデータアイデアソン・ハッカソン（CODIHA）2026 ／ ハッカソン部門
    ]
    #v(2.2em)
    #text(font: FONT_SANS, size: 40pt, weight: "bold")[CHIZUBA]
    #v(-0.5em)
    #text(font: FONT_SANS, size: 13.5pt, weight: "bold", fill: muted)[技術解説と想定質疑]
    #v(1.4em)
    #line(length: 100%, stroke: 0.8pt + line-color)
    #v(1.2em)
    #block(width: 100%)[
      #set text(size: 10pt)
      #set par(leading: 0.85em)
      千葉県の地図系サービスを 1 つに束ね，住民と行政が相互に情報を投稿できるウェブサイト．
      本書は，このアプリを*発表者自身が説明できる*ようにするための技術解説である．
      構成・技術選定の理由・各機能の内部の動き・想定される質問への答えを，
      実際のコードから起こしてまとめてある．
    ]
    #v(2.4em)
    #block(width: 100%, fill: paper-tint, inset: 12pt, radius: 4pt)[
      #set text(font: FONT_SANS, size: 9pt)
      #grid(
        columns: (auto, 1fr),
        column-gutter: 14pt,
        row-gutter: 7pt,
        text(fill: muted)[チーム], [愛で千葉は救えるのか],
        text(fill: muted)[プロダクト], [CHIZUBA（CHIba + ZU（地図）+ BA（場））],
        text(fill: muted)[対応範囲], [千葉県全域（デモデータは市川市・JIS X 0402 コード 12203）],
        text(fill: muted)[起動], [`cd app && docker compose up` → `http://localhost:3000`],
        text(fill: muted)[コンテナ], [2 つ（`node:22-slim` / `postgres:17-alpine`．いずれも Docker 公式イメージ）],
        text(fill: muted)[外部サービス], [国土地理院タイル／重ねるハザードマップ／OSRM／気象庁 JSON（#text(weight: "bold")[すべて認証キー不要])],
        text(fill: muted)[発表], [2026-09-16（水）11:50 提出・発表 10 分 + 質疑 3 分],
      )
    ]
    #v(1.5em)
    #block(width: 100%, fill: blue-tint, inset: 11pt, radius: 3pt, stroke: (left: 2.5pt + blue))[
      #text(font: FONT_SANS, size: 9pt, weight: "bold", fill: rgb("#0b4c76"))[発表前に読むなら，この順で]
    #v(0.2em)
    #set text(size: 8.8pt)
    #set par(leading: 0.72em)
    時間が無いときは #text(weight: "bold")[6 章（想定質疑）] と
    #text(weight: "bold")[巻末の早見表] だけでよい．
    質疑で数字を聞かれたら早見表，仕組みを聞かれたら 5 章の該当節，
    「なぜその技術か」を聞かれたら 4 章の該当行を思い出せばよい形にしてある．
    2 章と 3 章は，全体像が頭に入っていないと 6 章の答えが暗記になってしまうので，
    余裕があれば先に通しておく．
  ]
    #v(1.6em)
    #text(size: 8.4pt, fill: muted)[
      この資料は `main`（コミット 5dbf879）時点のコードを読んで書いている．
      図の正本は同じディレクトリの `chizuba-overview.progfocus.md`（prog-focus 形式）．
    ]
  ]
]

// ============================================================================
// 目次
// ============================================================================

#page(footer: none)[
  #text(font: FONT_SANS, size: 15pt, weight: "bold")[目次]
  #v(0.8em)
  #show outline.entry.where(level: 1): it => {
    v(0.75em, weak: true)
    text(font: FONT_SANS, size: 10pt, weight: "bold")[#it]
  }
  #show outline.entry.where(level: 2): it => {
    text(font: FONT_SANS, size: 8.8pt, fill: rgb("#3c4550"))[#it]
  }
  #outline(title: none, depth: 2, indent: 1.1em)
]

// ============================================================================
= CHIZUBA は何をするアプリか
// ============================================================================

== 一言でいうと

千葉県のオープンデータは，公開された時点で止まっている．
避難場所も AED も景観スポットも「市が持っている静的な一覧」であって，
#text(weight: "bold")[現場で今どうなっているか]
——ガードレールが折れている，この道路が冠水している，この時期はここが綺麗——
は誰も更新できない．

CHIZUBA は，そのオープンデータを土台に置いたうえで，
#text(weight: "bold")[その上に住民の投稿を重ね，行政が応答できる場所]を作る．
地図はすでに共通言語になっているので，防災と観光という性格の違う 2 つの用途を，
同じ地図・同じ投稿の仕組みで扱える．

#point("質疑で最初に返すべき 1 文")[
  「行政が出したオープンデータの上に，住民が投稿を重ねて，行政がそれに応答する．
  その一往復を 1 枚の地図の上で完結させたのが CHIZUBA です．」
]

== 機能の一覧（F-1 〜 F-8）

要件はチームで 8 つに決めてある．#text(weight: "bold")[ここに無いものは作らず，ここにあるものは全部作った．]

#table(
  columns: (auto, auto, 1fr),
  align: (center, left, left),
  table.header([ID], [機能], [中身]),
  [F-1], [ハザードマップ表示], [洪水・高潮・津波の浸水想定を地図に重ねる．レイヤーごとに ON/OFF と不透明度を変えられ，凡例と出典を出す],
  [F-2], [危険箇所の市民報告], [壊れたガードレール・陥没した路面などを，位置 + 写真 + 説明で投稿する],
  [F-3], [浸水状況の報告], [冠水している場所を投稿する．#text(weight: "bold")[投稿時点の雨量をサーバーが自動で記録する]],
  [F-4], [注意案内], [過去に浸水報告のある地域に，雨の予報が出ているとき注意を出す],
  [F-5], [観光マップ], [景観 100 選を地図に載せ，日英の解説・写真・徒歩ルートを出す],
  [F-6], [観光おすすめの投稿], [「ここが綺麗」「この店の◯◯が良い」を F-2 と同じ操作感で投稿する],
  [F-7], [行政からの応答], [行政が公式コメントを付け，対応状況を 4 段階で更新する],
  [F-8], [Google ログイン], [Google OAuth．#text(weight: "bold")[鍵が未設定の環境では自動でデモログインに落ちる]],
)

これに加えて，設計に落とす過程で 5 つだけ足した．
対応状況の 4 段階（F-7 の中），投稿一覧の画面，投稿日の範囲での絞り込み，
CSV / GeoJSON の書き出し，キーワード検索である．
どれも「なぜ足したか」と「削るときに何を消せばよいか」を要件定義に書いてあるので，
#text(weight: "bold")[勝手に膨らんだ機能は 1 つも無い]．

== 誰が使えて，どこからログインが要るか

権限は 3 段階．#text(weight: "bold")[未ログインでも「見る」ことは全部できる]．
防災情報をログインの壁の向こうに置かないという判断で，投稿にだけログインを要求している．

#table(
  columns: (auto, auto, 1fr),
  align: (left, left, left),
  table.header([ロール], [誰か], [できること]),
  [未ログイン], [誰でも], [地図・ハザードマップ・全レイヤー・投稿の閲覧，徒歩経路，注意案内，書き出し],
  [一般ユーザー], [住民・来訪者], [＋ 投稿（危険箇所・浸水・観光おすすめ），自分の投稿の編集と削除，他人の投稿へのコメント],
  [行政ユーザー], [自治体職員], [＋ 公式コメント（区別表示），#text(weight: "bold")[対応状況の更新]，公式おすすめ投稿],
)

行政ユーザーは一般ユーザーの上位互換で，#text(weight: "bold")[専用の管理画面は作っていない]．
同じ地図画面の上で出せる操作が増えるだけにしてある．画面数を増やさずに実装量を抑えるためで，
そのぶん「行政の発言と住民の発言が混ざる」危険が出るので，
行政の投稿とコメントには必ずバッジを出し，地図ではピンの輪を公式色にしている．

// ============================================================================
= 全体アーキテクチャ
// ============================================================================

== 動いているもの：コンテナ 2 つと外部サービス 4 種

#block(breakable: false)[
#figtitle[図 2-1　実行時の構成．太い矢印がサーバーを通る経路，破線がブラウザから直接取りに行く経路]

  #block(width: 100%, height: 276pt)[
    // --- タイル配信（ブラウザが直接） ---
    #dbox(112pt, 0pt, 150pt, 38pt, "国土地理院「淡色地図」", "背景地図タイル", fill: blue-tint, border: blue, tcolor: rgb("#0b4c76"))
    #dbox(280pt, 0pt, 175pt, 38pt, "重ねるハザードマップ", "洪水・高潮・津波のタイル", fill: blue-tint, border: blue, tcolor: rgb("#0b4c76"))

    // --- ブラウザ ---
    #dbox(0pt, 92pt, 100pt, 56pt, "ブラウザ", "MapLibre GL JS\nReact（Next.js）", fill: paper-tint)

    // --- web / db / uploads ---
    #dbox(140pt, 86pt, 155pt, 68pt, "web コンテナ", "node:22-slim\nNext.js 16（App Router）", fill: white, border: ink)
    #dbox(140pt, 196pt, 72pt, 44pt, "db", "postgres\n:17-alpine", fill: white, border: ink)
    #dbox(223pt, 196pt, 72pt, 44pt, "uploads", "投稿写真の\n実体", fill: white, border: ink)

    // --- サーバー側から叩く外部サービス ---
    #dbox(345pt, 76pt, 142pt, 36pt, "OSRM（FOSSGIS）", "徒歩経路", fill: paper-tint)
    #dbox(345pt, 124pt, 142pt, 36pt, "気象庁 防災情報 JSON", "アメダス実況・府県予報", fill: paper-tint)

    // --- 矢印 ---
    #arr(100pt, 120pt, 40pt)
    #lab(102pt, 106pt, [HTTP :3000])

    #arr(295pt, 94pt, 50pt)
    #lab(299pt, 80pt, [徒歩経路])
    #arr(295pt, 142pt, 50pt)
    #lab(299pt, 128pt, [雨量・予報])

    #arrd(176pt, 154pt, 42pt)
    #lab(180pt, 166pt, [SQL])
    #arrd(259pt, 154pt, 42pt)
    #lab(263pt, 166pt, [写真の実体])

    // ブラウザ → タイル（破線・中継しない）
    #seg(50pt, 92pt, 50pt, 62pt, c: blue, dash: "dashed")
    #seg(50pt, 62pt, 367pt, 62pt, c: blue, dash: "dashed")
    #arru(187pt, 62pt, 24pt, c: blue, dash: "dashed")
    #arru(367pt, 62pt, 24pt, c: blue, dash: "dashed")
    #lab(196pt, 48pt, [タイル画像はサーバーで中継しない], c: blue)

    #place(dx: 0pt, dy: 248pt, text(font: FONT_SANS, size: 6.8pt, fill: muted)[
      静的なオープンデータ（避難場所・AED・子育て施設・景観 100 選）は
      GeoJSON として `app/public/data/` に同梱してあり，起動時にどこへも取りに行かない．
    ])
  ]
]

読み方の要点は 4 つある．

#point("① コンテナは 2 つだけ")[
  `web`（Next.js）と `db`（PostgreSQL 17）．どちらも Docker 公式イメージで，タグを固定している．
  `db` は #text(weight: "bold")[ホストにポートを公開していない]．
  公開すると審査員のマシンで 5432 番が埋まっていたときに起動しなくなるためで，
  中を覗きたいときは `docker compose exec db psql` で入る．
]

#point("② タイル画像だけはブラウザが直接取りに行く")[
  背景地図とハザードマップは画像タイルなので，サーバーで中継しても意味がなく，
  むしろ `web` が詰まる．一方 #text(weight: "bold")[徒歩経路と気象データは必ずサーバーを通す]．
  理由は 3 つで，利用規約が求める User-Agent を確実に付けること，
  レート制限（OSRM は 1 秒 1 リクエスト）をサーバー側 1 箇所で守ること，
  タイムアウトを入れて外部が落ちても画面が固まらないようにすること．
]

#point("③ 起動の順番は healthcheck で保証する")[
  `db` に `pg_isready` の healthcheck を付け，`web` の `depends_on` に
  `condition: service_healthy` を書いてある．
  これで #text(weight: "bold")[DB が受け付けられる状態になるまで `web` は起動しない]．
  配布資料「Docker コンテナの作成例」の例 2 と同じ作法である．
]

#point("④ 外部が落ちても地図と投稿は出る")[
  施設の点は同梱の GeoJSON，投稿は DB にあるので，OSRM も気象庁も落ちた状態で表示できる．
  経路は直線距離からの見積もりに切り替わり，#text(weight: "bold")[見積もりであることを画面に出す]．
  浸水の投稿も，雨量が取れなくても投稿自体は成功させる．
  現場で投稿できないほうが害が大きいという判断である．
]

== コードの地図：6 つのかたまり

#block(breakable: false)[
#figtitle[図 2-2　コードを 6 つのかたまりで見たところ．詳細は同梱の prog-focus 図（ノード 38・接続 34）]

  #block(width: 100%, height: 236pt)[
    #dbox(0pt, 20pt, 132pt, 62pt, "利用者の操作と入力", "地図の操作 / 現在地\n投稿フォーム / 絞り込み", fill: paper-tint)
    #dbox(178pt, 20pt, 150pt, 62pt, "投稿 API", "検証 → 写真 → SQL\n3 カテゴリを 1 本で扱う", fill: white, border: ink)
    #dbox(374pt, 20pt, 113pt, 62pt, "地図の描画", "MapLibre\nレイヤーとタイル", fill: blue-tint, border: blue, tcolor: rgb("#0b4c76"))

    #dbox(0pt, 140pt, 132pt, 62pt, "外部サービスの中継", "気象庁 JSON / OSRM\nキャッシュとタイムアウト", fill: paper-tint)
    #dbox(178pt, 140pt, 150pt, 62pt, "認証とセッション", "Google ⇄ デモの二段構え\nJWT をこの DB に縛る", fill: white, border: ink)
    #dbox(374pt, 140pt, 113pt, 62pt, "蓄積データの出力", "注意案内（F-4）\nCSV / GeoJSON", fill: blue-tint, border: blue, tcolor: rgb("#0b4c76"))

    #arr(132pt, 40pt, 46pt)
    #lab(136pt, 26pt, [操作・投稿])
    #arr(328pt, 51pt, 46pt)
    #lab(332pt, 37pt, [GeoJSON])
    #arru(253pt, 140pt, 58pt)
    #lab(256pt, 108pt, [本人とロール])

    // 外部中継 → 投稿 API（雨量の焼き込み）
    #seg(132pt, 171pt, 155pt, 171pt)
    #seg(155pt, 171pt, 155pt, 64pt)
    #arr(155pt, 64pt, 23pt)
    #lab(120pt, 120pt, [雨量])

    // 投稿 API → 蓄積データの出力
    #seg(328pt, 70pt, 351pt, 70pt)
    #seg(351pt, 70pt, 351pt, 171pt)
    #arr(351pt, 171pt, 23pt)
    #lab(354pt, 118pt, [蓄積した投稿])

    // 外部中継 → 蓄積データの出力（雨の予報）
    #seg(66pt, 202pt, 66pt, 220pt, dash: "dashed")
    #seg(66pt, 220pt, 430pt, 220pt, dash: "dashed")
    #arru(430pt, 220pt, 18pt, dash: "dashed")
    #lab(200pt, 222pt, [雨の予報（注意案内の片方の根拠）])
  ]
]

かたまりごとの実体は次のとおり．どのファイルを開けばよいかまで覚えておくと，
「そこはどう実装したのか」と聞かれたときに詰まらない．

#table(
  columns: (auto, 1fr, auto),
  align: (left, left, left),
  table.header([かたまり], [何をしているか], [中心のファイル]),
  [利用者の操作と入力], [画面の状態を 1 つ持ち，地図・操作パネル・投稿パネルへ配る], [`components/MapExplorer.tsx`],
  [投稿 API], [検証 → 写真の保存 → SQL の 3 段．3 カテゴリを 1 テーブルで扱う], [`app/api/reports/`],
  [地図の描画], [MapLibre の実体を持つ唯一の場所．モードを変えても作り直さない], [`components/MapView.tsx`],
  [認証とセッション], [Google とデモの分岐．JWT をこのインストールに縛る], [`lib/auth.ts`],
  [外部サービスの中継], [気象庁 JSON の取得とキャッシュ，OSRM の中継], [`lib/jma.ts`],
  [蓄積データの出力], [注意案内の判定，CSV / GeoJSON の組み立て], [`lib/weather.ts`・`lib/reportExport.ts`],
)

== 「1 箇所を直せば全体が追従する」ようにしてある

質疑で拡張性を聞かれたときに，この 3 つを挙げられるとよい．

#table(
  columns: (auto, 1fr),
  align: (left, left),
  table.header([増やすもの], [やること]),
  [投稿のカテゴリを増やす],
  [`lib/reports.ts` の `REPORT_CATEGORIES` に 1 行足す．
   フォームの入力欄・地図のピンの色・詳細パネル・書き出しの列が，すべてこの表を読んでいるので自動で増える],
  [対応する市町村を増やす],
  [`municipalities` テーブルに 1 行足し，その市の CSV を GeoJSON にする．
   初期表示の座標もズームも範囲もマスタから引いているので，#text(weight: "bold")[コードは 1 行も変えない]],
  [地図に載せるデータを増やす],
  [`lib/layers.ts` の `LAYERS` に 1 行足す．色・アイコン・ポップアップの項目も同じ行に書く],
)

#caution("ここは正直に言う")[
  デモデータは市川市だけである．
  「千葉県全域に対応」と言えるのは #text(weight: "bold")[骨格がそうなっているから]であって，
  54 市町村ぶんのデータを入れてあるわけではない．
  聞かれたら「全域対応の設計にしてあり，データは市川市を入れています．
  増やす作業はマスタに 1 行と GeoJSON 化だけです」と答える．
]

// ============================================================================
= リクエストの流れ（3 本）
// ============================================================================

ここは #text(weight: "bold")[「動かしたときに何が順番に起きるか」] を追う章である．
質疑で「投稿すると何が起きるんですか」と聞かれたら，3-2 の 13 行を思い出せばよい．

#let B = who("ブラウザ", blue)
#let W = who("web", ink)
#let D = who("db", green)
#let X = who("外部", vermilion)

== 3-1　地図を開く（`GET /`）

#flow(
  [1], B, [`GET /?mode=disaster` を開く],
  [2], W, [サーバーコンポーネントが `getSessionView()` を呼ぶ．
           #text(weight: "bold")[認証モードとログイン状態はサーバー側で 1 回だけ決め]，画面へ渡す],
  [3], W, [HTML を返す．地図の状態を持つクライアントコンポーネントに，
           ログイン状態・市町村コード・初期モードを渡す],
  [4], B, [MapLibre を初期化する．背景タイル（国土地理院「淡色地図」）は
           #text(weight: "bold")[ブラウザが直接]取りに行く],
  [5], B, [モードの初期値から，どのレイヤーを出すかを決める．
           防災モードなら避難場所・AED・子育て施設 + ハザードマップ，観光モードなら景観 100 選],
  [6], X, [ハザードタイルをブラウザが直接取得する．
           #text(weight: "bold")[ズーム 6 より引いた縮尺では取りに行かない]（読み取れない染みのために国交省へ投げ続けないため）],
  [7], W, [`GET /data/*.geojson`．#text(weight: "bold")[同梱の静的ファイル]で，DB を経由しない],
  [8], B, [`GET /api/reports?city=12203&…` を呼ぶ．#text(weight: "bold")[ログインは要らない]],
  [9], D, [矩形（地図の表示範囲）・カテゴリ・期間・キーワードで絞る SQL を 1 本流す],
  [10], W, [#text(weight: "bold")[GeoJSON の FeatureCollection] で返す．
            静的レイヤーと同じ形なので，地図側のコードが 1 本で済む],
  [11], B, [`GET /api/weather?city=12203` を呼ぶ],
  [12], X, [`web` が気象庁 JSON を取りに行く．
            #text(weight: "bold")[キャッシュに載っていれば行かない]（実況 10 分・予報 30 分）],
  [13], B, [注意案内（F-4）を出すか決める．
            #text(weight: "bold")[根拠になる浸水報告だけは期間の絞り込みを無視して全期間で引き直す]],
)

#caution("13 行目がなぜ必要か")[
  期間で絞ったせいで「過去に浸水報告はありません」と表示されると，防災の判断を誤らせる．
  絞り込みは #text(weight: "bold")[見せ方] の都合であって，
  #text(weight: "bold")[危険の有無] は絞り込みで変わってはいけない．
]

== 3-2　浸水を投稿する（`POST /api/reports`）

#flow(
  [1], B, [地図で位置を決め，カテゴリ「浸水」・冠水の深さ・本文・写真（最大 3 枚）を入れる],
  [2], B, [`POST /api/reports` に `multipart/form-data` で送る],
  [3], W, [ログインしていなければ 401．#text(weight: "bold")[閲覧は自由だが書き込みは要ログイン]],
  [4], W, [`content-length` を先に見て，10 MB を超えるなら
           #text(weight: "bold")[本文を読み込まずに] 413 を返す],
  [5], W, [入力を検証する．写真は JPEG / PNG / WebP・1 枚 5 MB・3 枚まで．
           #text(weight: "bold")[申告された MIME を信じず，先頭バイトでも形式を確かめる]],
  [6], W, [座標を市町村マスタの範囲と突き合わせて `city_code` を決める．
           #text(weight: "bold")[クライアントの申告は使わない]],
  [7], X, [最寄りのアメダスを探す．距離の近い順に見て，
           #text(weight: "bold")[1 時間降水量が正常な値で入っている最初の観測所]を採る（20 km 以内）],
  [8], W, [取れたら雨量・観測時刻・観測所名・距離を投稿に焼き込む．
           #text(weight: "bold")[取れなくても投稿は通す]（現場で投稿できないほうが害が大きい）],
  [9], W, [写真の実体を `uploads` ボリュームへ保存する．ファイル名はサーバーが作る],
  [10], D, [トランザクションで `reports` に 1 行 ＋ `report_photos` に n 行],
  [11], W, [#text(weight: "bold")[途中で失敗したら ROLLBACK し，保存済みの写真の実体も消す]（孤児ファイルを残さない）],
  [12], W, [201 と，作られた投稿の内容を返す],
  [13], B, [地図の投稿ソースを引き直し，新しいピンを描く],
)

#point("この 13 行のうち，覚えておくと強い 3 つ")[
  #text(weight: "bold")[6 行目]：所属市町村をサーバーが決めるので，他市の投稿として紛れ込ませられない．
  #text(weight: "bold")[7〜8 行目]：雨量はクライアントから受け取らない．
  F-4 の注意案内の根拠になる値なので，投稿者が自由に入れられてはいけない．
  #text(weight: "bold")[11 行目]：DB とファイルは別の場所なので，
  片方だけ成功した状態を残さないよう明示的に後始末している．
]

== 3-3　ログインする（デモモードの場合）

#flow(
  [1], B, [`GET /login` を開く],
  [2], W, [起動時に決まっている認証モードを見る．
           デモモードなら表示名の入力欄，Google モードなら「Google でログイン」],
  [3], B, [表示名とロール（一般／行政）を送る．
           #text(weight: "bold")[公開運用の環境では，行政を選んだときだけ PIN も送る]],
  [4], W, [PIN を確かめる．未設定の環境では素通りする（審査員の体験を変えない）],
  [5], D, [`users` に upsert する．同じ「表示名 × ロール」で入り直したら同じユーザーになる],
  [6], D, [`app_instance.install_id` を読む．#text(weight: "bold")[このデータベースの識別子]],
  [7], W, [署名鍵をその ID から導く．
           `sha256("chizuba-session-key:" + install_id)`．
           #text(weight: "bold")[鍵を 1 つも設定していない環境でも，鍵は環境ごとに違う]],
  [8], W, [JWT に `uid` / 表示名 / ロール / 担当市町村 ／
           #text(weight: "bold")[発行元のインストール ID] を載せて署名する],
  [9], W, [Cookie を配ってリダイレクトする．
           #text(weight: "bold")[飛び先は設定値ではなく，リクエストが名乗ったホストから毎回導く]],
  [10], W, [以降のリクエストでは，トークンの中の ID と今の ID を毎回突き合わせる．
            #text(weight: "bold")[違えば未ログイン扱い]],
)

Google モードとの違いは 3 つだけである．
`/login` に出るボタンが Google になること，
コールバックが `/api/auth/callback/google` を通ること，
そして #text(weight: "bold")[ロールを自己申告できないこと]（環境変数
`GOV_ACCOUNTS` に書いたメールアドレスにだけ行政ロールが付く）．
5 行目以降——ユーザーの upsert，インストール ID の照合，リダイレクト先の導出——は
#text(weight: "bold")[まったく同じコードを通る]．
二段構えといっても，分岐しているのは入り口だけである．

// ============================================================================
= 技術選定の「なぜ」
// ============================================================================

== 全体を貫く 1 つの制約

#point("認証キーが要る外部サービスを使わない")[
  審査員が `docker compose up` だけで全機能を試せることを最優先にした．
  コード評価は #text(weight: "bold")[実装した割合 × 正しく動作する割合] の掛け算なので，
  「鍵が無いと動かない機能」は，実装した分がまるごと 0 点になる．
  唯一の例外が Google OAuth で，これは要件に明記されているため外せない．
  だから #text(weight: "bold")[鍵が未設定なら自動でデモログインに落ちる]構成にした．
]

この制約が，以下の選定のほぼすべてを決めている．
地図・ハザードマップ・徒歩経路・気象データはいずれも
「無料で使える似たサービス」ではなく，#text(weight: "bold")[登録もキーも要らないもの]を選んでいる．

#table(
  columns: (auto, auto, 1fr),
  align: (left, left, left),
  table.header([領域], [採ったもの], [なぜ]),
  [背景地図], [国土地理院「淡色地図」], [無認証．出典の明記だけで使える．国内の地名表記が正確で，配信も安定している],
  [地図ライブラリ], [MapLibre GL JS], [無認証．純 JavaScript でネイティブ拡張を持たないので，Docker のビルドが壊れない],
  [ハザードマップ], [重ねるハザードマップの#text(weight: "bold")[ラスタタイル]], [無認証．#text(weight: "bold")[ポリゴンを DB に入れずに済み]，実装が最小になる],
  [徒歩経路], [OSRM（FOSSGIS e.V.）], [無認証で徒歩プロファイルがある．実測で疎通を確認済み],
  [気象データ], [気象庁 防災情報 JSON], [無認証．#text(weight: "bold")[一次情報]なので出典として強い],
  [フレームワーク], [Next.js（App Router）], [地図の UI とサーバー側の中継 API を #text(weight: "bold")[1 コンテナに収められる]],
  [データベース], [PostgreSQL 17（`postgres:17-alpine`）], [Docker 公式イメージ．住民と行政の投稿を保存する],
  [DB クライアント], [`pg`（node-postgres）], [純 JavaScript．#text(weight: "bold")[ORM もマイグレーションツールも入れない]],
  [CSS], [Tailwind CSS v4], [提出までの期間が短く，書き足しの速度を優先した],
  [アイコン], [lucide-react], [依存ゼロの SVG コンポーネント．#text(weight: "bold")[絵文字は UI に使わない]],
  [配色], [Okabe-Ito], [色覚多様性に配慮した配色として国内で実績がある],
)

== なぜ Next.js なのか

このアプリは #text(weight: "bold")[地図を描くフロントエンドと，外部サービスを中継するサーバー]の
両方を必要とする．中継が要るのは，OSRM の利用規約が User-Agent の明示と
1 秒 1 リクエストの制限を求めており，気象庁 JSON もキャッシュしないと
閲覧数に比例して取りに行ってしまうからである．

フロントエンドとサーバーを別々に立てると #text(weight: "bold")[コンテナが 1 つ増える]．
Next.js の App Router なら，同じプロジェクトの中に画面（React）と
サーバーの API（ルートハンドラ）を並べて置け，1 つのコンテナで動く．
提出要件が「`docker compose up` 一発」を求めている以上，構成部品は少ないほどよい．

実行イメージは `output: "standalone"` で作った最小構成だけを入れている．
`node_modules` を丸ごと持たないので，イメージが小さく，起動も速い．

== なぜ Google マップではなく MapLibre なのか

#text(weight: "bold")[理由は 3 つある．]
第 1 に，Google Maps Platform は #text(weight: "bold")[API キーと課金アカウントが必須]で，
上の制約に真正面からぶつかる．審査員の環境で地図が出ない．
第 2 に，このアプリの主役は #text(weight: "bold")[国土地理院のタイルと国土交通省のハザードタイル]で，
これらを重ねられることが要件である．MapLibre は任意の XYZ タイルを
そのままレイヤーとして重ねられるが，Google マップは自前のタイルの上に
他機関のラスタを自由に重ねる用途には向いていない．
第 3 に，MapLibre は BSD ライセンスのオープンソースで，
#text(weight: "bold")[利用規約の変更で急に使えなくなる心配がない]．

== なぜ PostgreSQL で，なぜ PostGIS を使わないのか

住民と行政の投稿は #text(weight: "bold")[消えては困るデータ]なので，
ブラウザの保存領域やファイルではなくデータベースに置く．
PostgreSQL を選んだのは Docker 公式イメージがあり，タグを固定できるからである．

#point("PostGIS を入れなかった理由は 3 つ")[
  #text(weight: "bold")[①] 提出要件が「ベースイメージは可能な限り Docker 公式イメージ」と定めており，
  `postgis/postgis` は公式イメージではない．
  #text(weight: "bold")[②] 必要な地理演算は「地図の表示範囲に入る投稿を引く」（矩形の範囲検索）と
  「2 点間の距離」だけで，どちらも数値カラムと Haversine 式で足りる．
  #text(weight: "bold")[③] 投稿は 1 市あたり多くて数百件の規模で，特別な索引が無くても問題にならない．
  PostGIS が要るのは「ポリゴンとの交差判定を DB でやりたい」ときだが，
  #text(weight: "bold")[ハザードマップはタイル画像として重ねるだけ]なので，その必要が無い．
]

ORM とマイグレーションツールも入れていない．
スキーマは `app/db/init/*.sql` を PostgreSQL の公式イメージが起動時に流す仕組みに任せてある．
依存を 2 つ減らせるうえ，#text(weight: "bold")[審査員の初回起動で確実にスキーマができる]．
代償は「スキーマを変えたらボリュームを作り直す必要がある」ことだが，
開発期間が 2 週間強のプロジェクトでは割に合う．

== なぜ静的な GeoJSON を DB に入れないのか

避難場所 123 件・AED 304 件・子育て施設 388 件・景観 100 選 100 件は，
市川市が公開した #text(weight: "bold")[変わらないデータ]である．
これらを DB に入れると，「起動したのにデータが入っていない」という事故が起きうる．
初期データの投入が失敗しても，コンテナは正常に立ち上がってしまうからである．

そこで，手元で CSV から GeoJSON へ変換したものを
#text(weight: "bold")[リポジトリにコミットして同梱]し，ブラウザが直接読む形にした．
DB を使うのは #text(weight: "bold")[投稿だけ]である．
「読むだけのデータ」と「書き込まれるデータ」を置き場所で分けた，と説明すればよい．

== なぜこの Docker 構成なのか

#table(
  columns: (auto, 1fr),
  align: (left, left),
  table.header([決めたこと], [理由]),
  [ベースイメージは公式（DOI）], [提出要件．`node:22-slim` と `postgres:17-alpine`],
  [タグを固定する（`latest` を使わない）], [提出要件．`latest` は将来別のものになり，再現しなくなる],
  [multi-stage ビルド], [依存の取得・ビルド・実行を分け，実行イメージに開発用の依存を持ち込まない],
  [`depends_on` + `healthcheck`], [配布資料の作成例 2 と同じ作法．
    `pg_isready -U chizuba -d chizuba` が通るまで `web` を起動しない],
  [`db` のポートを公開しない], [審査員のマシンで 5432 番が埋まっていると起動できなくなるため],
  [公開ポートは `\${CHIZUBA_PORT:-3000}`], [既定の 3000 は動かさず，塞がっている環境だけ逃がせる],
  [`USER node` で動かす], [root で動かさない．そのため `/app/uploads` を先に作って所有者を移してある],
)

`healthcheck` に `-U` と `-d` を付けているのには理由がある．
付けないと既定の `postgres` ユーザーで見に行き，
#text(weight: "bold")[起動の途中でも通ってしまうことがある]．
そうなると `web` が先に立ち上がって接続に失敗する．

== なぜ Tailscale Funnel なのか（提出物ではない）

プレゼンで審査員に実物を触ってもらうため，自宅の Mac で動かして
インターネットへ公開する手順を別に用意してある．
Tailscale Funnel を選んだのは，#text(weight: "bold")[外部のホスティングサービスに登録せず]，
無料アカウントと自宅の Mac だけで HTTPS の公開 URL を得られるからである．
見る側に Tailscale は要らず，普通のウェブサイトとして開ける．

#block(breakable: false)[
#figtitle[図 4-1　公開したときの経路．TLS は Tailscale 側で終端し，自宅の中は素の HTTP のまま]

  #block(width: 100%, height: 96pt)[
    #dbox(0pt, 26pt, 105pt, 46pt, "審査員のスマホ", "ブラウザだけでよい\n（Tailscale は不要）", fill: paper-tint)
    #dbox(148pt, 26pt, 128pt, 46pt, "Tailscale の中継", "TLS 終端\n公開ホスト名を名乗る", fill: blue-tint, border: blue, tcolor: rgb("#0b4c76"))
    #dbox(320pt, 26pt, 167pt, 46pt, "自宅の Mac", "tailscaled → 127.0.0.1:3000\nweb コンテナ → db コンテナ", fill: white, border: ink)
    #arr(105pt, 49pt, 43pt)
    #lab(101pt, 8pt, [`https://<マシン名>.<tailnet 名>.ts.net`])
    #arr(276pt, 49pt, 44pt)
    #lab(276pt, 78pt, [素の HTTP])
  ]
]

ここで効いてくるのが 5-11 節の仕組みである．
Tailscale Funnel は公開ホスト名を `X-Forwarded-Host` に，
TLS を終端したことを `X-Forwarded-Proto: https` に入れて転送する．
CHIZUBA はそのヘッダーからリダイレクト先を毎回導いているので，
#text(weight: "bold")[公開 URL をどこにも書かずに，そのまま HTTPS のサイトとして成立する]．
起動と QR コードの生成をまとめたスクリプトも置いてあり，
画面の無い Mac（`colima`）でも通るようにしてある．

#caution("これは提出物に含まれない")[
  CODIHA に提出するのは `app/` 配下だけで，公開用の一式は提出アーカイブに入らない．
  「作ったものを触ってもらうための運用手順」であって，提出要件とは別の話である．
  ただし #text(weight: "bold")[公開すると誰でも行政ロールを名乗れてしまう]ので，
  そのときだけ行政ロールに PIN を要求する仕組みを足してある（5-10 節）．
]

// ============================================================================
= 各機能の仕組み
// ============================================================================

== 5-1　ハザードマップの重ね（F-1）

国土交通省「ハザードマップポータルサイト」の重ねるハザードマップが配信している
#text(weight: "bold")[ラスタタイル]を，背景地図の上に重ねている．
洪水・高潮・津波の 3 種類で，レイヤーごとに ON/OFF と不透明度を変えられる．

#point("ポリゴンを DB に入れない，という判断")[
  浸水想定区域を「地物」として扱うなら，ポリゴンを取り込んで PostGIS で交差判定する構成になる．
  しかし今回必要なのは #text(weight: "bold")[「見て分かる」こと]だけで，
  「この地点は何メートル浸かるか」を計算する機能は要件に無い．
  タイル画像を重ねるだけなら，データの取り込みも DB の拡張も要らない．
  #text(weight: "bold")[実装が最小になり，出典も 1 行で済む．]
]

実際に配信されているタイルの画素を数えて確かめたところ，
#text(weight: "bold")[凡例が 2 種類あった]．同じ色でも表す深さが違うので，1 つの凡例にまとめると誤読する．

#table(
  columns: (auto, auto, 1fr),
  align: (left, center, left),
  table.header([対象], [段階], [浅い側の違い]),
  [洪水浸水想定区域], [6], [いちばん浅い色（`#f7f5a9`）が「0.5 m 未満」を表す],
  [津波浸水想定・高潮浸水想定区域], [8], [浅い側に 2 段増え，同じ `#f7f5a9` が「0.3 〜 0.5 m」を表す],
)

#caution("凡例に必ず添えている注意書き")[
  #text(weight: "bold")[「色が付いていない場所が安全とは限りません」．]
  想定区域が公表されていない河川・地域では，その場所のタイルが 404 になり，地図には何も描かれない．
  #text(weight: "bold")[白紙を「危険なし」と誤読させない]ことは，このアプリで最も重要な表示上の約束である．
  実測でも，市川市には土砂災害警戒区域のタイルが存在しなかった（平地で該当区域が無いため）．
]

配信されているズームは 2 〜 17 だが，#text(weight: "bold")[ズーム 6 より引いた縮尺では重ねを描かない]．
日本全体が画面に収まるような縮尺では想定区域が数ピクセルの染みにしかならず読み取れないのに，
タイルの要求だけは発生し続けるからである．ズーム 6 なら本州全体が入るので，
千葉県内を見ている限り消えることはない．

== 5-2　3 種類の投稿を 1 つのモデルに統一した（F-2 / F-3 / F-6）

危険箇所・浸水・観光おすすめは，#text(weight: "bold")[1 つのテーブル・1 つの API・1 つのフォーム]で扱う．
違いは `category` の値と，カテゴリ固有の項目を入れる `details`（JSON の列）だけである．

#table(
  columns: (auto, auto, auto, 1fr),
  align: (left, left, left, left),
  table.header([カテゴリ], [`category`], [固有の項目], [サーバーが足すもの]),
  [危険箇所], [`hazard`], [危険の種別（5 択）], [—],
  [浸水], [`flood`], [冠水の深さ（3 択）], [#text(weight: "bold")[投稿時点の雨量・観測時刻・観測所名・距離]],
  [観光おすすめ], [`spot`], [おすすめの種別（4 択）], [—],
)

分けなかった理由は #text(weight: "bold")[実装量が 3 倍にならないこと]に尽きる．
3 テーブルにすれば，API も 3 本，フォームも 3 つ，地図のレイヤーも 3 系統になり，
「投稿の一覧」を出すたびに 3 本の問い合わせを束ねることになる．
共通なのは「位置・写真・本文・投稿者・対応状況」で，これは全体の 9 割を占める．

そのうえで，#text(weight: "bold")[統一しない部分]も決めてある．
地図で最初から表示する組はモードごとに分け，防災の投稿と観光の投稿が
同じ濃さで混ざらないようにしている．ピンの色もカテゴリごとに変えている．

#point("拡張性を聞かれたら，ここを答える")[
  カテゴリの定義は `lib/reports.ts` の 1 つの配列に集めてあり，
  #text(weight: "bold")[フォームの入力欄・地図のピンの色・詳細パネルの表示・書き出しの列]が
  すべてその配列を読んでいる．
  たとえば「不法投棄」というカテゴリを足すなら，配列に 1 行足すだけで，
  投稿の入り口も表示も書き出しも同時に増える．
]

== 5-3　雨量の自動記録（F-3）

浸水の投稿には，#text(weight: "bold")[投稿した瞬間の雨量をサーバーが記録する]．
値は気象庁のアメダス実況から取る．

#flow(
  [1], W, [投稿された座標から，全国 約 1,300 地点のアメダスを距離の近い順に並べる],
  [2], W, [#text(weight: "bold")[1 時間降水量が正常な値で入っている最初の観測所]を採る
           （風だけを測る観測所や欠測中の観測所を飛ばすため）],
  [3], W, [20 km より遠ければ諦める．その地点の雨量として使うには遠すぎる],
  [4], W, [雨量・観測時刻・#text(weight: "bold")[観測所名・距離]を投稿に焼き込む],
)

#caution("実測で踏んだ落とし穴 3 つ")[
  #text(weight: "bold")[①] 観測所一覧の緯度経度は #text(weight: "bold")[`[度, 分]` の配列]であって，小数の度ではない．
  これを見落とすと，すべての距離計算が壊れる．
  #text(weight: "bold")[②] 観測値は #text(weight: "bold")[`[数値, 品質フラグ]` の 2 要素]で，
  フラグが 0 でないものは欠測なので使ってはいけない．
  #text(weight: "bold")[③] #text(weight: "bold")[市川市にはアメダスが無く，最寄りは船橋で約 10 km ある．]
]

③ のせいで，「この地点の雨量」と言い切ることができない．
そこで #text(weight: "bold")[観測所名と距離を必ず併記]している．
画面には「船橋アメダス（約 10.2 km）」のように出る．
質疑で精度を突かれたら，#text(weight: "bold")[「最寄り観測所の値であることを画面に明示しています」]と答えればよい．

雨量は #text(weight: "bold")[クライアントから受け取らない]．
これは F-4 の注意案内の根拠になる値なので，投稿者が自由に入れられてはいけない．
実測でも，`rainfallMm` を混ぜて送信すると検証の段階で捨てられ，
サーバーが自分で取った値に上書きされることを確認してある．

気象庁へ取りに行けなかったときは，#text(weight: "bold")[雨量なしで投稿を通す]．
気象庁への到達を落とした状態で試したところ，投稿は 201 で成功し，
詳細に「投稿時の雨量：取得できませんでした」と表示され，注意案内は出なかった．

== 5-4　注意案内と，越えてはいけない線（F-4）

過去に浸水報告のある地域に雨の予報が出ているとき，操作パネルの先頭に注意カードを出し，
地図の該当地点に輪を描く．出す条件は #text(weight: "bold")[3 つすべて]が揃ったときだけである．

#table(
  columns: (auto, 1fr),
  align: (left, left),
  table.header([条件], [揃わないとどうなるか]),
  [気象庁の予報が取れている], [取れなければ #text(weight: "bold")[出さない]．根拠のない警告になるため],
  [今後 24 時間の降水確率が 30% 以上], [雨の見込みが無いときに注意を出しても，注意の意味が薄れる],
  [過去の浸水報告が 1 件以上ある], [注意すべき地点が無いので出さない],
)

しきい値を 30% にしたのは #text(weight: "bold")[傘を持つかどうかの一般的な目安]がここだからである．
50% まで上げると雨でも注意が出ない回が増え，10% まで下げるとほぼ毎日出て意味を失う．
#text(weight: "bold")[この 30% は「注意カードを出すかどうか」の内部的な足切りにすぎず]，
画面には気象庁の降水確率そのものを出す．CHIZUBA が確率を作り直すことはしない．

#caution("気象業務法の線 —— ここは絶対に踏まない")[
  気象業務法は，#text(weight: "bold")[気象庁以外が予報を業として出すことを許可制]にしている．
  だから CHIZUBA は「浸水するでしょう」「浸水のおそれがあります」に類する表現を，
  #text(weight: "bold")[コードにも画面にも一切入れていない]．

  出しているのは #text(weight: "bold")[検証できる事実 2 つ]だけである．
  ① 住民から寄せられた浸水の報告が N 件ある．
  ② 気象庁の予報では，千葉県◯◯部の今後 24 時間の降水確率は最大 X% である．
  そのうえで「過去の投稿と気象庁の予報を並べて示しています．#text(weight: "bold")[浸水の予測ではありません]」と明記し，
  予報が市町村単位ではなく予報区単位であることも書いている．
]

予報区は #text(weight: "bold")[市町村単位では取れない]．
千葉県は「北西部・北東部・南部」の 3 区分が最小である．
市区町村コードから予報区を引くために，気象庁の地域区分 JSON を
4 段（市区町村 → 二次細分 → 一次細分 → 発表官署）辿っている．
#text(weight: "bold")[この対応表は全国分が入っている]ので，DB にカラムを足さずに千葉県全域に効く．

#point("「データが溜まるほど精度が上がる」は，どう言うか")[
  将来像として語るのは構わないが，#text(weight: "bold")[提出したコードが今できると主張してはいけない]．
  「今は事実を 2 つ並べているだけです．投稿が溜まれば，
  どの地点がどの雨量で冠水したかという#text(weight: "bold")[データセットそのもの]ができるので，
  そこから先は行政や研究者が使える形にして渡すのが筋だと考えています」——
  これが，法にも実装にも誠実な答え方である．
]

== 5-5　徒歩ナビ（F-5）

避難場所・AED・子育て施設・景観スポットのどれにでも，現在地からの徒歩経路を出せる．
経路計算は OSRM（FOSSGIS e.V. 提供）で，#text(weight: "bold")[必ずサーバーを経由]させている．

#table(
  columns: (auto, 1fr),
  align: (left, left),
  table.header([守っていること], [どうやって]),
  [利用規約が求める User-Agent を名乗る], [サーバー側で必ず付ける．ブラウザからは付け替えられない],
  [1 秒あたり 1 リクエストを超えない], [#text(weight: "bold")[順番待ちの列]を 1 本作り，前回の送信から 1.1 秒空くまで待たせる],
  [外部が落ちても画面を固めない], [8 秒で打ち切る．失敗したら #text(weight: "bold")[直線距離からの見積もり]に切り替える],
  [出典を出す], [地図の隅と `/about` の両方に，OSRM と OpenStreetMap を明記],
)

見積もりに切り替わったときは，#text(weight: "bold")[見積もりであることを画面にはっきり出す]．
「経路サービスに接続できませんでした」という理由も一緒に表示する．
黙って直線距離を出すと，利用者は実際の経路だと思ってしまう．

== 5-6　景観スポットと写真（F-5）

観光マップの主データは市川市「いちかわ景観 100 選」で，100 件すべてに座標・日本語解説・英語解説がある．
解説は 19 〜 88 文字と短いので，#text(weight: "bold")[1 〜 2 文のキャプションとして扱い]，
「音声ガイド級の解説」は謳っていない．

元データの画像列は #text(weight: "bold")[3 通りの URL すべてで 404]だったので使えなかった．
そこで写真はウィキメディア・コモンズから，再利用が許されているもの（CC0 / CC BY / CC BY-SA）だけを集め，
#text(weight: "bold")[100 か所中 54 か所]に付けてある．作者名とライセンスはポップアップに出し，
全 54 枚の一覧を `/about` に載せている．

#caution("写真を集めるときに引っかかったこと")[
  スポット名で検索すると #text(weight: "bold")[同名の別の場所が大量に混ざる]．
  愛知県日進市の弁天池公園，岐阜県北方町の北方小学校，郡山市立行徳小学校などが実際に出てきた．
  そのため，座標による検索か専用カテゴリで裏を取り，#text(weight: "bold")[最後に必ず目視で確認]している．
  「AI に集めさせて終わりではないか」と聞かれたら，ここを答えればよい．
]

== 5-7　行政の応答（F-7）

行政ユーザーは，投稿に公式コメントを付け，対応状況を 4 段階
（未対応・受付・対応中・対応済）で更新できる．

対応状況を足したのは要件そのものではなく，設計の過程で加えたものである．
理由は，参考にした市民報告サービスがいずれも対応状況を持っており，
#text(weight: "bold")[「報告したあとどうなったか」が見えないと，市民は 2 度目を投稿しない]からである．

#point("更新の権限は「含まれている項目ごと」に確かめる")[
  更新は 1 つの経路（`PATCH /api/reports/:id`）にまとめてあるが，
  #text(weight: "bold")[要る権限は項目によって違う]．

  #v(0.3em)
  ・#text(weight: "bold")[対応状況]を変えられるのは，#text(weight: "bold")[担当市町村が一致する行政ユーザー]だけ．
  市川市の職員が船橋市の投稿を閉じられてはいけない．

  ・#text(weight: "bold")[本文]を書き換えられるのは #text(weight: "bold")[投稿者本人]だけ．
  行政ユーザーであっても他人の本文には触れない．
  行政の言い分はコメントとして残す．書き換えてしまうと，誰が書いたか分からなくなるためである．
]

もう 1 つ，実装上の細かい判断がある．
更新のときに，カテゴリ固有の項目を #text(weight: "bold")[丸ごと置き換えず，重ねている]．
そうしないと，浸水の投稿で本文を直すたびに，
サーバーが焼き込んだ雨量が消えてしまう．

== 5-8　認証の二段構え（F-8）

要件は「Google アカウントでログイン」だが，そのまま作ると提出要件と正面衝突する．

#table(
  columns: (1fr, 1fr),
  align: (left, left),
  table.header([提出要件], [Google OAuth をそのまま入れた場合]),
  [審査員が `docker compose up` #text(weight: "bold")[だけ]で動かせること],
  [クライアント ID とシークレットが無いとログインできず，#text(weight: "bold")[投稿機能が 1 つも試せない]],
  [認証キーが必須の外部サービスを使わない], [Google の OAuth クライアントは必須キーそのもの],
  [公開リポジトリにシークレットを置かない], [`.env` を配ることもリポジトリに入れることもできない],
)

そこで #text(weight: "bold")[鍵が両方そろっていれば Google モード，欠けていればデモモード]という
二段構えにした．判定は起動時にサーバー側で 1 回だけ行い，結果を画面へ渡す．
#text(weight: "bold")[クライアント側で鍵の有無を判定しない．]

#point("デモモードでも全機能が動くことが「要件」")[
  投稿・写真のアップロード・コメント・行政操作まで，デモモードで全部試せる．
  ここを落とすと二段構えにした意味が無い．
  「できたらいい」ではなく#text(weight: "bold")[要件]として決めてある．
]

== 5-9　セッションを，このデータベースに縛る

セッションは JWT で，DB にセッションのテーブルを持たない．
テーブルとコードが 1 つ減るという利点があるが，#text(weight: "bold")[そのままでは穴があった]．

#caution("実測で見つかった穴（2026-08-27）")[
  別のデータベースで発行した「行政ユーザー」のトークンを，
  作り直した直後のデータベースへ持ち込んだところ，
  #text(weight: "bold")[そのまま行政操作（対応状況の更新）が通った]．
  トークンの中の利用者 ID はそのデータベースに存在すらしていなかった．
  権限の判定に使うロールと担当市町村も，トークン側の値だったからである．
  加えて，署名鍵が #text(weight: "bold")[公開リポジトリに書かれた固定値]だったので，
  中身を自分で組み立てて偽造することもできた．

  原因は 2 つ．利用者 ID が #text(weight: "bold")[ただの連番]なので，
  データベースを作り直すと同じ番号が別人に割り当たること．
  そして #text(weight: "bold")[Cookie はポート番号を区別しない]ので，
  同じ `localhost` の別インスタンス同士でも起きること．
]

対策は，#text(weight: "bold")[データベースに 1 行だけ置いたインストール ID]（起動時に UUID で決まる）を
使った二重の縛りである．

#table(
  columns: (auto, 1fr, 1fr),
  align: (left, left, left),
  table.header([], [何をするか], [何を防ぐか]),
  [①], [鍵が未設定なら，#text(weight: "bold")[署名鍵をインストール ID から導く]],
  [公開の固定鍵による偽造．別インストールのトークンは #text(weight: "bold")[復号すらできない]],
  [②], [発行時に ID を焼き込み，#text(weight: "bold")[毎回のリクエストで突き合わせる]],
  [人が鍵を固定して複数環境で共有していても，#text(weight: "bold")[データベースが違えば通らない]],
)

要点は #text(weight: "bold")[鍵を 1 つも設定していない環境で成り立つ]ことである．
審査員が `docker compose up` だけで動かす前提を崩さずに，穴を塞いでいる．
ID が読めないとき（データベースが落ちているとき）は #text(weight: "bold")[セッションを通さない]．
例外は投げない．認証はアプリの入り口で毎回通るので，投げると画面ごと 500 になるからである．

副作用として，`docker compose down -v` でボリュームごと作り直すと ID も変わり，
それ以前のログイン状態は無効になる．
作り直したのだから投稿もユーザーも消えており，実害は無い．

== 5-10　行政ロールの PIN（公開運用のときだけ）

デモモードはロールを自己申告できる．審査員が行政側の機能まで試せるようにするための建付けで，
#text(weight: "bold")[手元で動かすぶんには正しい]．
ところがインターネットに公開すると，同じ建付けのまま
#text(weight: "bold")[通りすがりの誰でも行政ロールで入り，対応状況を書き換えられる]．

そこで環境変数を 1 つ設けた．
#text(weight: "bold")[未設定（審査員の既定）なら何も変わらず]，設定した環境でだけ，
行政ロールを選ぶときに PIN の一致を要求する．
#text(weight: "bold")[一般ユーザーのログインには一切影響しない．]
公開時に守りたいのは行政だけが持つ操作であって，投稿そのものではないからである．

#point("PIN は短いので，総当たり対策を 2 段構えで入れてある")[
  #text(weight: "bold")[①] 失敗のたびに待たせる（連続失敗で指数的に伸ばし，8 秒で頭打ち）．
  #text(weight: "bold")[②] 連続 10 回失敗したら 60 秒は即座に断る．

  ① だけだと並列に投げられて意味が薄れるが，② を足すと並列でも 60 秒あたり 10 回までに絞れる．
  6 桁なら #text(weight: "bold")[10#super[6] ÷ 10 × 60 秒 ≒ 69 日]かかるので，発表期間の公開には十分である．
  比較そのものも，いったんハッシュに畳んでから定数時間で行っている
  （素直に比べると，応答時間から「何文字目まで合っているか」が漏れる）．
]

== 5-11　公開 URL をリクエストから決める

ログイン後のリダイレクト先も，Google のコールバック URL も，
#text(weight: "bold")[設定値ではなくリクエストが名乗ったホストから毎回導く]．
ホストは `X-Forwarded-Host` →（無ければ）`Host`，プロトコルは `X-Forwarded-Proto` である．

#caution("固定値をやめた理由 —— 実際に壊れた")[
  以前は `AUTH_URL=http://localhost:3000` を固定で渡していた．
  この方式は #text(weight: "bold")[「公開する住所を変えたら設定も直す」を人間が覚えている前提]で，
  実際に破れた．公開ポートを 3100 に変えたら，
  ログイン後に開いていない 3000 番へ飛ばされた．

  さらに，#text(weight: "bold")[設定を外しただけでは直らなかった]．
  `output: "standalone"` の Next.js は #text(weight: "bold")[待ち受けアドレスからリクエスト URL を組む]ので，
  素のままだと `http://0.0.0.0:3000/…` が渡り，リダイレクト先が `0.0.0.0` になる．
  #text(weight: "bold")[経路によって URL の決め方が違う]のがこの問題の厄介なところで，
  サーバーアクション（サインイン・サインアウト）はヘッダーを見るので設定 1 つで足りるが，
  `/api/auth/*` のルートハンドラはリクエスト URL を見るので，自分で組み直す必要がある．
]

`X-Forwarded-Port` は #text(weight: "bold")[見ない]．
Next.js がコンテナの中のポート（3000）を無条件に入れてしまうので，
当てにすると 3100 番で開いた人を 3000 番へ飛ばす．ポート番号はホスト側に付いてくる．

これで，公開ポートを変えても Tailscale Funnel の HTTPS で公開しても，
#text(weight: "bold")[設定を 1 つも足さずに正しいリダイレクト先になる]．
どうしても固定したい運用のために，設定すればそちらが勝つ逃げ道も残してある．

== 5-12　書き出し（CSV / GeoJSON）

投稿は，#text(weight: "bold")[画面で絞り込んだ条件そのまま]で CSV と GeoJSON に書き出せる．
CHIZUBA はオープンデータの上に住民の投稿を重ねるサービスなので，
#text(weight: "bold")[集めたものもオープンデータとして返せて初めて一往復になる]．
行政が出したものを住民が使うだけの一方通行にしない，という考え方である．

#table(
  columns: (auto, 1fr),
  align: (left, left),
  table.header([決めたこと], [なぜ]),
  [出すのは画面で誰でも読める項目と座標だけ],
  [#text(weight: "bold")[利用者 ID・メールアドレス・認証元の識別子は出さない]．画面に出していないものは書き出しにも出さない],
  [デモ投稿には印を付け，#text(weight: "bold")[その雨量は書き出さない]],
  [デモの雨量は数字を置いてあるだけのダミーで，観測値ではない．
   #text(weight: "bold")[観測値の顔をした列に入れると，受け取った人には見分けが付かない]],
  [CSV は UTF-8 の BOM 付き・CRLF],
  [Excel が既定の文字コードで開いても日本語が化けないようにするため（RFC 4180 に BOM を足した形）],
  [GeoJSON は RFC 7946 に従う],
  [座標は `[経度, 緯度]` の WGS84．座標系のメンバーは付けない（RFC 7946 は WGS84 に固定されている）],
  [`=` `+` `-` `@` で始まるセルの先頭に `'` を足す],
  [#text(weight: "bold")[表計算ソフトが投稿の本文を数式として実行するのを止める]．中身は変えない],
)

== 5-13　入力の健全性

「悪意のある入力で壊れないか」は質疑で来やすい．入れてあるのは次のとおりである．

#table(
  columns: (auto, 1fr),
  align: (left, left),
  table.header([入り口], [対策]),
  [写真], [形式（JPEG / PNG / WebP）・1 枚 5 MB・3 枚・1 リクエスト 10 MB．
    #text(weight: "bold")[申告された MIME だけでなく先頭バイトも検査する]．
    拡張子と Content-Type は書き換えられるため],
  [投稿の本文], [タイトル 60 文字・本文 1000 文字．#text(weight: "bold")[DB の CHECK 制約でも同じ上限を掛けている]],
  [座標], [千葉県の範囲に収まらない座標は受け付けない（DB の CHECK 制約でも縛る）],
  [所属市町村・雨量・公式フラグ], [#text(weight: "bold")[クライアントから受け取らない．]サーバーが決める],
  [カテゴリ固有の項目], [#text(weight: "bold")[定義に無いキーは捨てる．]
    実測でも，デモ投稿の印を偽って送っても付かないことを確認済み],
  [SQL], [すべてプレースホルダで渡す．文字列を組み立てて SQL に埋め込んでいる箇所は無い],
  [キーワード検索], [部分一致のワイルドカード（`%` `_`）を打ち消す．
    利用者が `%` を打っても「全部に当たる」ことはない],
  [CSV の書き出し], [数式として実行されうるセルを無効化する（5-12）],
  [行政ロール（公開時）], [PIN ＋ 総当たり対策（5-10）],
)

#caution("正直に言っておくこと")[
  投稿そのものの悪用対策——荒らし・なりすまし・大量投稿——は
  #text(weight: "bold")[ハッカソンのスコープ外として意図的に入れていない]．
  聞かれたら「入力の健全性は入れましたが，
  #text(weight: "bold")[投稿数のレート制限や通報の仕組みは未実装です]．
  実運用なら，まず 1 人あたりの投稿数の制限と，行政側の非表示操作から足します」と答える．
  #text(weight: "bold")[「対策済みです」と言い切らない]ことが大事である．
]

== 5-14　デモデータの扱い

初回起動時に，デモの投稿を #text(weight: "bold")[22 件]（危険箇所 7・浸水 5・観光おすすめ 10）入れてある．
空の地図では何も伝わらないためだが，#text(weight: "bold")[デモを実データに見せない]建付けを入れてある．

- 一覧と詳細に #text(weight: "bold")[デモのバッジ]を出す．利用者は投稿からこのバッジを詐称できない
- 浸水のデモに入れてある雨量は #text(weight: "bold")[気象庁の出典を出さず]，「デモ用のダミー値」とだけ表示する．
  過去の実測値は気象庁の配信からは取れないので，観測値のふりをさせない
- 写真はウィキメディア・コモンズの再利用可なものだけ．
  #text(weight: "bold")[防災の 7 枚は市外の参考写真]であり，市川市で実際に起きた被害の写真ではない旨を `/about` に明記している

浸水のデモ 5 件は #text(weight: "bold")[3 つの「雨のあった日」に散らして]ある．
全部が同じ日に固まっていると，期間で絞る操作を試せないためである．

// ============================================================================
= 想定質疑と模範回答
// ============================================================================

#block(width: 100%, fill: paper-tint, inset: 10pt, radius: 3pt)[
  #set text(size: 8.9pt)
  #set par(leading: 0.72em)
  答えは #text(weight: "bold")[3 〜 5 文]にしてある．質疑は 1 問あたり 30 秒程度で，
  それ以上話すと次の質問に行けない．
  #text(weight: "bold")[最初の 1 文で結論を言い，残りで根拠を 1 つか 2 つ足す]と収まる．
  分からないことを聞かれたら，#text(weight: "bold")[「そこは未実装です」と言い切ってから，
  代わりに何を入れたかを言う]．取り繕うと次の質問で崩れる．
]

== 仕組みと技術選定について

#qa(1, "F-4 の注意案内は「予測」ではないのですか")[
  予測ではありません．出しているのは#text(weight: "bold")[事実 2 つ]だけで，
  「過去にこの地域で浸水の報告が N 件あります」と
  「気象庁の予報では今後 24 時間の降水確率が最大 X% です」を並べているだけです．
  独自のモデルも推定も持っていません．
  #text(weight: "bold")[気象業務法]が気象庁以外の予報を許可制にしているので，
  「浸水するでしょう」に類する表現はコードにも画面にも入れていません．
  画面にも「浸水の予測ではありません」と明記しています．
]

#qa(2, "なぜ Google マップを使わないのですか")[
  API キーと課金アカウントが必須で，#text(weight: "bold")[審査員の環境で地図が出せなくなる]からです．
  加えて，このアプリの主役は国土地理院のタイルと国土交通省のハザードタイルを
  #text(weight: "bold")[重ねること]で，任意の XYZ タイルをそのままレイヤーにできる MapLibre のほうが素直です．
  MapLibre は BSD ライセンスのオープンソースなので，
  利用規約の変更で急に使えなくなる心配もありません．
]

#qa(3, "PostGIS を使えばもっと簡単だったのでは")[
  必要な地理演算が #text(weight: "bold")[矩形の範囲検索と 2 点間の距離だけ]なので，使いませんでした．
  どちらも緯度経度の数値カラムと Haversine 式で足ります．
  提出要件が「ベースイメージは可能な限り Docker 公式イメージ」と定めていて，
  PostGIS のイメージは公式ではないという理由もあります．
  PostGIS が要るのはポリゴンとの交差判定を DB でやりたいときですが，
  #text(weight: "bold")[ハザードマップはタイル画像として重ねるだけ]なので，その必要がありません．
]

#qa(4, "データベースの設計を説明してください")[
  #text(weight: "bold")[テーブルは 6 つ]です．市町村マスタ，ユーザー，投稿，投稿の写真，投稿へのコメント，
  それにインストール ID を 1 行だけ持つテーブルです．
  投稿は #text(weight: "bold")[危険箇所・浸水・観光おすすめを 1 テーブルにまとめて]いて，
  違いはカテゴリの値と，カテゴリ固有の項目を入れる JSON の列だけです．
  位置は緯度経度の数値カラムで，値域は DB の CHECK 制約でも縛っています．
  写真は実体をボリュームに置き，DB にはファイル名だけを記録しています．
]

#qa(5, "なぜ投稿を 1 つのテーブルにまとめたのですか")[
  #text(weight: "bold")[実装量が 3 倍にならない]ようにするためです．
  3 つに分けると API も 3 本，フォームも 3 つ，地図のレイヤーも 3 系統になり，
  一覧を出すたびに 3 本の問い合わせを束ねることになります．
  共通する部分——位置・写真・本文・投稿者・対応状況——が全体の 9 割を占めていました．
  そのうえで，地図で最初から表示する組と，ピンの色はカテゴリごとに分けてあります．
]

#qa(6, "スケールしますか．投稿が何万件になったら")[
  #text(weight: "bold")[今の作りは 1 市あたり数百件を想定した規模]です．
  地図の表示範囲・カテゴリ・期間で絞る列には索引を張ってあるので，
  数万件までは今のままで動くと思います．
  それ以上になるなら，まずベクタタイルへの切り替えと，
  ズームに応じた点の集約が要ります．
  #text(weight: "bold")[今は「動くこと」を優先し，先回りの最適化はしていません．]
]

#qa(7, "オフラインでも使えますか")[
  #text(weight: "bold")[使えません．]背景地図とハザードマップのタイルを外部から取るので，
  通信が無いと地図が出ません．
  ただし #text(weight: "bold")[外部サービスが落ちても止まらない]ようにはしてあります．
  施設のデータはアプリに同梱してあり，投稿は自前のデータベースにあるので表示できます．
  経路サービスが落ちたときは直線距離からの見積もりに切り替え，
  #text(weight: "bold")[見積もりであることを画面に出します．]
]

#qa(8, "テストは書きましたか")[
  #text(weight: "bold")[自動テストは書いていません．]
  代わりに，各段階の完了条件として
  #text(weight: "bold")[型検査・`docker compose up` での実操作・提出アーカイブの起動確認・
  秘匿情報のスキャン]の 4 つを毎回通しています．
  外部サービスが落ちたときの挙動は，通信を遮断した状態で実際に投稿して確かめました．
  #text(weight: "bold")[期間が 2 週間強で，テストを書く時間を機能の動作確認に振った]，というのが正直なところです．
]

#qa(9, "どこまで自分たちで作ったのですか")[
  外部から持ってきているのは #text(weight: "bold")[地図タイル・ハザードタイル・経路計算・気象データ]で，
  いずれも公的機関か非営利団体が公開しているものです．
  それらをどう組み合わせ，何を投稿の形にし，どこで線を引くかは自分たちで決めました．
  #text(weight: "bold")[実装には AI コーディングツールを使っています]が，
  設計判断——投稿を 1 テーブルにする，PostGIS を使わない，予報表現を入れない——は
  理由まで含めてドキュメントに残してあります．
]

== データと権利について

#qa(10, "写真の権利はどうしていますか")[
  デモに付けた写真も景観スポットの写真も，
  #text(weight: "bold")[ウィキメディア・コモンズで再利用が許されているもの]（CC0 / CC BY / CC BY-SA）だけを使っています．
  作者名とライセンスは画面に出していて，全 54 枚の一覧を `/about` に載せています．
  スポット名で検索すると #text(weight: "bold")[同名の別の場所が大量に混ざる]ので，
  座標か専用カテゴリで裏を取ったうえで，最後は目視で確認しました．
  防災のデモに付けた 7 枚は #text(weight: "bold")[市外の参考写真]で，市川市の被害写真ではない旨も明記しています．
]

#qa(11, "オープンデータの出典はどう扱っていますか")[
  出典の文言は #text(weight: "bold")[コードの 1 箇所にまとめて]あり，
  地図の隅と `/about` の両方が同じものを読んでいます．
  市川市のオープンデータは CC BY 4.0，ハザードマップと気象庁のデータは
  公共データ利用規約（第 1.0 版）です．
  気象庁のデータは #text(weight: "bold")[加工した旨も書く]ことが求められているので，
  「最寄りの観測所の抽出と距離の算出を行って表示している」と明記しています．
]

#qa(12, "個人情報はどう扱っていますか")[
  #text(weight: "bold")[メールアドレスと認証元の識別子は，画面にも API の応答にも一切出しません．]
  外へ出すのは表示名とロールだけです．
  CSV や GeoJSON への書き出しでも同じで，#text(weight: "bold")[画面に出していないものは書き出しにも出しません．]
  Google ログインで受け取ったメールアドレスは，行政ロールを付けるかどうかの判定にだけ使っています．
]

#qa(13, "投稿された雨量は，本当にその場所の値ですか")[
  #text(weight: "bold")[いいえ，最寄りのアメダスの値です．]
  市川市にはアメダスが無く，最寄りは船橋で約 10 km あります．
  そのため #text(weight: "bold")[観測所名と距離を必ず画面に併記]しています．
  「船橋アメダス（約 10.2 km）」という形です．
  20 km より遠い場合は，その地点の雨量として使わずに空欄にします．
]

== 運用と実用性について

#qa(14, "「千葉県全域」と言いますが，データは市川市だけでは")[
  #text(weight: "bold")[そのとおりで，デモデータは市川市だけです．]
  ただし #text(weight: "bold")[骨格は最初から全域対応]で作ってあります．
  市町村は 5 桁のコードで識別し，地図の初期表示の座標もズームも範囲も
  マスタのテーブルから引いていて，#text(weight: "bold")[コードに座標を書いていません．]
  市を 1 つ増やす作業は「マスタに 1 行足して，その市の CSV を GeoJSON にする」だけで，
  コードの変更を伴いません．
]

#qa(15, "デモモードだと誰でも行政ロールを名乗れるのでは")[
  #text(weight: "bold")[手元で動かすぶんには，そのとおりです．]
  審査員が投稿から行政の対応まで通しで試せるように，あえてそうしてあります．
  ただし #text(weight: "bold")[インターネットに公開するときは，行政ロールに PIN を要求する仕組み]を入れてあります．
  環境変数を 1 つ設定した環境でだけ有効になり，
  未設定なら何も変わりません．総当たり対策として，失敗ごとの待機と連続失敗のロックも入れています．
]

#qa(16, "荒らしや大量投稿への対策はありますか")[
  #text(weight: "bold")[未実装です．]
  入れてあるのは入力の健全性——写真の形式とサイズ，文字数の上限，
  座標の範囲，所属市町村をサーバーが決めること——までです．
  #text(weight: "bold")[投稿数のレート制限も，通報の仕組みも，行政による非表示操作もありません．]
  実運用に載せるなら，まず 1 人あたりの投稿数の制限と，行政側の非表示操作から足します．
]

#qa(17, "既存のハザードマップポータルと何が違うのですか")[
  ハザードマップポータルは #text(weight: "bold")[「想定」を見せるサイト]で，
  そこに #text(weight: "bold")[「今どうなっているか」は載りません．]
  CHIZUBA は同じタイルを重ねたうえに，住民が投稿した浸水と危険箇所を並べています．
  想定と実績を同じ地図で見られること，
  そして #text(weight: "bold")[集めた実績を CSV と GeoJSON で返せる]ことが違いです．
]

#qa(18, "市民報告型のサービスは既にありますが，違いは何ですか")[
  違いは 3 つあります．第 1 に，#text(weight: "bold")[防災と観光を同じ地図・同じ投稿の仕組みで扱っている]こと．
  第 2 に，#text(weight: "bold")[オープンデータの上に投稿を重ねている]ことで，
  避難場所や景観スポットといった既存のデータと，住民の投稿が同じ画面に並びます．
  第 3 に，#text(weight: "bold")[集めた投稿をオープンデータとして書き出せる]ことです．
  行政が出したものを住民が使うだけの一方通行にしない，というのが設計の軸です．
]

#qa(19, "行政が本当に運用できますか")[
  行政側に #text(weight: "bold")[専用の管理画面を作っていない]のが，この質問への答えです．
  職員も住民と同じ地図画面を使い，ログインすると出せる操作が増えるだけにしてあります．
  操作は #text(weight: "bold")[対応状況を 4 段階から選ぶことと，コメントを書くこと]の 2 つだけです．
  他市の投稿は触れないよう，担当市町村が一致するかをサーバー側で確かめています．
  ただし #text(weight: "bold")[職員アカウントの管理そのものはスコープ外]で，
  今は環境変数にメールアドレスを書く形にとどめています．
]

#qa(20, "災害のときに本当に動きますか")[
  #text(weight: "bold")[そこは正直に言うと，今の構成では保証できません．]
  自宅の Mac 1 台で動かしていて，冗長化もしていないので，
  停電や回線断があれば止まります．
  設計として入れてあるのは #text(weight: "bold")[「外部サービスが落ちても地図と投稿は出る」]ところまでで，
  施設のデータをアプリに同梱し，経路は直線距離の見積もりに切り替わるようにしてあります．
  実運用に載せるなら，まずホスティングの冗長化から必要です．
]

#qa(21, "実装で一番苦労したところはどこですか")[
  #text(weight: "bold")[セッションの穴]です．
  別のデータベースで発行したトークンを持ち込むと，
  そのデータベースに存在しない利用者として #text(weight: "bold")[行政操作が通ってしまう]ことが分かりました．
  Cookie がポート番号を区別しないので，同じ `localhost` でも起きます．
  データベースにインストール ID を 1 行置いて，
  #text(weight: "bold")[署名鍵をそこから導き，トークンにも焼き込んで毎回突き合わせる]二重の縛りで塞ぎました．
  #text(weight: "bold")[鍵を 1 つも設定していない環境でも成り立つ]ことが条件でした．
]

#qa(22, "これからどう発展させますか")[
  近いところでは，#text(weight: "bold")[投稿が溜まったときの使い道]です．
  どの地点がどの雨量で冠水したかというデータセットができるので，
  それを行政や研究者が使える形で渡すのが筋だと考えています．
  #text(weight: "bold")[CHIZUBA 自身が予測を出すつもりはありません]．
  そこは気象庁と自治体の仕事で，私たちがやるべきなのは
  #text(weight: "bold")[現場の記録を集めて，使える形にして返すこと]です．
]

// ============================================================================
= 用語集
// ============================================================================

質疑で出てきそうな語を，#text(weight: "bold")[1 〜 2 行で言えるように]まとめてある．
「それは何ですか」と聞き返されたときに，ここの言い方をそのまま使えばよい．

== ウェブとサーバー

#term("App Router")[Next.js の画面とサーバーの API を，同じディレクトリ構成の中に並べて書ける仕組み．]
#term("サーバーコンポーネント")[サーバー側でだけ実行される画面の部品．ブラウザへは結果の HTML だけが届くので，鍵や DB の接続情報がブラウザに漏れない．]
#term("ルートハンドラ")[`/api/…` のような URL に対して，サーバー側で動く関数．CHIZUBA では投稿・気象・経路・写真の 4 系統がある．]
#term("多重定義（multipart）")[写真のようなファイルと文字を，1 回の送信にまとめて詰める形式．投稿はこの形で送っている．]
#term("User-Agent")[「どのソフトが要求したか」を名乗るヘッダー．OSRM の利用規約が正しく名乗ることを求めている．]
#term("レート制限")[単位時間あたりの要求回数の上限．OSRM は 1 秒 1 回で，CHIZUBA はサーバー側の順番待ちで守っている．]
#term("キャッシュ")[取ってきた結果をしばらく手元に置いて，同じ要求で外部へ行かないようにすること．寿命（TTL）を決めて持つ．]
#term("タイムアウト")[応答を待つ上限時間．超えたら諦める．外部が落ちたときに画面が固まらないために要る．]
#term("リバースプロキシ")[利用者と本体のあいだに立って要求を転送するもの．元のホスト名を `X-Forwarded-Host` などで伝える．]
#term("TLS 終端")[暗号化された通信（HTTPS）を途中で復号すること．Tailscale Funnel はここで復号して，中は素の HTTP で本体へ渡す．]

== 認証とセキュリティ

#term("OAuth")[「Google のアカウントで入る」を実現する規格．パスワードを渡さずに，本人であることだけを別のサービスに証明してもらう．]
#term("JWT")[署名付きの小さなデータ．中身は誰でも読めるが，#text(weight: "bold")[署名があるので書き換えると分かる]．CHIZUBA のセッションはこの形．]
#term("Cookie")[ブラウザがサーバーから預かって毎回送り返す小さなデータ．#text(weight: "bold")[ポート番号を区別しない]という性質が，5-9 節の穴の原因になった．]
#term("署名鍵")[JWT の署名を作る秘密の値．これが漏れるとトークンを偽造できる．CHIZUBA は DB のインストール ID から導いている．]
#term("ハッシュ（SHA-256）")[任意の長さのデータを，決まった長さの値に潰す一方向の計算．元に戻せない．]
#term("タイミング攻撃")[比較にかかる時間の差から秘密を推測する攻撃．素直に文字列を比べると「何文字目まで合っているか」が漏れる．]
#term("プレースホルダ")[SQL に値を埋め込むのではなく，別枠で渡す書き方．#text(weight: "bold")[SQL インジェクションを防ぐ基本]で，CHIZUBA は全箇所これ．]
#term("マジックバイト")[ファイルの先頭にある，形式を示す決まったバイト列．申告された形式が嘘でも，ここを見れば分かる．]
#term("CSV インジェクション")[CSV のセルが表計算ソフトで数式として実行される問題．先頭に `'` を足して無効化する．]

== 地図とデータ

#term("XYZ タイル")[地図を正方形の画像に切り分けて，ズーム・列・行の 3 つの番号で取り出す方式．国土地理院もハザードマップも，この形で配信している．]
#term("ラスタタイル")[画像として配られるタイル．重ねるだけで表示できるが，中の値（浸水深など）をプログラムから読むことはできない．]
#term("ベクタタイル")[点や線の座標として配られるタイル．拡大しても綺麗だが，作るのに手間がかかる．CHIZUBA では使っていない．]
#term("GeoJSON")[位置つきのデータを表す JSON の標準形式．CHIZUBA は #text(weight: "bold")[静的データも投稿も同じこの形]で扱う．]
#term("FeatureCollection")[GeoJSON で「地物の集まり」を表す入れ物．投稿の一覧はこの形で返る．]
#term("WGS84")[GPS で使われている世界共通の座標系．GeoJSON はこれに固定されている．]
#term("bbox（矩形）")[「西・南・東・北」の 4 つの数で表す長方形の範囲．地図の表示範囲で投稿を絞るのに使う．]
#term("Haversine 式")[球面上の 2 点間の距離を求める式．アメダスまでの距離も，最寄りの避難場所を探すのもこれ．]
#term("JIS X 0402")[市区町村を表す 5 桁のコードの規格．市川市は 12203．CHIZUBA は全域対応の鍵としてこれを使う．]
#term("Okabe-Ito")[色覚多様性に配慮した配色として国内で実績のある 8 色の組．地図の点も凡例もこれで塗っている．]
#term("NFKC 正規化")[全角と半角，大文字と小文字などの見た目の違いをそろえる変換．検索が「ｱﾝﾀﾞｰﾊﾟｽ」でも当たるのはこれのおかげ．]

== Docker とデータベース

#term("イメージ／コンテナ")[イメージは実行に必要なものを固めた型で，コンテナはそれを動かした実体．]
#term("Docker 公式イメージ（DOI）")[Docker 社が品質を確認して配布しているイメージ．提出要件が「可能な限りこれを使う」と定めている．]
#term("multi-stage ビルド")[「依存の取得」「ビルド」「実行」を別の段に分ける書き方．#text(weight: "bold")[実行イメージに開発用の道具を持ち込まない]ためにする．]
#term("healthcheck")[コンテナが「使える状態か」を定期的に確かめる仕組み．`db` は `pg_isready` で確かめている．]
#term("depends_on: service_healthy")[相手の healthcheck が通るまで自分を起動しない指定．DB の準備が済む前に web が繋ぎに行くのを防ぐ．]
#term("ボリューム")[コンテナを作り直しても消えない保存領域．CHIZUBA は DB のデータと投稿写真の 2 つを持っている．]
#term("ORM")[SQL の代わりにプログラムの言葉で DB を操作する道具．#text(weight: "bold")[CHIZUBA は入れていない]（依存を増やさず，ビルドが壊れる余地も作らないため）．]
#term("トランザクション")[複数の書き込みを「全部成功か，全部無かったことにするか」のどちらかにまとめる仕組み．投稿の作成で使っている．]
#term("インデックス（索引）")[特定の列で速く探せるようにする仕組み．CHIZUBA は緯度・経度・市町村・カテゴリ・投稿日時に張っている．]
#term("CHECK 制約")[列に入れてよい値を DB 側で縛る仕組み．文字数や座標の範囲を，プログラムと DB の両方で確かめている．]
#term("jsonb")[PostgreSQL が JSON を効率よく保存する型．カテゴリ固有の項目をここに入れている．]

== 気象と法令

#term("アメダス")[気象庁の地域気象観測システム．観測所は全国に約 1,300 地点あり，10 分ごとに値が配信される．#text(weight: "bold")[すべての地点が雨量を測っているわけではない]（風だけの地点もある）．]
#term("予報区")[天気予報を出す区域の単位．#text(weight: "bold")[市町村より粗く]，千葉県は北西部・北東部・南部の 3 区分．]
#term("降水確率")[その時間帯に 1 mm 以上の雨が降る確率．気象庁が 6 時間ごとに 10% 刻みで出す．]
#term("気象業務法")[気象庁以外が予報を業として出すことを許可制にしている法律．#text(weight: "bold")[F-4 が事実の提示に留まっている理由．]]
#term("公共データ利用規約（第 1.0 版）")[国の機関のデータを出典明記で使える規約．ハザードマップと気象庁のデータがこれ．]
#term("CC BY 4.0")[出典を明記すれば自由に使えるクリエイティブ・コモンズのライセンス．市川市のオープンデータがこれ．]
#term("ODbL")[OpenStreetMap のデータのライセンス．徒歩経路の道路データがこれにあたる．]

// ============================================================================
= 数字の早見表
// ============================================================================

#block(width: 100%, fill: warn-tint, inset: 10pt, radius: 3pt, stroke: (left: 2.5pt + orange))[
  #set text(size: 8.9pt)
  #set par(leading: 0.72em)
  #text(font: FONT_SANS, weight: "bold", fill: rgb("#8a5a00"))[このページだけは直前に見ておく．]
  質疑で数字を間違えると，そこから先の話がすべて疑われる．
  #text(weight: "bold")[分からない数字は「正確な数は手元の資料にあります」と言えばよく，推測で答えない．]
]

== データの件数

#table(
  columns: (1fr, auto, 1fr, auto),
  align: (left, right, left, right),
  table.header([項目], [数], [項目], [数]),
  [指定緊急避難場所], [123], [デモ投稿（合計）], [22],
  [AED 設置箇所], [304], [　うち危険箇所], [7],
  [子育て施設], [388], [　うち浸水], [5],
  [景観 100 選], [100], [　うち観光おすすめ], [10],
  [　うち写真つき], [54], [デモ投稿の写真], [17],
)

== 構成と規模

#table(
  columns: (1fr, auto, 1fr, auto),
  align: (left, right, left, right),
  table.header([項目], [数], [項目], [数]),
  [コンテナ], [2], [機能（F-1 〜 F-8）], [8],
  [名前つきボリューム], [2], [投稿のカテゴリ], [3],
  [データベースのテーブル], [6], [対応状況の段階], [4],
  [ハザードのレイヤー], [3], [ユーザーのロール], [3],
  [TypeScript の行数（`app/src`）], [約 10,600], [`db/init` の SQL], [約 370 行],
)

== 上限としきい値

#table(
  columns: (1fr, auto, 1fr, auto),
  align: (left, right, left, right),
  table.header([項目], [値], [項目], [値]),
  [写真 1 枚], [5 MB], [タイトル], [60 字],
  [写真の枚数], [3 枚], [本文], [1000 字],
  [1 リクエスト], [10 MB], [コメント], [500 字],
  [一覧の既定件数], [500 件], [表示名], [30 字],
  [一覧の上限件数], [1000 件], [検索語], [40 字],
)

== 外部サービスとの約束

#table(
  columns: (auto, 1fr),
  align: (left, left),
  table.header([項目], [値]),
  [注意案内を出す降水確率], [#text(weight: "bold")[30%]（今後 24 時間の最大値）],
  [アメダスの最大距離], [#text(weight: "bold")[20 km]．市川市の最寄りは船橋で約 10 km],
  [キャッシュの寿命], [アメダス実況 10 分／府県予報 30 分／観測所一覧・地域区分 24 時間],
  [気象庁のタイムアウト], [5 秒],
  [OSRM の間隔とタイムアウト], [1.1 秒に 1 回／8 秒],
  [ハザードタイルのズーム], [配信は 2 〜 17．#text(weight: "bold")[6 より引いたら描かない]],
  [ハザードの不透明度], [既定 0.6（0.1 〜 1.0 の範囲で変えられる）],
  [PIN の総当たり対策], [失敗ごとに最大 8 秒待機／連続 10 回で 60 秒ロック],
)

== 覚えておく固有の値

#table(
  columns: (auto, 1fr),
  align: (left, left),
  table.header([項目], [値]),
  [市川市の市町村コード], [`12203`（JIS X 0402）],
  [公開ポート], [`3000`（`CHIZUBA_PORT` で変えられる．変えても他に直す設定は無い）],
  [ベースイメージ], [`node:22-slim` ／ `postgres:17-alpine`（どちらも Docker 公式イメージ）],
  [コード提出の締切], [#text(weight: "bold")[2026-09-09（水）17:00]],
  [プレゼン資料の締切], [#text(weight: "bold")[2026-09-16（水）11:50]（発表 10 分 + 質疑 3 分）],
)

#v(1.2em)
#block(width: 100%, fill: blue-tint, inset: 11pt, radius: 3pt, stroke: (left: 2.5pt + blue))[
  #text(font: FONT_SANS, size: 9.5pt, weight: "bold", fill: rgb("#0b4c76"))[質疑で困ったときの 3 つの型]
  #v(0.3em)
  #set text(size: 9pt)
  #set par(leading: 0.75em)
  #text(weight: "bold")[① 未実装を聞かれたら]——「そこは未実装です．代わりに◯◯までは入れました．
  実運用に載せるなら，まず××から足します」．

  #text(weight: "bold")[② 精度や正確さを聞かれたら]——「その値は◯◯由来で，
  画面にも出典と条件を出しています」．#text(weight: "bold")[断定しないことが誠実さになる]．

  #text(weight: "bold")[③ 知らないことを聞かれたら]——「そこは確認していません」と言い切る．
  #text(weight: "bold")[推測で答えると，次の質問で必ず崩れる．]
]

#v(1.4em)
#line(length: 100%, stroke: 0.5pt + line-color)
#v(0.7em)
#block(width: 100%)[
  #set text(size: 8.5pt, fill: muted)
  #set par(leading: 0.75em)
  #text(font: FONT_SANS, size: 9pt, weight: "bold", fill: ink)[もっと詳しく知りたくなったら]
  #v(0.2em)
  #table(
    columns: (auto, 1fr),
    stroke: none,
    inset: (x: 0pt, y: 3pt),
    [`docs/presentation/chizuba-overview.progfocus.md`], [本書の図の正本．prog-focus に取り込むと，ノード 38・接続 34 の図として開ける],
    [`docs/design/requirements.md`], [#text(weight: "bold")[何を作るかの正本．]機能 F-1 〜 F-8・データモデル・認証・実装順序],
    [`docs/design/interfaces.md`], [つなぎ目の正本．API の形式と，#text(weight: "bold")[異常時の約束]],
    [`.agent/architecture.md`], [システム構成と設計判断の一覧],
    [`app/README.md`], [動かし方と#text(weight: "bold")[既知の制約]],
    [`課題/2026-09-09_CODIHA2026_提出要件.md`], [#text(weight: "bold")[提出要件の正本．]締切・0 点条件・審査基準],
  )
  #v(0.5em)
  この PDF は `chizuba-tech-explainer.typ` から
  `typst compile chizuba-tech-explainer.typ` で作り直せる．
]
