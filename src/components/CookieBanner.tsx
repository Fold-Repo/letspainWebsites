"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function readConsentCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)lap_consent=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!readConsentCookie()) setVisible(true);
  }, []);

  async function save(analytics: boolean) {
    setPending(true);
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics }),
      });
      setVisible(false);
    } catch {
      setPending(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-burgundy/15 bg-white/95 p-4 shadow-[0_-12px_40px_rgba(40,33,42,0.12)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-ink/80">
          We use essential cookies to run bookings and admin sign-in. Optional analytics cookies stay off unless you
          allow them. See the{" "}
          <Link href="/privacy" className="text-burgundy underline-offset-2 hover:underline">
            privacy notice
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void save(false)}
            className="rounded-full border border-burgundy/25 px-4 py-2 text-sm text-burgundy disabled:opacity-60"
          >
            Essential only
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void save(true)}
            className="rounded-full bg-burgundy px-4 py-2 text-sm font-medium text-cream disabled:opacity-60"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}
