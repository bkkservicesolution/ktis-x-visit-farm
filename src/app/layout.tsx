import type { Metadata } from "next";
import type { Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KTIS X SURVEYPRO",
  description: "KTIS X SURVEYPRO – โปรแกรมประเมินศักยภาพและสำรวจความคิดเห็น",
  icons: {
    // Use generated icon routes so browser icon can differ from in-app logo.
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
      // fallback static file (some browsers ignore dynamic icon routes)
      { url: "/brand/favicon-32.png?v=4", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon", type: "image/png", sizes: "180x180" },
      { url: "/brand/favicon-180.png?v=4", type: "image/png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${kanit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
