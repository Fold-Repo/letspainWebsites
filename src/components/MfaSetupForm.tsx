"use client";

import { useEffect, useState } from "react";

type SetupPayload = {
  secret: string;
  uri: string;
  qrDataUrl: string;
  enabled: boolean;
};

export function MfaSetupForm({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function loadSetup() {
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/mfa/setup");
    const data = (await response.json()) as SetupPayload & { message?: string };
    if (!response.ok) {
      setError(data.message ?? "Could not start MFA setup.");
      return;
    }
    setSetup(data);
    setEnabled(data.enabled);
  }

  useEffect(() => {
    if (!initiallyEnabled) {
      void loadSetup();
    }
  }, [initiallyEnabled]);

  async function enable() {
    if (!setup) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setup.secret, code }),
      });
      const data = (await response.json()) as { message?: string; enabled?: boolean };
      if (!response.ok) {
        setError(data.message ?? "Could not enable MFA.");
        setPending(false);
        return;
      }
      setEnabled(true);
      setSetup(null);
      setCode("");
      setMessage("Authenticator MFA is on. Sign-in will ask for a code next time.");
      setPending(false);
    } catch {
      setError("Could not reach the server.");
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disable: true }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Could not disable MFA.");
        setPending(false);
        return;
      }
      setEnabled(false);
      setMessage("MFA is off for this account.");
      setPending(false);
      await loadSetup();
    } catch {
      setError("Could not reach the server.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">
        Status:{" "}
        <span className="font-medium text-ink">{enabled ? "Enabled" : "Not enabled"}</span>
      </p>
      {enabled ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void disable()}
          className="rounded-full border border-burgundy/30 px-5 py-2 text-sm text-burgundy disabled:opacity-60"
        >
          {pending ? "Working…" : "Turn off MFA"}
        </button>
      ) : null}
      {!enabled && setup ? (
        <div className="space-y-4 rounded-[1.2rem] bg-cream/80 p-4">
          <img src={setup.qrDataUrl} alt="Authenticator QR code" className="mx-auto rounded-lg" width={220} height={220} />
          <p className="text-center text-xs break-all text-ink/60">{setup.secret}</p>
          <label className="block text-sm">
            Confirm with a 6-digit code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]{6}"
              className="field"
              autoComplete="one-time-code"
            />
          </label>
          <button
            type="button"
            disabled={pending || code.length < 6}
            onClick={() => void enable()}
            className="w-full rounded-full bg-burgundy px-5 py-3 font-medium text-cream disabled:opacity-60"
          >
            {pending ? "Saving…" : "Enable MFA"}
          </button>
        </div>
      ) : null}
      {!enabled && !setup ? (
        <button
          type="button"
          onClick={() => void loadSetup()}
          className="rounded-full bg-burgundy px-5 py-2 text-sm font-medium text-cream"
        >
          Set up authenticator
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-burgundy">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-ink/70">{message}</p> : null}
    </div>
  );
}
