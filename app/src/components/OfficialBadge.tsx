import { ShieldCheck } from "lucide-react";

/**
 * **行政が出したものだと分かる印**（F-7）。
 *
 * 住民の投稿と行政の投稿・行政の回答を、本文を読まなくても見分けられるようにする。
 * 使う場所は 4 つあり、どこも同じ青（`#0072b2`）でなければ意味がない。
 * 地図のピンの輪（`MapView` の `OFFICIAL_COLOR`）とも同じ色にそろえてある
 * ── ただし **Tailwind の任意値（`bg-[#0072b2]`）は class に直接書かないと拾われない**ので、
 * JS の定数を共有することはできず、この色は「同じ値を書く」形でしか揃えられない。
 *
 * `label` を渡し分けるのは、同じ印でも指すものが違うため
 * （投稿そのもの／その投稿への回答）。
 */
/** 印の大きさ。**画面の中で 2 種類しか使わない**（`DemoBadge` も同じ 2 段階）。
 *
 *   - 既定 … 見出しの帯に置く版。折り返しても字が縦に潰れないよう縮ませない
 *   - compact … 本文の中に混ぜる版。周りの小さな文字に合わせて一回り小さくする
 */
function badgeSize(compact: boolean): string {
  return compact
    ? "px-1.5 py-0.5 text-[10px]"
    : "shrink-0 px-2 py-0.5 text-[10.5px] whitespace-nowrap";
}

export function OfficialBadge({ label, compact = false }: { label: string; compact?: boolean }) {
  const size = badgeSize(compact);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#0072b2] font-medium text-white ${size}`}
    >
      <ShieldCheck aria-hidden className="size-3" />
      {label}
    </span>
  );
}

/**
 * 名前に添える「行政」の印。
 *
 * `OfficialBadge` が「何が公式か」を言うのに対し、こちらは**誰か**に付く
 * （投稿者・コメント者・いまログインしている自分）。名前のすぐ横に出るので、
 * 盾のアイコンは付けず字だけにしてある。
 */
export function OfficialRoleBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`rounded-full bg-[#0072b2] font-medium text-white ${badgeSize(compact)}`}>
      行政
    </span>
  );
}
