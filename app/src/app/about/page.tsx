import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import HazardLegend from "@/components/HazardLegend";
import { DATA_CREDITS, DEMO_PHOTO_CREDITS } from "@/lib/credits";
import { HAZARD_LEGENDS } from "@/lib/hazards";
import { SCENIC_PHOTOS } from "@/lib/scenicPhotos";

export const metadata: Metadata = {
  title: "出典とライセンス",
  description: "このアプリが使っているオープンデータ・地図タイル・経路サービスの出典。",
};

const scenicEntries = Object.entries(SCENIC_PHOTOS).sort(([a], [b]) =>
  a.localeCompare(b, "ja"),
);

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

        {/* このページへの入口は地図の「詳しい出典」なので、見出しは出典のまま。
            ただし直接開かれても何のサービスか分かるよう、頭にブランドの説明を置く。 */}
        <section className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_30px_-26px_rgb(0_0_0/0.5)]">
          <p className="text-[19px] leading-none font-bold tracking-[0.16em] text-ink">CHIZUBA</p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-sub">
            千葉県の地図系サービスを 1 つに束ね、
            <strong className="font-semibold text-ink">住民と行政が相互に情報を投稿できる</strong>
            ウェブサイトです。ハザードマップや施設のオープンデータの上に、危険箇所・浸水・
            観光おすすめといった「いまの千葉」を重ねます。
          </p>
          {/* **オープンデータを使うだけでなく、集めたものをオープンデータとして返す。**
              CHIZUBA が普通の投稿サイトと違うのはこの一往復なので、頭の紹介に置く */}
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-sub">
            集まった投稿は、
            <strong className="font-semibold text-ink">
              誰でも CSV / GeoJSON で持ち帰れるオープンデータとして公開
            </strong>
            しています（
            <a
              href="/reports"
              className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
            >
              投稿一覧
            </a>
            と地図の操作パネルから、絞り込んだそのままの条件で書き出せます）。
            行政が出したデータを住民が使うだけの一方通行にせず、
            住民が寄せた情報も同じように使える形にして返します。
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
            書き出しに含まれるのは、画面で誰でも読める項目（種類・本文・位置・対応状況・
            投稿者の表示名・投稿日時）だけです。アカウントの情報は含みません。
            デモ投稿は <code className="text-[11.5px]">is_demo</code> の列で見分けられ、
            <strong className="font-medium text-ink-sub">
              デモ投稿の雨量は観測値ではないので書き出していません
            </strong>
            。投稿そのものの再配布条件は運用時に定めるもので、この試作では確定していません。
          </p>
          <p className="mt-2.5 text-[12px] text-ink-muted">対応: 千葉県全域（デモデータは市川市）</p>
        </section>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">出典とライセンス</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-sub">
          CHIZUBA は、市川市のオープンデータに、国土地理院の背景地図・国土交通省のハザードマップ・
          気象庁の気象データ・OpenStreetMap の道路データを重ねています。
          それぞれについて、提供元と利用条件を以下に示します。
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
              景観スポットは「いちかわ景観100選」の 100 件をそのまま載せています。解説文
              （日本語・英語）・カテゴリ・アクセス方法は元データの文章をそのまま表示していて、
              翻訳や要約はしていません。
              <strong className="font-semibold text-ink">
                元データの写真は配信先が公開されていないため、掲載していません。
              </strong>
            </li>
            <li>
              景観スポットのカテゴリ（まち並み・自然・歴史・文化・生活風景）は元データの
              「備考」欄の値です。1 か所が複数のカテゴリを持つことがあり、地図の点の色は
              その先頭のカテゴリを表します。
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
              重ねているのは洪水・高潮・津波の浸水想定と、
              土砂災害警戒区域（急傾斜地の崩壊）の 4 種類です。
              土砂災害は市川市に 142 区域が指定されていて、そのすべてが急傾斜地の崩壊です（出典:{" "}
              <a
                href="https://www.pref.chiba.lg.jp/kakan/sabou/keikai/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
              >
                千葉県「土砂災害警戒区域等の一覧」
              </a>
              ）。指定は斜面のある北部に偏っているので、
              地図では最初は外してあります。操作パネルから重ねられます。
            </li>
            <li>
              内水（雨水出水）の浸水想定は、市川市でも水防法にもとづいて指定・公表されていますが、
              公表されているのは PDF だけで、地図に重ねられる形では配信されていません。
              土石流と地すべりの警戒区域は、市川市には指定がありません。
              <strong className="font-semibold text-ink">
                重ねていない災害の危険が無いという意味ではありません。
              </strong>
            </li>
          </ul>
        </section>

        {/* デモ投稿に付けた写真の出典。**投稿の詳細パネルからここへ飛んでくる**ので、
            見出しの id は変えないこと（components/DemoBadge.tsx の DemoNote） */}
        <section id="demo-photos" className="mt-8 scroll-mt-6 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-[13px] font-semibold text-ink">デモ投稿の写真</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-sub">
            このアプリには、起動した直後から投稿機能を試せるように
            <strong className="font-semibold text-ink">デモ投稿</strong>
            が入っています。実際の通報ではなく、
            <strong className="font-semibold text-ink">
              実際に起きた被害を特定の場所に結び付けたものでもありません。
            </strong>
            投稿には「デモ投稿」の印が付いています。
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-sub">
            写真はウィキメディア・コモンズから、
            再利用が許されているもの（CC0・CC BY・CC BY-SA）だけを選んで使っています。
            加工したのは縮小と再圧縮だけです。
            <strong className="font-semibold text-ink">
              撮影地が市川市外のものは、防災のデモ投稿に添えた参考写真で、
              市川市で撮られた被害の写真ではありません。
            </strong>
          </p>
          <ul className="mt-3 space-y-2.5">
            {DEMO_PHOTO_CREDITS.map((credit) => (
              <li key={credit.file} className="text-[12px] leading-relaxed">
                <p>
                  <span className="font-medium text-ink">{credit.what}</span>
                  <span className="text-ink-muted">
                    {credit.inIchikawa ? "（" : "（市川市外・参考写真: "}
                    {credit.place}）
                  </span>
                </p>
                <p className="text-ink-sub">
                  {credit.artist}
                  <span className="mx-1.5 text-ink-muted">/</span>
                  <a
                    href={credit.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
                  >
                    {credit.license}
                  </a>
                  <span className="mx-1.5 text-ink-muted">/</span>
                  <a
                    href={credit.page}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
                  >
                    コモンズの説明ページ
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 景観スポットに付けた写真の出典（54 枚ぶんの全部）。
            地図のポップアップには作者とライセンスだけを出し、全体の一覧はここに置く。
            操作パネルの「出典とライセンス」からここへ来る（components/ControlPanel.tsx） */}
        <section id="scenic-photos" className="mt-8 scroll-mt-6 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-[13px] font-semibold text-ink">景観100選のスポット写真</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-sub">
            観光マップの景観スポットのうち
            <strong className="font-semibold text-ink">{scenicEntries.length} か所</strong>
            に、ウィキメディア・コモンズの写真を添えています。
            元データ（いちかわ景観100選）の画像列は配信先が見つからないため、使っていません。
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-sub">
            <strong className="font-semibold text-ink">
              再利用が許されているもの（CC0・パブリックドメイン・CC BY・CC BY-SA）だけ
            </strong>
            を選んでいます。加工したのは縮小と再圧縮だけです。
            どの写真がどの場所のものかは 1 枚ずつ目で確かめました
            （同じ名前で別の土地にある場所の写真が検索に多く混ざるためです）。
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-sub">
            <strong className="font-semibold text-ink">「東京湾三番瀬」だけは船橋市側から撮影</strong>
            された写真です。三番瀬の干潟は市川市から船橋市にまたがっていて、
            市川市側から撮られた再利用可能な写真が見つかりませんでした。
          </p>
          <ul className="mt-3 space-y-2.5">
            {scenicEntries.map(([spot, photo]) => (
              <li key={photo.file} className="text-[12px] leading-relaxed">
                <p>
                  <span className="font-medium text-ink">{spot}</span>
                  {photo.placeNote ? (
                    <span className="text-ink-muted">（{photo.placeNote}）</span>
                  ) : null}
                </p>
                <p className="text-ink-sub">
                  {photo.artist}
                  <span className="mx-1.5 text-ink-muted">/</span>
                  {photo.licenseUrl ? (
                    <a
                      href={photo.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
                    >
                      {photo.license}
                    </a>
                  ) : (
                    <span>{photo.license}</span>
                  )}
                  <span className="mx-1.5 text-ink-muted">/</span>
                  <a
                    href={photo.page}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
                  >
                    コモンズの説明ページ
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-[12.5px] leading-relaxed text-ink-sub">
          受け取った情報の扱い（ログイン・投稿・現在地・Cookie）は
          <Link
            href="/privacy"
            className="ml-1 font-medium text-ink underline decoration-line underline-offset-2 transition hover:decoration-ink"
          >
            プライバシーポリシー
          </Link>
          にまとめています。
        </p>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">
          ちばオープンデータアイデアソン・ハッカソン（CODIHA）2026 の作品として制作。
        </p>
      </main>
    </div>
  );
}
