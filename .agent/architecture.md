# アーキテクチャ

> **AI 向けの記述。** 図や背景の説明は `docs/` に書き、ここには
> **作業に必要な事実**を簡潔に書く。

## 大前提

- サービス本体は **`app/` 配下**に置き、**`docker compose up` で起動できる**こと
- `app/` 配下のファイル名・ディレクトリ名は**すべて英数字**（提出 zip の要件）
- ベースイメージは可能な限り **Docker 公式イメージ（DOI）** を使う

## システム構成

**コンテナは 1 つ（`web`）だけ。データベースは使わない。**
地図に載せるデータは GeoJSON として `app/public/data/` に同梱してあるので、
起動時に外部からデータを取りに行く必要がない。

```
                                      ┌─ 国土地理院タイル（背景地図・キー不要）
[ブラウザ] --localhost:3000--> [web] ─┤
                                      └─ /api/routing --> OSRM（FOSSGIS・キー不要）

[市川市 CSV] --build_geojson.py（手元で実行）--> [app/public/data/*.geojson]（コミット済み）
```

- 背景地図タイルは**ブラウザが直接**取りに行く
- 徒歩経路だけ **`web` コンテナ経由**にしている。理由は 3 つ:
  ① OSRM の利用規約が求める User-Agent を確実に付けるため
  ② 「1 秒あたり 1 リクエスト」の制限をサーバー側 1 箇所で守るため
  ③ タイムアウトを入れて、OSRM が落ちていても画面が固まらないようにするため
- 外部サービスが落ちていても**施設の点は表示できる**（データが同梱なので）。
  経路は直線距離の概算に切り替わる

## コンポーネントと担当

詳細は `docs/design/assignments.md`。ここには**コードの置き場所**を書く。

| コンポーネント | 置き場所 | 単独で動かす方法 |
|---|---|---|
| 画面全体（地図・操作パネル） | `app/src/components/` | `cd app && npm run dev` |
| 地図の描画（MapLibre） | `app/src/components/MapView.tsx` | 同上 |
| 経路の中継 API | `app/src/app/api/routing/route.ts` | `curl 'localhost:3000/api/routing?from=139.93,35.72&to=139.92,35.75'` |
| CSV → GeoJSON 変換 | `data/scripts/build_geojson.py` | `python3 data/scripts/build_geojson.py` |

## コンポーネント間のデータ形式

**正本は `docs/design/interfaces.md`。** ここには要点だけ書く。

| つなぎ目 | 形式 | 経路 |
|---|---|---|
| 市川市 CSV → 地図 | GeoJSON（`FeatureCollection`・properties のキーは英字） | `app/public/data/*.geojson`（リポジトリにコミット） |
| ブラウザ → 経路 API | `GET /api/routing?from=<経度>,<緯度>&to=<経度>,<緯度>` | 同一オリジン |
| 経路 API → ブラウザ | `{ ok: true, distanceMeters, durationSeconds, geometry }` / `{ ok: false, reason }` | 同上。型は `app/src/app/api/routing/route.ts` |

**座標はすべて `[経度, 緯度]` の順**（GeoJSON と MapLibre に合わせている）。
`data/analysis/` の Python 側は `緯度, 経度` の順なので、混ぜない。

**この形式を変える変更は影響が広い。** 送る側と受け取る側を必ず同時に直す。

## 使うオープンデータ

**参照元（クレジット）は必ず記録する。** プレゼン資料への記載が要件になっている。

**文言の正本は `app/src/lib/credits.ts`。** 地図の隅と `/about` の両方がここを読む。

| データ | 出典 | 取得方法 | ライセンス |
|---|---|---|---|
| 指定緊急避難場所（123 件） | 市川市オープンデータ | CSV → `build_geojson.py` | CC BY 4.0 |
| AED 設置箇所（304 件） | 市川市オープンデータ | 同上 | CC BY 4.0 |
| 子育て施設（388 件） | 市川市オープンデータ | 同上 | CC BY 4.0 |
| 背景地図 | 国土地理院「淡色地図」タイル | XYZ タイル（キー不要） | 国土地理院コンテンツ利用規約 |
| 徒歩経路 | OSRM（FOSSGIS e.V.）／道路データは OpenStreetMap | HTTP API（キー不要） | ODbL |

## 設計判断の記録

大きな判断（言語選定・コンテナ構成・ライブラリ採否）は
`docs/decisions/` に ADR として残す。ここには結論だけ書く。

| 判断 | 結論 | 理由 |
|---|---|---|
| 実装言語・フレームワーク | Next.js（App Router）+ TypeScript | 地図 UI とサーバー側の中継 API を 1 コンテナに収められる |
| 地図ライブラリ | MapLibre GL JS | 認証キー不要。ネイティブ拡張を持たない純 JS |
| 背景地図 | 国土地理院「淡色地図」 | 無認証・出典明記のみ。国内で安定 |
| 経路サービス | OSRM（FOSSGIS） | 無認証。徒歩プロファイルあり（実測で確認済み） |
| CSS | Tailwind CSS v4 | 提出までの期間が短く、書き足しの速度を優先 |
| アイコン | lucide-react | 依存ゼロの SVG コンポーネント。**絵文字は UI に使わない** |
| 配色 | Okabe-Ito | 色覚多様性に配慮した配色として国内で実績がある |
| DB | 使わない | データが 815 点と小さく、GeoJSON 同梱で足りる。コンテナが 1 つで済む |
