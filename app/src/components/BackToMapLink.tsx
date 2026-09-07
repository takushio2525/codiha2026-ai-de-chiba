import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * 地図（`/`）へ戻る 1 行のリンク。
 *
 * `/about`・`/privacy`・`/login` の 3 ページが**同じマークアップを写していた**。
 * どのページも地図から辿り着く子ページなので戻り先は必ず `/` で、
 * 写しのままだと当たる面積や文字の大きさがページごとにずれていく。
 *
 * 置き場所（`<main>` の先頭）は呼び出し側が決める。
 */
export default function BackToMapLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-sub transition hover:text-ink"
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      地図に戻る
    </Link>
  );
}
