import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/I18nProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Best Bites";

export const metadata: Metadata = {
  title: appName,
  description: "Only the best-rated restaurants and cafés within 5 km of you.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
