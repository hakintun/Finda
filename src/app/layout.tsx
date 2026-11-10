import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RealtimeRefresh } from "@/components/buyer/realtime-refresh";

export const metadata: Metadata = {
  title: {
    default: "Finda.ng — Buy & Sell in Port Harcourt · Live Prices & Verified Stock",
    template: "%s · Finda Port Harcourt",
  },
  description:
    "Buy smarter, sell faster in Port Harcourt. Browse verified local shops, live Naira prices, confirmed stock status, and street landmarks.",
  applicationName: "Finda",
  appleWebApp: {
    capable: true,
    title: "Finda",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Finda — Buy & Sell Smarter in Port Harcourt",
    description:
      "Local marketplace for Port Harcourt. Today's price, confirmed stock, and street landmark directions.",
    locale: "en_NG",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00B53F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body className="antialiased selection:bg-[#BBF7D0] selection:text-[#064E3B]">
        <RealtimeRefresh />
        {children}
      </body>
    </html>
  );
}
