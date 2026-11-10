import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finda — Find who has it, near you",
    short_name: "Finda",
    description:
      "Local availability search for Port Harcourt. See nearby sellers, today's Naira price, stock status, and landmark directions.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F5",
    theme_color: "#065F46",
    orientation: "portrait",
    lang: "en-NG",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
