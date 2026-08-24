"use client";

import {
  Baby,
  ChevronDown,
  HeartPulse,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Shield,
  type LucideIcon,
} from "lucide-react";

import type { LngLat } from "@/lib/geo";
import { LAYERS, type IconName, type LayerId } from "@/lib/layers";
import type { WalkingRoute } from "@/lib/routing";
import RouteCard from "./RouteCard";

const ICONS: Record<IconName, LucideIcon> = {
  shield: Shield,
  heartPulse: HeartPulse,
  baby: Baby,
};

export type Busy = "idle" | "locating" | "routing";

type Props = {
  counts: Record<LayerId, number>;
  visible: Record<LayerId, boolean>;
  onToggleLayer: (id: LayerId) => void;
  origin: LngLat | null;
  pickMode: boolean;
  onTogglePickMode: () => void;
  onNavigateNearest: () => void;
  busy: Busy;
  route: WalkingRoute | null;
  onClearRoute: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  ref?: React.Ref<HTMLElement>;
};

export default function ControlPanel({
  counts,
  visible,
  onToggleLayer,
  origin,
  pickMode,
  onTogglePickMode,
  onNavigateNearest,
  busy,
  route,
  onClearRoute,
  collapsed,
  onToggleCollapsed,
  ref,
}: Props) {
  const anyVisible = LAYERS.some((layer) => visible[layer.id]);

  return (
    <aside
      ref={ref}
      className={[
        "pointer-events-auto absolute z-10 overflow-hidden rounded-2xl border border-line",
        "bg-white/95 shadow-[0_20px_50px_-28px_rgb(0_0_0/0.6)] backdrop-blur-sm",
        // スマホは下からせり上がるシート、タブレット以上は左の固定パネル
        "inset-x-3 bottom-3 md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:w-[21.5rem]",
        "md:flex md:flex-col",
      ].join(" ")}
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] leading-tight font-semibold tracking-tight text-ink">
            市川市 オープンデータマップ
          </h1>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
            避難場所・AED・子育て施設と、そこまでの徒歩経路
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "操作パネルを開く" : "操作パネルを閉じる"}
          className="shrink-0 rounded-lg p-1.5 text-ink-muted transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:hidden"
        >
          <ChevronDown
            aria-hidden
            className={`size-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </header>

      <div
        className={[
          "overflow-y-auto border-t border-line md:block md:flex-1",
          collapsed ? "hidden" : "block",
          "max-h-[58dvh] md:max-h-none",
        ].join(" ")}
      >
        {route ? (
          <section className="border-b border-line bg-[#fbfbfa] px-4 py-3.5">
            <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-ink-muted">徒歩ナビの結果</h2>
            <RouteCard route={route} onClear={onClearRoute} />
          </section>
        ) : null}

        <section className="px-4 py-3.5">
          <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted">表示するデータ</h2>
          <ul className="mt-2 space-y-1.5">
            {LAYERS.map((layer) => {
              const Icon = ICONS[layer.icon];
              const on = visible[layer.id];
              return (
                <li key={layer.id}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => onToggleLayer(layer.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-lg transition"
                      style={{
                        backgroundColor: on ? layer.color : "#f1f2f4",
                        color: on ? "#ffffff" : "#9aa0a8",
                      }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className="truncate text-[13.5px] font-semibold text-ink">
                          {layer.label}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-muted tabular-nums">
                          {counts[layer.id]} 件
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-ink-muted">
                        {layer.summary}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-ink" : "bg-[#d5d8dc]"}`}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-t border-line px-4 py-3.5">
          <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted">徒歩ナビ</h2>

          <div className="mt-2 space-y-1.5">
            <button
              type="button"
              onClick={onNavigateNearest}
              disabled={busy !== "idle" || !anyVisible}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#31353d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === "idle" ? (
                <Navigation aria-hidden className="size-4" />
              ) : (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              )}
              {busy === "locating"
                ? "現在地を取得中…"
                : busy === "routing"
                  ? "経路を計算中…"
                  : "現在地から最寄りの地点へ"}
            </button>

            <button
              type="button"
              onClick={onTogglePickMode}
              aria-pressed={pickMode}
              className={[
                "flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                pickMode
                  ? "border-ink bg-ink/5 text-ink"
                  : "border-line text-ink-sub hover:border-ink-muted/40 hover:bg-[#fafafa]",
              ].join(" ")}
            >
              {pickMode ? (
                <MapPin aria-hidden className="size-4" />
              ) : (
                <LocateFixed aria-hidden className="size-4" />
              )}
              {pickMode ? "地図をクリックして出発地点を指定" : "出発地点を地図で指定する"}
            </button>
          </div>

          {!anyVisible ? (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
              データを 1 つ以上表示すると、最寄りの地点を探せます。
            </p>
          ) : null}

          {origin ? (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted tabular-nums">
              出発地点: {origin[1].toFixed(5)}, {origin[0].toFixed(5)}
            </p>
          ) : null}

        </section>

        <footer className="border-t border-line bg-[#fafafa] px-4 py-3 text-[11px] leading-relaxed text-ink-muted">
          出典: 市川市オープンデータ（CC BY 4.0）／背景地図 国土地理院／経路 OSRM・
          <span className="whitespace-nowrap">&copy; OpenStreetMap contributors</span>。
          <a
            href="/about"
            className="ml-1 font-medium text-ink underline decoration-line underline-offset-2 transition hover:decoration-ink"
          >
            詳しい出典
          </a>
        </footer>
      </div>
    </aside>
  );
}
