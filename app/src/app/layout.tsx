import type { Metadata, Viewport } from "next";
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
