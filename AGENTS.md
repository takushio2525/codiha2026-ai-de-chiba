# AGENTS.md — AI 開発支援ツール向けの指示

このファイルは **AI（Claude Code / Codex / Cursor / Cline など）がこのリポジトリで
作業するときに最初に読む入口**。人間が読んでも構わない。

主要な AI ツールはリポジトリ直下の `AGENTS.md` を自動で読む。
Claude Code 用の `CLAUDE.md` は、このファイルへのリダイレクト 1 行だけにしてある。

---

## プロジェクト概要

- **何を作るか**: **CHIZUBA**（**CHI**ba + **ZU**（地図）+ **BA**（場））。
  千葉県の地図系サービスを 1 つに束ね、**住民と行政が相互に情報を投稿できる**ウェブサイト。
  柱は**防災**（ハザードマップ・老朽化/危険箇所の市民報告・浸水報告・注意案内）と
  **観光**（景観スポット・周遊ルート・おすすめ投稿）の 2 つ。
  **対応は千葉県全域、デモデータは市川市**（市町村はコードでパラメータ化する）。
  既にある**地図 × オープンデータの土台**（`app/`。市川市の避難場所・AED・子育て施設を
  地図に重ね、徒歩経路を出す）の上に載せる。
  **機能・ロール・実装順序の正本は `docs/design/requirements.md`**
- **誰が使うか**: **千葉県の住民**（危険箇所や冠水を現場から報告し、ハザードマップと
  周辺の投稿を見る）、**来訪者**（景観スポットとお土産を探す・投稿する）、
  **自治体職員**（投稿に公式コメントを付け、対応状況を更新し、おすすめを発信する）。
  **閲覧はログイン不要**、投稿にだけログインが要る
- **イベント**: ちばオープンデータアイデアソン・ハッカソン（CODIHA）2026・ハッカソン部門
- **チーム**: 愛で千葉は救えるのか（担当は `docs/design/assignments.md`）

### 締切（厳守・遅れたら採点されない）

| 期日 | 提出物 |
|---|---|
| **2026-09-09（水）17:00** | コード（作業ディレクトリの zip / 7z ＋ 説明資料 PDF 2 種） |
| **2026-09-16（水）11:50** | プレゼン資料（PowerPoint・16:9） |

**提出要件の正本は `課題/2026-09-09_CODIHA2026_提出要件.md`。**
提出物・0 点条件・審査基準の判断は必ずこのファイルを見てから行う。
このファイルと他のドキュメントが食い違ったら、**課題 md を勝たせる**。

## 言語

**すべて日本語で書く。** コードのコメント・コミットメッセージ・
ドキュメント・PR の説明文すべて。

---

## 技術スタック

| 領域 | 技術 | 場所 |
|---|---|---|
| サービス本体 | **Next.js（App Router）+ TypeScript**。Docker 公式イメージ `node:22-slim` の multi-stage で `docker compose up` 一発起動 | `app/` |
| データベース | **PostgreSQL 17**（`postgres:17-alpine`・DOI）。住民・行政の投稿を保存する。`depends_on` + `healthcheck` で待ち合わせ。**PostGIS は使わない**（緯度経度の数値カラム） | `app/db/init/` |
| 認証 | **Auth.js（NextAuth）+ Google OAuth**。**キー未設定の環境では自動でデモログインに落ちる**ので、審査員は `docker compose up` だけで投稿機能まで試せる | `app/src/lib/auth.ts` |
| 地図 | **MapLibre GL JS** + 国土地理院「淡色地図」タイル（**認証キー不要**） | `app/src/components/MapView.tsx` |
| 徒歩経路 | **OSRM**（FOSSGIS e.V. 提供・**認証キー不要**）。サーバー側 API で中継し、UA 明示と 1 秒 1 リクエストの制限を守る | `app/src/app/api/routing/` |
| ハザードマップ | 国土交通省**ハザードマップポータルサイト「重ねるハザードマップ」のラスタタイル**（洪水・高潮・津波・**認証キー不要**）。ブラウザが直接読む | `app/src/lib/hazards.ts` |
| 気象 | **気象庁 防災情報 JSON**（アメダス実況・府県予報・**認証キー不要**）。サーバー側で中継しキャッシュする | `app/src/app/api/weather/`・`app/src/lib/jma.ts` |
| 見た目 | Tailwind CSS v4 + lucide-react（アイコンは SVG。絵文字は使わない） | `app/src/` |
| データ整形 | Python（標準ライブラリのみ）。市川市 CSV → GeoJSON | `data/scripts/build_geojson.py` |

**認証キーが要る外部サービス（Mapbox 等）は使わない。**
唯一の例外が Google OAuth で、**キーが未設定なら自動でデモログインに切り替わる**構成にしてある
（詳細は `docs/design/requirements.md` §8）。
審査員の環境で追加設定なしに動くことを最優先にしている。
ベースイメージは Docker 公式イメージ（DOI）、タグは固定する（`latest` を使わない）。

## 重要なパス

| パス | 何があるか |
|---|---|
| `課題/2026-09-09_CODIHA2026_提出要件.md` | **提出要件の正本**。締切・0 点条件・審査基準・readme.txt の書式 |
| `docs/design/requirements.md` | **何を作るかの正本**。機能一覧（F-1〜F-8）・ユーザーロール・投稿モデル・画面一覧・**実装順序** |
| `app/` | **提出するサービス本体**（CHIZUBA）。ここを丸ごと zip 化して提出する。動かし方と既知の制約は `app/README.md` |
| `app/src/app/icon.svg` | **ロゴの正本**。タブアイコン・`favicon.ico`・`apple-icon.png` はこれから起こす。画面の中のロゴは `app/src/components/BrandMark.tsx` に同じ図形を写してあるので、**変えるなら必ず両方** |
| `app/src/lib/layers.ts` | 地図に載せるレイヤーの定義（データ・色・ポップアップ項目）。**データを足すならここから** |
| `app/src/lib/scenic.ts` | 景観スポット（景観100選・F-5）の定義。カテゴリの色と、**MapLibre が配列プロパティを文字列に畳む**問題を吸収する読み取り |
| `app/src/lib/scenicPhotos.ts` | 景観スポットの**写真と出典**（54 / 100 か所）。**自動生成物なので直接編集しない**（`data/scripts/fetch_scenic_photos.py` → `build_scenic_photos_ts.py`）。実体は `app/public/images/scenic/` |
| `app/src/lib/mapModes.ts` | 防災モード（S-1）と観光モード（S-2）で**最初から表示する組**。切り替えても地図は作り直さない |
| `app/src/lib/hazards.ts` | ハザードマップ（浸水想定）のタイル定義と**浸水深の凡例**。洪水と津波・高潮で段階が違う |
| `app/src/lib/reports.ts` | **投稿の定義**（カテゴリ・色・固有項目・文字数と写真の上限）。**カテゴリを増やすならここに 1 行足す** |
| `app/src/lib/weather.ts` | 気象データの**共通の型と表示**（ブラウザからも読む）。**注意案内 F-4 を出す条件（`buildFloodAlert`）と降水確率のしきい値**もここ |
| `app/src/lib/jma.ts` | 気象庁 JSON の**取得とキャッシュ**（サーバー専用）。上流 URL・観測所の選び方・落とし穴 |
| `app/src/app/api/reports/` | 投稿 API（一覧・作成・詳細・**更新**・削除・コメント・**書き出し**）。読み書きの SQL は `app/src/lib/reportStore.ts` |
| `app/src/lib/reportRange.ts` | 投稿日の範囲（浸水実績アーカイブ）。**JST の暦日で扱う**約束と期間の近道 |
| `app/src/lib/reportExport.ts` | CSV / GeoJSON の書き出し。**出す項目と出さない項目の線**・デモ投稿の雨量を出さない理由 |
| `app/src/lib/searchText.ts` | キーワードの文字そろえ（NFKC + 小文字）。DB 側も同じ変換を SQL で行う |
| `app/src/lib/installId.ts` | **このインストールを識別する値。** セッションをこの DB に縛る（別環境の JWT を通さない） |
| `app/src/lib/credits.ts` | 出典（クレジット）の正本。地図の隅と `/about` の両方がここを見る |
| `app/db/init/*.sql` | **DB スキーマの正本**。`db` の初回起動時だけ流れる（変えたら `docker compose down -v`） |
| `app/src/lib/auth.ts` | 認証。**Google モードとデモモードの分岐はここ 1 箇所**。`.env.example` に環境変数の一覧 |
| `app/src/lib/publicOrigin.ts` | **公開 URL をリクエストのヘッダーから導く**（`AUTH_URL` の固定値をやめた理由と実測もここ）。`/api/auth/*` のルートハンドラが使う |
| `app/src/lib/photoStore.ts` | 投稿写真の実体（`uploads` ボリューム）。**置き場は作業ディレクトリ直下に固定**している |
| `data/scripts/build_geojson.py` | 市川市 CSV → `app/public/data/*.geojson` の変換（cp932・市域外座標の除外） |
| `docs/before_coding.md` | **開始前に決めること**（担当の切り方・つなぎ目・public/private の線引き） |
| `docs/design/assignments.md` | 担当表。誰が何を持っているか |
| `docs/design/interfaces.md` | **コンポーネント間のデータ形式**。ここを変える変更は影響が広い |
| `docs/presentation/審査基準_主張と根拠.md` | **審査 5 項目ごとの主張と根拠**（ターゲット・スライド構成案・弱点と返し方）。出典はすべて一次資料まで遡って確認済みで、末尾に**リンク検証台帳**がある。プレゼン資料を作るときはここから読む |
| `data/analysis/findings.md` | **取得したオープンデータの所見**。アイデア出しはここから読む |
| `data/` | 取得したオープンデータ（`<ソース>/raw/`）・取得スクリプト・分析（`data/README.md` に規約） |
| `assets/` | オープンデータの検討用サンプル・データ形式のメモ |
| `tools/package_submission.sh` | **提出アーカイブの生成と検証**。`dist/` に 7z を作り、展開し直して提出要件（必須ファイル・日本語名・キャッシュ混入）を確認する |
| `tools/verification/` | 評価指標の計測・判定 |
| `deploy/selfhost/` | **自宅の Mac で公開する一式**（Tailscale Funnel）。手順書・`setup.sh`・QR 生成。**提出アーカイブには入らない** |
| `.agent/` | AI 向けの詳細仕様と作業文脈（下記） |
| `CONTRIBUTING.md` | Git の使い方・開発ルール（人間向けの正本） |

## よく使うコマンド

```bash
# サービスの起動（審査員もこれだけ。http://localhost:3000）
cd app && docker compose up

# 3000 番が塞がっているときだけ公開ポートを変える（他に直す設定は無い）
cd app && CHIZUBA_PORT=3100 docker compose up

# UI をいじるとき（ホットリロード。Node.js 22 以上が必要）
cd app && npm install && npm run dev

# 型チェック
cd app && npm run typecheck

# 市川市 CSV → 地図用 GeoJSON（app/public/data/ に出力）
python3 data/scripts/build_geojson.py

# データベースの中を覗く（db はホストにポートを公開していない）
cd app && docker compose exec db psql -U chizuba -d chizuba

# スキーマを変えたあと（初期化 SQL はボリュームが空のときだけ流れる）
# -v は投稿写真（uploads ボリューム）も一緒に消すので注意
cd app && docker compose down -v && docker compose up

# 投稿写真の置き場を覗く
cd app && docker compose exec web ls -l /app/uploads

# 秘匿情報スキャン（コミット前に実行できる）
bash .github/scripts/secret_scan.sh

# 提出アーカイブを作って検証（dist/ に出力。NG が 1 つでもあればアーカイブを消して非 0 終了）
bash tools/package_submission.sh
bash tools/package_submission.sh --smoke   # ＋ 展開先で実際に起動して HTTP 200 まで確認する

# 評価用ログの判定
python tools/verification/evaluate.py --input tools/verification/results/run.csv

# オープンデータの取得と分析（詳細は data/README.md, data/analysis/README.md）
python3 data/scripts/fetch_datasets.py
for s in data/analysis/scripts/0*.py; do data/analysis/.venv/bin/python "$s"; done
```

---

## 守ってほしいこと

### 1. 個人情報・著作物を絶対にコミットしない

**このリポジトリは public。**

- 氏名・学籍番号・学内メールアドレス・評価情報を書かない（**ファイル名にも入れない**）
- 配布資料（授業スライド・課題 PDF）など著作権のあるものを追加しない。
  `課題/` に置いてよいのは、要点を自分たちで抽出した md だけ
- API キー・トークン・パスワードを書かない
- **提出用 `readme.txt` には氏名と所属を書く必要があるが、それは提出直前に手元で書く。
  リポジトリにはコミットしない**

判断ルール: **氏名・学籍番号・著作権物・評価情報が 1 つでも入るなら置かない。
公開されて困るか 5 秒迷ったら置かない。**

線引き表は `docs/before_coding.md`。コミット前に `bash .github/scripts/secret_scan.sh` を実行する。

### 2. 提出 zip の中身に日本語ファイル名を使わない

**`app/` 配下は、ディレクトリ名・ファイル名をすべて英数字にする。**
提出要件で「作業ディレクトリ内のファイル名に日本語を使わない」と決まっているため。

リポジトリ直下の `課題/` は zip に含めないので日本語名のままでよい。
**この線引きを崩さない**（提出対象を `app/` の外に置かない）。

### 3. コミット規約

`[種別] 変更内容の概要` の形式。種別は
`[機能追加]` `[修正]` `[改善]` `[リファクタ]` `[ドキュメント]` `[スタイル]` から選ぶ。

- 機能単位で細かく分割する（無関係な変更を 1 コミットにまとめない）
- **コード変更とドキュメント更新は同一コミットに含める**
- Issue 番号があれば末尾に付ける → `[修正] データ取得の欠損を修正 (#12)`

### 4. ブランチと PR

- `main` へ直接 push しない。必ずブランチを切って PR を出す
- `rebase` は使わない（このチームのルール）。main の取り込みは `merge`
- 詳細は `CONTRIBUTING.md`

### 5. ドキュメントの整合性を保つ

以下を変更したら、関連するドキュメントも同じコミットで直す。

| 変更したもの | 一緒に直すもの |
|---|---|
| ディレクトリ構成 | ルート `README.md` とそのディレクトリの `README.md` |
| CI ワークフロー | `README.md` の秘匿情報スキャンの説明 |
| 機能の追加・削除・仕様変更 | `docs/design/requirements.md`（**正本**。ここを直さずに機能を足さない） |
| データ形式・通信仕様 | `docs/design/interfaces.md`（変更は PR で） |
| DB スキーマ | `app/db/init/*.sql`・`docs/design/requirements.md` §5・`docs/design/interfaces.md` I-7 |
| 認証まわり | `docs/design/requirements.md` §8・`app/.env.example`・`app/README.md`・提出用 `readme.txt` の「ログイン情報」 |
| 気象データの使い方・注意案内の文言 | `docs/design/interfaces.md` I-6・`docs/design/requirements.md` §3-1（**気象業務法の線**）・`app/src/lib/credits.ts` |
| 投稿の API・カテゴリ・上限 | `docs/design/interfaces.md` I-3〜I-5・**I-10**・`app/src/lib/reports.ts`・`app/db/init/001_schema.sql` |
| 認証・セッションの作り | `docs/design/requirements.md` §8-6・`app/src/lib/installId.ts`・`app/.env.example`・`app/README.md`・`.agent/architecture.md` |
| 公開 URL・公開ポートの決め方 | `app/src/lib/publicOrigin.ts`・`app/compose.yaml`・`app/.env.example`・`docs/design/requirements.md` §8-7・`docs/design/interfaces.md` I-8・`.agent/architecture.md`「公開 URL の決め方」・`deploy/selfhost/`（`compose.prod.yaml`・`setup.sh`・`README.md`） |
| UI を足す・変える | **375px 幅で先に決めてから広げる**（`.agent/conventions.md` の「モバイルファースト」）。実際に 375px で動かして確かめる |
| 担当の変更 | `docs/design/assignments.md` |
| 起動手順（`compose.yaml` など） | このファイルの「よく使うコマンド」と `app/README.md` |
| ディレクトリの追加・削除 | そのディレクトリの `README.md`（何のフォルダか） |
| `data/` に取得先を追加 | `data/scripts/manifest.json` と `data/<ソース>/SOURCE.md`（出典・ライセンス） |
| 地図に載せるデータを追加・変更 | `data/scripts/build_geojson.py`・`app/src/lib/layers.ts`（景観スポットは `app/src/lib/scenic.ts`）・`app/src/lib/credits.ts`・`app/README.md`・`docs/design/requirements.md` §7-2 |
| 景観スポットの写真を足す・差し替える | `data/scripts/fetch_scenic_photos.py` の `SPOT_PHOTOS` に 1 行足す → `--credits` 付きで実行 → `build_scenic_photos_ts.py` で `scenicPhotos.ts` を再生成 → `data/wikimedia-commons/SOURCE.md` の表と 「写真が見つからなかったスポット」を直す。**目視でその場所か確かめてから採る** |
| 外部サービス（地図タイル・経路）を変更 | `app/src/lib/credits.ts`（出典）・`app/README.md` の「既知の制約」・このファイルの技術スタック |
| 提出物の作り方・検証項目 | `tools/package_submission.sh`・`app/README.md` の「提出アーカイブを作る」・このファイルの「よく使うコマンド」 |

### 6. 完了報告の前に確認する

- ビルド・スキャンが通ることを実際に実行して確かめる
- **`docker compose up` で実際に起動して動くところまで確認する。**
  コードは「実装した割合 × 正しく動作する割合」で採点される。
  **動かない機能を積むより、動く機能を確実に仕上げる**
- 「たぶん動く」で完了報告しない。確かめられていないことは、そう書く

---

## `.agent/` — AI 向けの詳細仕様と作業文脈

`docs/` が**人間向け**の設計ドキュメントなのに対し、`.agent/` は
**AI が作業するために読む**ファイルを置く。詳細は [`.agent/README.md`](.agent/README.md)。

| ファイル | 内容 | 更新頻度 |
|---|---|---|
| `.agent/activeContext.md` | **今どこを触っているか**・次の一手 | 毎回上書き |
| `.agent/progress.md` | 完了した作業の時系列 | 一段落ごとに追記 |
| `.agent/architecture.md` | システム構成と設計判断 | 設計が変わったとき |
| `.agent/conventions.md` | コーディング規約・命名 | 規約を決めたとき |

@.agent/activeContext.md
@.agent/progress.md

> **`@` を付けると毎回全文が読み込まれる。**
> 上の 2 つ（現在状態と履歴）だけを `@` にして、重い設計書は
> バックティック参照（`` `.agent/architecture.md` ``）にしてある。
> 全部 `@` にすると毎回の読み込みが重くなるので、増やすときは慎重に。
