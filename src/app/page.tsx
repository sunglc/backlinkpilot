import Link from "next/link";
import { LIVE_CHANNEL_COUNT, TOTAL_CHANNEL_COUNT } from "@/lib/execution-contract";

const stats = [
  { value: "500+", label: "Directories" },
  { value: `${LIVE_CHANNEL_COUNT}`, label: "Live Channels" },
  { value: "42%", label: "Stealth Unlock Rate" },
  { value: "< 5min", label: "Setup Time" },
];

const channels = [
  {
    name: "Directory Submission",
    desc: "Auto-fill and submit to 500+ curated directories with AI-powered form completion.",
    icon: "📂",
  },
  {
    name: "Stealth Browser",
    desc: "Anti-fingerprint browser bypasses Cloudflare, Turnstile, and CAPTCHAs that block normal tools.",
    icon: "🥷",
  },
  {
    name: "Resource Page Outreach",
    desc: "Find relevant resource pages and send personalized outreach emails automatically.",
    icon: "📧",
  },
  {
    name: "Community Submission",
    desc: "Submit to GitHub, Product Hunt, and developer communities with proper formatting.",
    icon: "👥",
  },
  {
    name: "Social Distribution",
    desc: "Distribute to X (Twitter), Pinterest, and social platforms for social signals.",
    icon: "📱",
  },
  {
    name: "Real-time Reporting",
    desc: "Track every submission: pending, live, failed. See your backlink profile grow.",
    icon: "📊",
  },
];

const painPoints = [
  {
    before: "Spend 5+ hours/week manually submitting to directories",
    after: "Click once. BacklinkPilot submits to 500+ in minutes.",
  },
  {
    before: "Get blocked by Cloudflare, CAPTCHAs, and anti-bot walls",
    after: "Stealth browser technology bypasses 42% of blocked sites.",
  },
  {
    before: "Pay $200-500/month for Pitchbox or a link building agency",
    after: "Full automation for $29/month. No agency middlemen.",
  },
  {
    before: "Hire a VA for $1000/month who submits inconsistently",
    after: "Consistent, automated, 24/7. Never misses a submission.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: 29,
    period: "/month",
    features: [
      "1 product",
      "100 submissions/month",
      "Directory submission",
      "Basic reporting",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Growth",
    price: 79,
    period: "/month",
    features: [
      "3 products",
      "500 submissions/month",
      `${LIVE_CHANNEL_COUNT} live channels today`,
      `${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} in rollout`,
      "Stealth browser",
      "Resource page outreach",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Scale",
    price: 199,
    period: "/month",
    features: [
      "10 products",
      "Unlimited submissions",
      `${LIVE_CHANNEL_COUNT} live channels today`,
      `${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} in rollout`,
      "Stealth browser",
      "Custom directory list",
      "API access",
      "Dedicated support",
    ],
    cta: "Contact Us",
    popular: false,
  },
];

const faqs = [
  {
    q: "Is this safe for my SEO?",
    a: "Yes. BacklinkPilot only submits to legitimate, curated directories — no PBNs, no spam. These are the same directories you'd submit to manually. We monitor Google's guidelines and exclude any risky targets.",
  },
  {
    q: "How is this different from Ahrefs or Semrush?",
    a: "Ahrefs and Semrush are analytics tools — they show you backlink data. BacklinkPilot actually builds backlinks for you. We automate the submission process that you'd otherwise do by hand.",
  },
  {
    q: "What kind of websites can I submit?",
    a: "Any legitimate product, SaaS, tool, app, or website. Our AI adapts the submission to match each directory's categories and requirements.",
  },
  {
    q: "How does the stealth browser work?",
    a: "We use anti-fingerprint browser technology to bypass Cloudflare, Turnstile, and other bot detection. This unlocks 42% more directories that regular tools can't access.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no lock-in. Cancel anytime from your dashboard.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-white">
            Backlink<span className="text-blue-400">Pilot</span>
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#pricing" className="hover:text-white transition">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white transition">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            Stop building backlinks manually
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Autopilot for Your
            <br />
            <span className="text-blue-400">Backlinks</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Submit your product to 500+ directories automatically. AI-powered
            form filling, stealth browser technology, {LIVE_CHANNEL_COUNT} live channels today, and a {TOTAL_CHANNEL_COUNT}-channel roadmap. Set up
            in 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="#pricing"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-lg text-lg transition"
            >
              Start Free Trial
            </a>
            <a
              href="#how-it-works"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 font-medium px-8 py-3.5 rounded-lg text-lg transition"
            >
              See How It Works
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain → Solution */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Link Building is Painful. We Fix That.
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Every indie maker knows the pain. You launch a great product, then
            spend weeks doing tedious manual backlink work.
          </p>
          <div className="space-y-6">
            {painPoints.map((point, i) => (
              <div
                key={i}
                className="grid md:grid-cols-2 gap-4 items-center"
              >
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5">
                  <span className="text-red-400 text-sm font-medium">
                    Before
                  </span>
                  <p className="text-slate-300 mt-1">{point.before}</p>
                </div>
                <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-5">
                  <span className="text-green-400 text-sm font-medium">
                    After
                  </span>
                  <p className="text-slate-300 mt-1">{point.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            3 Steps. 5 Minutes. Done.
          </h2>
          <p className="text-slate-400 text-center mb-12">
            No complex setup. No learning curve.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Add Your Product",
                desc: "Enter your URL, product name, and a short description. Our AI handles the rest.",
              },
              {
                step: "2",
                title: "Choose Channels",
                desc: `Pick which channels to activate. ${LIVE_CHANNEL_COUNT} are live today and the rest are rolling out in phases.`,
              },
              {
                step: "3",
                title: "Watch It Work",
                desc: "BacklinkPilot submits automatically. Track progress in real-time on your dashboard.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features / Channels */}
      <section id="features" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            6 Channels. One Dashboard.
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Most tools only do one thing. BacklinkPilot automates your entire
            backlink strategy across {LIVE_CHANNEL_COUNT} live channels today, with additional channels in rollout.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((ch) => (
              <div
                key={ch.name}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/30 transition"
              >
                <div className="text-3xl mb-3">{ch.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {ch.name}
                </h3>
                <p className="text-slate-400 text-sm">{ch.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple Pricing. No Surprises.
          </h2>
          <p className="text-slate-400 text-center mb-12">
            Cheaper than a VA. More reliable than an agency. Cancel anytime.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-8 border ${
                  plan.popular
                    ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20"
                    : "border-slate-700 bg-slate-800/50"
                }`}
              >
                {plan.popular && (
                  <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-white">
                    ${plan.price}
                  </span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-slate-300"
                    >
                      <svg
                        className="w-4 h-4 text-blue-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    plan.popular
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="border border-slate-700/50 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  {faq.q}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Stop Wasting Time on Manual Backlinks
          </h2>
          <p className="text-slate-400 mb-8">
            Join hundreds of indie makers who automated their link building with
            BacklinkPilot.
          </p>
          <a
            href="#pricing"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Start Your Free Trial
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold text-white">
            Backlink<span className="text-blue-400">Pilot</span>
          </span>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-300 transition">
              Terms
            </Link>
            <a href="mailto:support@backlinkpilot.com" className="hover:text-slate-300 transition">
              Contact
            </a>
          </div>
          <span className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} BacklinkPilot
          </span>
        </div>
      </footer>
    </main>
  );
}
