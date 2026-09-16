import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TraGo",
    short_name: "TraGo",
    description: "Promociones vigentes de cadenas, por sucursal y cerca de ti.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#08110e",
    theme_color: "#08110e",
    lang: "es-MX",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
