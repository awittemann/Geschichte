import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SitzungsProvider } from "@/lib/client/sitzung";
import NutzerMenu from "@/components/NutzerMenu";

export const metadata: Metadata = {
  title: "Lernkarten – Aufklärung & Menschenrechte",
  description:
    "Lernkarten-App zum Üben des Themas Aufklärung und Menschenrechte.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        <SitzungsProvider>
          <header className="safe-area-pt safe-area-px mx-auto max-w-md w-full flex items-center justify-end py-2">
            <NutzerMenu />
          </header>
          {children}
        </SitzungsProvider>
      </body>
    </html>
  );
}
