"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-white">
            Backlink<span className="text-blue-400">Pilot</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <a
            href="/api/stripe/checkout?plan=starter"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition text-sm"
          >
            Upgrade Plan
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Submissions", value: "0", sub: "this month" },
            { label: "Success Rate", value: "—", sub: "no data yet" },
            { label: "Active Channels", value: "0", sub: "of 6" },
            { label: "Plan", value: "Free", sub: "upgrade to start" },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Ready to build your backlink profile?
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Choose a plan to start submitting your product to 500+ directories
            across 6 channels with stealth browser automation.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/api/stripe/checkout?plan=starter"
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              Starter — $29/mo
            </a>
            <a
              href="/api/stripe/checkout?plan=growth"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              Growth — $79/mo
            </a>
            <a
              href="/api/stripe/checkout?plan=scale"
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              Scale — $199/mo
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
