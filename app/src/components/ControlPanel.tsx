"use client";

import Link from "next/link";
import {
  Baby,
  Camera,
  ChevronDown,
  CloudRain,
  Droplets,
  HeartPulse,
  List,
  LoaderCircle,
  LocateFixed,
  LogIn,
  MapPin,
  Navigation,
  Shield,
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
import {
  REPORT_CATEGORIES,
  formatJst,
  reportCategoryDef,
  type ReportCategory,
  type ReportIconName,
} from "@/lib/reports";
import type { WalkingRoute } from "@/lib/routing";
import { formatRainfall, formatStation, type FloodAlert, type WeatherObservation }
  from "@/lib/weather";
import FloodAlertCard from "./FloodAlertCard";
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

const REPORT_ICONS: Record<ReportIconName, LucideIcon> = {
  triangleAlert: TriangleAlert,
  droplets: Droplets,
  camera: Camera,
};

export type Busy = "idle" | "locating" | "routing";

type Props = {
  counts: Record<LayerId, number>;
  visible: Record<LayerId, boolean>;
  onToggleLayer: (id: LayerId) => void;
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
  /** いま投稿できるカテゴリ（P3 は危険箇所・P4 で浸水。観光は P5 で足す） */
  postableCategories: ReportCategory[];
  /** ログイン済みか。**表示の出し分けにしか使わない**（権限判定は API 側） */
  canPost: boolean;
  /** 投稿する場所を地図で指定してもらっている最中なら、そのカテゴリ */
  picking: ReportCategory | null;
  onStartComposing: (category: ReportCategory) => void;
  /** 注意案内（F-4）。出す条件を満たさないときは null */
  floodAlert: FloodAlert | null;
  /** 最寄りのアメダスの実況（I-6）。取れていなければ null */
  observation: WeatherObservation | null;
  ref?: React.Ref<HTMLElement>;
};

export default function ControlPanel({
  counts,
  visible,
  onToggleLayer,
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
  picking,
  onStartComposing,
  floodAlert,
  observation,
  ref,
}: Props) {
  const anyVisible = LAYERS.some((layer) => visible[layer.id]);
  // いま投稿できるカテゴリ（ボタンの文言に使う）
  const postable = postableCategories.map(reportCategoryDef);
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
          {/* ワードマークは欧文の全大文字。字間を空けて日本語のタグラインと質感を分ける */}
          <h1 className="text-[17px] leading-none font-bold tracking-[0.16em] text-ink">
            CHIZUBA
          </h1>
          <p className="mt-1.5 truncate text-[11.5px] text-ink-muted">
            千葉の地図に、住民と行政の「いま」を重ねる
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
        {floodAlert ? <FloodAlertCard alert={floodAlert} /> : null}

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
            <div className="mt-2 grid gap-1.5">
              {postable.map((category) => {
                const Icon = REPORT_ICONS[category.icon];
                const active = picking === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onStartComposing(category.id)}
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
                      <Icon aria-hidden className="size-4" />
                    )}
                    {active ? "地図をクリックして場所を指定" : `${category.label}を投稿する`}
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

          {observation ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-line bg-[#fafafa] px-2.5 py-2 text-[11px] leading-relaxed text-ink-muted">
              <Droplets aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[#56b4e9]" />
              <span>
                いまの雨量{" "}
                <strong className="font-semibold text-ink-sub tabular-nums">
                  {formatRainfall(observation.rainfallMm)}
                </strong>
                {" "}／ {formatStation(observation.station, observation.distanceKm)}・
                <span className="tabular-nums">{formatJst(observation.observedAt)}</span> 時点。
                浸水の投稿にはこの値が記録されます（この地点の実測値ではありません）。
              </span>
            </p>
          ) : null}

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
