# 作業履歴

> **書き方**: 作業が一段落したら**追記**する（上書きしない）。
> 1 エントリ **1〜3 行**に収める。詳細は git log とコミットメッセージに任せる。
> 単発の質問やタイポ修正では更新しない。
>
> 古いエントリが 30 件を超えたら `progress-archive.md` に移す。

---

- 2026-08-24: CODIHA 2026 の提出要件を `課題/2026-09-09_CODIHA2026_提出要件.md` に抽出。
  締切（コード 9/9 17:00・プレゼン資料 9/16 11:50）・審査基準 5 項目・0 点条件が正本。
- 2026-08-24: hackathon-template 由来の残骸（マイコン・回路・LaTeX 報告書向けの
  ディレクトリ一式と専用 CI）を削除。README / AGENTS.md / .agent / docs / tools の
  記述を Docker・オープンデータ前提に同期。削除対象の内訳はコミット 00bf09d を参照。
- 2026-08-24: 提出単位として `app/` を新設（規約のみ・実装はまだ無い）。
  `.gitignore` に zip / 7z・フレームワークのキャッシュ・`app/readme.txt` を追加。
- 2026-08-24: 主催者指定の 2 ソースから `data/` に 16 本取得（千葉県 Excel 8・市川市 CSV 8）。
  ライセンスは PDL1.0 / CC BY 4.0 でいずれも出典明記で再配布可。`SOURCE.md` に諸元と落とし穴を記録。
- 2026-08-24: `data/analysis/` に探索的分析を追加（スクリプト 5 本・グラフ 9 枚・`findings.md`）。
  市川市は町丁字で高齢化率が 6.6 倍ちがう／避難場所は全地区 839m 以内／AED が 0 箇所の地区が 96。
  クリーン venv（Python 3.12・3.14）で同一 PNG が出ることを確認済み。
- 2026-08-24: `app/` に地図アプリの骨格を実装（Next.js 16 + MapLibre GL 6 + Tailwind v4）。
  市川市の避難場所 123・AED 304・子育て施設 388 を地図に重ね、レイヤー切替とポップアップ、
  OSRM による徒歩ナビ（Geolocation 拒否時は地図クリックで出発地点指定）まで。
- 2026-08-24: `docker compose up` で起動を実機確認。**MapLibre v6 は worker が別ファイルになり、
  バンドルすると読めない**ため `public/maplibre/` に配置して `setWorkerUrl` で指す
  （`app/scripts/copy-maplibre-worker.mjs`）。これが無いと点が永久に出ない。
- 2026-08-24: 市川市 CSV → GeoJSON 変換を `data/scripts/build_geojson.py` に追加。
  避難場所 CSV 末尾の 6 行は「緯度経度の欠損」ではなく**全列が空の行**だったので SOURCE.md を訂正。
- 2026-08-24: 提出アーカイブの生成と検証を `tools/package_submission.sh` に自動化。
  gitignore 判定で `app/` をクリーンコピー（readme.txt だけ強制同梱）→ 7z 化 → 展開し直して
  必須ファイル・BOM・日本語名・キャッシュ混入・compose を検査。NG ならアーカイブを消して非 0 終了。
