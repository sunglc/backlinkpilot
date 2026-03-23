"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
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

  const isPaid = subscription?.status === "active";
  const planName = subscription?.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : "Free";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("products").insert({
      user_id: user.id,
      name,
      url,
      description,
      status: "pending",
    });

    if (!error) {
      setName("");
      setUrl("");
      setDescription("");
      setShowAddProduct(false);
      router.refresh();
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
          {isPaid ? (
            <button
              onClick={() => setShowAddProduct(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition text-sm"
            >
              + Add Product
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
              {isPaid ? `Active` : "No active plan"}
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
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="https://example.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
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
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
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
        {!isPaid ? (
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
              onClick={() => setShowAddProduct(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              + Add Product
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-white font-semibold">{product.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{product.url}</p>
                  <p className="text-sm text-slate-500 mt-1">{product.description}</p>
                </div>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    product.status === "active"
                      ? "bg-green-500/10 text-green-400"
                      : product.status === "completed"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  {product.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
