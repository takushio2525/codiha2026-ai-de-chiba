import type { Metadata, Viewport } from "next";

import AuthBar from "@/components/AuthBar";
import "./globals.css";

export const metadata: Metadata = {
  // 子ページは title に画面名だけを書けば、末尾のブランド名が自動で付く
  title: {
    default: "CHIZUBA — 千葉の地図に、住民と行政の「いま」を重ねる",
    template: "%s｜CHIZUBA",
  },
  description:
    "CHIZUBA は千葉県の地図系サービスを 1 つに束ねたウェブサイトです。"
    + "ハザードマップとオープンデータ（指定緊急避難場所・AED 設置箇所・子育て施設）を重ね、"
    + "住民と行政が危険箇所・浸水・観光おすすめを投稿できます。"
    + "対応は千葉県全域（デモデータは市川市）。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 地図をピンチ操作するので拡大を禁止しない
  maximumScale: 5,
  themeColor: "#16181d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      {/* 帯 + 本体の縦 2 段。本体側を flex-1 にして、地図が残り全部の高さを取る */}
      <body className="flex h-dvh flex-col font-sans antialiased">
        <AuthBar />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
