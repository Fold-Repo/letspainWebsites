"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);

  async function onPassword(formData: FormData) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const data = (await response.json()) as { message?: string; mfaRequired?: boolean; redirect?: string };
      if (!response.ok) {
        setError(data.message ?? "Could not sign in.");
        setPending(false);
        return;
      }
      if (data.mfaRequired) {
        setMfaRequired(true);
        setPending(false);
        return;
      }
      router.push(data.redirect || "/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setPending(false);
    }
  }

  async function onMfa(formData: FormData) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: formData.get("code") }),
      });
      const data = (await response.json()) as { message?: string; redirect?: string };
      if (!response.ok) {
        setError(data.message ?? "Could not verify that code.");
        setPending(false);
        return;
      }
      router.push(data.redirect || "/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setPending(false);
    }
  }

  if (mfaRequired) {
    return (
      <form action={onMfa} className="space-y-4">
        <p className="text-sm text-ink/70">Enter the 6-digit code from your authenticator app.</p>
        <label className="block text-sm">
          Authenticator code
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            className="field"
            autoFocus
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-burgundy">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-burgundy px-5 py-3 font-medium text-cream disabled:opacity-60"
        >
          {pending ? "Checking…" : "Verify and sign in"}
        </button>
      </form>
    );
  }

  return (
    <form action={onPassword} className="space-y-4">
      <label className="block text-sm">
        Email
        <input name="email" type="email" autoComplete="username" required className="field" />
      </label>
      <label className="block text-sm">
        Password
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-burgundy">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-burgundy px-5 py-3 font-medium text-cream disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
