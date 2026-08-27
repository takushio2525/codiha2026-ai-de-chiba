# docs/presentation — 発表前に読む技術解説

**プレゼン（2026-09-16・発表 10 分 + 質疑 3 分）で技術的な質問に答えられるようにするための資料。**
CHIZUBA の中身を，実際のコードから起こして 2 つの形にまとめてある。

| ファイル | 何か |
|---|---|
| [`chizuba-tech-explainer.pdf`](chizuba-tech-explainer.pdf) | **本体。** 全体構成・リクエストの流れ 3 本・技術選定の理由・各機能の仕組み・**想定質疑 22 問**・用語集・数字の早見表（A4 23 ページ） |
| `chizuba-tech-explainer.typ` | 上の PDF の原稿（Typst）。直したらコンパイルし直す |
| [`chizuba-overview.progfocus.md`](chizuba-overview.progfocus.md) | **アーキテクチャ図の正本。** prog-focus 形式（ノード 38・接続 34）。取り込むと図として開ける |
| `verify_progfocus.py` | 図の検査（JSON の妥当性・件数・参照整合性・**fileName の実在**） |
| `verify_explainer.py` | 原稿の検査（**パスと URL の実在**・句読点が全角の「，」「．」か） |

## 時間が無いときにどこを読むか

PDF の **6 章（想定質疑）** と **8 章（数字の早見表）** だけでよい。
質疑で数字を聞かれたら早見表，仕組みを聞かれたら 5 章の該当節，
「なぜその技術か」を聞かれたら 4 章の該当行を思い出せばよい形にしてある。

## 作り直す

```bash
# PDF（Typst が要る: brew install typst）
cd docs/presentation && typst compile chizuba-tech-explainer.typ

# 図と原稿が実装から離れていないか（リポジトリのルートで実行する）
python3 docs/presentation/verify_progfocus.py docs/presentation/chizuba-overview.progfocus.md
python3 docs/presentation/verify_explainer.py docs/presentation/chizuba-tech-explainer.typ
```

日本語フォントは macOS 標準の Hiragino を指している。
別の環境で組むときは `.typ` の先頭の `FONT_SERIF` / `FONT_SANS` / `FONT_MONO` を書き換える。

## 直すときの約束

- **数字は実物から取る。** 件数も上限もコードと DB スキーマが正本で，この資料は写しにすぎない
- **句読点は全角の「，」「．」**（提出資料の規約）。`verify_explainer.py` が見張っている
- **F-4 の説明に予報表現を混ぜない。** 気象業務法の線は `docs/design/requirements.md` §3-1 が正本
- コードを動かしたら 2 つの検査スクリプトを流す。図や原稿が実装から離れたら落ちる

> **この資料は提出物ではない。** CODIHA に提出するのは `app/` 配下だけで，
> `tools/package_submission.sh` は `docs/` を固めない。
