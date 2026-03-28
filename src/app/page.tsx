import Link from "next/link";

import { LIVE_CHANNEL_COUNT, TOTAL_CHANNEL_COUNT } from "@/lib/execution-contract";

const signalStrip = [
  "500+ vetted directories",
  `${LIVE_CHANNEL_COUNT} live channels today`,
  "Free first-product setup",
  "AI-assisted copy detection",
];

const valuePoints = [
  {
    title: "Starts from your homepage",
    detail:
      "Paste your URL and BacklinkPilot pulls the name, title, and product description before you touch a field.",
  },
  {
    title: "Built for real submission work",
    detail:
      "Directories and stealth routes are live now. The rest of the network is shown honestly as rollout, not fake coverage.",
  },
  {
    title: "Made for makers, not SEO teams",
    detail:
      "You do not need a VA, a link agency, or a giant playbook just to get your first wave of backlinks moving.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Paste your homepage",
    copy:
      "Start with the URL you already ship. The app normalizes it, reads public metadata, and turns it into a product profile.",
    aside: "Typical time: under 30 seconds",
  },
  {
    step: "02",
    title: "Confirm the positioning",
    copy:
      "Edit the detected name and description, then choose when to upgrade into live directory and stealth submission lanes.",
    aside: "No need to write submission copy from scratch",
  },
  {
    step: "03",
    title: "Let the engine run",
    copy:
      "Track queue, progress, and operational status from one place instead of juggling spreadsheets, VAs, and outreach docs.",
    aside: "Designed for the first 500 backlinks, not enterprise theatre",
  },
];

const channelGroups = [
  {
    label: "Live now",
    tone: "text-emerald-300",
    items: [
      "Directory Submission",
      "Stealth Browser Submission",
    ],
  },
  {
    label: "Rolling out next",
    tone: "text-amber-200",
    items: [
      "Community Submission",
      "Resource Page Outreach",
      "Social Distribution",
      "Editorial Outreach",
    ],
  },
];

const faqs = [
  {
    q: "Is this safe for SEO?",
    a: "The product is built around vetted directories and controlled rollout. It is explicitly not positioned as spam volume or private-blog-network automation.",
  },
  {
    q: "Why is free setup important?",
    a: "Because a consumer tool should let you feel the workflow before asking for money. You can now add one product and see the system recognize it before you upgrade.",
  },
  {
    q: "What happens after I upgrade?",
    a: "Your saved product profile becomes the source of truth for live channels. Directory and stealth routes can start from that profile immediately.",
  },
  {
    q: "Is everything already live?",
    a: `No. ${LIVE_CHANNEL_COUNT} channels are live today, and the remaining ${TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} are shown as rollout so the product does not over-promise.`,
  },
];

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="text-sm font-medium uppercase tracking-[0.28em] text-stone-200"
          >
            BacklinkPilot
          </Link>
          <div className="hidden items-center gap-8 text-sm text-stone-400 md:flex">
            <a href="#product">Product</a>
            <a href="#workflow">Workflow</a>
            <a href="#pricing-teaser">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-stone-400 transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-[var(--line-strong)] bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Try Free Setup
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen overflow-hidden px-5 pb-16 pt-28 md:px-8 md:pt-32">
        <div className="bp-grid absolute inset-0 opacity-40" />
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(246,212,148,0.18),transparent_58%)]" />
        <div className="absolute right-[-12rem] top-32 h-80 w-80 rounded-full bg-emerald-300/8 blur-3xl" />
        <div className="absolute left-[-6rem] top-48 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(26rem,0.85fr)] lg:items-end">
          <div className="bp-fade-up">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-amber-200/80">
              Consumer link-building tool
            </p>
            <div className="max-w-4xl">
              <div className="font-display text-[4.25rem] leading-none tracking-[-0.05em] text-stone-50 md:text-[7rem]">
                BacklinkPilot
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-medium leading-[1.03] text-stone-100 md:text-5xl">
                Paste your homepage.
                <br />
                Leave with a live backlink launch plan.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
                BacklinkPilot turns a plain product URL into a submission-ready profile,
                then routes it into real directory and stealth channels without making
                you learn agency-style workflows.
              </p>
            </div>

            <div className="bp-fade-up bp-fade-delay-1 mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-full bg-[var(--accent-500)] px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
              >
                Start Free Setup
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-[var(--line-strong)] px-6 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
              >
                See Pricing
              </Link>
            </div>

            <div className="bp-fade-up bp-fade-delay-2 mt-10 flex flex-wrap gap-3 text-xs uppercase tracking-[0.24em] text-stone-400">
              {signalStrip.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--line-soft)] bg-white/4 px-3 py-2"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bp-fade-up bp-fade-delay-3 relative">
            <div className="bp-float absolute -right-4 top-4 h-28 w-28 rounded-full border border-amber-200/15 bg-amber-100/6 blur-2xl" />
            <div className="bp-float bp-float-delay absolute bottom-12 left-0 h-24 w-24 rounded-full border border-emerald-200/10 bg-emerald-100/6 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-400">
                    First-product setup
                  </p>
                  <p className="mt-2 text-2xl font-medium text-stone-50">
                    One URL in, ready-to-run profile out.
                  </p>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-200">
                  Live now
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-stone-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                    Homepage URL
                  </p>
                  <p className="mt-3 rounded-full border border-white/8 bg-white/5 px-4 py-3 text-sm text-stone-200">
                    https://your-product.com
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[#221c17] p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                      Auto-detected profile
                    </p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs text-stone-500">Product name</p>
                        <p className="mt-1 text-lg font-medium text-stone-100">
                          BacklinkPilot
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Description</p>
                        <p className="mt-1 text-sm leading-6 text-stone-300">
                          Automated backlink setup for makers who want vetted
                          directory reach, stealth unlocks, and a clean launch path.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[#141310] p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                      Submission readiness
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-stone-300">
                      <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-3">
                        <span>Directory network</span>
                        <span className="text-emerald-200">Ready</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-3">
                        <span>Stealth route</span>
                        <span className="text-emerald-200">Ready</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Outreach lanes</span>
                        <span className="text-amber-200">Rollout</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[linear-gradient(135deg,rgba(159,224,207,0.08),rgba(208,166,90,0.06))] p-4">
                  <div className="flex items-end justify-between gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                        What changes versus manual work
                      </p>
                      <p className="mt-3 max-w-sm text-sm leading-6 text-stone-300">
                        The product now feels like an onboarding flow, not an admin form:
                        detect copy first, save one product free, then upgrade when you are ready to run.
                      </p>
                    </div>
                    <div className="font-display text-5xl leading-none text-amber-100">
                      5m
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="product"
        className="border-t border-[var(--line-soft)] px-5 py-18 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Why this feels different
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              Built for the first meaningful wave of backlinks, not enterprise SEO theatre.
            </h2>
          </div>

          <div className="mt-12 divide-y divide-[var(--line-soft)] border-y border-[var(--line-soft)]">
            {valuePoints.map((point) => (
              <div
                key={point.title}
                className="grid gap-5 py-8 md:grid-cols-[0.9fr_1.1fr] md:items-start"
              >
                <h3 className="text-2xl font-medium text-stone-100">{point.title}</h3>
                <p className="max-w-2xl text-base leading-7 text-stone-400">
                  {point.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="workflow"
        className="px-5 py-18 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.62fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                Workflow
              </p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
                Three clean steps instead of fifteen little SEO chores.
              </h2>
            </div>

            <div className="space-y-6">
              {workflow.map((item) => (
                <div
                  key={item.step}
                  className="grid gap-4 rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.03] p-6 md:grid-cols-[5.5rem_1fr_auto] md:items-start"
                >
                  <div className="font-display text-5xl leading-none text-amber-100/80">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium text-stone-100">
                      {item.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400 md:text-base">
                      {item.copy}
                    </p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.22em] text-stone-500 md:max-w-[12rem] md:text-right">
                    {item.aside}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line-soft)] bg-white/[0.02] px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Channel truth
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              Honest coverage beats fake “all channels live” marketing.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-400">
              The product says exactly what is ready today and what is still rolling out.
              That matters because consumer trust is easier to win on day one than after a refund.
            </p>
          </div>

          <div className="space-y-8">
            {channelGroups.map((group) => (
              <div
                key={group.label}
                className="rounded-[1.75rem] border border-[var(--line-soft)] bg-stone-950/60 p-6"
              >
                <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-4">
                  <p className={`text-sm font-medium uppercase tracking-[0.28em] ${group.tone}`}>
                    {group.label}
                  </p>
                  <span className="text-xs uppercase tracking-[0.24em] text-stone-500">
                    {group.items.length} lanes
                  </span>
                </div>
                <div className="mt-4 divide-y divide-[var(--line-soft)]">
                  {group.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between py-4 text-sm text-stone-300 md:text-base"
                    >
                      <span>{item}</span>
                      <span className={`text-xs uppercase tracking-[0.24em] ${group.tone}`}>
                        {group.label === "Live now" ? "Ready" : "Soon"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-sm text-stone-500">
              Total roadmap: {TOTAL_CHANNEL_COUNT} channels. Live today: {LIVE_CHANNEL_COUNT}.
            </p>
          </div>
        </div>
      </section>

      <section
        id="pricing-teaser"
        className="px-5 py-18 md:px-8 md:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              Pricing posture
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              Start with setup.
              <br />
              Pay when you want the engine.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-400">
              The product now lets new users feel the workflow before committing.
              Pricing is there to unlock live submission capacity, not block basic orientation.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "$29",
                copy: "Single product, essential volume, clean first launch.",
              },
              {
                name: "Growth",
                price: "$79",
                copy: "The main plan for products actively building distribution.",
              },
              {
                name: "Scale",
                price: "$199",
                copy: "For teams, larger portfolios, and custom submission depth.",
              },
            ].map((plan, index) => (
              <div
                key={plan.name}
                className={`rounded-[1.75rem] border p-6 ${
                  index === 1
                    ? "border-[var(--accent-500)] bg-[linear-gradient(180deg,rgba(208,166,90,0.13),rgba(208,166,90,0.04))]"
                    : "border-[var(--line-soft)] bg-white/[0.03]"
                }`}
              >
                <p className="text-sm uppercase tracking-[0.28em] text-stone-500">
                  {plan.name}
                </p>
                <p className="mt-5 font-display text-5xl text-stone-50">
                  {plan.price}
                </p>
                <p className="mt-4 text-sm leading-6 text-stone-400">
                  {plan.copy}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl">
          <Link
            href="/pricing"
            className="inline-flex rounded-full border border-[var(--line-strong)] px-6 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/6"
          >
            Open Full Pricing
          </Link>
        </div>
      </section>

      <section
        id="faq"
        className="border-t border-[var(--line-soft)] px-5 py-18 md:px-8 md:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
              FAQ
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight text-stone-50 md:text-6xl">
              Short answers for the questions that actually matter.
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.03] p-6"
              >
                <summary className="cursor-pointer list-none text-lg font-medium text-stone-100">
                  {item.q}
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400 md:text-base">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
