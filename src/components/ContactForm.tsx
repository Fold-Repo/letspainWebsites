"use client";

import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(formData: FormData) {
    setStatus("pending");
    setMessage("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          company: formData.get("company"),
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setStatus("error");
        setMessage(data.message ?? "We could not send that.");
        return;
      }
      setStatus("sent");
      setMessage(data.message ?? "Message received.");
    } catch {
      setStatus("error");
      setMessage("We could not reach the contact form. Try again in a moment.");
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
      <label className="block text-sm">
        Name
        <input name="name" required autoComplete="name" className="field" />
      </label>
      <label className="block text-sm">
        Email
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <label className="block text-sm">
        Subject
        <input name="subject" required className="field" />
      </label>
      <label className="block text-sm">
        Message
        <textarea name="message" required rows={5} className="field" />
      </label>
      {status === "error" ? (
        <p role="alert" className="text-sm text-burgundy">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "pending"}
        className="rounded-full bg-burgundy px-5 py-3 text-sm font-medium text-cream disabled:opacity-60"
      >
        {status === "pending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
