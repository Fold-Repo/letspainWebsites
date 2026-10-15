"use client";

import { useState } from "react";
import Link from "next/link";
import { partnershipCategories, categoryLabel, type PartnershipCategory } from "@/lib/partnership-categories";

export function PartnershipForm() {
  const [openedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [field, setField] = useState("");

  async function onSubmit(formData: FormData) {
    setStatus("pending");
    setMessage("");
    setField("");
    try {
      const response = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          organisation: formData.get("organisation"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          category: formData.get("category"),
          message: formData.get("message"),
          website: formData.get("website"),
          privacyAccepted: formData.get("privacyAccepted") === "on",
          company: formData.get("company"),
          openedAt,
        }),
      });
      const data = (await response.json()) as { message?: string; field?: string };
      if (!response.ok) {
        setStatus("error");
        setField(data.field ?? "");
        setMessage(data.message ?? "We could not send that.");
        return;
      }
      setStatus("sent");
      setMessage(data.message ?? "Enquiry received.");
    } catch {
      setStatus("error");
      setMessage("We could not reach the form. Try again in a moment.");
    }
  }

  if (status === "sent") {
    return (
      <p role="status" className="rounded-3xl bg-white px-5 py-6 text-ink">
        {message}
      </p>
    );
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Name
          <input name="name" required autoComplete="name" className="field" />
          {field === "name" ? <span className="mt-1 block text-burgundy">{message}</span> : null}
        </label>
        <label className="block text-sm">
          Organisation
          <input name="organisation" required autoComplete="organization" className="field" />
          {field === "organisation" ? <span className="mt-1 block text-burgundy">{message}</span> : null}
        </label>
      </div>
      <label className="block text-sm">
        Email
        <input name="email" type="email" required autoComplete="email" className="field" />
        {field === "email" ? <span className="mt-1 block text-burgundy">{message}</span> : null}
      </label>
      <label className="block text-sm">
        Phone <span className="text-ink/50">(optional)</span>
        <input name="phone" type="tel" autoComplete="tel" className="field" />
        {field === "phone" ? <span className="mt-1 block text-burgundy">{message}</span> : null}
      </label>
      <label className="block text-sm">
        Enquiry category
        <select name="category" required defaultValue="" className="field">
          <option value="" disabled>
            Choose one
          </option>
          {partnershipCategories.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category as PartnershipCategory)}
            </option>
          ))}
        </select>
        {field === "category" ? <span className="mt-1 block text-burgundy">{message}</span> : null}
      </label>
      <label className="block text-sm">
        Message
        <textarea name="message" required rows={6} className="field" />
        {field === "message" ? <span className="mt-1 block text-burgundy">{message}</span> : null}
      </label>
      <label className="block text-sm">
        Website or social link <span className="text-ink/50">(optional)</span>
        <input name="website" type="url" inputMode="url" placeholder="https://" className="field" />
        {field === "website" ? <span className="mt-1 block text-burgundy">{message}</span> : null}
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input name="privacyAccepted" type="checkbox" required className="mt-1 accent-burgundy" />
        <span>
          I have read the <Link href="/privacy" className="text-burgundy">privacy notice</Link> and agree
          to you keeping this enquiry so you can reply.
        </span>
      </label>
      {field === "privacyAccepted" ? <p className="text-sm text-burgundy">{message}</p> : null}
      {status === "error" && !field ? (
        <p role="alert" className="text-sm text-burgundy">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "pending"}
        className="rounded-full bg-burgundy px-5 py-3 text-sm font-medium text-cream disabled:opacity-60"
      >
        {status === "pending" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
