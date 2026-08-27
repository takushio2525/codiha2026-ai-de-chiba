"use client";

import { CalendarRange, X } from "lucide-react";

import {
  RANGE_PRESETS,
  describeRange,
  hasRange,
  matchingPreset,
  normalizeRange,
  rangeFromPreset,
  type DateRange,
} from "@/lib/reportRange";

type Props = {
  range: DateRange;
  onChange: (range: DateRange) => void;
  /** いまの期間で地図に出ている投稿の件数。0 件のときに黙らせないために出す */
  count: number;
};

/**
 * 投稿を**投稿日の範囲**で絞る操作（浸水実績アーカイブ）。
 *
 * 「あの雨の日、どこが冠水したか」を後から引くための入り口。CHIZUBA が溜めているのは
 * 実績であって予測ではないので、ここでも**過去を遡る**言い方しかしない
 * （docs/design/requirements.md 3-1）。
 *
 * **375px 幅を先に決めた。** 近道は 4 つまでにして折り返し 2 行に収め、
 * 日付の入力欄は縦に積まず 2 列にしてある（iOS / Android の日付ピッカーは
 * 入力欄の幅に関係なく全画面で出るので、幅を削っても操作性が落ちない）。
 */
export default function DateRangeFilter({ range, onChange, count }: Props) {
  const active = matchingPreset(range);

  return (
    <section className="border-t border-line px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted">
          <CalendarRange aria-hidden className="size-3.5" />
          期間でしぼる
        </h2>
        {hasRange(range) ? (
          <button
            type="button"
            onClick={() => onChange({ from: null, to: null })}
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-ink-sub underline decoration-line underline-offset-2 transition hover:text-ink hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <X aria-hidden className="size-3" />
            解除
          </button>
        ) : null}
      </div>

      <div role="group" aria-label="期間の近道" className="mt-2 flex flex-wrap gap-1.5">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(rangeFromPreset(preset.id))}
            aria-pressed={active === preset.id}
            className={[
              "rounded-full border px-3 py-2 text-[12px] font-medium transition",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              active === preset.id
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-ink-sub hover:border-ink-muted/40 hover:text-ink",
            ].join(" ")}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-ink-muted">開始日</span>
          <input
            type="date"
            value={range.from ?? ""}
            max={range.to ?? undefined}
            onChange={(event) => onChange(normalizeRange(event.target.value, range.to))}
            className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[12px] text-ink transition focus:border-ink focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-ink-muted">終了日</span>
          <input
            type="date"
            value={range.to ?? ""}
            min={range.from ?? undefined}
            onChange={(event) => onChange(normalizeRange(range.from, event.target.value))}
            className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[12px] text-ink transition focus:border-ink focus:outline-none"
          />
        </label>
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
        {describeRange(range)}の投稿{" "}
        <strong className="font-semibold text-ink-sub tabular-nums">{count}</strong> 件
        {count === 0 && hasRange(range) ? "（この期間の投稿はありません）" : null}
      </p>
    </section>
  );
}
