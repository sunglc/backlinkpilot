import type { Metadata } from "next";
import Link from "next/link";
import { LIVE_CHANNEL_COUNT, TOTAL_CHANNEL_COUNT } from "@/lib/execution-contract";

export const metadata: Metadata = {
  title: "Best Backlink Automation Tool 2026 — BacklinkPilot",
  description:
    `Automate your backlink building with AI-powered directory submission, stealth browser technology, and ${LIVE_CHANNEL_COUNT} live channels today. 500+ directories. From $29/month.`,
  keywords: [
    "backlink automation tool",
    "automated backlink builder",
    "backlink automation software",
    "automatic link building",
    "SEO automation tool",
  ],
};

export default function BacklinkAutomationTool() {
  return (
    <main>
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            Backlink<span className="text-blue-400">Pilot</span>
          </Link>
          <a
            href="/#pricing"
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Get Started
          </a>
        </div>
      </nav>

      <article className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            The Best Backlink Automation Tool for Indie Makers in 2026
          </h1>

          <p className="text-lg text-slate-400 mb-8">
            Building backlinks manually is one of the most time-consuming parts
            of SEO. You find directories, fill out forms, get blocked by
            CAPTCHAs, and repeat — for hours every week. BacklinkPilot automates
            this entire process.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">
            Why Manual Backlink Building Doesn&apos;t Scale
          </h2>
          <p className="text-slate-400 mb-4">
            Most indie makers and small startup founders know that backlinks
            matter for SEO. But the reality of building them is brutal:
          </p>
          <ul className="list-disc list-inside text-slate-400 space-y-2 mb-8">
            <li>
              Finding relevant directories takes hours of research
            </li>
            <li>
              Each directory has a different form layout — no two are the same
            </li>
            <li>
              40%+ of directories use Cloudflare or CAPTCHAs that block
              automation tools
            </li>
            <li>
              Hiring a VA costs $500-1500/month and quality is inconsistent
            </li>
            <li>
              Link building agencies charge $200-500/month and mostly do
              outreach, not submission
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">
            How BacklinkPilot Works
          </h2>
          <p className="text-slate-400 mb-4">
            BacklinkPilot is an automated backlink submission tool built for
            indie makers and small teams. Here&apos;s what it does:
          </p>
          <div className="space-y-4 mb-8">
            {[
              {
                title: "AI-Powered Form Filling",
                desc: "Our AI analyzes each directory's form fields and fills them correctly — handling dropdowns, text areas, categories, and descriptions automatically.",
              },
              {
                title: "Stealth Browser Technology",
                desc: "Anti-fingerprint browser tech bypasses Cloudflare, Turnstile, and CAPTCHAs. This unlocks 42% more directories that regular tools can't access.",
              },
              {
                title: "Phased Multi-Channel Rollout",
                desc: `BacklinkPilot runs ${LIVE_CHANNEL_COUNT} live channels today. Resource outreach, community, social, and editorial lanes are being connected in controlled rollout, not oversold as fully live.`,
              },
              {
                title: "Real-Time Dashboard",
                desc: "Track every submission: pending, live, failed. See your backlink profile grow in real time.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
              >
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">
            BacklinkPilot vs Alternatives
          </h2>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 text-slate-400 font-medium">
                    Feature
                  </th>
                  <th className="text-center py-3 text-blue-400 font-medium">
                    BacklinkPilot
                  </th>
                  <th className="text-center py-3 text-slate-400 font-medium">
                    Pitchbox
                  </th>
                  <th className="text-center py-3 text-slate-400 font-medium">
                    Manual / VA
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  ["Auto directory submission", "Yes", "No", "Manual"],
                  ["Stealth browser", "Yes", "No", "No"],
                  ["AI form filling", "Yes", "No", "No"],
                  ["Multi-channel", `${LIVE_CHANNEL_COUNT} live / ${TOTAL_CHANNEL_COUNT} planned`, "Email only", "1-2"],
                  ["Price", "From $29/mo", "From $195/mo", "$500-1500/mo"],
                  ["Setup time", "5 minutes", "Hours", "Days"],
                ].map(([feature, bp, pb, manual]) => (
                  <tr key={feature} className="border-b border-slate-800">
                    <td className="py-3">{feature}</td>
                    <td className="py-3 text-center text-green-400">{bp}</td>
                    <td className="py-3 text-center">{pb}</td>
                    <td className="py-3 text-center">{manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Ready to Automate Your Backlinks?
            </h2>
            <p className="text-slate-400 mb-6">
              Start your free trial. No credit card required.
            </p>
            <a
              href="/#pricing"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </article>

      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold text-white">
            Backlink<span className="text-blue-400">Pilot</span>
          </Link>
          <span className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} BacklinkPilot
          </span>
        </div>
      </footer>
    </main>
  );
}
