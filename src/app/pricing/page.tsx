import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — BacklinkPilot",
  description:
    "Simple pricing for automated backlink building. Starter $29/mo, Growth $79/mo, Scale $199/mo. No contracts, cancel anytime.",
};

const plans = [
  {
    name: "Starter",
    price: 29,
    desc: "For indie makers just getting started with SEO.",
    features: [
      "1 product",
      "100 submissions/month",
      "Directory submission channel",
      "Basic reporting dashboard",
      "Email support",
    ],
    limits: ["No stealth browser", "No outreach emails", "No API access"],
    popular: false,
  },
  {
    name: "Growth",
    price: 79,
    desc: "For growing products that need serious backlink firepower.",
    features: [
      "3 products",
      "500 submissions/month",
      "All 6 channels",
      "Stealth browser technology",
      "Resource page outreach",
      "Community submissions",
      "Social distribution",
      "Priority support",
    ],
    limits: ["No custom directory list", "No API access"],
    popular: true,
  },
  {
    name: "Scale",
    price: 199,
    desc: "For agencies and teams managing multiple products.",
    features: [
      "10 products",
      "Unlimited submissions",
      "All 6 channels",
      "Stealth browser technology",
      "Custom directory list",
      "API access",
      "White-label reports",
      "Dedicated support",
    ],
    limits: [],
    popular: false,
  },
];

export default function Pricing() {
  return (
    <main>
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            Backlink<span className="text-blue-400">Pilot</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <Link href="/#features" className="hover:text-white transition">
              Features
            </Link>
            <Link href="/pricing" className="text-white">
              Pricing
            </Link>
            <Link href="/#faq" className="hover:text-white transition">
              FAQ
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-slate-400 text-center mb-4 max-w-xl mx-auto">
            No contracts. No hidden fees. Cancel anytime. Start with a 7-day
            free trial on any plan.
          </p>
          <p className="text-blue-400 text-center text-sm mb-12">
            Cheaper than a VA. More reliable than an agency.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-8 border flex flex-col ${
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
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <p className="text-slate-400 text-sm mt-1 mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    ${plan.price}
                  </span>
                  <span className="text-slate-400">/month</span>
                </div>

                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                    Includes
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-slate-300"
                      >
                        <svg
                          className="w-4 h-4 text-green-400 shrink-0 mt-0.5"
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
                  {plan.limits.length > 0 && (
                    <>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                        Not included
                      </p>
                      <ul className="space-y-2 mb-6">
                        {plan.limits.map((l) => (
                          <li
                            key={l}
                            className="flex items-start gap-2 text-sm text-slate-500"
                          >
                            <svg
                              className="w-4 h-4 text-slate-600 shrink-0 mt-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            {l}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    plan.popular
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                >
                  Start 7-Day Free Trial
                </button>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Frequently Asked Pricing Questions
            </h2>
            <div className="space-y-4 text-left">
              {[
                {
                  q: "Is there a free trial?",
                  a: "Yes! Every plan includes a 7-day free trial. No credit card required to start.",
                },
                {
                  q: "What counts as a 'submission'?",
                  a: "Each directory, resource page, or community submission counts as one. Social distribution and email outreach have separate limits based on your plan.",
                },
                {
                  q: "Can I upgrade or downgrade anytime?",
                  a: "Yes. Changes take effect immediately. If you upgrade mid-cycle, you'll be prorated. If you downgrade, the change applies at your next billing date.",
                },
                {
                  q: "Do you offer annual pricing?",
                  a: "Yes — save 20% with annual billing. Contact us for details.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="border border-slate-700/50 rounded-xl p-5"
                >
                  <h3 className="text-white font-semibold mb-1">{item.q}</h3>
                  <p className="text-slate-400 text-sm">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
