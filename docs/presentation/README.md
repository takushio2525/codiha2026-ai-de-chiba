# docs/presentation — 提出する説明資料と，発表前に読む技術解説

ここには**性格の違う 2 種類**が入っている。取り違えないこと。

| | 何 | 締切 |
|---|---|---|
| [`submission/`](submission/) | **CODIHA に提出する説明資料 2 種（PDF）。** zip と一緒に Slack へ投稿する。**提出物** | **2026-09-09（水）17:00** |
| このディレクトリ直下 | プレゼンで技術的な質問に答えるための手元資料。**提出物ではない** | — |

---

## submission/ — 提出する説明資料 2 種

提出要件（`課題/2026-09-09_CODIHA2026_提出要件.md`「説明資料の仕様」）が求めている 2 つ。
**著しい不備があると採点されない**ので，直したら必ず `build.sh` を通す。

| ファイル | 何か |
|---|---|
| [`submission/01-service-overview.pdf`](submission/01-service-overview.pdf) | **説明資料① サービスの概要。** 16:9 スライド・**5 ページ**（要件は 5 ページ以内）。目的／主要機能／コンテナの概要（図）／実行の手順／実行結果（画面 5 枚） |
| [`submission/02-feature-implementation-table.pdf`](submission/02-feature-implementation-table.pdf) | **説明資料② 必要機能の一覧と実装の対応表。** A4・4 ページ・全 48 行。「番号／必要機能／対応する実装／備考」で，**未実装も割愛せず全件**並べてある |
| `submission/01-*.typ` / `submission/02-*.typ` | 上の原稿（Typst）。体裁の共通部分は `submission/common.typ` |
| `submission/verify_table.py` | 対応表の検査。**書いたパスとシンボルが実在するか**と，件数（避難場所 123 など）を実データから数え直す |
| `submission/build.sh` | 組み直し。検査 → コンパイル → **ページ数の上限** → PDF の個人情報スキャンまで通す |

```bash
bash docs/presentation/submission/build.sh
```

**直すときの約束**（下の「直すときの約束」も併せて守る）:

- **`app/readme.txt`（提出 zip 同梱・git 管理外）の「1. 概要・主要機能」「4. 実行方法」と
  齟齬を作らない。** 提出要件で明記されている。readme.txt を直したら資料①の 2・4 ページも直す
- **氏名・所属は資料に書かない。** 提出者の情報は readme.txt が担う
- 機能を足したら**資料②に行を足す**。未実装のものを実装したら「未実装」の行を移す
  （未実装の正本は `docs/spec/13-limitations.md` と `docs/design/requirements.md` §10-1）

---

## 発表前に読む技術解説（提出物ではない）

**プレゼン（2026-09-16・発表 10 分 + 質疑 3 分）で技術的な質問に答えられるようにするための資料。**
CHIZUBA の中身を，実際のコードから起こして 2 つの形にまとめてある。

| ファイル | 何か |
|---|---|
| [`chizuba-tech-explainer.pdf`](chizuba-tech-explainer.pdf) | **本体。** 全体構成・リクエストの流れ 3 本・技術選定の理由・各機能の仕組み・**想定質疑 22 問**・用語集・数字の早見表（A4 23 ページ） |
| `chizuba-tech-explainer.typ` | 上の PDF の原稿（Typst）。直したらコンパイルし直す |
| [`chizuba-overview.progfocus.md`](chizuba-overview.progfocus.md) | **アーキテクチャ図の正本。** prog-focus 形式（ノード 38・接続 34）。取り込むと図として開ける |
| [`審査基準_主張と根拠.md`](審査基準_主張と根拠.md) | **審査 5 項目ごとの主張と根拠。** ターゲットの言語化・スライド構成案（10 分）・弱点と質疑での返し方・出典一覧・**リンク検証台帳**。スライドを作るときはまずこれを読む |
| `verify_progfocus.py` | 図の検査（JSON の妥当性・件数・参照整合性・**fileName の実在**） |
| `verify_explainer.py` | 原稿の検査（**パスと URL の実在**・句読点が全角の「，」「．」か） |

## 時間が無いときにどこを読むか

スライドを組むなら [`審査基準_主張と根拠.md`](審査基準_主張と根拠.md) の §1（ターゲット）と各節の「スライド見出し案」だけでよい。
質疑の準備なら PDF の **6 章（想定質疑）** と **8 章（数字の早見表）** だけでよい。
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

## PDF をコミットする前に

**秘匿情報スキャン（`.github/scripts/secret_scan.sh`）はバイナリを検査しない。**
パターンが拡張正規表現なので，走査すると圧縮されたバイトの並びが必ず誤検知するため
（実際に，この PDF のしおりが学籍番号のパターンに偶然一致して CI が落ちた）。
**PDF の中身は目視で確かめる。**

```bash
P=docs/presentation/chizuba-tech-explainer.pdf

# ① 氏名・ホームパス・メールアドレス（何も出なければよい）
strings -n 6 "$P" | grep -inE '/Users/|/home/|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'

# ② 作成者情報（`/Creator(Typst 0.15.1)` の 1 行だけ出る。人名が出たら消す）
strings -n 6 "$P" | grep -oE '/(Creator|Producer|Author)\([^)]*\)'
```

PDF は**作成者情報にユーザー名が入りやすい**ので，Typst 以外で作り直したときは特に確認する。
なお**文言そのものは PDF ではなく原稿（`.typ`）で担保される**。
原稿はテキストなので秘匿情報スキャンが普通に検査している。

> **技術解説とアーキテクチャ図は提出物ではない。** zip に入るのは `app/` 配下だけで，
> `tools/package_submission.sh` は `docs/` を固めない。
> ただし [`submission/`](submission/) の PDF 2 種は，**zip とは別に**同じ Slack 投稿へ添付する提出物。
