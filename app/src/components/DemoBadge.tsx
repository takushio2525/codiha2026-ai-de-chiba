import Link from "next/link";
import { FlaskConical } from "lucide-react";

/**
 * **デモ投稿の印。**
 *
 * 初回起動の時点で入っている投稿（`app/db/init/003_seed_demo_reports.sql`）に付ける。
 * 審査員が起動した直後から F-2〜F-7 が動いて見えるように用意したデータで、
 * **実際の通報でも、実際に起きた被害の記録でもない**。
 *
 * 本文の末尾にも同じ断りを書いてあるが、一覧では本文が 2 行で切れるので、
 * **見出しの並びにバッジを置いて、読まなくても分かる**ようにしている。
 *
 * 色は行政の公式バッジ（#0072b2）とも、投稿カテゴリの 3 色（#e69f00・#56b4e9・#cc79a7）
 * とも重ならない灰色にしてある。デモである断りが、カテゴリの表示とぶつからないように。
 */
export function DemoBadge({ compact = false }: { compact?: boolean }) {
  const size = compact
    ? "px-1.5 py-0.5 text-[10px]"
    : "px-2 py-0.5 text-[10.5px] whitespace-nowrap";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#5b6270] font-medium text-white ${size}`}
    >
      <FlaskConical aria-hidden className="size-3" />
      デモ投稿
    </span>
  );
}

/**
 * 詳細パネル（S-3）に出す、デモ投稿についての断り。
 *
 * バッジだけでは**写真の出どころ**まで辿れないので、ここから `/about` に繋ぐ。
 * 掲載している写真はすべて再利用が許されたもので、作者とライセンスを
 * `/about` の「デモ投稿の写真」に並べてある。
 */
export function DemoNote() {
  return (
    <section className="mt-3 rounded-xl border border-dashed border-line bg-canvas px-3 py-2.5">
      <p className="text-[11.5px] leading-relaxed text-ink-sub">
        <span className="font-semibold text-ink">これは CHIZUBA のデモ投稿です。</span>
        起動した直後から機能を試せるように用意したもので、実際の通報ではありません。
        場所も内容も、実際に起きた被害を指すものではありません。
      </p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">
        写真は再利用が許されたものだけを使っています。作者とライセンスは{" "}
        <Link
          href="/about#demo-photos"
          className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
        >
          出典とライセンス
        </Link>
        {" "}にまとめてあります。
      </p>
    </section>
  );
}
