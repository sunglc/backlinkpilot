"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { CHANNELS, LIVE_CHANNEL_COUNT, TOTAL_CHANNEL_COUNT } from "@/lib/execution-contract";
import type { User } from "@supabase/supabase-js";

interface SiteResult {
  site: string;
  success: boolean;
  output: string;
}

interface Submission {
  id: string;
  channel: string;
  status: string;
  total_sites: number;
  completed_sites: number;
  success_sites: number;
  results: SiteResult[];
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

  // Auto-refresh when there are running/queued submissions
  const hasActive = submissions.some(
    (s) => s.status === "queued" || s.status === "running"
  );
  useEffect(() => {
    if (!hasActive) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [hasActive, router]);

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

  function supportBadge(channelId: string) {
    const channel = CHANNELS.find((c) => c.id === channelId);
    if (!channel) return null;
    if (channel.support_status === "live") {
      return (
        <span className="text-[10px] font-medium uppercase tracking-wide text-green-400">
          Live
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        Planned
      </span>
    );
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
        <div className="flex items-end justify-between mb-4 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Channels</h2>
            <p className="text-xs text-slate-500 mt-1">
              {LIVE_CHANNEL_COUNT} live today, {TOTAL_CHANNEL_COUNT - LIVE_CHANNEL_COUNT} in controlled rollout.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {CHANNELS.map((channel) => {
            const available = channel.plans.includes(plan);
            const live = channel.support_status === "live";
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
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-white font-semibold text-sm">{channel.name}</h3>
                  {supportBadge(channel.id)}
                </div>
                <p className="text-xs text-slate-400 mt-1 mb-4">{channel.desc}</p>

                {!available ? (
                  <span className="text-xs text-slate-500">Upgrade to unlock</span>
                ) : !live ? (
                  <span className="text-xs text-slate-500">Not customer-runnable yet</span>
                ) : activeSubmission ? (
                  <div>
                    <span className="text-xs text-blue-400">
                      {activeSubmission.status === "queued" ? "Queued..." : `Running ${activeSubmission.completed_sites}/${activeSubmission.total_sites}`}
                    </span>
                    {activeSubmission.total_sites > 0 && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(activeSubmission.completed_sites / activeSubmission.total_sites) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => startSubmission(channel.id)}
                    disabled={submitting === channel.id || !live}
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
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isActive = sub.status === "running" || sub.status === "queued";
              const progress = sub.total_sites > 0 ? Math.round((sub.completed_sites / sub.total_sites) * 100) : 0;
              const results = sub.results || [];

              return (
                <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-white font-medium">{channelName(sub.channel)}</h3>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusBadge(sub.status)}`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(sub.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {sub.total_sites > 0 && (
                      <div className="text-right">
                        <p className="text-white font-semibold text-lg">
                          {sub.success_sites}<span className="text-slate-500 text-sm">/{sub.total_sites}</span>
                        </p>
                        <p className="text-xs text-slate-500">successful</p>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {isActive && sub.total_sites > 0 && (
                    <div className="px-5 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">
                          Submitting... {sub.completed_sites}/{sub.total_sites} sites
                        </span>
                        <span className="text-xs text-blue-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Site Results */}
                  {results.length > 0 && (
                    <div className="border-t border-slate-800 px-5 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {results.map((r, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                              r.success
                                ? "bg-green-500/5 text-green-400"
                                : "bg-red-500/5 text-red-400"
                            }`}
                            title={r.output}
                          >
                            <span>{r.success ? "✓" : "✗"}</span>
                            <span className="truncate">{r.site}</span>
                          </div>
                        ))}
                        {/* Pending placeholders */}
                        {isActive && sub.total_sites > results.length && (
                          Array.from({ length: Math.min(sub.total_sites - results.length, 4) }).map((_, i) => (
                            <div
                              key={`pending-${i}`}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-slate-800/50 text-slate-500"
                            >
                              <span className="animate-pulse">⏳</span>
                              <span>Pending...</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Queued State */}
                  {sub.status === "queued" && results.length === 0 && (
                    <div className="border-t border-slate-800 px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="animate-pulse">⏳</span>
                        Waiting for worker to pick up this job...
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
