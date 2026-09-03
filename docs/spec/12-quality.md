# 12. テストと品質保証

**この章は正直に書く。過少申告も過大申告もしない。**

---

## 12-1. まず結論：自動テストは 0 本

**CHIZUBA にはテストフレームワークが入っていない。**
Jest も Vitest も Playwright も、テストファイルも 1 つも無い。

実測（2026-09-03）:

```bash
$ git ls-files | grep -iE "test|spec|\.test\.|__tests__|jest|vitest|playwright"
assets/format_spec.md          ← 「spec」に当たっただけのドキュメント

$ python3 -c "import json;print(json.load(open('app/package.json'))['scripts'])"
{'predev': ..., 'dev': 'next dev', 'prebuild': ..., 'build': 'next build',
 'start': 'next start', 'typecheck': 'tsc --noEmit'}
                                        ↑ test スクリプトが無い
```

**聞かれたらこう答える**（[14 章 Q29](14-faq.md) にも書いた）:

> 単体テストは書いていません。開発期間が約 1 か月で、
> 「実装した割合 × 正しく動作する割合」の掛け算で採点されるため、
> **テストコードを書く時間を、実際に `docker compose up` して全機能を手で動かす
> 検証に充てました**。代わりに 4 本の機械的なゲートを置いています。
> 自動テストが無いことは技術的負債として認識しています。

---

## 12-2. 実際に置いてある品質ゲート（4 本）

| # | ゲート | コマンド | いつ走るか | 何を見るか |
|---|---|---|---|---|
| 1 | **型検査** | `cd app && npm run typecheck` | 手動 | `tsc --noEmit`。`strict: true` |
| 2 | **ビルド** | `cd app && npm run build` | Docker ビルド時に必ず | 型エラー・未解決 import・ビルド警告 |
| 3 | **秘匿情報スキャン** | `bash .github/scripts/secret_scan.sh` | **CI（push・PR・手動）** ＋ 手元 | 個人情報・API キー・ホームパスの混入 |
| 4 | **提出物の検証** | `bash tools/package_submission.sh [--smoke]` | 手動 | 提出要件 9 項目。`--smoke` は実起動まで |

さらに、**`requirements.md` §9-1 の「全フェーズ共通の完了条件」**として
毎フェーズで次の 5 つを通すことになっている:

1. `docker compose up` で起動する
2. 前フェーズの機能が無傷
3. `npm run typecheck` が通る
4. `bash tools/package_submission.sh --smoke` が通る
5. `bash .github/scripts/secret_scan.sh` が通る

---

## 12-3. ゲート ①② 型検査とビルド

```json
// app/tsconfig.json
{ "strict": true, "noEmit": true, "isolatedModules": true, … }
```

`strict: true` なので `any` の暗黙使用・`null` の見落としがコンパイルエラーになる。

**ビルドは Docker のビルドステージで必ず走る**（`Dockerfile:25` の `RUN npm run build`）。
つまり `docker compose up --build` が通れば、型エラーは無いことが保証される。

> **この worktree では `npm run typecheck` を実行していない。**
> 専用の worktree に `node_modules` を置いていないため（`tsc: command not found`）。
> この仕様書の変更は `docs/` のみで、`app/` のコードには 1 行も触れていないので、
> 型検査の結果は main と同じ。

---

## 12-4. ゲート ③ 秘匿情報スキャン（唯一の CI）

`.github/workflows/secret-scan.yml`（25 行）が **push・PR・手動**で走る。
**これが CHIZUBA にある唯一の CI ジョブ**。

### 検知パターン（`.github/secret-scan-patterns.txt`）

| 分類 | パターン |
|---|---|
| 学籍番号 | `[0-9]{2}[A-Z][0-9]{4}` |
| メールアドレス | `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` |
| API キー・トークン | `(api[_-]?key\|apikey\|secret[_-]?key\|access[_-]?token\|auth[_-]?token)…[A-Za-z0-9_\-]{16,}` |
| GitHub トークン | `gh[pousr]_[A-Za-z0-9]{16,}` |
| OpenAI 形式 | `sk-[A-Za-z0-9]{20,}` |
| AWS | `AKIA[0-9A-Z]{16}` |
| 秘密鍵 | `-----BEGIN [A-Z ]*PRIVATE KEY-----` |
| パスワード | `(password\|passwd\|pwd\|passphrase)…{4,}` |
| **ホームパス**（ユーザー名が漏れる） | `/Users/[A-Za-z0-9._-]+/`・`/home/…`・`C:\\Users\\…` |
| クラウドのアカウント ID | `(account[_-]?id\|ACCOUNT_ID)…[A-Za-z0-9]{16,}` |

### 除外（`.github/secret-scan-allowlist.txt`）

```
path:.github/secret-scan-patterns.txt     ← 検知パターンを文字列で持つので必ず自己検知する
path:.github/secret-scan-allowlist.txt
path:.github/workflows/secret-scan.yml
value:@(example\.(com|org|net)|test\.invalid)   ← 説明用のプレースホルダ
value:@users\.noreply\.github\.com
```

**理由の無い除外を足さない。** 除外を足すより、パターンを絞るほうが安全。

### バイナリは意図的に検査しない

**パターンは拡張正規表現なので、バイナリを走査すると必ず誤検知する。**

実測（2026-08-27）: `docs/presentation/chizuba-tech-explainer.pdf` をコミットしたら
CI が落ちた。**PDF のしおり（目次）の見出しは UTF-16 を 16 進の文字列にして
埋め込む決まり**で、その桁の並びが学籍番号のパターン（数字 2 桁 + 英大文字 + 数字 4 桁）に
偶然一致していた。16 進表記は 0-9 と A-F しか使わないので、この形の一致は避けられない。

**バイナリの中身は目視で確かめる**（スクリプトの冒頭に手順が書いてある）:

```bash
# ① 氏名・ホームパス・メールアドレス。何も出なければよい
strings -n 6 <ファイル> | grep -inE '<自分の姓>|/Users/|/home/|[メールの正規表現]'
# ② 作成者情報。道具の名前だけが出ること（人名が出たら消す）
strings -n 6 <ファイル> | grep -oE '/(Creator|Producer|Author)\([^)]*\)'
```

### バイナリ判定を `grep -I` に任せない

**`grep -I` は「先頭の一定量にヌルバイトがあるか」しか見ない**ので、
頭が ASCII で本体が後ろにあるファイルをテキストと誤認する。
実測では **PDF の最初のヌルバイトが 356,831 バイト目**にあり、テキスト扱いされた。
だから拡張子・`file` コマンド・全体走査の 3 段で判定している。

### 実行結果（2026-09-03・この worktree で実行）

```
検査対象: 185 ファイル
バイナリのため除外: 91 ファイル（中身は目視で確かめる）
検知なし。
```

**除外したものは黙って落とさず必ず出す。**
「スキャンが緑 = 全部見た」と読み違えられるのを防ぐため。

---

## 12-5. ゲート ④ 提出物の検証

```bash
bash tools/package_submission.sh              # dist/ に 7z を作って検査
bash tools/package_submission.sh --smoke      # ＋ 展開先で実起動して HTTP 200 まで
```

### やること

1. **`app/` をクリーンコピー**。git に「追跡中のファイル」＋「未追跡だが gitignore
   対象でないファイル」を出させるので、`node_modules/`・`.next/`・
   `tsconfig.tsbuildinfo`・`public/maplibre/` は自動的に落ちる
   （落ちたものは Docker のビルド中に作り直される）
2. `readme.txt` だけは明示的に足す（**氏名を書くため `.gitignore` 済みだが提出必須**）
3. 提出用のベース名にリネームして **7z**（無ければ zip）で固め、`dist/` に置く
4. **固めたあと展開し直して**、アーカイブそのものに対して検査する

### 検査 9 項目

| # | 検査 | 落ちる条件 |
|---|---|---|
| 1 | `readme.txt` があるか | 無い（**現在ここが NG**。9/9 に向けて作る） |
| 2 | `readme.txt` が **UTF-8・BOM なし**か | BOM が付いている／Shift_JIS |
| 3 | `Dockerfile` と `compose.yaml` があるか | 欠けている |
| 4 | 展開すると作業ディレクトリが **1 つ**になるか | 最上位が 2 つ以上 |
| 5 | **日本語（非 ASCII）のファイル名**が無いか | 1 つでもある（提出要件で禁止） |
| 6 | キャッシュ・ビルド生成物の混入が無いか | `node_modules` 等が混ざっている |
| 7 | 展開し直した中身が固める前と一致するか | ファイル数・内容が違う |
| 8 | 展開先で `docker compose config` が通るか | compose の記述が壊れている |
| 9 | （`--smoke` のみ）展開先で `docker compose up` して **HTTP 200** が返るか | 90 秒待っても 200 が返らない |

**1 つでも落ちたらアーカイブを消して非 0 で終了する。**
「提出物に著しい不備がある場合は採点されない」ので、誤って提出しないため。

### 他の人の作業を巻き込まない工夫

`compose.yaml` はプロジェクト名を `ichikawa-opendata-map` に固定している
（審査員がディレクトリ名に左右されず起動できるようにするため）。
そのまま `docker compose` を叩くと、**同じマシンで誰かが起動中のコンテナを
作り直したり落としたりしてしまう**。

だから検証は **`-p pkgtest-<PID>`** で専用のプロジェクト名に隔離してある。

> **この worktree では `package_submission.sh` を実行していない。**
> 別の担当者が `readme.txt` と提出 zip を並行して作業中で、
> 検査 1（`readme.txt` があるか）が現時点で NG になることが分かっているため。
> 実行結果はその担当者の報告を見ること。

---

## 12-6. 手で確かめている（＝自動化されていない）こと

**ここが自動テストの代わりになっている部分。**
証拠は PR の本文と `.agent/progress.md` に残っている。

| 何を | どう確かめたか | 記録 |
|---|---|---|
| **375px / 320px / 414px での全フロー** | 実機幅で実操作し、破綻 9 件を修正 | PR #15 |
| **リファクタで挙動が変わっていないこと** | **レンダリング後の DOM を before/after で丸ごと突き合わせ**（class 文字列まで一致を確認）。API は 18 経路のスナップショットを取り、時刻だけ除いて差分ゼロ | PR #20 |
| **Google ログインの実キー疎通** | `/api/auth/providers` が `google, demo` を返す・認可の 302 が `accounts.google.com` へ・`redirect_uri` が公開ホスト | `.agent/activeContext.md` |
| **Tailscale Funnel 越しの公開** | 外部 ingress 経由で HTTP 200・Let's Encrypt 証明書・デモログイン成立 | `.agent/progress.md` 2026-08-30 |
| **デモバッジを詐称できないこと** | `demo: true` を付けて `POST /api/reports` し、201 の応答に `demo` が無いことを確認 | `.agent/progress.md` 2026-08-27 |
| **`rainfallMm` を PATCH で混ぜても捨てられること** | 実測 | `.agent/progress.md` 2026-08-27 |
| **セッションの穴が塞がったこと** | 別 DB のトークンを持ち込んで 403 になることを確認 | `.agent/progress.md` 2026-08-27 |
| **ハザードタイルの疎通** | 市川市 z=14 のタイルを実取得 | `.agent/architecture.md` |
| **浸水深の凡例の色** | 千葉県内 20 タイルの**画素を数えて**確認 | `.agent/architecture.md` |
| **GeoJSON が RFC 7946 として妥当** | 公式 JSON Schema でエラー 0 | `.agent/progress.md` 2026-08-27 |
| **横スクロールの有無** | Chromium と WebKit × 320/375/390/430px × 全ページ × 各状態 | PR #28 |

---

## 12-7. 「完了」と言う前の決まり

`AGENTS.md`「完了報告の前に確認する」より。

- ビルド・スキャンが通ることを**実際に実行して**確かめる
- **`docker compose up` で実際に起動して動くところまで確認する**
- **「たぶん動く」で完了報告しない。確かめられていないことは、そう書く**

このルールがあるので、`.agent/progress.md` には
「**実測でわかったこと**」「**実測で再現しなかったこと**」が繰り返し出てくる。

---

## 12-8. 品質保証で足りていないもの（正直に）

| 足りないもの | 影響 | 代わりにやっていること |
|---|---|---|
| **単体テスト** | 関数の境界値が回帰しても気づけない | 型検査＋手動確認 |
| **結合テスト・E2E** | 画面のフローが壊れても気づけない | 手動確認（実機幅での実操作） |
| **CI でのビルド** | push 時にビルドが通るか見ていない | Docker ビルドでは必ず走るので、起動確認で気づく |
| **負荷試験** | 同時アクセスの上限が未測定 | [13 章](13-limitations.md)に「未測定」と明記 |
| **セキュリティ診断** | 網羅的な検査はしていない | 入力の検証・権限判定・秘匿情報スキャンは実装済み |
| **ADR** | 判断の経緯が PR 本文と `.agent/` に散っている | `docs/decisions/` に雛形だけある |
