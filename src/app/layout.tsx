import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BacklinkPilot — Autopilot for Your Backlinks",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
