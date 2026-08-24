import type { Metadata, Viewport } from "next";

import AuthBar from "@/components/AuthBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "市川市 オープンデータマップ",
  description:
    "市川市のオープンデータ（指定緊急避難場所・AED 設置箇所・子育て施設）を地図で重ね、"
    + "現在地からの徒歩経路を調べられます。",
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
