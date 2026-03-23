import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BacklinkPilot — Autopilot for Your Backlinks",
  description:
    "Automatically submit your product to 500+ directories. AI-powered form filling, stealth browser technology, multi-channel outreach. From $29/month.",
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
