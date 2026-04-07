import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { LOCALE_COOKIE_NAME, parseLocaleCookie } from "@/lib/i18n/types";
import { THEME_STORAGE_KEY } from "@/lib/theme-constants";
import { shouldApplyDarkClass } from "@/lib/server-theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KULMISCART - Multi Vendor Commerce",
  description: "Build your store and sell anywhere in Somalia.",
  applicationName: "KulmisCart",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "KulmisCart",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerList = await headers();
  const themeCookie = cookieStore.get(THEME_STORAGE_KEY)?.value;
  const chPref = headerList.get("sec-ch-prefers-color-scheme");
  const serverDark = shouldApplyDarkClass(themeCookie, chPref);
  const initialLocale = parseLocaleCookie(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const htmlLang =
    initialLocale === "so" ? "so" : initialLocale === "ar" ? "ar" : "en";
  const htmlDir = initialLocale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={htmlLang}
      dir={htmlDir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${serverDark ? " dark" : ""}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full min-w-0 overflow-x-hidden bg-background text-foreground transition-colors duration-300"
      >
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
