# ガントチャート

Mermaid でスケジュールを描く。詳細なタスクは [wbs.md](wbs.md) を参照。

GitHub の Markdown プレビューは Mermaid を自動でレンダリングするので、
図を別ツールで作って画像を貼る必要はない。**テキストなので差分も見える。**

## 全体スケジュール

```mermaid
gantt
    title プロジェクトスケジュール
    dateFormat  YYYY-MM-DD
    axisFormat  %m/%d

    section フェーズ1
    タスク名          :a1, 2026-04-15, 14d

    section フェーズ2
    タスク名          :a2, after a1, 7d
```

<details>
<summary>📋 記入例（13 週間のプロジェクトの場合）— クリックで開く</summary>

```mermaid
gantt
    title プロジェクトスケジュール（13週）
    dateFormat  YYYY-MM-DD
    axisFormat  %m/%d

    section フェーズ1: 企画
    テーマ検討          :a1, 2026-04-15, 14d
    テーマ決定          :milestone, after a1, 0d

    section フェーズ2: 設計
    技術選定            :a2, after a1, 7d
    システム設計        :a3, after a1, 7d
    計画書提出          :milestone, after a3, 0d

    section フェーズ3: 実装
    共通基盤            :b1, after a3, 14d
    サブシステム並列実装 :b2, after b1, 28d

    section フェーズ4: 結合
    結合テスト           :c1, after b2, 7d

    section フェーズ5: 評価
    評価実験             :d1, after c1, 4d
    デモ動画撮影         :d2, after c1, 2d

    section フェーズ6: 発表
    報告書執筆           :e1, after d1, 10d
    発表スライド         :e2, after d2, 5d
    最終発表             :milestone, after e1, 0d
```

</details>

## Mermaid の書き方（最低限）

| 書き方 | 意味 |
|---|---|
| `タスク名 :id, 2026-04-15, 14d` | 開始日と期間を指定 |
| `タスク名 :id, after a1, 7d` | 別のタスクの後から開始 |
| `タスク名 :milestone, after a1, 0d` | 節目（ひし形で表示される） |
| `タスク名 :done, id, ...` | 完了済み（グレー表示） |
| `タスク名 :active, id, ...` | 進行中（強調表示） |

## 備考

- 日付は暫定でよい。実際の授業日程が出たら調整する
- タスクは [wbs.md](wbs.md) と必ず対応させる（片方だけ更新すると必ずズレる）
- **遅れたら線を伸ばす。** 予定のまま放置された図はチームを油断させる
