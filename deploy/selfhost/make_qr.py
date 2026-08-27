#!/usr/bin/env python3
"""公開 URL から QR コードの PNG を作る（プレゼン資料に貼る用）。

    python3 deploy/selfhost/make_qr.py https://<マシン名>.<tailnet 名>.ts.net
    python3 deploy/selfhost/make_qr.py <URL> -o slide-qr.png --scale 16 --preview

**Python の標準ライブラリだけで動く。** 外部パッケージ（qrcode / Pillow）にも
外部コマンド（qrencode）にも頼らない。理由は 1 つで、**これを実行するのが
発表直前の自宅の旧 Mac だから**。「pip install できない」「brew が古い」で
止まる可能性を消しておきたい。QR の符号化（ISO/IEC 18004）と PNG の書き出しを
この 1 ファイルに閉じ込めてある。

生成物の検証（このリポジトリで実測済み）:
  - qrencode 4.1.1 が出す行列と**モジュール単位で完全一致**することを確認
  - 出力 PNG を macOS の Vision フレームワークでデコードし、
    入力した URL がそのまま読めることを確認
  検証スクリプトは deploy/selfhost/verify_qr.sh。
"""

from __future__ import annotations

import argparse
import struct
import sys
import zlib

# ---------------------------------------------------------------------------
# 1. 規格の表（ISO/IEC 18004）
# ---------------------------------------------------------------------------
# バージョン（1〜40）と誤り訂正レベルごとに決まっている値。規格そのものなので
# 中身をいじらない。添字 0 は使わないので -1 を置いてある。

# 1 ブロックあたりの誤り訂正コード語数
_ECC_PER_BLOCK = {
    "L": [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28,
          28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    "M": [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26,
          26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    "Q": [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26,
          30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    "H": [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26,
          28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
}

# 誤り訂正ブロックの数
_NUM_BLOCKS = {
    "L": [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7,
          8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    "M": [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14,
          16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    "Q": [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21,
          20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    "H": [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25,
          25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
}

# 形式情報に載せる誤り訂正レベルの符号（規格。L と M が入れ替わっているのは仕様）
_ECC_FORMAT_BITS = {"L": 1, "M": 0, "Q": 3, "H": 2}

# マスクの評価に使う減点の重み（規格の N1〜N4）
_PENALTY_N1, _PENALTY_N2, _PENALTY_N3, _PENALTY_N4 = 3, 3, 40, 10


def _raw_data_modules(version: int) -> int:
    """機能パターンを除いた、データを置けるモジュール数。"""
    result = (16 * version + 128) * version + 64
    if version >= 2:
        num_align = version // 7 + 2
        result -= (25 * num_align - 10) * num_align - 55
        if version >= 7:
            result -= 36
    return result


def _data_codewords(version: int, ecc: str) -> int:
    """そのバージョン・誤り訂正レベルで載せられるデータのコード語数。"""
    return (
        _raw_data_modules(version) // 8
        - _ECC_PER_BLOCK[ecc][version] * _NUM_BLOCKS[ecc][version]
    )


def _alignment_positions(version: int) -> list[int]:
    """位置合わせパターンの中心座標。"""
    if version == 1:
        return []
    num = version // 7 + 2
    step = 26 if version == 32 else (version * 4 + num * 2 + 1) // (num * 2 - 2) * 2
    size = version * 4 + 17
    positions = [size - 7 - i * step for i in range(num - 1)] + [6]
    return list(reversed(positions))


# ---------------------------------------------------------------------------
# 2. リード・ソロモン符号（GF(256)・原始多項式 0x11D）
# ---------------------------------------------------------------------------

def _gf_multiply(x: int, y: int) -> int:
    """GF(256) の掛け算。"""
    z = 0
    for i in range(7, -1, -1):
        z = (z << 1) ^ ((z >> 7) * 0x11D)
        z ^= ((y >> i) & 1) * x
    return z


def _rs_divisor(degree: int) -> bytes:
    """指定の次数の生成多項式（係数を降べきの順で並べたもの）。"""
    result = bytearray([0] * (degree - 1) + [1])
    root = 1
    for _ in range(degree):
        for j in range(degree):
            result[j] = _gf_multiply(result[j], root)
            if j + 1 < degree:
                result[j] ^= result[j + 1]
        root = _gf_multiply(root, 0x02)
    return bytes(result)


def _rs_remainder(data: bytes, divisor: bytes) -> bytes:
    """データを生成多項式で割った余り ＝ 誤り訂正コード語。"""
    result = bytearray([0] * len(divisor))
    for b in data:
        factor = b ^ result.pop(0)
        result.append(0)
        for i, d in enumerate(divisor):
            result[i] ^= _gf_multiply(d, factor)
    return bytes(result)


# ---------------------------------------------------------------------------
# 3. 符号化
# ---------------------------------------------------------------------------

def _char_count_bits(version: int) -> int:
    """8 ビットバイトモードの文字数指示子の長さ。"""
    return 8 if version <= 9 else 16


def _choose_version(data: bytes, ecc: str, min_version: int = 1) -> int:
    """データが収まる最小のバージョンを選ぶ。"""
    for version in range(max(1, min_version), 41):
        capacity_bits = _data_codewords(version, ecc) * 8
        needed = 4 + _char_count_bits(version) + 8 * len(data)
        if needed <= capacity_bits:
            return version
    raise ValueError(
        f"データが長すぎて QR コードに収まりません（{len(data)} バイト）。"
        "URL を短くするか、誤り訂正レベルを下げてください（--ecc L）。"
    )


def _build_codewords(data: bytes, version: int, ecc: str) -> bytes:
    """ビット列を組み立て、パディングしてコード語（バイト列）にする。"""
    bits: list[int] = []

    def append(value: int, length: int) -> None:
        for i in range(length - 1, -1, -1):
            bits.append((value >> i) & 1)

    append(0b0100, 4)                       # 8 ビットバイトモード
    append(len(data), _char_count_bits(version))
    for b in data:
        append(b, 8)

    capacity_bits = _data_codewords(version, ecc) * 8
    append(0, min(4, capacity_bits - len(bits)))     # 終端子
    append(0, (8 - len(bits) % 8) % 8)               # バイト境界まで 0 埋め

    # 残りは 0xEC / 0x11 を交互に詰める（規格で決まっている埋め草）
    for pad in (0xEC, 0x11) * ((capacity_bits - len(bits)) // 16 + 1):
        if len(bits) >= capacity_bits:
            break
        append(pad, 8)

    return bytes(
        int("".join(str(b) for b in bits[i:i + 8]), 2) for i in range(0, len(bits), 8)
    )


def _add_ecc_and_interleave(data: bytes, version: int, ecc: str) -> bytes:
    """ブロックに分けて誤り訂正を付け、規格どおりの順番に並べ替える。"""
    num_blocks = _NUM_BLOCKS[ecc][version]
    ecc_len = _ECC_PER_BLOCK[ecc][version]
    raw_codewords = _raw_data_modules(version) // 8
    num_short = num_blocks - raw_codewords % num_blocks
    short_len = raw_codewords // num_blocks

    divisor = _rs_divisor(ecc_len)
    blocks: list[bytearray] = []
    pos = 0
    for i in range(num_blocks):
        length = short_len - ecc_len + (0 if i < num_short else 1)
        chunk = bytearray(data[pos:pos + length])
        pos += length
        parity = _rs_remainder(bytes(chunk), divisor)
        if i < num_short:
            # 短いブロックに 1 バイト詰めて長さをそろえる。下の並べ替えで読み飛ばす
            chunk.append(0)
        blocks.append(chunk + bytearray(parity))

    result = bytearray()
    for i in range(len(blocks[0])):
        for j, block in enumerate(blocks):
            if i != short_len - ecc_len or j >= num_short:
                result.append(block[i])
    return bytes(result)


# ---------------------------------------------------------------------------
# 4. 行列の組み立て
# ---------------------------------------------------------------------------

class _Matrix:
    """QR コードのモジュール（True = 黒）を持つ正方行列。"""

    def __init__(self, version: int, ecc: str) -> None:
        self.version = version
        self.ecc = ecc
        self.size = version * 4 + 17
        self.modules = [[False] * self.size for _ in range(self.size)]
        # 機能パターン（データを置けない場所）の印
        self.reserved = [[False] * self.size for _ in range(self.size)]

    # --- 機能パターン ---------------------------------------------------
    def _set_function(self, x: int, y: int, dark: bool) -> None:
        self.modules[y][x] = dark
        self.reserved[y][x] = True

    def _draw_finder(self, cx: int, cy: int) -> None:
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                x, y = cx + dx, cy + dy
                if 0 <= x < self.size and 0 <= y < self.size:
                    self._set_function(x, y, max(abs(dx), abs(dy)) not in (2, 4))

    def _draw_alignment(self, cx: int, cy: int) -> None:
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                self._set_function(cx + dx, cy + dy, max(abs(dx), abs(dy)) != 1)

    def draw_function_patterns(self) -> None:
        for i in range(self.size):
            self._set_function(6, i, i % 2 == 0)   # タイミングパターン（縦）
            self._set_function(i, 6, i % 2 == 0)   # タイミングパターン（横）
        self._draw_finder(3, 3)
        self._draw_finder(self.size - 4, 3)
        self._draw_finder(3, self.size - 4)

        positions = _alignment_positions(self.version)
        last = len(positions) - 1
        for i, py in enumerate(positions):
            for j, px in enumerate(positions):
                # 3 隅は切り出しパターンと重なるので置かない
                if (i, j) not in ((0, 0), (0, last), (last, 0)):
                    self._draw_alignment(px, py)

        self.draw_format_bits(0)   # 位置を予約するための仮置き
        self._draw_version_bits()

    def draw_format_bits(self, mask: int) -> None:
        value = _ECC_FORMAT_BITS[self.ecc] << 3 | mask
        rem = value
        for _ in range(10):
            rem = (rem << 1) ^ ((rem >> 9) * 0x537)
        bits = (value << 10 | rem) ^ 0x5412

        def bit(i: int) -> bool:
            return (bits >> i) & 1 != 0

        for i in range(6):
            self._set_function(8, i, bit(i))
        self._set_function(8, 7, bit(6))
        self._set_function(8, 8, bit(7))
        self._set_function(7, 8, bit(8))
        for i in range(9, 15):
            self._set_function(14 - i, 8, bit(i))

        for i in range(8):
            self._set_function(self.size - 1 - i, 8, bit(i))
        for i in range(8, 15):
            self._set_function(8, self.size - 15 + i, bit(i))
        self._set_function(8, self.size - 8, True)   # 必ず黒になるモジュール

    def _draw_version_bits(self) -> None:
        if self.version < 7:
            return
        rem = self.version
        for _ in range(12):
            rem = (rem << 1) ^ ((rem >> 11) * 0x1F25)
        bits = self.version << 12 | rem
        for i in range(18):
            dark = (bits >> i) & 1 != 0
            a, b = self.size - 11 + i % 3, i // 3
            self._set_function(a, b, dark)
            self._set_function(b, a, dark)

    # --- データの配置 ---------------------------------------------------
    def draw_codewords(self, codewords: bytes) -> None:
        """右下から 2 列ずつ、蛇行しながら置いていく。"""
        i = 0
        for right in range(self.size - 1, 0, -2):
            if right <= 6:
                right -= 1          # 6 列目はタイミングパターンなので飛ばす
            for vert in range(self.size):
                for j in range(2):
                    x = right - j
                    upward = (right + 1) & 2 == 0
                    y = (self.size - 1 - vert) if upward else vert
                    if not self.reserved[y][x] and i < len(codewords) * 8:
                        self.modules[y][x] = (codewords[i >> 3] >> (7 - (i & 7))) & 1 != 0
                        i += 1
        # 余ったモジュール（剰余ビット）は白のままでよい

    # --- マスク ---------------------------------------------------------
    def apply_mask(self, mask: int) -> None:
        for y in range(self.size):
            for x in range(self.size):
                if self.reserved[y][x]:
                    continue
                if mask == 0:
                    invert = (x + y) % 2 == 0
                elif mask == 1:
                    invert = y % 2 == 0
                elif mask == 2:
                    invert = x % 3 == 0
                elif mask == 3:
                    invert = (x + y) % 3 == 0
                elif mask == 4:
                    invert = (x // 3 + y // 2) % 2 == 0
                elif mask == 5:
                    invert = x * y % 2 + x * y % 3 == 0
                elif mask == 6:
                    invert = (x * y % 2 + x * y % 3) % 2 == 0
                else:
                    invert = ((x + y) % 2 + x * y % 3) % 2 == 0
                if invert:
                    self.modules[y][x] = not self.modules[y][x]

    # --- マスクの良し悪しを測る（規格の減点法）---------------------------
    @staticmethod
    def _finder_like(history: list[int]) -> int:
        """1:1:3:1:1 の並び（切り出しパターンと紛らわしい形）を数える。"""
        n = history[1]
        core = n > 0 and history[2] == history[4] == history[5] == n and history[3] == n * 3
        return (1 if core and history[0] >= n * 4 and history[6] >= n else 0) + (
            1 if core and history[6] >= n * 4 and history[0] >= n else 0
        )

    def _push_history(self, run: int, history: list[int]) -> None:
        if history[0] == 0:
            run += self.size        # 端は白が続いているものとして扱う
        history.pop()
        history.insert(0, run)

    def _finish_line(self, color: bool, run: int, history: list[int]) -> int:
        if color:
            self._push_history(run, history)
            run = 0
        run += self.size
        self._push_history(run, history)
        return self._finder_like(history)

    def penalty(self) -> int:
        size, modules = self.size, self.modules
        score = 0

        for axis in range(2):   # 0 = 行、1 = 列
            for a in range(size):
                color, run, history = False, 0, [0] * 7
                for b in range(size):
                    cell = modules[a][b] if axis == 0 else modules[b][a]
                    if cell == color:
                        run += 1
                        if run == 5:
                            score += _PENALTY_N1
                        elif run > 5:
                            score += 1
                    else:
                        self._push_history(run, history)
                        if not color:
                            score += self._finder_like(history) * _PENALTY_N3
                        color, run = cell, 1
                score += self._finish_line(color, run, history) * _PENALTY_N3

        for y in range(size - 1):
            for x in range(size - 1):
                c = modules[y][x]
                if c == modules[y][x + 1] == modules[y + 1][x] == modules[y + 1][x + 1]:
                    score += _PENALTY_N2

        dark = sum(row.count(True) for row in modules)
        total = size * size
        # 黒の割合が 50% からどれだけ離れているかを 5% 刻みで数える
        k = (abs(dark * 20 - total * 10) + total - 1) // total - 1
        return score + k * _PENALTY_N4


def encode(
    text: str, ecc: str = "M", min_version: int = 1, mask: int | None = None
) -> list[list[bool]]:
    """文字列を QR コードのモジュール行列にする。

    `mask` を指定すると 8 種類のマスクから選ばずにそれを使う。**検証専用**。
    どのマスクを選ぶかは規格が減点法で決めているが、実装ごとに解釈が少し違う
    （libqrencode とこちらで結果が割れることがある）。verify_qr.sh が
    「マスク以外は完全に同じか」を確かめるために使う。
    """
    if ecc not in _ECC_PER_BLOCK:
        raise ValueError(f"誤り訂正レベルは L / M / Q / H のいずれかです（指定: {ecc}）")
    if mask is not None and not 0 <= mask <= 7:
        raise ValueError(f"マスクは 0〜7 です（指定: {mask}）")
    data = text.encode("utf-8")
    version = _choose_version(data, ecc, min_version)

    codewords = _add_ecc_and_interleave(_build_codewords(data, version, ecc), version, ecc)

    best: tuple[int, list[list[bool]]] | None = None
    for mask in range(8) if mask is None else (mask,):
        matrix = _Matrix(version, ecc)
        matrix.draw_function_patterns()
        matrix.draw_codewords(codewords)
        matrix.apply_mask(mask)
        matrix.draw_format_bits(mask)
        score = matrix.penalty()
        if best is None or score < best[0]:
            best = (score, matrix.modules)
    assert best is not None
    return best[1]


def read_mask(matrix: list[list[bool]]) -> int:
    """出来上がった行列の形式情報から、使われているマスク番号を読み取る。

    verify_qr.sh が参照実装と条件をそろえるために使う。
    """
    positions = [(8, i) for i in range(6)] + [(8, 7), (8, 8), (7, 8)] + [(14 - i, 8) for i in range(9, 15)]
    bits = 0
    for i, (x, y) in enumerate(positions):
        if matrix[y][x]:
            bits |= 1 << i
    return ((bits ^ 0x5412) >> 10) & 0b111


# ---------------------------------------------------------------------------
# 5. PNG の書き出し（8 ビットグレースケール）
# ---------------------------------------------------------------------------

def _chunk(tag: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def write_png(path: str, matrix: list[list[bool]], scale: int, margin: int) -> tuple[int, int]:
    """モジュール行列を PNG として書き出し、(画素幅, モジュール数) を返す。"""
    size = len(matrix)
    width = (size + margin * 2) * scale
    blank = b"\xff" * width

    raw = bytearray()
    for _ in range(margin * scale):
        raw.append(0)       # フィルタ種別 0（None）
        raw += blank
    for row in matrix:
        line = bytearray(b"\xff" * (margin * scale))
        for cell in row:
            line += (b"\x00" if cell else b"\xff") * scale
        line += b"\xff" * (margin * scale)
        for _ in range(scale):
            raw.append(0)
            raw += line
    for _ in range(margin * scale):
        raw.append(0)
        raw += blank

    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", struct.pack(">IIBBBBB", width, width, 8, 0, 0, 0, 0))
        + _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)
    return width, size


def to_ascii(matrix: list[list[bool]], margin: int = 2) -> str:
    """端末で目視確認するための粗い表示（1 文字 = 1 モジュール）。"""
    size = len(matrix)
    pad = "  " * (size + margin * 2)
    lines = [pad] * margin
    for row in matrix:
        lines.append("  " * margin + "".join("██" if c else "  " for c in row) + "  " * margin)
    lines += [pad] * margin
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 6. コマンドライン
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="公開 URL から QR コードの PNG を作る（プレゼン資料用）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "例:\n"
            "  python3 make_qr.py https://example-machine.example-tailnet.ts.net\n"
            "  python3 make_qr.py https://example.ts.net -o slide-qr.png --scale 16 --preview\n"
        ),
    )
    parser.add_argument("url", help="QR コードにする URL（そのまま埋め込む）")
    parser.add_argument("-o", "--output", default="chizuba-qr.png", help="出力ファイル名（既定: chizuba-qr.png）")
    parser.add_argument("-s", "--scale", type=int, default=12, help="1 モジュールの画素数（既定: 12）")
    parser.add_argument("-m", "--margin", type=int, default=4, help="余白のモジュール数（既定: 4。規格の最小値）")
    parser.add_argument("-l", "--ecc", default="M", choices=["L", "M", "Q", "H"],
                        help="誤り訂正レベル（既定: M。汚れや反射に強くしたいなら Q / H）")
    parser.add_argument("-v", "--min-version", type=int, default=1, choices=range(1, 41), metavar="1-40",
                        help="最小バージョン（既定: 1。大きくすると細かい格子になる）")
    parser.add_argument("--preview", action="store_true", help="端末にも QR を表示する")
    args = parser.parse_args(argv)

    if args.scale < 1:
        parser.error("--scale は 1 以上にしてください")
    if args.margin < 0:
        parser.error("--margin は 0 以上にしてください")
    if args.margin < 4:
        print("警告: 余白が 4 モジュール未満です。読み取れないカメラがあります。", file=sys.stderr)

    try:
        matrix = encode(args.url, args.ecc, args.min_version)
    except ValueError as e:
        print(f"エラー: {e}", file=sys.stderr)
        return 1

    width, modules = write_png(args.output, matrix, args.scale, args.margin)
    version = (modules - 17) // 4

    if args.preview:
        print(to_ascii(matrix))
    print(f"書き出しました: {args.output}")
    print(f"  URL      : {args.url}")
    print(f"  バージョン: {version}（{modules} × {modules} モジュール）／ 誤り訂正 {args.ecc}")
    print(f"  画像サイズ: {width} × {width} px（余白 {args.margin} モジュール）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
