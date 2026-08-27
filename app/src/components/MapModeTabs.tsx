"use client";

import { Camera, ShieldAlert, type LucideIcon } from "lucide-react";

import { MAP_MODES, type MapMode, type MapModeIconName } from "@/lib/mapModes";

const ICONS: Record<MapModeIconName, LucideIcon> = {
  shieldAlert: ShieldAlert,
  camera: Camera,
};

type Props = {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
};

/** 防災マップ（S-1）と観光マップ（S-2）の切り替えタブ。
 *
 * **ヘッダーのすぐ下に置いて、地図より先に目に入るようにしている。**
 * CHIZUBA は防災と観光という性格の違う 2 つの用途を 1 枚の地図に載せるので、
 * 「いまどちらを見ているか」が分からないと地図が読めなくなる
 * （docs/design/requirements.md §6・§4「統一しない部分」）。
 *
 * 中身の切り替え（どのレイヤーを出すか）は `lib/mapModes.ts` が持つ。
 * ここは見た目と操作だけを受け持つ。
 */
export default function MapModeTabs({ mode, onChange }: Props) {
  return (
    <nav
      aria-label="地図の種類"
      className="flex shrink-0 items-stretch gap-1 border-b border-line bg-surface px-2 sm:px-3"
    >
      {MAP_MODES.map((item) => {
        const Icon = ICONS[item.icon];
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            // タブなので、押せる状態と選ばれている状態を両方読み上げさせる
            aria-current={active ? "page" : undefined}
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={[
              "group relative flex min-w-0 items-center gap-2 px-3 py-2.5 sm:px-4",
              "text-[13px] font-semibold transition",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
              active ? "text-ink" : "text-ink-muted hover:text-ink-sub",
            ].join(" ")}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{item.label}マップ</span>
            {/* 幅に余裕があるときだけ、そのタブで何が見えるかを添える */}
            <span className="hidden truncate text-[11.5px] font-normal text-ink-muted lg:inline">
              {item.summary}
            </span>
            {/* 選択中の下線。タブの境界線に重ねる */}
            <span
              aria-hidden
              className={[
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition",
                active ? "bg-ink" : "bg-transparent group-hover:bg-line",
              ].join(" ")}
            />
          </button>
        );
      })}
    </nav>
  );
}
