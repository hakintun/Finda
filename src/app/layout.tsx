import type { Metadata, Viewport } from "next";
import { RealtimeRefresh } from "@/components/buyer/realtime-refresh";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Finda — Port Harcourt Buy & Sell Local Stock Marketplace",
    template: "%s · Finda Port Harcourt",
  },
  description:
    "Find faster, buy smarter in Port Harcourt. Browse live Naira prices, confirmed stock, and exact street landmarks across Mile 1, Mile 3, Oil Mill, Garrison, Rumuokoro & Artillery.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finda",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#065F46",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body className="antialiased selection:bg-emerald-100 selection:text-emerald-950">
        <RealtimeRefresh />
        {children}
      </body>
    </html>
  );
}
