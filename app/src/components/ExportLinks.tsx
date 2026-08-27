import { Download, FileJson, Sheet } from "lucide-react";

import { exportHref } from "@/lib/reportExport";
import type { DateRange } from "@/lib/reportRange";
import type { ReportCategory } from "@/lib/reports";

type Props = {
  city: string;
  /** いま画面で絞っている期間。そのまま書き出しの条件になる */
  range: DateRange;
  /** いま画面で絞っているカテゴリ。全部なら null */
  category?: ReportCategory | null;
  /** いま画面で絞っている検索語。空なら絞らない */
  query?: string;
};

/**
 * 投稿を**オープンデータとして持ち帰る**ためのリンク（S-5 と地図の操作パネル）。
 *
 * CHIZUBA が普通の投稿サイトと違うのはここで、**行政が公開したデータを住民が使う**
 * 一方通行ではなく、**住民が寄せた情報も誰でも持ち出せる**。
 * 出すのは画面で読める情報だけで、投稿者の内部 ID は含めない。
 *
 * `<a download>` ではなくサーバーの `Content-Disposition` に任せている
 * （ファイル名の付け方を 1 箇所に集めるため）。
 * リンクなので **JavaScript が無くても動く**。
 */
export default function ExportLinks({ city, range, category = null, query = "" }: Props) {
  const shared = { city, from: range.from, to: range.to, category, q: query };
  const style =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[12px] font-medium text-ink-sub transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted">
        <Download aria-hidden className="size-3.5" />
        オープンデータとして持ち帰る
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        いま絞り込んでいる条件のまま書き出します。投稿者の表示名までを含み、
        アカウントの情報は含みません。
      </p>
      <div className="mt-2 flex gap-1.5">
        <a href={exportHref({ ...shared, format: "csv" })} className={style}>
          <Sheet aria-hidden className="size-3.5" />
          CSV
        </a>
        <a href={exportHref({ ...shared, format: "geojson" })} className={style}>
          <FileJson aria-hidden className="size-3.5" />
          GeoJSON
        </a>
      </div>
    </div>
  );
}
