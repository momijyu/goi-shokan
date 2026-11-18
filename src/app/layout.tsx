import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameShell } from "@/components/GameShell";
import "./globals.css";

const siteBaseUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl),
  title: "語彙召喚(仮) | GOI-SHOKAN(KARI)",
  description:
    "日常の文章から語彙を採掘し、青天井のシナジーで迷宮に挑む語彙デッキ構築ローグライク",
  openGraph: {
    title: "語彙召喚(仮) | GOI-SHOKAN(KARI)",
    description:
      "日常の文章から語彙を採掘し、青天井のシナジーで迷宮に挑む語彙デッキ構築ローグライク",
    type: "website",
    locale: "ja_JP",
    siteName: "語彙召喚(仮)",
  },
  twitter: {
    card: "summary_large_image",
    title: "語彙召喚(仮) | GOI-SHOKAN(KARI)",
    description:
      "日常の文章から語彙を採掘し、青天井のシナジーで迷宮に挑む語彙デッキ構築ローグライク",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DotGothic16&family=JetBrains+Mono:wght@500;700&family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho:wght@600;700;800&display=swap"
        />
      </head>
      <body className="min-h-full font-sans text-[#ECE6D8] selection:bg-[#C93A2B] selection:text-[#F7F3EA]">
        <TooltipProvider delay={150}>
          <GameShell>{children}</GameShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
