import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Wyjezdnik",
    short_name: "Wyjezdnik",
    description: "Baza wyjazdu, wspólne decyzje i rozliczenia w jednym miejscu.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#12100d",
    theme_color: "#12100d",
    lang: "pl",
    dir: "ltr",
    orientation: "portrait",
    categories: ["travel", "finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Nowy wyjazd",
        short_name: "Nowy wyjazd",
        description: "Utwórz nowy wyjazd",
        url: "/create",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
