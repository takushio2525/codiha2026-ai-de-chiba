"use client";

import { useState } from "react";
import { Check, LoaderCircle, ShieldCheck } from "lucide-react";

import {
  REPORT_STATUSES,
  type ReportProperties,
  type ReportStatus,
} from "@/lib/reports";
import { patchReport } from "@/lib/reportsApi";

type Props = {
  report: ReportProperties;
  /** 更新できたら、サーバーが返した最新の姿を渡す */
  onUpdated: (report: ReportProperties) => void;
};

/**
 * 行政の対応状況を更新する操作（F-7・画面 S-3 の中）。
 *
 * **出すかどうかの判断は呼び出し側**（`canUpdateStatus`）。ここは「出すと決まった」
 * 前提で描く。権限が無い相手が API を直接叩いても、サーバーが 403 を返す
 * （docs/design/interfaces.md I-5）。
 *
 * 4 段階を**縦 1 列の 2 カラム**に並べるのは、375px でもラベルと説明が折り返さずに
 * 収まる形がこれだけだったため（**スマホ幅を先に決めてから広い画面に広げる**）。
 */
export default function ReportStatusControl({ report, onUpdated }: Props) {
  const [saving, setSaving] = useState<ReportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function change(next: ReportStatus) {
    if (saving !== null || next === report.status) return;
    setSaving(next);
    const result = await patchReport(report.id, { status: next });
    setSaving(null);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setError(null);
    onUpdated(result.value);
  }

  return (
    <section className="mt-3 rounded-xl border border-[#0072b2]/40 bg-[#eef6fb] px-3 py-3">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#0a5a86]">
        <ShieldCheck aria-hidden className="size-3.5" />
        行政の対応状況を更新する
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
        変えた状況は一覧と詳細にすぐ反映され、投稿した人が経過を追えるようになります。
      </p>

      <div role="group" aria-label="対応状況" className="mt-2 grid grid-cols-2 gap-1.5">
        {REPORT_STATUSES.map((status) => {
          const active = report.status === status.id;
          const busy = saving === status.id;
          return (
            <button
              key={status.id}
              type="button"
              onClick={() => void change(status.id)}
              aria-pressed={active}
              disabled={saving !== null}
              className={[
                "flex min-w-0 flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                "disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-[#0072b2] bg-[#0072b2] text-white"
                  : "border-line bg-surface text-ink-sub hover:border-[#0072b2]/50 hover:bg-white",
              ].join(" ")}
            >
              <span className="flex w-full items-center gap-1.5">
                {busy ? (
                  <LoaderCircle aria-hidden className="size-3.5 shrink-0 animate-spin" />
                ) : active ? (
                  <Check aria-hidden className="size-3.5 shrink-0" />
                ) : null}
                <span className="truncate text-[12.5px] font-semibold">{status.label}</span>
              </span>
              <span
                className={[
                  "line-clamp-2 text-[10.5px] leading-snug",
                  active ? "text-white/85" : "text-ink-muted",
                ].join(" ")}
              >
                {status.summary}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[11.5px] leading-relaxed text-[#7a2f10]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
