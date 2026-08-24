"use client";

import { CloudRain, Info } from "lucide-react";

import { formatJst } from "@/lib/reports";
import { tidyForecastSummary, type FloodAlert } from "@/lib/weather";

/**
 * 注意案内（F-4）。**過去の浸水報告と気象庁の予報を、事実として 2 つ並べるだけ**。
 *
 * ## 文言の制約（勝手に変えないこと）
 *
 * 「浸水するでしょう」「浸水のおそれがあります」のような**予報表現は書かない**。
 * 気象業務法は気象庁以外が予報を業として出すことを許可制にしているため、
 * CHIZUBA が独自の見通しを述べると法に触れうる。
 * 書いてよいのは「過去にここで浸水報告があった」「雨の予報が出ている」という
 * 検証できる事実だけ（docs/design/requirements.md 3-1・`lib/weather.ts` の頭）。
 *
 * 予報が取れていないとき・雨の予報が無いとき・過去の浸水報告が無いときは、
 * そもそもこのカードを出さない（判定は `buildFloodAlert`）。
 */
export default function FloodAlertCard({ alert }: { alert: FloodAlert }) {
  const { forecast, reportCount, latestAt } = alert;
  const summary = tidyForecastSummary(forecast.summary);

  return (
    <section
      aria-labelledby="flood-alert-title"
      className="border-b border-line bg-[#eef6fc] px-4 py-3.5"
    >
      <h2
        id="flood-alert-title"
        className="flex items-center gap-2 text-[12.5px] font-semibold text-[#0b4a6f]"
      >
        <CloudRain aria-hidden className="size-4 shrink-0" />
        浸水報告のある地域に、雨の予報が出ています
      </h2>

      <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-[#134b6b]">
        <li className="flex gap-2">
          <span aria-hidden className="mt-[0.45em] size-1 shrink-0 rounded-full bg-[#56b4e9]" />
          <span>
            この地域には、住民から寄せられた
            <strong className="font-semibold tabular-nums">浸水の報告が {reportCount} 件</strong>
            あります。
            {latestAt ? <>（最新: <span className="tabular-nums">{formatJst(latestAt)}</span>）</> : null}
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="mt-[0.45em] size-1 shrink-0 rounded-full bg-[#56b4e9]" />
          <span>
            気象庁の予報では、
            {forecast.area ? <strong className="font-semibold">千葉県{forecast.area}</strong> : "この地域"}
            の今後 24 時間の降水確率は
            <strong className="font-semibold tabular-nums"> 最大 {forecast.maxPop}%</strong> です。
            {summary ? <>（{summary}）</> : null}
          </span>
        </li>
      </ul>

      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#3d6b85]">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          過去の投稿と気象庁の予報を並べて示しています。<strong>浸水の予測ではありません。</strong>
          予報は市町村ごとではなく
          {forecast.area ? `「${forecast.area}」` : "県内の広い区分"}単位で出ています。
          出典: <a
            href="https://www.jma.go.jp/bosai/forecast/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[#9dc4d9] underline-offset-2 transition hover:decoration-[#0b4a6f]"
          >気象庁ホームページ</a>
          （<span className="tabular-nums">{formatJst(forecast.publishedAt)}</span> 発表）
        </span>
      </p>
    </section>
  );
}
