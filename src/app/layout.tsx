import type { Metadata } from "next";
import { Newsreader, Space_Grotesk } from "next/font/google";

import { getLocale } from "@/lib/locale";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "BacklinkPilot",
  description:
    "Automatically submit your product to vetted directories with AI-powered form filling and stealth browser technology. Additional outreach channels roll out in phases. From $29/month.",
  keywords: [
    "backlink automation",
    "directory submission",
    "SEO tool",
    "link building",
    "backlink builder",
    "automated backlinks",
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body
        className={`${spaceGrotesk.variable} ${newsreader.variable} antialiased bg-stone-950 text-stone-100`}
      >
        {children}
      </body>
    </html>
  );
}
