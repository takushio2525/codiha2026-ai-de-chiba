import { CloudOff, Droplets } from "lucide-react";

import { formatJst, isDemoReport, type ReportCategory } from "@/lib/reports";
import {
  formatRainfall,
  formatStation,
  readDemoRainfall,
  readFloodObservation,
} from "@/lib/weather";

/**
 * 浸水投稿（F-3）に記録された、**投稿した時点の雨量**の表示。
 *
 * 値はサーバーが投稿の瞬間に気象庁から取って `details` に焼き込んだもので、
 * クライアントからは入れられない（docs/design/interfaces.md I-4）。
 *
 * **「この地点の雨量」と言い切らないこと。** 市川市にはアメダスが無く、
 * 最寄りの船橋まで約 10 km ある。局地的な豪雨は数 km で降り方が変わるので、
 * 観測所名と距離を必ず添えて「最寄りの観測所の値」として出す。
 *
 * 取れなかった投稿（気象庁が落ちていた・最寄りが 20 km 以上）は
 * **その旨を出す**。空欄にすると「雨が降っていなかった」と読み違えられる。
 *
 * 浸水以外のカテゴリでは何も出さない（`details` に雨量が入ることも無い）。
 *
 * **デモ投稿（`isDemoReport`）の雨量は気象庁の観測値ではない。**
 * 過去の実測値は気象庁 JSON からは取れないので、デモ投稿にはダミー値を入れてある。
 * そのぶん **出典（気象庁）も観測所名も書かず**、「デモ値」だと分かる形だけで出す。
 * ここを実測値と同じ見た目にしてはいけない。
 */
type Props = {
  category: ReportCategory;
  details: Record<string, unknown>;
  /** 一覧（S-5）向けの 1 行版。詳細パネル（S-3）では false */
  compact?: boolean;
};

export default function FloodRainfall({ category, details, compact = false }: Props) {
  if (category !== "flood") return null;

  // デモ投稿はここで打ち切る。**実測値の経路（下）に混ぜない**
  if (isDemoReport(details)) {
    const demoMm = readDemoRainfall(details);
    if (demoMm === null) return null;
    return <DemoRainfall mm={demoMm} compact={compact} />;
  }

  const observation = readFloodObservation(details);

  if (!observation) {
    return (
      <p
        className={`flex items-center gap-1.5 text-[11px] text-ink-muted ${compact ? "mt-1" : "mt-3"}`}
      >
        <CloudOff aria-hidden className="size-3.5 shrink-0" />
        投稿時の雨量: 取得できませんでした
      </p>
    );
  }

  const source = `${formatStation(observation.amedasStation, observation.amedasDistanceKm)}・${formatJst(observation.observedAt)} 時点`;

  if (compact) {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-muted">
        <Droplets aria-hidden className="size-3.5 shrink-0 text-[#56b4e9]" />
        <span>
          投稿時の雨量{" "}
          <span className="font-semibold text-ink-sub tabular-nums">
            {formatRainfall(observation.rainfallMm)}
          </span>
          <span className="mx-1 text-ink-muted/60">/</span>
          <span className="tabular-nums">{source}</span>
        </span>
      </p>
    );
  }

  return (
    <section className="mt-3 rounded-xl border border-line bg-[#f5fafd] px-3 py-2.5">
      <p className="flex items-baseline gap-2">
        <Droplets aria-hidden className="size-4 shrink-0 translate-y-0.5 text-[#56b4e9]" />
        <span className="text-[11px] font-semibold tracking-wide text-ink-muted">
          投稿時の雨量（1 時間降水量）
        </span>
        <span className="ml-auto text-[15px] font-semibold text-ink tabular-nums">
          {formatRainfall(observation.rainfallMm)}
        </span>
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted tabular-nums">{source}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        最寄りの観測所の値です。この地点で測った値ではありません。
        出典: 気象庁ホームページ（アメダス）
      </p>
    </section>
  );
}

/** デモ投稿の雨量。**実測値と取り違えられないことがこの表示の役目**なので、
 *  数値のとなりに必ず「デモ値」と書き、出典（気象庁）は書かない。 */
function DemoRainfall({ mm, compact }: { mm: number; compact: boolean }) {
  if (compact) {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-muted">
        <Droplets aria-hidden className="size-3.5 shrink-0 text-[#56b4e9]" />
        <span>
          投稿時の雨量{" "}
          <span className="font-semibold text-ink-sub tabular-nums">{formatRainfall(mm)}</span>
          <span className="mx-1 text-ink-muted/60">/</span>
          <span>デモ用のダミー値</span>
        </span>
      </p>
    );
  }

  return (
    <section className="mt-3 rounded-xl border border-dashed border-line bg-canvas px-3 py-2.5">
      <p className="flex items-baseline gap-2">
        <Droplets aria-hidden className="size-4 shrink-0 translate-y-0.5 text-[#56b4e9]" />
        <span className="text-[11px] font-semibold tracking-wide text-ink-muted">
          投稿時の雨量（1 時間降水量）
        </span>
        <span className="ml-auto text-[15px] font-semibold text-ink tabular-nums">
          {formatRainfall(mm)}
        </span>
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink-sub">これはデモ用のダミー値です。</span>
        気象庁の観測値ではありません。実際の投稿では、投稿した時刻の最寄りのアメダスの
        雨量がここに記録されます。
      </p>
    </section>
  );
}
