"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

const CHANNELS = [
  {
    id: "directory",
    name: "Directory Submission",
    icon: "📂",
    desc: "Submit to 500+ AI tool directories",
    plans: ["starter", "growth", "scale"],
  },
  {
    id: "stealth",
    name: "Stealth Browser",
    icon: "🥷",
    desc: "Bypass Cloudflare & CAPTCHAs for protected directories",
    plans: ["starter", "growth", "scale"],
  },
  {
    id: "community",
    name: "Community Submission",
    icon: "👥",
    desc: "GitHub, Product Hunt, dev communities",
    plans: ["growth", "scale"],
  },
  {
    id: "resource_page",
    name: "Resource Page Outreach",
    icon: "📧",
    desc: "Find & email resource page owners",
    plans: ["growth", "scale"],
  },
  {
    id: "social",
    name: "Social Distribution",
    icon: "📱",
    desc: "X, Pinterest, automated social posts",
    plans: ["scale"],
  },
  {
    id: "editorial",
    name: "Editorial Outreach",
    icon: "✍️",
    desc: "Contact editors and bloggers for reviews",
    plans: ["scale"],
  },
];

interface Submission {
  id: string;
  channel: string;
  status: string;
  total_sites: number;
  completed_sites: number;
  success_sites: number;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  url: string;
  description: string;
  status: string;
}

export default function ProductDetail({
  user,
  product,
  submissions,
  plan,
}: {
  user: User;
  product: Product;
  submissions: Submission[];
  plan: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function startSubmission(channelId: string) {
    setSubmitting(channelId);
    const supabase = createClient();

    const { error } = await supabase.from("submissions").insert({
      user_id: user.id,
      product_id: product.id,
      channel: channelId,
      status: "queued",
    });

    if (!error) {
      router.refresh();
    }
    setSubmitting(null);
  }

  function channelName(id: string) {
    return CHANNELS.find((c) => c.id === id)?.name || id;
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      queued: "bg-yellow-500/10 text-yellow-400",
      running: "bg-blue-500/10 text-blue-400",
      completed: "bg-green-500/10 text-green-400",
      failed: "bg-red-500/10 text-red-400",
    };
    return styles[status] || "bg-slate-500/10 text-slate-400";
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-white">
            Backlink<span className="text-blue-400">Pilot</span>
          </Link>
          <span className="text-sm text-slate-400">{user.email}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/dashboard" className="hover:text-white transition">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-white">{product.name}</span>
        </div>

        {/* Product Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h1 className="text-xl font-bold text-white">{product.name}</h1>
          <p className="text-sm text-blue-400 mt-1">{product.url}</p>
          <p className="text-sm text-slate-400 mt-2">{product.description}</p>
        </div>

        {/* Channels */}
        <h2 className="text-lg font-semibold text-white mb-4">Channels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {CHANNELS.map((channel) => {
            const available = channel.plans.includes(plan);
            const activeSubmission = submissions.find(
              (s) => s.channel === channel.id && (s.status === "queued" || s.status === "running")
            );

            return (
              <div
                key={channel.id}
                className={`bg-slate-900 border rounded-xl p-5 ${
                  available ? "border-slate-800" : "border-slate-800/50 opacity-50"
                }`}
              >
                <div className="text-2xl mb-2">{channel.icon}</div>
                <h3 className="text-white font-semibold text-sm">{channel.name}</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">{channel.desc}</p>

                {!available ? (
                  <span className="text-xs text-slate-500">Upgrade to unlock</span>
                ) : activeSubmission ? (
                  <span className="text-xs text-blue-400">
                    {activeSubmission.status === "queued" ? "Queued..." : "Running..."}
                  </span>
                ) : (
                  <button
                    onClick={() => startSubmission(channel.id)}
                    disabled={submitting === channel.id}
                    className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                  >
                    {submitting === channel.id ? "Starting..." : "Start Submission"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Submission History */}
        <h2 className="text-lg font-semibold text-white mb-4">Submission History</h2>
        {submissions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400 text-sm">No submissions yet. Choose a channel above to start.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-white font-medium text-sm">{channelName(sub.channel)}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(sub.created_at).toLocaleDateString()}{" "}
                    {sub.total_sites > 0 && (
                      <>
                        · {sub.completed_sites}/{sub.total_sites} sites
                        · {sub.success_sites} successful
                      </>
                    )}
                  </p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusBadge(sub.status)}`}>
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
