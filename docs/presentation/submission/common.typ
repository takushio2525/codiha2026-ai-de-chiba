// CODIHA 2026 提出用・説明資料 2 種で共有する体裁と部品．
//
// 提出要件の正本は `課題/2026-09-09_CODIHA2026_提出要件.md`「説明資料の仕様」．
//   資料① サービスの概要        … スライド形式・5 ページ以内（01-service-overview.typ）
//   資料② 必要機能と実装の対応表 … 表形式・ページ制限なし（02-feature-implementation-table.typ）
//
// 句読点は全角「，」「．」で統一する（提出資料の規約）．
// 画面・readme.txt から引用した文言だけは原文のままにしてある．
//
// 日本語フォントは macOS 標準の Hiragino を第一候補にしてある．
// 別の環境で組むときは FONT_SERIF / FONT_SANS / FONT_MONO を書き換える:
//   FONT_SERIF → ("Noto Serif CJK JP",)  FONT_SANS → ("Noto Sans CJK JP",)
//   FONT_MONO  → ("DejaVu Sans Mono",)

#let FONT_SERIF = ("Hiragino Mincho ProN", "Hiragino Mincho Pro")
#let FONT_SANS = ("Hiragino Kaku Gothic ProN", "Hiragino Sans")
#let FONT_MONO = ("Menlo",)

// Okabe-Ito（色覚多様性に配慮した配色）．アプリ本体と同じ色を使っている
// （`app/src/app/globals.css` の @theme・`app/src/lib/layers.ts`）．
#let ink = rgb("#1a1d21")
#let muted = rgb("#5b626b")
#let line-color = rgb("#d3d8de")
#let blue = rgb("#0072b2") // 行政・避難場所
#let orange = rgb("#e69f00") // 危険箇所
#let sky = rgb("#56b4e9") // 浸水
#let green = rgb("#009e73") // 子育て施設
#let vermilion = rgb("#d55e00") // AED
#let pink = rgb("#cc79a7") // 観光おすすめ
#let paper-tint = rgb("#f4f6f8")
#let blue-tint = rgb("#eaf3fa")
#let warn-tint = rgb("#fdf3e3")
#let deep = rgb("#0b4c76")

#let LOGO = "/app/src/app/icon.svg"

/// 資料の共通メタ．表紙・フッターの表記をここ 1 箇所で持つ
#let EVENT = "CODIHA 2026 ハッカソン部門"
#let TEAM = "愛で千葉は救えるのか"
#let PRODUCT = "CHIZUBA"

/// 見出しつきの色帯（機能 ID などの小さな札）
#let chip(body, fill: blue) = box(
  fill: fill,
  inset: (x: 4pt, y: 1.5pt),
  outset: (y: 1.5pt),
  radius: 2pt,
)[#text(font: FONT_SANS, size: 7pt, weight: "bold", fill: white)[#body]]

/// 枠つきの注記
#let note(body, fill: blue-tint, stroke-color: blue) = block(
  width: 100%,
  fill: fill,
  inset: (x: 8pt, y: 6pt),
  radius: 3pt,
  stroke: (left: 2.5pt + stroke-color),
)[#body]
