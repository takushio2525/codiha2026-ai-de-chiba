import type { LucideIcon } from "lucide-react";

/**
 * 操作パネルの ON/OFF スイッチの「軌道」部分。
 *
 * 見た目だけの飾りなので `aria-hidden`。押せる状態と選ばれている状態は、
 * これを包む `role="switch"` のボタンが `aria-checked` で伝える。
 *
 * **`ToggleRow` に収まらない行（ハザードの重ね）からも使う。** あちらは
 * 件数を持たず、下に不透明度のスライダーが付くので行ごとは共通化できないが、
 * スイッチだけは同じものでなければ「押せるもの」の見え方が画面の中で食い違う。
 */
export function SwitchTrack({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-ink" : "bg-[#d5d8dc]"}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`}
      />
    </span>
  );
}

type Props = {
  /** lucide のアイコン。**色だけに頼らず形でも区別できる**ようにするためのもの */
  icon: LucideIcon;
  label: string;
  /** 地図に出ている件数 */
  count: number;
  /** 1 行の説明。狭い画面では truncate で切れる */
  summary: string;
  /** ON のときのアイコンの下地。地図の点と同じ色にする（`lib/*.ts` が正本） */
  color: string;
  on: boolean;
  onToggle: () => void;
};

/**
 * 「地図に出すものを 1 つ ON/OFF する行」（操作パネル）。
 *
 * オープンデータの施設レイヤー・景観スポット・投稿のカテゴリの 3 種類が、
 * **利用者から見ればどれも同じ「出す / 出さない」**なので、同じ形にそろえてある。
 * 3 か所に同じマークアップを写していたのをここにまとめた
 * （写しのままだと、押せる面積や truncate の有無が種類ごとにずれていく）。
 *
 * `<li>` は呼び出し側が置く（key の付け方が並びごとに違うため）。
 */
export function ToggleRow({ icon: Icon, label, count, summary, color, on, onToggle }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-lg transition"
        style={{
          backgroundColor: on ? color : "#f1f2f4",
          color: on ? "#ffffff" : "#9aa0a8",
        }}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate text-[13.5px] font-semibold text-ink">{label}</span>
          <span className="shrink-0 text-[11px] text-ink-muted tabular-nums">{count} 件</span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-ink-muted">
          {summary}
        </span>
      </span>
      <SwitchTrack on={on} />
    </button>
  );
}
