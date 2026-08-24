"use client";

import Link from "next/link";
import {
  Baby,
  Camera,
  ChevronDown,
  CloudRain,
  Droplets,
  HeartPulse,
  Landmark,
  List,
  LoaderCircle,
  LocateFixed,
  LogIn,
  MapPin,
  Navigation,
  Plus,
  Shield,
  ShieldAlert,
  TriangleAlert,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

import type { LngLat } from "@/lib/geo";
import {
  HAZARDS,
  HAZARD_OPACITY_MAX,
  HAZARD_OPACITY_MIN,
  HAZARD_OPACITY_STEP,
  visibleHazardLegends,
  type HazardIconName,
  type HazardId,
} from "@/lib/hazards";
import { LAYERS, type IconName, type LayerId } from "@/lib/layers";
import { MAP_MODES, type MapMode, type MapModeIconName } from "@/lib/mapModes";
import {
  REPORT_CATEGORIES,
  reportCategoryDef,
  type ReportCategory,
  type ReportIconName,
} from "@/lib/reports";
import { SCENIC_CATEGORIES, SCENIC_LABEL, SCENIC_SUMMARY } from "@/lib/scenic";
import type { WalkingRoute } from "@/lib/routing";
import HazardLegend from "./HazardLegend";
import RouteCard from "./RouteCard";

const ICONS: Record<IconName, LucideIcon> = {
  shield: Shield,
  heartPulse: HeartPulse,
  baby: Baby,
};

const HAZARD_ICONS: Record<HazardIconName, LucideIcon> = {
  cloudRain: CloudRain,
  wind: Wind,
  waves: Waves,
};

const MODE_ICONS: Record<MapModeIconName, LucideIcon> = {
  shieldAlert: ShieldAlert,
  camera: Camera,
};

const REPORT_ICONS: Record<ReportIconName, LucideIcon> = {
  triangleAlert: TriangleAlert,
  droplets: Droplets,
  camera: Camera,
};

export type Busy = "idle" | "locating" | "routing";

type Props = {
  /** 地図のモード（S-1 防災 / S-2 観光）。表示するレイヤーの組が変わる */
  mode: MapMode;
  onChangeMode: (mode: MapMode) => void;
  counts: Record<LayerId, number>;
  visible: Record<LayerId, boolean>;
  onToggleLayer: (id: LayerId) => void;
  /** 景観スポット（F-5）の件数と表示 ON/OFF */
  scenicCount: number;
  scenicVisible: boolean;
  onToggleScenic: () => void;
  hazardVisible: Record<HazardId, boolean>;
  hazardOpacity: Record<HazardId, number>;
  onToggleHazard: (id: HazardId) => void;
  onChangeHazardOpacity: (id: HazardId, value: number) => void;
  origin: LngLat | null;
  pickMode: boolean;
  onTogglePickMode: () => void;
  onNavigateNearest: () => void;
  busy: Busy;
  route: WalkingRoute | null;
  onClearRoute: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** カテゴリごとの投稿の件数 */
  reportCounts: Record<ReportCategory, number>;
  reportVisible: Record<ReportCategory, boolean>;
  onToggleReportCategory: (id: ReportCategory) => void;
  /** いま投稿できるカテゴリ。モードごとに違う（`lib/mapModes.ts` が正本） */
  postableCategories: ReportCategory[];
  /** ログイン済みか。**表示の出し分けにしか使わない**（権限判定は API 側） */
  canPost: boolean;
  /** 投稿する場所を地図で指定してもらっている最中のカテゴリ。指定中でなければ null */
  pickingCategory: ReportCategory | null;
  onStartComposing: (category: ReportCategory) => void;
  ref?: React.Ref<HTMLElement>;
};

export default function ControlPanel({
  mode,
  onChangeMode,
  counts,
  visible,
  onToggleLayer,
  scenicCount,
  scenicVisible,
  onToggleScenic,
  hazardVisible,
  hazardOpacity,
  onToggleHazard,
  onChangeHazardOpacity,
  origin,
  pickMode,
  onTogglePickMode,
  onNavigateNearest,
  busy,
  route,
  onClearRoute,
  collapsed,
  onToggleCollapsed,
  reportCounts,
  reportVisible,
  onToggleReportCategory,
  postableCategories,
  canPost,
  pickingCategory,
  onStartComposing,
  ref,
}: Props) {
  // 徒歩ナビの候補になるものが 1 つでも表示されているか（景観スポットも候補に入る）
  const anyVisible = LAYERS.some((layer) => visible[layer.id]) || scenicVisible;
  // 凡例は、表示中のハザードが使っているものだけを出す（洪水と津波・高潮で段階が違う）
  const legends = visibleHazardLegends(hazardVisible);

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
            ハザードマップ・住民の投稿と、避難場所などへの徒歩経路
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
        role="group"
        aria-label="地図のモード"
        className="flex gap-1 border-t border-line bg-[#fafafa] px-2 py-2"
      >
        {MAP_MODES.map((item) => {
          const Icon = MODE_ICONS[item.icon];
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChangeMode(item.id)}
              title={item.summary}
              className={[
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5",
                "text-[12.5px] font-semibold transition",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
                active
                  ? "bg-ink text-white"
                  : "text-ink-sub hover:bg-[#f1f2f4] hover:text-ink",
              ].join(" ")}
            >
              <Icon aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

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

            <li>
              <button
                type="button"
                role="switch"
                aria-checked={scenicVisible}
                onClick={onToggleScenic}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-lg transition"
                  style={{
                    backgroundColor: scenicVisible ? "#5b6470" : "#f1f2f4",
                    color: scenicVisible ? "#ffffff" : "#9aa0a8",
                  }}
                >
                  <Landmark className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-ink">
                      {SCENIC_LABEL}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-muted tabular-nums">
                      {scenicCount} 件
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-ink-muted">
                    {SCENIC_SUMMARY}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`relative h-5 w-9 shrink-0 rounded-full transition ${scenicVisible ? "bg-ink" : "bg-[#d5d8dc]"}`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${scenicVisible ? "left-[1.125rem]" : "left-0.5"}`}
                  />
                </span>
              </button>
            </li>
          </ul>

          {scenicVisible ? (
            <div className="mt-2 rounded-xl border border-line bg-[#fafafa] px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-wide text-ink-muted">
                景観のカテゴリ
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {SCENIC_CATEGORIES.map((category) => (
                  <li key={category.id} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full border-[2px] bg-white"
                      style={{ borderColor: category.color }}
                    />
                    <span className="text-[11.5px] text-ink-sub">{category.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                1 か所が複数のカテゴリを持つことがあります。点の色は先頭のカテゴリです。
              </p>
            </div>
          ) : null}
        </section>

        <section className="border-t border-line px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted">みんなの投稿</h2>
            <Link
              href="/reports"
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-ink-sub underline decoration-line underline-offset-2 transition hover:text-ink hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <List aria-hidden className="size-3" />
              一覧で見る
            </Link>
          </div>

          {canPost ? (
            <div className="mt-2 space-y-1.5">
              {postableCategories.map((id) => {
                const def = reportCategoryDef(id);
                const active = pickingCategory === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onStartComposing(id)}
                    aria-pressed={active}
                    className={[
                      "flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                      active
                        ? "border border-ink bg-ink/5 text-ink"
                        : "bg-ink text-white hover:bg-[#31353d]",
                    ].join(" ")}
                  >
                    {active ? (
                      <MapPin aria-hidden className="size-4" />
                    ) : (
                      <Plus aria-hidden className="size-4" />
                    )}
                    {active ? "地図をクリックして場所を指定" : `${def.label}を投稿する`}
                  </button>
                );
              })}
            </div>
          ) : (
            <Link
              href="/login"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2.5 text-[12.5px] font-medium text-ink-sub transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <LogIn aria-hidden className="size-4" />
              投稿するにはログイン
            </Link>
          )}

          <ul className="mt-2 space-y-1.5">
            {REPORT_CATEGORIES.map((category) => {
              const Icon = REPORT_ICONS[category.icon];
              const on = reportVisible[category.id];
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => onToggleReportCategory(category.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-lg transition"
                      style={{
                        backgroundColor: on ? category.color : "#f1f2f4",
                        color: on ? "#ffffff" : "#9aa0a8",
                      }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className="truncate text-[13.5px] font-semibold text-ink">
                          {category.label}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-muted tabular-nums">
                          {reportCounts[category.id]} 件
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-ink-muted">
                        {category.summary}
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

          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
            ピンをクリックすると、写真・説明・コメントが読めます。閲覧にログインは要りません。
          </p>
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

        <section className="border-t border-line px-4 py-3.5">
          <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted">
            ハザードマップ（浸水想定）
          </h2>
          <ul className="mt-2 space-y-1.5">
            {HAZARDS.map((hazard) => {
              const Icon = HAZARD_ICONS[hazard.icon];
              const on = hazardVisible[hazard.id];
              const percent = Math.round(hazardOpacity[hazard.id] * 100);
              return (
                <li
                  key={hazard.id}
                  className={`overflow-hidden rounded-xl border transition ${
                    on ? "border-ink-muted/40 bg-[#fafafa]" : "border-line"
                  }`}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => onToggleHazard(hazard.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#f4f4f3] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                  >
                    <span
                      aria-hidden
                      className={`grid size-8 shrink-0 place-items-center rounded-lg transition ${
                        on ? "bg-ink text-white" : "bg-[#f1f2f4] text-[#9aa0a8]"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">
                        {hazard.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-ink-muted">
                        {hazard.summary}
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

                  {on ? (
                    <label className="flex items-center gap-2.5 border-t border-line px-3 py-2">
                      <span className="shrink-0 text-[11px] text-ink-muted">不透明度</span>
                      <input
                        type="range"
                        min={HAZARD_OPACITY_MIN}
                        max={HAZARD_OPACITY_MAX}
                        step={HAZARD_OPACITY_STEP}
                        value={hazardOpacity[hazard.id]}
                        onChange={(event) =>
                          onChangeHazardOpacity(hazard.id, Number(event.target.value))
                        }
                        aria-label={`${hazard.label}の不透明度`}
                        className="h-1 min-w-0 flex-1 cursor-pointer accent-ink"
                      />
                      <span className="w-9 shrink-0 text-right text-[11px] text-ink-sub tabular-nums">
                        {percent}%
                      </span>
                    </label>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {legends.length > 0 ? (
            <div className="mt-3 rounded-xl border border-line bg-surface px-3 py-3">
              <HazardLegend legends={legends} withSource />
            </div>
          ) : (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
              重ねたい想定を選ぶと、浸水深の凡例と出典が表示されます。
            </p>
          )}
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
