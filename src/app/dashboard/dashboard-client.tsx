"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import LocaleToggle from "@/components/locale-toggle";
import { LIVE_CHANNEL_COUNT } from "@/lib/execution-contract";
import { type Locale } from "@/lib/locale-config";
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

function getDashboardCopy(locale: Locale) {
  if (locale === "zh") {
    return {
      nav: {
        logout: "退出登录",
      },
      header: {
        title: "Dashboard",
        addFirstProduct: "添加第一个产品",
        addProduct: "+ 添加产品",
        upgradePlan: "升级计划",
      },
      stats: {
        plan: "当前计划",
        products: "产品数",
        submissions: "提交数",
        successRate: "成功率",
        active: "已激活",
        freeSlot: "还有 1 个免费配置名额",
        upgradeToUnlock: "升级后解锁真实提交",
        added: "已添加",
        thisMonth: "本月",
        noDataYet: "还没有数据",
      },
      modal: {
        title: "添加产品",
        freeBanner:
          "免费配置模式：你可以先添加 1 个产品，自动识别站点文案，并在升级前预览整体流程。",
        productName: "产品名称",
        productNamePlaceholder: "例如：我的 SaaS 工具",
        websiteUrl: "网站地址",
        websiteUrlPlaceholder: "https://example.com",
        detect: "自动识别",
        detecting: "识别中...",
        detectHint:
          "贴上你的首页，BacklinkPilot 会自动拉取标题和描述。",
        detectedFrom: "识别来源",
        nameSource: "名称来源",
        descriptionSource: "描述来源",
        description: "描述",
        descriptionPlaceholder: "简要描述一下你的产品...",
        cancel: "取消",
        save: "添加产品",
        saving: "保存中...",
      },
      errors: {
        enterUrl: "请先输入网站地址。",
        previewFailed: "暂时无法预览这个网站。",
        upgradeRequired: "升级计划后才能继续添加更多产品。",
        saveFailed: "暂时无法保存这个产品。",
      },
      freeState: {
        title: "免费配置你的第一个产品",
        body:
          "贴上你的首页，自动识别产品名称和描述，在付费前先看到 BacklinkPilot 将如何安排真实提交流程。",
        primary: "添加第一个产品",
        secondary: "查看计划",
        steps: [
          {
            title: "1. 贴上首页地址",
            copy: "直接使用你的主产品网址。系统会规范化 URL 并读取公开元信息。",
          },
          {
            title: "2. 自动补齐基础信息",
            copy: "产品标题和描述会从站点自动带出，配置体验更像消费级应用，而不是后台表单。",
          },
          {
            title: "3. 准备好再升级",
            copy: `当你准备启动真实提交时，再解锁 ${LIVE_CHANNEL_COUNT} 个已上线渠道。`,
          },
        ],
      },
      upgradeState: {
        eyebrow: "产品配置已完成",
        title: "你的产品已经保存，升级后即可启动真实提交。",
        body:
          "首个产品已经在 Dashboard 中。升级后，目录和 stealth 渠道可以直接从这份档案开始跑。",
        starter: "解锁入门版",
        growth: "解锁增长版",
      },
      emptyState: {
        title: "添加你的第一个产品",
        body:
          "先补齐产品信息，我们就可以开始把它自动提交到 500+ 个目录。",
        cta: "+ 添加产品",
      },
      detectedLabel: "识别自",
    };
  }

  return {
    nav: {
      logout: "Log out",
    },
    header: {
      title: "工作台",
      addFirstProduct: "Add Your First Product",
      addProduct: "+ Add Product",
      upgradePlan: "Upgrade Plan",
    },
    stats: {
      plan: "Plan",
      products: "Products",
      submissions: "Submissions",
      successRate: "Success Rate",
      active: "Active",
      freeSlot: "1 free setup slot available",
      upgradeToUnlock: "Upgrade to unlock live submissions",
      added: "added",
      thisMonth: "this month",
      noDataYet: "no data yet",
    },
    modal: {
      title: "Add Product",
      freeBanner:
        "Free setup mode: add 1 product, auto-detect its copy, and preview your setup before upgrading.",
      productName: "Product Name",
      productNamePlaceholder: "e.g. My SaaS Tool",
      websiteUrl: "Website URL",
      websiteUrlPlaceholder: "https://example.com",
      detect: "Auto-fill",
      detecting: "Detecting...",
      detectHint:
        "Paste your homepage and BacklinkPilot will pull the title and description automatically.",
      detectedFrom: "Detected from",
      nameSource: "Name source",
      descriptionSource: "Description source",
      description: "Description",
      descriptionPlaceholder: "Brief description of your product...",
      cancel: "Cancel",
      save: "Add Product",
      saving: "Saving...",
    },
    errors: {
      enterUrl: "Enter your website URL first.",
      previewFailed: "Could not preview that website.",
      upgradeRequired: "Upgrade your plan to add more products.",
      saveFailed: "Could not save your product.",
    },
    freeState: {
      title: "Set up your first product for free",
      body:
        "Paste your homepage, auto-detect your product name and description, and preview how BacklinkPilot will route submissions before you pay.",
      primary: "Add First Product",
      secondary: "See Plans",
      steps: [
        {
          title: "1. Paste your homepage",
          copy:
            "Use your main product URL. BacklinkPilot will normalize the URL and read your public metadata.",
        },
        {
          title: "2. Auto-fill the basics",
          copy:
            "We pull the product title and description from the site so setup feels like a consumer app, not a backend form.",
        },
        {
          title: "3. Upgrade when ready",
          copy: `Unlock ${LIVE_CHANNEL_COUNT} live channels when you want to start real submissions.`,
        },
      ],
    },
    upgradeState: {
      eyebrow: "Product setup complete",
      title: "Your product is saved. Upgrade to start live submissions.",
      body:
        "Your first product is already in the dashboard. When you upgrade, directory and stealth channels can start from that saved profile immediately.",
      starter: "Unlock Starter",
      growth: "Unlock Growth",
    },
    emptyState: {
      title: "Add your first product",
      body:
        "Add your product details and we'll start submitting it to 500+ directories automatically.",
      cta: "+ Add Product",
    },
    detectedLabel: "Detected from",
  };
}

function productStatusLabel(status: string, locale: Locale) {
  const labels =
    locale === "zh"
      ? {
          active: "运行中",
          completed: "就绪",
          pending: "排队中",
          draft: "草稿",
        }
      : {
          active: "Active",
          completed: "Ready",
          pending: "Queued",
          draft: "Draft",
        };

  return labels[status as keyof typeof labels] || status;
}

function productStatusClasses(status: string) {
  const classes: Record<string, string> = {
    active: "bg-emerald-300/10 text-emerald-200",
    completed: "bg-sky-300/10 text-sky-200",
    pending: "bg-amber-300/10 text-amber-200",
    draft: "bg-stone-800 text-stone-300",
  };
  return classes[status] || "bg-amber-300/10 text-amber-200";
}

function formatPlanName(plan: string | null | undefined, locale: Locale) {
  const labels =
    locale === "zh"
      ? {
          free: "免费版",
          starter: "入门版",
          growth: "增长版",
          scale: "规模版",
        }
      : {
          free: "Free",
          starter: "Starter",
          growth: "Growth",
          scale: "Scale",
        };

  if (!plan) {
    return labels.free;
  }

  return labels[plan as keyof typeof labels] || plan;
}

export default function DashboardClient({
  locale,
  user,
  subscription,
  products,
}: {
  locale: Locale;
  user: User;
  subscription: Subscription | null;
  products: Product[];
}) {
  const copy = getDashboardCopy(locale);
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
  const planName = formatPlanName(subscription?.plan, locale);
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
      setPreviewError(copy.errors.enterUrl);
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
        throw new Error("error" in data ? data.error : copy.errors.previewFailed);
      }

      if (!("normalizedUrl" in data)) {
        throw new Error(copy.errors.previewFailed);
      }

      setPreview(data);
      setUrl(data.normalizedUrl);
      setName(data.name);
      setDescription(data.description);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : copy.errors.previewFailed
      );
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!canAddProduct) {
      setSaveError(copy.errors.upgradeRequired);
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
      setSaveError(error.message || copy.errors.saveFailed);
    }
    setSaving(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100">
      <div className="bp-grid absolute inset-0 opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(circle_at_top,rgba(246,212,148,0.14),transparent_58%)]" />
      <div className="absolute -left-12 top-56 h-64 w-64 rounded-full bg-amber-300/8 blur-3xl" />
      <div className="absolute -right-16 top-32 h-72 w-72 rounded-full bg-emerald-300/7 blur-3xl" />

      <nav className="relative border-b border-[var(--line-soft)] bg-black/10 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <span className="text-xl font-bold text-white">BacklinkPilot</span>
          <div className="flex items-center gap-3">
            <LocaleToggle locale={locale} />
            <span className="hidden text-sm text-stone-400 md:inline">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-stone-400 transition hover:text-white"
            >
              {copy.nav.logout}
            </button>
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{copy.header.title}</h1>
            <p className="mt-2 text-sm text-stone-400">{user.email}</p>
          </div>
          {canAddProduct ? (
            <button
              onClick={openAddProduct}
              className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {isPaid ? copy.header.addProduct : copy.header.addFirstProduct}
            </button>
          ) : (
            <a
              href="/api/stripe/checkout?plan=starter"
              className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {copy.header.upgradePlan}
            </a>
          )}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.04] p-5">
            <p className="text-sm text-stone-400">{copy.stats.plan}</p>
            <p className="mt-1 text-2xl font-bold text-white">{planName}</p>
            <p className="mt-1 text-xs text-stone-500">
              {isPaid
                ? copy.stats.active
                : showFreeSetup
                  ? copy.stats.freeSlot
                  : copy.stats.upgradeToUnlock}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.04] p-5">
            <p className="text-sm text-stone-400">{copy.stats.products}</p>
            <p className="mt-1 text-2xl font-bold text-white">{products.length}</p>
            <p className="mt-1 text-xs text-stone-500">{copy.stats.added}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.04] p-5">
            <p className="text-sm text-stone-400">{copy.stats.submissions}</p>
            <p className="mt-1 text-2xl font-bold text-white">0</p>
            <p className="mt-1 text-xs text-stone-500">{copy.stats.thisMonth}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--line-soft)] bg-white/[0.04] p-5">
            <p className="text-sm text-stone-400">{copy.stats.successRate}</p>
            <p className="mt-1 text-2xl font-bold text-white">—</p>
            <p className="mt-1 text-xs text-stone-500">{copy.stats.noDataYet}</p>
          </div>
        </div>

        {showAddProduct ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-[2rem] border border-[var(--line-strong)] bg-stone-950 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
              <h2 className="mb-6 text-lg font-bold text-white">{copy.modal.title}</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                {!isPaid ? (
                  <div className="rounded-2xl border border-amber-200/15 bg-amber-100/5 px-4 py-3 text-xs leading-6 text-amber-100">
                    {copy.modal.freeBanner}
                  </div>
                ) : null}
                <div>
                  <label className="mb-1 block text-sm text-stone-400">
                    {copy.modal.productName}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder={copy.modal.productNamePlaceholder}
                    className="w-full rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-stone-400">
                    {copy.modal.websiteUrl}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      placeholder={copy.modal.websiteUrlPlaceholder}
                      className="flex-1 rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                    />
                    <button
                      type="button"
                      onClick={handleAutofillFromUrl}
                      disabled={previewLoading}
                      className="shrink-0 rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {previewLoading ? copy.modal.detecting : copy.modal.detect}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">{copy.modal.detectHint}</p>
                  {previewError ? (
                    <p className="mt-2 text-xs text-red-300">{previewError}</p>
                  ) : null}
                  {preview ? (
                    <div className="mt-3 rounded-2xl border border-[var(--line-soft)] bg-black/20 p-3 text-xs">
                      <p className="font-medium text-stone-200">
                        {copy.detectedLabel} {preview.hostname}
                      </p>
                      <p className="mt-1 text-stone-500">
                        {copy.modal.nameSource}: {preview.detectedFrom.name} ·{" "}
                        {copy.modal.descriptionSource}:{" "}
                        {preview.detectedFrom.description}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-stone-400">
                    {copy.modal.description}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder={copy.modal.descriptionPlaceholder}
                    className="w-full resize-none rounded-2xl border border-[var(--line-soft)] bg-stone-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent-500)]"
                  />
                </div>
                {saveError ? <p className="text-xs text-red-300">{saveError}</p> : null}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddProduct}
                    className="flex-1 rounded-full border border-[var(--line-soft)] bg-white/[0.04] py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    {copy.modal.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-[var(--accent-500)] py-3 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)] disabled:opacity-60"
                  >
                    {saving ? copy.modal.saving : copy.modal.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {showFreeSetup ? (
          <div className="rounded-[2rem] border border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-12 text-center">
            <div className="mb-4 text-4xl">🧭</div>
            <h2 className="mb-2 text-lg font-semibold text-white">
              {copy.freeState.title}
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-sm text-stone-400">
              {copy.freeState.body}
            </p>
            <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={openAddProduct}
                className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
              >
                {copy.freeState.primary}
              </button>
              <Link
                href="/pricing"
                className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                {copy.freeState.secondary}
              </Link>
            </div>
            <div className="mx-auto grid max-w-3xl gap-4 text-left md:grid-cols-3">
              {copy.freeState.steps.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-[var(--line-soft)] bg-black/15 p-4"
                >
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-xs text-stone-400">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        ) : !isPaid && products.length > 0 ? (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[var(--line-soft)] bg-white/[0.04] p-8">
              <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div>
                  <p className="text-sm font-medium text-amber-200">
                    {copy.upgradeState.eyebrow}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    {copy.upgradeState.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-stone-400">
                    {copy.upgradeState.body}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/api/stripe/checkout?plan=starter"
                    className="rounded-full border border-[var(--line-soft)] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    {copy.upgradeState.starter}
                  </a>
                  <a
                    href="/api/stripe/checkout?plan=growth"
                    className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
                  >
                    {copy.upgradeState.growth}
                  </a>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {products.map((product) => (
                <a
                  key={product.id}
                  href={`/dashboard/product/${product.id}`}
                  className="block rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6 transition hover:border-[var(--line-strong)]"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <p className="mt-1 text-sm text-amber-200">{product.url}</p>
                      <p className="mt-1 text-sm text-stone-400">
                        {product.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${productStatusClasses(
                          product.status
                        )}`}
                      >
                        {productStatusLabel(product.status, locale)}
                      </span>
                      <span className="text-sm text-stone-500">→</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[2rem] border border-[var(--line-soft)] bg-white/[0.04] p-12 text-center">
            <div className="mb-4 text-4xl">📦</div>
            <h2 className="mb-2 text-lg font-semibold text-white">
              {copy.emptyState.title}
            </h2>
            <p className="mx-auto mb-6 max-w-md text-sm text-stone-400">
              {copy.emptyState.body}
            </p>
            <button
              onClick={openAddProduct}
              className="rounded-full bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-[var(--accent-300)]"
            >
              {copy.emptyState.cta}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <a
                key={product.id}
                href={`/dashboard/product/${product.id}`}
                className="block rounded-[1.75rem] border border-[var(--line-soft)] bg-white/[0.04] p-6 transition hover:border-[var(--line-strong)]"
              >
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <h3 className="font-semibold text-white">{product.name}</h3>
                    <p className="mt-1 text-sm text-amber-200">{product.url}</p>
                    <p className="mt-1 text-sm text-stone-400">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${productStatusClasses(
                        product.status
                      )}`}
                    >
                      {productStatusLabel(product.status, locale)}
                    </span>
                    <span className="text-sm text-stone-500">→</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
