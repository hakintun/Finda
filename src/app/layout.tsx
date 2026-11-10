import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RealtimeRefresh } from "@/components/buyer/realtime-refresh";

export const metadata: Metadata = {
  title: {
    default: "Finda — Live Market Prices & Verified Stock in Port Harcourt",
    template: "%s · Finda Port Harcourt",
  },
  description:
    "Know which Port Harcourt stall has it in stock, today's real Naira price, and exact street landmarks before you make the trip.",
  applicationName: "Finda",
  appleWebApp: {
    capable: true,
    title: "Finda",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Finda — Port Harcourt Live Stock & Market Finder",
    description:
      "Verified local stalls, today's confirmed Naira prices, and landmark-first directions across Port Harcourt.",
    locale: "en_NG",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#064E3B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body className="antialiased selection:bg-[#A7F3D0] selection:text-[#042F22]">
        <RealtimeRefresh />
        {children}
      </body>
    </html>
  );
}
