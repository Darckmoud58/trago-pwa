import type { Metadata, Viewport } from "next";
import { Figtree, Syne } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { GeoProvider } from "@/components/GeoProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { InstallBanner } from "@/components/InstallBanner";
import { BirthdayNotifier } from "@/components/BirthdayNotifier";
import { CatalogProvider } from "@/components/CatalogProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { getCatalog, seedCatalog } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import "./globals.css";

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TraGo — Promos vigentes cerca de ti",
  description:
    "Promos vigentes en Guadalajara: comida, café, botellas y regalos de cumpleaños. Por sucursal y cerca de ti.",
  applicationName: "TraGo",
  appleWebApp: {
    capable: true,
    title: "TraGo",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#08110e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [catalog, user] = await Promise.all([
    getCatalog().catch(() => seedCatalog()),
    getSession().catch(() => null),
  ]);

  return (
    <html lang="es">
      <body className={`${body.variable} ${display.variable} antialiased`}>
        <SessionProvider user={user}>
          <CatalogProvider catalog={catalog}>
            <GeoProvider>
              <PwaRegister />
              <BirthdayNotifier />
              <NavBar />
              <main className="pb-24 md:pb-10">{children}</main>
              <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-[var(--muted)]">
                TraGo · Guadalajara · 18+ en alcohol · promos sujetas a existencias
              </footer>
              <InstallBanner />
            </GeoProvider>
          </CatalogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
