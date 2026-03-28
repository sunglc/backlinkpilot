"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { LOCALE_COOKIE_NAME, type Locale } from "@/lib/locale-config";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
];

export default function LocaleToggle({
  locale,
  className = "",
}: {
  locale: Locale;
  className?: string;
}) {
  const router = useRouter();
  const [activeLocale, setActiveLocale] = useState(locale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === activeLocale) {
      return;
    }

    setActiveLocale(nextLocale);
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale;

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-[var(--line-soft)] bg-black/20 p-1 backdrop-blur ${className}`.trim()}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === activeLocale;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => switchLocale(option.value)}
            aria-pressed={selected}
            disabled={isPending && selected}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selected
                ? "bg-[var(--accent-500)] text-stone-950"
                : "text-stone-300 hover:bg-white/6 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
