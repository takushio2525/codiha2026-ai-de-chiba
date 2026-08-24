/** 投稿写真の実体の置き場。**サーバー側からしか読み込まないこと**（Node.js の fs を使う）。
 *
 * 実体は named volume（`uploads`）に置き、DB にはファイル名だけを記録する
 * （.agent/architecture.md「投稿写真の保存」）。DB の行が軽くなり、一覧の取得が速い。
 *
 * **コンテナでは `/app/uploads` が `node` 所有になっている必要がある**。
 * Dockerfile の runner ステージで先に作って chown してあり、named volume は
 * 空のときに中身と所有者をイメージから引き継ぐ。これを忘れると volume が
 * root 所有になり、`USER node` で書けなくなる。
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { ALLOWED_PHOTO_TYPES, type PhotoMimeType } from "./reports";

/** 写真の置き場（作業ディレクトリ直下）。
 *
 * コンテナでは WORKDIR が `/app` なので `/app/uploads` になり、
 * compose.yaml がそこに named volume をマウントする。
 * 手元で `npm run dev` したときは `app/uploads/`（.gitignore 済み）。
 *
 * **パスは環境変数で差し替えない。** Next のビルドはファイル操作のパスを静的に追う作りで、
 * 追えないと「プロジェクト全体を出力に同梱する」動きになり、実行イメージが膨らむ。
 * `path.join(process.cwd(), UPLOADS_SUBDIR, ...)` の形をそのまま書くのはそのため。 */
const UPLOADS_SUBDIR = "uploads";

/** 保存する拡張子。ファイル名は自分で作るので、投稿された名前は使わない。 */
const EXTENSIONS: Record<PhotoMimeType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** ファイルの先頭バイトから形式を判定する。
 *
 * ブラウザが申告する MIME タイプは書き換えられるので、**中身も確かめる**。
 * 画像以外を「画像です」と言って置いていかれるのを防ぐための最低限の検査
 * （docs/design/requirements.md 10-1「入力の健全性として必ず入れる」）。
 */
export function sniffImageType(bytes: Uint8Array): PhotoMimeType | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= PNG.length && PNG.every((b, i) => bytes[i] === b)) {
    return "image/png";
  }
  // WebP: "RIFF" ....（サイズ 4 バイト）"WEBP"
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  return null;
}

export function isAllowedPhotoType(value: string): value is PhotoMimeType {
  return (ALLOWED_PHOTO_TYPES as readonly string[]).includes(value);
}

/** 写真を 1 枚保存し、DB に記録するファイル名を返す。 */
export async function savePhoto(bytes: Uint8Array, mimeType: PhotoMimeType): Promise<string> {
  await mkdir(path.join(process.cwd(), UPLOADS_SUBDIR), { recursive: true });
  const fileName = `${randomUUID()}${EXTENSIONS[mimeType]}`;
  await writeFile(path.join(process.cwd(), UPLOADS_SUBDIR, fileName), bytes);
  return fileName;
}

/** 保存済みの写真を読む。無ければ null（消えていても API は 404 を返すだけにする）。 */
export async function readPhoto(fileName: string): Promise<Buffer | null> {
  const base = safeName(fileName);
  if (!base) return null;
  try {
    return await readFile(path.join(process.cwd(), UPLOADS_SUBDIR, base));
  } catch {
    return null;
  }
}

/** 写真を消す。無くても失敗にしない（投稿の削除と DB 失敗時の後片付けで使う）。 */
export async function removePhotos(fileNames: readonly string[]): Promise<void> {
  await Promise.all(
    fileNames.map(async (name) => {
      const base = safeName(name);
      if (!base) return;
      try {
        await unlink(path.join(process.cwd(), UPLOADS_SUBDIR, base));
      } catch {
        // 既に無い・権限が無いなどは握りつぶす。呼び出し側の本筋（投稿の削除・
        // ロールバック）を止めるほどの失敗ではない
      }
    }),
  );
}

/** ファイル名を uploads の中に閉じ込める。`..` などでディレクトリを抜けさせない。 */
function safeName(fileName: string): string | null {
  const base = path.basename(fileName);
  if (!base || base === "." || base === "..") return null;
  return base;
}
