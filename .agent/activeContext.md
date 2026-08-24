# 現在の作業文脈

> **書き方**: ここには「**今の状態**」だけを書く。作業のたびに**上書き**する。
> 過去にやったことは `progress.md` に追記し、ここには残さない。
> **80 行を超えたら太りすぎ。** 過去の話を `progress.md` へ逃がす。

## 現在の対象

**プロダクトの中身はまだ未確定。ただし土台は動く状態になった。**
`app/` に地図アプリの骨格があり、`cd app && docker compose up` →
<http://localhost:3000> で市川市の避難場所 123 件・AED 304 件・子育て施設 388 件が
地図に出て、現在地からの徒歩経路も引ける。**次に決めるのは「何の課題を解くか」**で、
決まったらこの土台の上に載せる。

## 直近の観点

「そのデータがあるから解ける課題」に落とし込む。データ側の手がかりは
`data/analysis/findings.md`（市川市は町丁字で**高齢化率が 6.6 倍**ちがう／
避難場所は全地区 839m 以内で**箱の量は足りている**／AED が 0 箇所の地区が 96）。

審査は「オープンデータの活用 / 新規性 / 有効性と実現性 / 資料とプレゼン / コード」の 5 項目。
**コードは実装割合 × 動作割合の掛け算**なので、9/9 までに Docker で確実に動く範囲に
収まるスコープかを同時に見る。土台が動いているぶん、載せる機能は絞れる。

## 次の一手

1. 課題候補とオープンデータの組を出し、**プロダクトを 1 つに決める**
2. 決まったら `AGENTS.md` の「誰が使うか」を埋め、`docs/design/assignments.md` に担当を書く
3. 機能を足すときは `app/src/lib/layers.ts`（レイヤー定義）から。
   データを増やすなら `data/scripts/build_geojson.py` に変換を足す
4. 提出物のうち **`readme.txt`・説明資料 PDF 2 種はまだ無い**。9/9 に向けて作る

## 現フェーズで読むべきドキュメント

- **アイデア出し / 提出物の判断**: `課題/2026-09-09_CODIHA2026_提出要件.md`（**正本**）
- **データから課題を立てる段**: `data/analysis/findings.md`、
  `data/chiba-pref/SOURCE.md`, `data/ichikawa-city/SOURCE.md`（出典・ライセンス・落とし穴）
- **アプリに手を入れる段**: `app/README.md`（動かし方・**既知の制約**）、
  `.agent/architecture.md`（構成とデータ形式）、`.agent/conventions.md`
- **担当とつなぎ目を決める段**: `docs/before_coding.md`, `docs/design/assignments.md`,
  `docs/design/interfaces.md`

## 決まっていること（変わりにくい前提）

| 項目 | 内容 |
|---|---|
| イベント | CODIHA 2026 ハッカソン部門・千葉工業大学会場（2026-08-24 開始） |
| チーム | 愛で千葉は救えるのか |
| **コード提出** | **2026-09-09（水）17:00** — `app/` を丸ごと zip / 7z ＋ 説明資料 PDF 2 種 |
| **プレゼン資料提出** | **2026-09-16（水）11:50** — PowerPoint・16:9・発表 10 分 + 質疑 3 分 |
| 実行環境 | Docker（`docker compose up`）。`node:22-slim`（DOI）の multi-stage・コンテナ 1 つ |
| 実装 | Next.js（App Router）+ TypeScript / MapLibre GL JS / Tailwind CSS v4 / lucide-react |
| 外部サービス | 国土地理院タイル・OSRM（FOSSGIS）。**どちらも認証キー不要**。キーが要るものは使わない |
| データ | DB なし。市川市 CSV → GeoJSON にして `app/public/data/` に同梱 |
| 提出単位 | `app/` 配下のみ。**日本語ファイル名禁止**。`readme.txt` / `Dockerfile` / `compose.yaml` 必須 |
| 提出経路 | ハッカソン Slack のチーム用プライベートチャンネル（チーム代表者が投稿） |
| リポジトリ | **public**。氏名・学籍番号・配布資料・API キーを置かない |
| その他 | 個別相談 9/3・9/4（1 チーム 30 分・Google Meet）。UI/UX デザインは Moqups |
