"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { LIVE_CHANNEL_COUNT } from "@/lib/execution-contract";
import type { User } from "@supabase/supabase-js";

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string;
}

interface Product {
  id: string;
  name: string;
  url: string;
  description: string;
  status: string;
  created_at: string;
}

interface SitePreview {
  normalizedUrl: string;
  hostname: string;
  name: string;
  description: string;
  detectedFrom: {
    name: string;
    description: string;
  };
}

const FREE_PREVIEW_PRODUCT_LIMIT = 1;

function productStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Active",
    completed: "Ready",
    pending: "Queued",
    draft: "Draft",
  };
  return labels[status] || status;
}

function productStatusClasses(status: string) {
  const classes: Record<string, string> = {
    active: "bg-green-500/10 text-green-400",
    completed: "bg-blue-500/10 text-blue-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    draft: "bg-slate-700 text-slate-300",
  };
  return classes[status] || "bg-yellow-500/10 text-yellow-400";
}

export default function DashboardClient({
  user,
  subscription,
  products,
}: {
  user: User;
  subscription: Subscription | null;
  products: Product[];
}) {
  const router = useRouter();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [preview, setPreview] = useState<SitePreview | null>(null);

  const isPaid = subscription?.status === "active";
  const planName = subscription?.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : "Free";
  const canAddProduct = isPaid || products.length < FREE_PREVIEW_PRODUCT_LIMIT;
  const showFreeSetup = !isPaid && products.length === 0;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function openAddProduct() {
    setShowAddProduct(true);
    setSaveError("");
    setPreviewError("");
  }

  function closeAddProduct() {
    setShowAddProduct(false);
    setSaveError("");
    setPreviewError("");
    setPreview(null);
    setName("");
    setUrl("");
    setDescription("");
    setPreviewLoading(false);
  }

  async function handleAutofillFromUrl() {
    if (!url.trim()) {
      setPreviewError("Enter your website URL first.");
      return;
    }

    setPreviewLoading(true);
    setPreviewError("");
    setSaveError("");

    try {
      const response = await fetch("/api/products/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as SitePreview | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Could not preview that website.");
      }

      if (!("normalizedUrl" in data)) {
        throw new Error("Could not preview that website.");
      }

      setPreview(data);
      setUrl(data.normalizedUrl);
      setName(data.name);
      setDescription(data.description);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Could not preview that website."
      );
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!canAddProduct) {
      setSaveError("Upgrade your plan to add more products.");
      return;
    }

    setSaving(true);
    setSaveError("");

    const supabase = createClient();
    const { error } = await supabase.from("products").insert({
      user_id: user.id,
      name,
      url,
      description,
      status: isPaid ? "pending" : "draft",
    });

    if (!error) {
      closeAddProduct();
      router.refresh();
    } else {
      setSaveError(error.message || "Could not save your product.");
    }
    setSaving(false);
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
          {canAddProduct ? (
            <button
              onClick={openAddProduct}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition text-sm"
            >
              {isPaid ? "+ Add Product" : "Add Your First Product"}
            </button>
          ) : (
            <a
              href="/api/stripe/checkout?plan=starter"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition text-sm"
            >
              Upgrade Plan
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-sm text-slate-400">Plan</p>
            <p className="text-2xl font-bold text-white mt-1">{planName}</p>
            <p className="text-xs text-slate-500 mt-1">
              {isPaid
                ? "Active"
                : showFreeSetup
                ? "1 free setup slot available"
                : "Upgrade to unlock live submissions"}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-sm text-slate-400">Products</p>
            <p className="text-2xl font-bold text-white mt-1">{products.length}</p>
            <p className="text-xs text-slate-500 mt-1">added</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-sm text-slate-400">Submissions</p>
            <p className="text-2xl font-bold text-white mt-1">0</p>
            <p className="text-xs text-slate-500 mt-1">this month</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-sm text-slate-400">Success Rate</p>
            <p className="text-2xl font-bold text-white mt-1">—</p>
            <p className="text-xs text-slate-500 mt-1">no data yet</p>
          </div>
        </div>

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-md">
              <h2 className="text-lg font-bold text-white mb-6">Add Product</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                {!isPaid && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-100">
                    Free setup mode: add 1 product, auto-detect its copy, and preview your setup before upgrading.
                  </div>
                )}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. My SaaS Tool"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Website URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      placeholder="https://example.com"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAutofillFromUrl}
                      disabled={previewLoading}
                      className="shrink-0 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium px-3 py-2.5 rounded-lg transition text-sm"
                    >
                      {previewLoading ? "Detecting..." : "Auto-fill"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Paste your homepage and BacklinkPilot will pull the title and description automatically.
                  </p>
                  {previewError && (
                    <p className="text-xs text-red-400 mt-2">{previewError}</p>
                  )}
                  {preview && (
                    <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs">
                      <p className="text-slate-200 font-medium">
                        Detected from {preview.hostname}
                      </p>
                      <p className="text-slate-500 mt-1">
                        Name source: {preview.detectedFrom.name} · Description source:{" "}
                        {preview.detectedFrom.description}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="Brief description of your product..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                {saveError && (
                  <p className="text-xs text-red-400">{saveError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddProduct}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition text-sm"
                  >
                    {saving ? "Saving..." : "Add Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content */}
        {showFreeSetup ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🧭</div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Set up your first product for free
            </h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xl mx-auto">
              Paste your homepage, auto-detect your product name and description,
              and preview how BacklinkPilot will route submissions before you pay.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <button
                onClick={openAddProduct}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
              >
                Add First Product
              </button>
              <Link
                href="/pricing"
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
              >
                See Plans
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              {[
                {
                  title: "1. Paste your homepage",
                  copy: "Use your main product URL. BacklinkPilot will normalize the URL and read your public metadata.",
                },
                {
                  title: "2. Auto-fill the basics",
                  copy: "We pull the product title and description from the site so setup feels like a consumer app, not a backend form.",
                },
                {
                  title: "3. Upgrade when ready",
                  copy: `Unlock ${LIVE_CHANNEL_COUNT} live channels when you want to start real submissions.`,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-2">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        ) : !isPaid && products.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                  <p className="text-sm font-medium text-blue-400">Product setup complete</p>
                  <h2 className="text-xl font-semibold text-white mt-1">
                    Your product is saved. Upgrade to start live submissions.
                  </h2>
                  <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                    Your first product is already in the dashboard. When you upgrade, directory and stealth channels can start from that saved profile immediately.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/api/stripe/checkout?plan=starter"
                    className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
                  >
                    Unlock Starter
                  </a>
                  <a
                    href="/api/stripe/checkout?plan=growth"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
                  >
                    Unlock Growth
                  </a>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {products.map((product) => (
                <a
                  key={product.id}
                  href={`/dashboard/product/${product.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between hover:border-slate-700 transition block"
                >
                  <div>
                    <h3 className="text-white font-semibold">{product.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">{product.url}</p>
                    <p className="text-sm text-slate-500 mt-1">{product.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${productStatusClasses(
                        product.status
                      )}`}
                    >
                      {productStatusLabel(product.status)}
                    </span>
                    <span className="text-slate-500 text-sm">→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Add your first product
            </h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Add your product details and we&apos;ll start submitting it to 500+ directories automatically.
            </p>
            <button
              onClick={openAddProduct}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              + Add Product
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <a
                key={product.id}
                href={`/dashboard/product/${product.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between hover:border-slate-700 transition block"
              >
                <div>
                  <h3 className="text-white font-semibold">{product.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{product.url}</p>
                  <p className="text-sm text-slate-500 mt-1">{product.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${productStatusClasses(
                      product.status
                    )}`}
                  >
                    {productStatusLabel(product.status)}
                  </span>
                  <span className="text-slate-500 text-sm">→</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
