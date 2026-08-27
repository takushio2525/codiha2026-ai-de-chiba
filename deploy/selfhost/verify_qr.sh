#!/usr/bin/env bash
# tako:cwd: ../..
# tako:run: bash deploy/selfhost/verify_qr.sh
#
# verify_qr.sh — make_qr.py が正しい QR コードを出しているかを検証する
#
#   bash deploy/selfhost/verify_qr.sh
#
# make_qr.py は QR の符号化を自前で実装している（発表直前の旧 Mac で
# 外部パッケージの導入に失敗しないようにするため）。自前実装は
# 「それらしい模様は出るが読めない」という壊れ方をするので、
# **他人の実装と突き合わせる検査**を用意してある。3 通りで見る。
#
#   1. 容量表の照合  — 全 40 バージョン × 4 レベルで「何バイトまで入るか」が
#                      qrencode と一致するか（境目の +1 バイトまで見る）
#   2. 行列の照合    — qrencode が出すモジュール配置と 1 マスずつ比較する
#   3. デコード      — 出力 PNG を macOS の CoreImage で実際に読み、入力と一致するか
#
# qrencode / swift が無い環境では、その検査を SKIP して残りを実行する。
# make_qr.py に手を入れたら必ずこれを通すこと。
#
#   brew install qrencode          … 1 と 2 に必要
#   xcode-select --install         … 3 に必要（swift）

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAKE_QR="$SCRIPT_DIR/make_qr.py"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

NG=0
count_ng() { NG=$((NG + $1)); }

# 検査に使う文字列。境目（バージョンが上がる長さ・非 ASCII・記号）を混ぜてある。
export QR_TEXTS=$'https://example-machine.example-tailnet.ts.net\nhttps://example.ts.net\nhttps://example-machine.example-tailnet.ts.net/reports?category=flood&from=2026-09-01\nA\nCHIZUBA 千葉の地図'
export MAKE_QR

# --- 1 と 2. 参照実装（qrencode）との突き合わせ ---------------------------
if command -v qrencode >/dev/null 2>&1; then
    echo "参照実装: $(qrencode --version 2>&1 | head -1)"
    python3 - <<'PY'
import importlib.util, os, subprocess, sys

spec = importlib.util.spec_from_file_location("make_qr", os.environ["MAKE_QR"])
qr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qr)

LEVELS = "LMQH"
TEXTS = os.environ["QR_TEXTS"].split("\n")
ng = 0


def ok(msg):    print(f"[ OK ] {msg}")
def bad(msg):
    global ng
    ng += 1
    print(f"[ NG ] {msg}")


def reference(text, level):
    """qrencode の行列。-8 で 8 ビットバイトモードに固定する（付けないと
    英数字だけの入力を英数字モードで詰めてしまい、こちらと比較にならない）。"""
    out = subprocess.run(
        ["qrencode", "-t", "ASCII", "-m", "0", "-8", "-l", level, "-o", "-", "--", text],
        capture_output=True, text=True, check=True,
    ).stdout.rstrip("\n").split("\n")
    return [[line[i:i + 2] == "##" for i in range(0, len(line), 2)] for line in out]


# --- 1. 容量表（全 40 バージョン × 4 レベル）---
def qrencode_version(nbytes, level):
    out = subprocess.run(
        ["qrencode", "-t", "ASCII", "-m", "0", "-8", "-l", level, "-o", "-", "--", "x" * nbytes],
        capture_output=True, text=True, check=True,
    ).stdout.rstrip("\n").split("\n")
    return (len(out) - 17) // 4


mismatch = []
for version in range(1, 41):
    for level in LEVELS:
        limit = (qr._data_codewords(version, level) * 8 - 4 - qr._char_count_bits(version)) // 8
        if qrencode_version(limit, level) != version:
            mismatch.append(f"v{version}-{level}: 自前は {limit} バイトが v{version} に入ると言うが qrencode は違う")
        elif version < 40 and qrencode_version(limit + 1, level) <= version:
            mismatch.append(f"v{version}-{level}: {limit + 1} バイトでも v{version} に入る（容量を過小評価）")
if mismatch:
    for m in mismatch[:5]:
        bad(f"容量表 {m}")
else:
    ok("容量表が全 160 組（40 バージョン × 4 レベル）で一致・境目の ±1 バイトまで確認")

# --- 2. 行列 ---
mask_only = 0
for level in LEVELS:
    for text in TEXTS:
        ref = reference(text, level)
        mine = qr.encode(text, level)
        if mine == ref:
            ok(f"行列一致 [{level}] {text[:44]}")
            continue
        if len(mine) != len(ref):
            bad(f"大きさが違う [{level}] {text} — 参照 {len(ref)} / 自前 {len(mine)}")
            continue
        # 同じ大きさで中身が違うなら、まずマスク選択の差を疑う。
        # 規格は減点法でマスクを決めるが、libqrencode と Nayuki 系実装では
        # 減点の数え方の解釈が割れており、どちらも規格上は正しい QR になる。
        forced = qr.encode(text, level, mask=qr.read_mask(ref))
        if forced == ref:
            mask_only += 1
            ok(f"マスク以外は完全一致 [{level}] {text[:36]}"
               f"（自前 mask={qr.read_mask(mine)} / 参照 mask={qr.read_mask(ref)}）")
        else:
            bad(f"マスクをそろえても違う [{level}] {text}")

if mask_only:
    print(f"       ※ {mask_only} 件はマスク番号だけの相違。どちらも規格に適合する（下のデコード検査で読めることを確認）")
sys.exit(1 if ng else 0)
PY
    count_ng $?
else
    echo "[SKIP] qrencode が無いので参照実装との比較を飛ばす（brew install qrencode で入る）"
fi

# --- 3. 出力 PNG を実際にデコードする -----------------------------------
if command -v swift >/dev/null 2>&1; then
    cat > "$WORK/decode.swift" <<'SWIFT'
import Foundation
import CoreImage

let args = CommandLine.arguments
guard args.count > 1, let image = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("画像を読み込めません\n".data(using: .utf8)!)
    exit(2)
}
let detector = CIDetector(ofType: CIDetectorTypeQRCode, context: CIContext(),
                          options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
let found = detector.features(in: image).compactMap { ($0 as? CIQRCodeFeature)?.messageString }
found.forEach { print($0) }
exit(found.isEmpty ? 1 : 0)
SWIFT
    while IFS= read -r text; do
        for level in L M Q H; do
            python3 "$MAKE_QR" "$text" -o "$WORK/out.png" --scale 8 --ecc "$level" >/dev/null || {
                printf '[ NG ] PNG を作れなかった: [%s] %s\n' "$level" "$text"; count_ng 1; continue; }
            decoded="$(swift "$WORK/decode.swift" "$WORK/out.png" 2>/dev/null | head -1)"
            if [ "$decoded" = "$text" ]; then
                printf '[ OK ] PNG をデコードできた [%s] %s\n' "$level" "${text:0:44}"
            else
                printf '[ NG ] デコード結果が違う [%s] 入力[%s] 読み取り[%s]\n' "$level" "$text" "$decoded"
                count_ng 1
            fi
        done
    done <<< "$QR_TEXTS"
else
    echo "[SKIP] swift が無いので PNG のデコード検査を飛ばす（xcode-select --install で入る）"
fi

# --- 4. 入力の異常を弾くか -----------------------------------------------
if python3 "$MAKE_QR" "$(python3 -c 'print("x"*3000)')" -o "$WORK/toolong.png" >/dev/null 2>&1; then
    echo "[ NG ] 長すぎるデータを弾いていない"; count_ng 1
else
    echo "[ OK ] 長すぎるデータをエラーにする"
fi

echo
if [ "$NG" -eq 0 ]; then
    echo "すべて通過しました。"
    exit 0
fi
echo "NG が $NG 件あります。"
exit 1
