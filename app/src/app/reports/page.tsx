import Link from "next/link";
import { Camera, Droplets, Map, MessageSquare, ShieldCheck, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DemoBadge } from "@/components/DemoBadge";
import FloodRainfall from "@/components/FloodRainfall";
import { DbUnavailableError } from "@/lib/db";
import { DEMO_CITY_CODE, findMunicipality } from "@/lib/municipalities";
import { parseCityCode } from "@/lib/reportInput";
import {
  REPORTS_DEFAULT_LIMIT,
  REPORT_CATEGORIES,
  REPORT_CATEGORY_IDS,
  REPORT_STATUS_IDS,
  detailRows,
  formatJst,
  isDemoReport,
  isReportCategory,
  reportCategoryDef,
  reportStatusLabel,
  type ReportCategory,
  type ReportFeature,
  type ReportIconName,
} from "@/lib/reports";
import { listReports } from "@/lib/reportStore";

/** 投稿は増えるのでキャッシュしない。 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "投稿一覧｜市川市 オープンデータマップ",
  description: "住民と行政が投稿した危険箇所・浸水・観光おすすめの一覧。",
};

const ICONS: Record<ReportIconName, LucideIcon> = {
  triangleAlert: TriangleAlert,
  droplets: Droplets,
  camera: Camera,
};

type Search = { city?: string; category?: string };

/** 投稿一覧（画面 S-5）。
 *
 * 地図だけだと画面の外にある投稿に気づけないので、新着順のリストでも引けるようにする
 * （docs/design/requirements.md 3-4）。**閲覧にログインは要らない**。
 * 絞り込みはリンクで持ち回るので、JavaScript が無くても動く。 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const raw = await searchParams;
  const cityCode = parseCityCode(raw.city ?? null, DEMO_CITY_CODE) ?? DEMO_CITY_CODE;
  const category = isReportCategory(raw.category) ? raw.category : null;

  let features: ReportFeature[] = [];
  let cityName = "";
  let error: string | null = null;

  try {
    const municipality = await findMunicipality(cityCode);
    if (!municipality) {
      error = "指定された市町村にはまだ対応していません。";
    } else {
      cityName = municipality.name;
      features = await listReports({
        cityCode: municipality.code,
        categories: category ? [category] : REPORT_CATEGORY_IDS,
        statuses: REPORT_STATUS_IDS,
        bbox: municipality.bbox,
        limit: REPORTS_DEFAULT_LIMIT,
      });
    }
  } catch (caught) {
    if (caught instanceof DbUnavailableError) {
      error = "投稿を読み込めませんでした。データベースに接続できていません。";
    } else {
      throw caught;
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[20px] leading-tight font-semibold tracking-tight text-ink">
          投稿一覧
        </h1>
        {cityName ? <p className="text-[12.5px] text-ink-muted">{cityName}</p> : null}
        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-sub transition hover:border-ink-muted/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Map aria-hidden className="size-3.5" />
          地図に戻る
        </Link>
      </header>

      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
        住民と行政が投稿した情報です。新しいものから {REPORTS_DEFAULT_LIMIT} 件まで表示します。
      </p>

      <nav aria-label="カテゴリで絞り込む" className="mt-4 flex flex-wrap gap-1.5">
        <FilterChip href={buildHref(cityCode, null)} active={category === null} label="すべて" />
        {REPORT_CATEGORIES.map((def) => (
          <FilterChip
            key={def.id}
            href={buildHref(cityCode, def.id)}
            active={category === def.id}
            label={def.label}
            color={def.color}
          />
        ))}
      </nav>

      {error ? (
        <p className="mt-6 rounded-2xl border border-line bg-surface px-4 py-6 text-center text-[13px] leading-relaxed text-ink-sub">
          {error}
        </p>
      ) : features.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-surface px-4 py-8 text-center text-[13px] leading-relaxed text-ink-muted">
          まだ投稿がありません。地図から最初の 1 件を投稿できます。
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {features.map((feature) => (
            <ReportRow key={feature.properties.id} feature={feature} />
          ))}
        </ul>
      )}
    </div>
  );
}

function buildHref(cityCode: string, category: ReportCategory | null): string {
  const params = new URLSearchParams({ city: cityCode });
  if (category) params.set("category", category);
  return `/reports?${params.toString()}`;
}

function FilterChip({
  href,
  active,
  label,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-surface text-ink-sub hover:border-ink-muted/40 hover:text-ink",
      ].join(" ")}
    >
      {color ? (
        <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      {label}
    </Link>
  );
}

function ReportRow({ feature }: { feature: ReportFeature }) {
  const report = feature.properties;
  const def = reportCategoryDef(report.category);
  const Icon = ICONS[def.icon];
  const rows = detailRows(report.category, report.details);

  return (
    <li>
      <Link
        href={`/?report=${report.id}`}
        className="flex gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {report.photoUrls.length > 0 ? (
          // 投稿写真は自前の API から返す。next/image の最適化は挟まない
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.photoUrls[0]}
            alt=""
            className="size-20 shrink-0 rounded-xl border border-line object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-20 shrink-0 place-items-center rounded-xl border border-line"
            style={{ backgroundColor: `${def.color}1a`, color: def.color }}
          >
            <Icon className="size-6" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink-sub">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: def.color }}
              />
              {def.label}
            </span>
            <span className="rounded-full bg-[#f1f2f4] px-2 py-0.5 text-[10.5px] font-medium text-ink-sub">
              {reportStatusLabel(report.status)}
            </span>
            {/* 行政が出した投稿（F-7 の公式おすすめなど）。住民の投稿と一目で区別する */}
            {report.authorRole === "gov" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0072b2] px-1.5 py-0.5 text-[10px] font-medium text-white">
                <ShieldCheck aria-hidden className="size-3" />
                行政の公式投稿
              </span>
            ) : null}
            {report.hasOfficialComment ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0072b2] px-1.5 py-0.5 text-[10px] font-medium text-white">
                <ShieldCheck aria-hidden className="size-3" />
                行政の回答あり
              </span>
            ) : null}
            {/* 起動時から入っているデモ投稿。本文は 2 行で切れるのでバッジでも示す */}
            {isDemoReport(report.details) ? <DemoBadge compact /> : null}
          </p>

          <h2 className="mt-1 truncate text-[14px] leading-snug font-semibold text-ink">
            {report.title}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-sub">
            {report.body}
          </p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-muted">
            <span>{report.authorName}</span>
            {report.authorRole === "gov" ? (
              <span className="rounded-full bg-[#0072b2] px-1.5 py-0.5 text-[10px] font-medium text-white">
                行政
              </span>
            ) : null}
            <span className="tabular-nums">{formatJst(report.createdAt)}</span>
            {rows.length > 0 ? <span>{rows.map((r) => r.value).join("・")}</span> : null}
            {report.commentCount > 0 ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <MessageSquare aria-hidden className="size-3" />
                {report.commentCount}
              </span>
            ) : null}
          </p>

          {/* 浸水（F-3）は、投稿時点の雨量も一覧で読めるようにする */}
          <FloodRainfall category={report.category} details={report.details} compact />
        </div>
      </Link>
    </li>
  );
}
