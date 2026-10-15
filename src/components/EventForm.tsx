"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type EventFormValues = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  city: string;
  venue: string;
  whenLabel: string;
  timeLabel: string;
  story: string;
  inclusions: string;
  capacity: string;
  enrollmentStartsAt: string;
  enrollmentEndsAt: string;
  isFree: boolean;
  pricePerPerson: string;
  familyPrice: string;
  paymentTiming: "now" | "later";
  published: boolean;
};

function toLocalInput(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({ mode, initial }: { mode: "create" | "edit"; initial: EventFormValues }) {
  const router = useRouter();
  const [isFree, setIsFree] = useState(initial.isFree);
  const [timing, setTiming] = useState(initial.paymentTiming);
  const [published, setPublished] = useState(initial.published);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const startsRaw = String(form.get("enrollmentStartsAt") ?? "");
    const endsRaw = String(form.get("enrollmentEndsAt") ?? "");
    const starts = new Date(startsRaw);
    const ends = new Date(endsRaw);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      setMessage("Add an enrolment start and end.");
      setPending(false);
      return;
    }
    const payload = {
      slug: String(form.get("slug") ?? ""),
      name: form.get("name"),
      tagline: form.get("tagline"),
      summary: form.get("summary"),
      city: form.get("city"),
      venue: form.get("venue"),
      whenLabel: form.get("whenLabel"),
      timeLabel: form.get("timeLabel"),
      story: form.get("story"),
      inclusions: form.get("inclusions"),
      capacity: form.get("capacity"),
      enrollmentStartsAt: starts.toISOString(),
      enrollmentEndsAt: ends.toISOString(),
      isFree,
      pricePerPerson: form.get("pricePerPerson"),
      familyPrice: form.get("familyPrice"),
      paymentTiming: timing,
      published,
    };
    try {
      const response = await fetch(mode === "create" ? "/api/admin/events" : `/api/admin/events/${initial.slug}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { slug?: string; message?: string };
      if (!response.ok || !data.slug) {
        setMessage(data.message ?? "The event could not be saved.");
        setPending(false);
        return;
      }
      router.push(`/admin/events/${data.slug}`);
      router.refresh();
      setMessage("Saved.");
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Enrolment opens
          <input name="enrollmentStartsAt" type="datetime-local" required defaultValue={toLocalInput(initial.enrollmentStartsAt)} className="field" />
        </label>
        <label className="block text-sm">
          Enrolment closes
          <input name="enrollmentEndsAt" type="datetime-local" required defaultValue={toLocalInput(initial.enrollmentEndsAt)} className="field" />
        </label>
      </div>
      <p className="text-sm text-ink/70">
        Guests can enrol only between these times. You can still email a payment link after enrolment closes.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Event name
          <input name="name" required defaultValue={initial.name} className="field" />
        </label>
        <label className="block text-sm">
          Slug
          <input name="slug" required defaultValue={initial.slug} readOnly={mode === "edit"} className="field" />
        </label>
      </div>
      <label className="block text-sm">
        Tagline
        <input name="tagline" defaultValue={initial.tagline} className="field" />
      </label>
      <label className="block text-sm">
        Summary
        <textarea name="summary" rows={3} defaultValue={initial.summary} className="field" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          City
          <input name="city" defaultValue={initial.city} className="field" />
        </label>
        <label className="block text-sm">
          Venue
          <input name="venue" defaultValue={initial.venue} className="field" />
        </label>
        <label className="block text-sm">
          When
          <input name="whenLabel" defaultValue={initial.whenLabel} className="field" />
        </label>
        <label className="block text-sm">
          Time
          <input name="timeLabel" defaultValue={initial.timeLabel} className="field" />
        </label>
      </div>
      <label className="block text-sm">
        Story
        <textarea name="story" rows={6} defaultValue={initial.story} className="field" />
      </label>
      <label className="block text-sm">
        What is included <span className="text-ink/50">(one item per line)</span>
        <textarea name="inclusions" rows={4} defaultValue={initial.inclusions} className="field" />
      </label>
      <label className="block text-sm">
        Capacity
        <input name="capacity" type="number" min={1} max={500} required defaultValue={initial.capacity} className="field" />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm">Price</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="pricing" checked={isFree} onChange={() => setIsFree(true)} className="accent-burgundy" />
          Free
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="pricing" checked={!isFree} onChange={() => setIsFree(false)} className="accent-burgundy" />
          Paid
        </label>
      </fieldset>
      {!isFree ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Price per person (£)
            <input name="pricePerPerson" inputMode="decimal" defaultValue={initial.pricePerPerson} placeholder="45.00" className="field" />
            <span className="mt-1 block text-xs text-ink/60">Optional if you use ticket categories below.</span>
          </label>
          <label className="block text-sm">
            Family or group price (£) <span className="text-ink/50">optional flat amount</span>
            <input name="familyPrice" inputMode="decimal" defaultValue={initial.familyPrice} placeholder="120.00" className="field" />
          </label>
        </div>
      ) : null}
      {!isFree ? (
        <fieldset className="space-y-2">
          <legend className="text-sm">When to take payment</legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="paymentTiming"
              checked={timing === "now"}
              onChange={() => setTiming("now")}
              className="mt-1 accent-burgundy"
            />
            <span>Straight after enrolment. The guest is taken to Stripe to pay.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="paymentTiming"
              checked={timing === "later"}
              onChange={() => setTiming("later")}
              className="mt-1 accent-burgundy"
            />
            <span>After enrolment. You email a payment link from the reservations screen.</span>
          </label>
        </fieldset>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="accent-burgundy" />
        Published on the site
      </label>
      {message ? <p className="text-sm text-ink/80">{message}</p> : null}
      <button type="submit" disabled={pending} className="rounded-full bg-burgundy px-5 py-3 text-cream disabled:opacity-60">
        {pending ? "Saving…" : mode === "create" ? "Create event" : "Save event"}
      </button>
    </form>
  );
}
