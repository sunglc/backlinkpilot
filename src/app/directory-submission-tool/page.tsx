import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Automated Directory Submission Tool — Submit to 500+ Directories | BacklinkPilot",
  description:
    "Automatically submit your website to 500+ curated directories. AI fills forms, stealth browser bypasses CAPTCHAs. Build backlinks on autopilot.",
  keywords: [
    "directory submission tool",
    "automated directory submission",
    "submit website to directories",
    "directory listing tool",
    "bulk directory submission",
  ],
};

export default function DirectorySubmissionTool() {
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
            Submit Your Website to 500+ Directories — Automatically
          </h1>

          <p className="text-lg text-slate-400 mb-8">
            Directory submissions are one of the easiest ways to build
            foundational backlinks for your website. But doing it manually?
            That&apos;s hours of repetitive form filling. BacklinkPilot does it
            for you in minutes.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">
            Why Directory Submissions Still Matter in 2026
          </h2>
          <p className="text-slate-400 mb-4">
            Some SEOs say directory submissions are dead. They&apos;re wrong —
            but they&apos;re right that <em>spammy</em> directory submissions
            are dead. High-quality, niche-relevant directory listings still
            provide:
          </p>
          <ul className="list-disc list-inside text-slate-400 space-y-2 mb-8">
            <li>
              <strong className="text-slate-200">Foundational backlinks</strong>{" "}
              — the base layer every new site needs
            </li>
            <li>
              <strong className="text-slate-200">Referral traffic</strong> —
              people actually browse directories to find tools
            </li>
            <li>
              <strong className="text-slate-200">Brand signals</strong> —
              consistent NAP (Name, Address, Phone) across the web
            </li>
            <li>
              <strong className="text-slate-200">Domain diversity</strong> —
              links from many different domains signal authority to Google
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">
            What Makes Our Directory Submission Different
          </h2>
          <div className="space-y-4 mb-8">
            {[
              {
                title: "500+ Curated Directories",
                desc: "Not a random list scraped from the internet. Every directory is vetted for quality, domain authority, and relevance. No PBNs, no spam.",
              },
              {
                title: "AI Form Analysis",
                desc: "Every directory has a different form. Our AI reads the form, understands the fields, and fills them correctly — categories, descriptions, tags, everything.",
              },
              {
                title: "Stealth Browser — 42% More Directories",
                desc: "40%+ of quality directories use Cloudflare or CAPTCHAs. Our anti-fingerprint browser tech unlocks them. That's 200+ extra directories your competitors can't access.",
              },
              {
                title: "Submission Verification",
                desc: "We don't just submit and forget. BacklinkPilot checks back to verify your listing is live, indexed, and linking correctly.",
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
            How It Works
          </h2>
          <ol className="list-decimal list-inside text-slate-400 space-y-3 mb-8">
            <li>
              <strong className="text-slate-200">Enter your product URL</strong>{" "}
              — we auto-detect your product name, description, and category
            </li>
            <li>
              <strong className="text-slate-200">
                Review matched directories
              </strong>{" "}
              — see which directories are relevant to your product
            </li>
            <li>
              <strong className="text-slate-200">Click submit</strong> —
              BacklinkPilot handles form filling, CAPTCHA solving, and
              submission
            </li>
            <li>
              <strong className="text-slate-200">Track results</strong> — see
              submissions go from pending to live in your dashboard
            </li>
          </ol>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Stop Submitting Directories by Hand
            </h2>
            <p className="text-slate-400 mb-6">
              Let BacklinkPilot handle the tedious work. Start your free trial
              today.
            </p>
            <a
              href="/#pricing"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition"
            >
              Start Free Trial — $29/month
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
