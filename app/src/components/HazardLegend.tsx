import { TriangleAlert } from "lucide-react";

import { HAZARD_CAUTIONS, type HazardLegendDef } from "@/lib/hazards";

type Props = {
  /** 出す凡例。表示中のレイヤーが使っているものだけを渡す */
  legends: HazardLegendDef[];
  /** 出典の 1 行を添えるか（/about には出典の一覧が別にあるので添えない） */
  withSource?: boolean;
};

/** ハザードの凡例。地図の操作パネルと /about の両方で同じものを使う。
 *
 * **浸水想定は「深さ」、土砂災害は「区域の種別」**と意味が違うので、凡例は
 * `legends` に渡されたものをそのまま別々の塊として並べる（1 つにまとめない）。 */
export default function HazardLegend({ legends, withSource = false }: Props) {
  if (legends.length === 0) return null;

  return (
    <div className="space-y-3">
      {legends.map((legend) => (
        <div key={legend.id}>
          <p className="text-[11px] font-semibold text-ink-sub">{legend.title}</p>
          {/* 既定は 2 列に畳む。段階が 8 つある津波・高潮でも操作パネルの縦を食いすぎない。
              ラベルが長い土砂災害だけ 1 列にする（375px で折り返して色見本とずれるため）。
              **Tailwind は class を文字列として拾う**ので、組み立てずに三項で書き分ける */}
          <ul
            className={`mt-1.5 grid gap-x-3 gap-y-1 ${
              legend.columns === 1 ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {legend.classes.map((cls) => (
              <li key={cls.color} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-3 w-6 shrink-0 rounded-[3px] border border-black/15"
                  style={{ backgroundColor: cls.color }}
                />
                <span className="text-[11px] leading-tight text-ink-sub tabular-nums">
                  {cls.label}
                </span>
              </li>
            ))}
          </ul>
          {legend.note ? (
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-muted">{legend.note}</p>
          ) : null}
        </div>
      ))}

      <div className="flex gap-1.5 rounded-lg bg-[#fdf6e8] px-2.5 py-2">
        <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0 text-[#b45309]" />
        <ul className="space-y-1 text-[10.5px] leading-relaxed text-[#7c4a03]">
          {HAZARD_CAUTIONS.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </div>

      {withSource ? (
        <p className="text-[10.5px] leading-relaxed text-ink-muted">
          出典:「
          <a
            href="https://disaportal.gsi.go.jp/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
          >
            ハザードマップポータルサイト
          </a>
          」（国土交通省）
        </p>
      ) : null}
    </div>
  );
}
