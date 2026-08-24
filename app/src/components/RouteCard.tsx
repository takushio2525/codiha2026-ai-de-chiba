"use client";

import { Footprints, Route as RouteIcon, TriangleAlert, X } from "lucide-react";

import { formatDistance, formatDuration } from "@/lib/geo";
import type { WalkingRoute } from "@/lib/routing";

/** 経路の結果。距離と所要時間は「探した理由そのもの」なので大きく出す。 */
export default function RouteCard({
  route,
  onClear,
}: {
  route: WalkingRoute;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-white shadow-[0_10px_24px_-18px_rgb(0_0_0/0.5)]">
      <div className="flex items-start gap-2 px-3.5 pt-3">
        <RouteIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-ink-muted">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: route.destination.color }}
            />
            {route.destination.kind}
          </p>
          <p className="truncate text-[13.5px] font-semibold text-ink">{route.destination.name}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="経路を消す"
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink-muted transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 divide-x divide-line border-t border-line">
        <div className="px-3.5 py-2.5">
          <p className="text-[11px] text-ink-muted">歩く距離</p>
          <p className="text-[22px] leading-tight font-semibold tracking-tight text-ink tabular-nums">
            {formatDistance(route.distanceMeters)}
          </p>
        </div>
        <div className="px-3.5 py-2.5">
          <p className="flex items-center gap-1 text-[11px] text-ink-muted">
            <Footprints aria-hidden className="size-3" />
            所要時間の目安
          </p>
          <p className="text-[22px] leading-tight font-semibold tracking-tight text-ink tabular-nums">
            {formatDuration(route.durationSeconds)}
          </p>
        </div>
      </div>

      {route.estimated ? (
        <p className="flex items-start gap-1.5 border-t border-line bg-[#fff8ec] px-3.5 py-2 text-[11.5px] leading-relaxed text-[#7a5200]">
          <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            経路を取得できませんでした（{route.note}）。
            直線距離と徒歩 4.8 km/h からの概算を表示しています。
          </span>
        </p>
      ) : (
        <p className="border-t border-line px-3.5 py-2 text-[11.5px] text-ink-muted">
          OpenStreetMap の道路データによる徒歩経路です。
        </p>
      )}
    </div>
  );
}
