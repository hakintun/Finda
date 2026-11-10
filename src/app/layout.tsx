import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Finda — Find who has it, near you (Port Harcourt)",
    template: "%s · Finda PH",
  },
  description:
    "Check which nearby Port Harcourt shop or market stall has what you need right now, today's Naira price, stock status, and landmark directions.",
  applicationName: "Finda",
  appleWebApp: {
    capable: true,
    title: "Finda",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Finda — Find who has it, near you",
    description:
      "Local availability search for Port Harcourt. Today's price, confirmed stock, and landmark directions.",
    locale: "en_NG",
    type: "website",
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
      <body className="antialiased selection:bg-[#A7F3D0] selection:text-[#064E3B]">
        {children}
      </body>
    </html>
  );
}
