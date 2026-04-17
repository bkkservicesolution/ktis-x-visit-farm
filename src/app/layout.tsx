import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KTIS X VISIT FARM",
  description: "KTIS X VISIT FARM – Onsite Visit Form",
  icons: {
    icon: [
      { url: "/brand/logo.png", type: "image/png" },
      { url: "/brand/logo.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/brand/logo.png", type: "image/png" }],
  },
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
