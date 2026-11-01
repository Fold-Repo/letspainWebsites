"use client";

import { useState } from "react";

type SocialSettingsFormProps = {
  initialInstagram: string;
  initialFacebook: string;
};

export function SocialSettingsForm({
  initialInstagram,
  initialFacebook,
}: SocialSettingsFormProps) {
  const [instagram, setInstagram] = useState(
    initialInstagram === "#" ? "" : initialInstagram,
  );
  const [facebook, setFacebook] = useState(initialFacebook === "#" ? "" : initialFacebook);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/settings/social", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagram: instagram.trim() || "#",
          facebook: facebook.trim() || "#",
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        instagram?: string;
        facebook?: string;
      };
      if (!response.ok) {
        setError(data.message ?? "Could not save social links.");
        return;
      }
      setInstagram(data.instagram && data.instagram !== "#" ? data.instagram : "");
      setFacebook(data.facebook && data.facebook !== "#" ? data.facebook : "");
      setMessage("Social links saved. Empty fields use # on the website.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm">
        Instagram URL
        <input
          className="field mt-1.5"
          type="url"
          inputMode="url"
          placeholder="https://instagram.com/letsallpaint"
          value={instagram}
          onChange={(event) => setInstagram(event.target.value)}
        />
      </label>
      <label className="block text-sm">
        Facebook URL
        <input
          className="field mt-1.5"
          type="url"
          inputMode="url"
          placeholder="https://facebook.com/letsallpaint"
          value={facebook}
          onChange={(event) => setFacebook(event.target.value)}
        />
      </label>
      <p className="text-xs text-ink/55">
        Leave blank to show the icon with a <code>#</code> link until you add a real profile.
      </p>
      {error ? <p className="text-sm text-burgundy">{error}</p> : null}
      {message ? <p className="text-sm text-ink/70">{message}</p> : null}
      <button type="submit" className="admin-btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save social links"}
      </button>
    </form>
  );
}
