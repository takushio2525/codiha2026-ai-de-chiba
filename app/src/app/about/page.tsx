import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import HazardLegend from "@/components/HazardLegend";
import { DATA_CREDITS } from "@/lib/credits";
import { HAZARD_LEGENDS } from "@/lib/hazards";

export const metadata: Metadata = {
  title: "出典とライセンス｜市川市 オープンデータマップ",
  description: "このアプリが使っているオープンデータ・地図タイル・経路サービスの出典。",
};

export default function AboutPage() {
  return (
    <div className="min-h-full bg-canvas px-5 py-10">
      <main className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-sub transition hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          地図に戻る
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">出典とライセンス</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-sub">
          このアプリは、市川市が公開しているオープンデータを地図に重ねて表示します。
          データ・背景地図・経路計算のそれぞれについて、提供元と利用条件を以下に示します。
        </p>

        <ul className="mt-6 space-y-3">
          {DATA_CREDITS.map((credit) => (
            <li
              key={credit.what}
              className="rounded-2xl border border-line bg-surface p-4 shadow-[0_12px_30px_-26px_rgb(0_0_0/0.5)]"
            >
              <p className="text-[11px] font-semibold tracking-wide text-ink-muted">{credit.what}</p>
              <p className="mt-1 text-[14px] leading-relaxed font-medium text-ink">{credit.text}</p>
              <p className="mt-2 text-[12px] text-ink-sub">
                ライセンス: {credit.license}
                <span className="mx-1.5 text-ink-muted">/</span>
                <a
                  href={credit.href}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all underline decoration-line underline-offset-2 transition hover:decoration-ink"
                >
                  {credit.href}
                </a>
              </p>
            </li>
          ))}
        </ul>

        <section className="mt-8 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-[13px] font-semibold text-ink">ハザードマップの凡例（浸水深）</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-sub">
            同じ色でも、洪水と津波・高潮では表す浸水深が違います。地図では、重ねている想定に
            合わせた凡例だけを表示します。
          </p>
          <div className="mt-3 max-w-sm">
            <HazardLegend legends={Object.values(HAZARD_LEGENDS)} />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-[13px] font-semibold text-ink">データの加工について</h2>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-ink-sub">
            <li>
              市川市の CSV（cp932）を GeoJSON に変換し、緯度経度が空の行と、
              市域の外に飛んでいる座標を除いています。
            </li>
            <li>
              AED 設置箇所の元データには経度の誤りが 1 件あり（東経 129 度台）、
              これを除いた 304 件を表示しています。
            </li>
            <li>
              徒歩経路は OpenStreetMap の道路データにもとづく推定です。
              実際に通れるかどうかは現地の状況を優先してください。
            </li>
            <li>
              ハザードマップは、ハザードマップポータルサイトが配信しているタイル画像を
              そのまま背景地図に重ねています。加工しているのは重ねる濃さ（不透明度）だけで、
              区域や浸水深は変更していません。
            </li>
            <li>
              重ねているのは洪水・高潮・津波の 3 種類です。内水（雨水出水）の浸水想定は
              千葉県内でほとんど公表されておらず（市川市には無い）、土砂災害警戒区域は
              市川市に該当がないため、扱っていません。
              <strong className="font-semibold text-ink">
                重ねていない災害の危険が無いという意味ではありません。
              </strong>
            </li>
          </ul>
        </section>

        <p className="mt-8 text-[11.5px] leading-relaxed text-ink-muted">
          ちばオープンデータアイデアソン・ハッカソン（CODIHA）2026 の作品として制作。
        </p>
      </main>
    </div>
  );
}
