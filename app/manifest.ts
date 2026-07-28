import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SNES PAL Sammlung",
    short_name: "SNES Sammlung",
    description:
      "Sammlungsmanager für 530 europäische SNES-PAL-Spiele mit festen Richtwerten.",
    start_url: "/",
    display: "standalone",
    background_color: "#090a0f",
    theme_color: "#090a0f",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
