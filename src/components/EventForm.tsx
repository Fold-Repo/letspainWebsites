"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { parseLooseDate, parseLooseTime } from "@/lib/datetime-input";
import type { TicketKind } from "@/lib/ticket-categories";

export type EventFormValues = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  city: string;
  venue: string;
  whenLabel: string;
  timeLabel: string;
  eventDate: string;
  eventTime: string;
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
  imageUrl: string;
};

type DraftCategory = {
  key: string;
  name: string;
  kind: TicketKind;
  description: string;
  price: string;
  seatsPerTicket: string;
  maxPerOrder: string;
  include: boolean;
};

const steps = [
  { id: "basics", title: "Basics", hint: "Name, summary and cover image" },
  { id: "place", title: "Place & time", hint: "Venue and enrolment window" },
  { id: "story", title: "Story", hint: "What guests should know" },
  { id: "tickets", title: "Tickets", hint: "Pricing and publish" },
] as const;

const defaultCategories: DraftCategory[] = [
  {
    key: "adult",
    name: "Adult",
    kind: "adult",
    description: "One adult place with materials and a seat at the table.",
    price: "45.00",
    seatsPerTicket: "1",
    maxPerOrder: "8",
    include: true,
  },
  {
    key: "child",
    name: "Child",
    kind: "child",
    description: "One child place. Only the lead booker's details are collected.",
    price: "25.00",
    seatsPerTicket: "1",
    maxPerOrder: "8",
    include: true,
  },
  {
    key: "family",
    name: "Family",
    kind: "family",
    description: "Flat family ticket covering up to four places.",
    price: "120.00",
    seatsPerTicket: "4",
    maxPerOrder: "2",
    include: true,
  },
];

function toLocalInput(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function EventForm({ mode, initial }: { mode: "create" | "edit"; initial: EventFormValues }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    ...initial,
    eventDate: initial.eventDate || parseLooseDate(initial.whenLabel),
    eventTime: initial.eventTime || parseLooseTime(initial.timeLabel),
    enrollmentStartsAt: toLocalInput(initial.enrollmentStartsAt),
    enrollmentEndsAt: toLocalInput(initial.enrollmentEndsAt),
  });
  const [isFree, setIsFree] = useState(initial.isFree);
  const [timing, setTiming] = useState(initial.paymentTiming);
  const [published, setPublished] = useState(initial.published);
  const [categories, setCategories] = useState(defaultCategories);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(initial.imageUrl || "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit" || Boolean(initial.slug));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function patch(partial: Partial<typeof values>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  function updateCategory(key: string, next: Partial<DraftCategory>) {
    setCategories((prev) => prev.map((row) => (row.key === key ? { ...row, ...next } : row)));
  }

  function validateStep() {
    if (step === 0) {
      if (values.name.trim().length < 3) return "Add the event name.";
      if (mode === "create" && !slugify(values.slug || values.name)) return "Add a short slug.";
    }
    if (step === 1) {
      if (!values.eventDate) return "Pick the event date.";
      if (!values.eventTime) return "Pick the event time.";
      const starts = new Date(values.enrollmentStartsAt);
      const ends = new Date(values.enrollmentEndsAt);
      if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) return "Add enrolment start and end.";
      if (ends <= starts) return "Enrolment must end after it starts.";
      const capacity = Number(values.capacity);
      if (!Number.isInteger(capacity) || capacity < 1) return "Capacity must be at least 1.";
    }
    if (step === 3 && !isFree) {
      const selected = categories.filter((row) => row.include);
      if (mode === "create" && selected.length === 0) {
        return "Include at least one ticket category, or mark the event free.";
      }
    }
    return "";
  }

  function goNext() {
    const error = validateStep();
    if (error) {
      setMessage(error);
      return;
    }
    setMessage("");
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function goBack() {
    setMessage("");
    setStep((value) => Math.max(value - 1, 0));
  }

  async function uploadImageIfNeeded() {
    if (!imageFile) return values.imageUrl.trim();
    const body = new FormData();
    body.append("file", imageFile);
    const response = await fetch("/api/admin/media", { method: "POST", body });
    const data = (await response.json()) as { url?: string; message?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.message ?? "Could not upload the image.");
    }
    return data.url;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) {
      goNext();
      return;
    }
    const error = validateStep();
    if (error) {
      setMessage(error);
      return;
    }

    setPending(true);
    setMessage("");
    try {
      const imageUrl = await uploadImageIfNeeded();
      const starts = new Date(values.enrollmentStartsAt);
      const ends = new Date(values.enrollmentEndsAt);
      const selectedCategories =
        mode === "create" && !isFree
          ? categories
              .filter((row) => row.include)
              .map((row, index) => ({
                name: row.name,
                description: row.description,
                kind: row.kind,
                price: row.price,
                seatsPerTicket: Number(row.seatsPerTicket),
                maxPerOrder: Number(row.maxPerOrder),
                sortOrder: index,
                active: true,
              }))
          : undefined;

      const payload = {
        slug: values.slug || slugify(values.name),
        name: values.name,
        tagline: values.tagline,
        summary: values.summary,
        city: values.city,
        venue: values.venue,
        whenLabel: values.whenLabel,
        timeLabel: values.timeLabel,
        eventDate: values.eventDate,
        eventTime: values.eventTime,
        story: values.story,
        inclusions: values.inclusions,
        capacity: values.capacity,
        enrollmentStartsAt: starts.toISOString(),
        enrollmentEndsAt: ends.toISOString(),
        isFree,
        pricePerPerson: values.pricePerPerson,
        familyPrice: values.familyPrice,
        paymentTiming: timing,
        published,
        imageUrl,
        ...(selectedCategories ? { categories: selectedCategories } : {}),
      };

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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not reach the server.");
      setPending(false);
    }
  }

  const coverSrc = imagePreview || "/landing-hero.webp";
  const coverIsRemote = coverSrc.startsWith("http") || coverSrc.startsWith("blob:");

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <p className="font-medium text-ink">
            Step {step + 1} of {steps.length}
            <span className="ml-2 text-ink/50">{steps[step].title}</span>
          </p>
          <p className="text-ink/45">{steps[step].hint}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-burgundy/10">
          <div className="h-full rounded-full bg-burgundy transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <ol className="mt-4 flex flex-wrap gap-2">
          {steps.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (index <= step) setStep(index);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  index === step
                    ? "bg-burgundy text-white"
                    : index < step
                      ? "bg-burgundy/15 text-burgundy"
                      : "bg-cream text-ink/40"
                }`}
              >
                {index + 1}. {item.title}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.2rem] border border-burgundy/10">
            <div className="relative aspect-[16/9] bg-burgundy/10">
              {coverIsRemote ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <Image src={coverSrc} alt="" fill className="object-cover" sizes="640px" />
              )}
              {!imagePreview ? (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-burgundy/50 to-transparent p-4">
                  <p className="text-sm font-medium text-white">Placeholder cover until you upload an image</p>
                </div>
              ) : null}
            </div>
            <div className="space-y-3 bg-white p-4">
              <label className="block text-sm">
                Cover image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="field"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setImageFile(file);
                    if (!file) setImagePreview(values.imageUrl);
                  }}
                />
              </label>
              <p className="text-xs text-ink/50">JPG, PNG or WebP up to 5MB. Shown on the hangout page and listings.</p>
              {values.imageUrl && !imageFile ? (
                <button
                  type="button"
                  className="text-xs text-burgundy"
                  onClick={() => {
                    patch({ imageUrl: "" });
                    setImagePreview("");
                  }}
                >
                  Remove current image
                </button>
              ) : null}
            </div>
          </div>
          <label className="block text-sm">
            Event name
            <input
              required
              value={values.name}
              onChange={(event) => {
                const name = event.target.value;
                patch({
                  name,
                  slug: mode === "create" && !slugTouched ? slugify(name) : values.slug,
                });
              }}
              className="field"
            />
          </label>
          <label className="block text-sm">
            Slug
            <input
              required
              value={values.slug}
              readOnly={mode === "edit"}
              onChange={(event) => {
                setSlugTouched(true);
                patch({ slug: slugify(event.target.value) });
              }}
              className="field"
            />
          </label>
          <label className="block text-sm">
            Tagline
            <input value={values.tagline} onChange={(event) => patch({ tagline: event.target.value })} className="field" />
          </label>
          <label className="block text-sm">
            Summary
            <textarea
              rows={3}
              value={values.summary}
              onChange={(event) => patch({ summary: event.target.value })}
              className="field"
            />
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              City
              <input value={values.city} onChange={(event) => patch({ city: event.target.value })} className="field" />
            </label>
            <label className="block text-sm">
              Venue
              <input value={values.venue} onChange={(event) => patch({ venue: event.target.value })} className="field" />
            </label>
            <DatePickerField
              label="When"
              required
              value={values.eventDate}
              onChange={(eventDate) => patch({ eventDate, whenLabel: "" })}
            />
            <TimePickerField
              label="Time"
              required
              value={values.eventTime}
              onChange={(eventTime) => patch({ eventTime, timeLabel: "" })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Enrolment opens
              <input
                type="datetime-local"
                required
                value={values.enrollmentStartsAt}
                onChange={(event) => patch({ enrollmentStartsAt: event.target.value })}
                className="field"
              />
            </label>
            <label className="block text-sm">
              Enrolment closes
              <input
                type="datetime-local"
                required
                value={values.enrollmentEndsAt}
                onChange={(event) => patch({ enrollmentEndsAt: event.target.value })}
                className="field"
              />
            </label>
          </div>
          <label className="block text-sm sm:max-w-xs">
            Capacity
            <input
              type="number"
              min={1}
              max={500}
              required
              value={values.capacity}
              onChange={(event) => patch({ capacity: event.target.value })}
              className="field"
            />
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <label className="block text-sm">
            Story
            <textarea rows={7} value={values.story} onChange={(event) => patch({ story: event.target.value })} className="field" />
          </label>
          <label className="block text-sm">
            What is included <span className="text-ink/50">(one item per line)</span>
            <textarea
              rows={5}
              value={values.inclusions}
              onChange={(event) => patch({ inclusions: event.target.value })}
              className="field"
            />
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Price</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={isFree} onChange={() => setIsFree(true)} className="accent-burgundy" />
              Free
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={!isFree} onChange={() => setIsFree(false)} className="accent-burgundy" />
              Paid
            </label>
          </fieldset>

          {!isFree && mode === "create" ? (
            <div className="space-y-3">
              <p className="text-sm text-ink/65">Set Adult, Child and Family prices for the enrolment form.</p>
              {categories.map((row) => (
                <div key={row.key} className="space-y-3 rounded-[1rem] border border-burgundy/10 bg-cream/40 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={(event) => updateCategory(row.key, { include: event.target.checked })}
                      className="accent-burgundy"
                    />
                    Include {row.name}
                  </label>
                  {row.include ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        Display name
                        <input
                          value={row.name}
                          onChange={(event) => updateCategory(row.key, { name: event.target.value })}
                          className="field"
                        />
                      </label>
                      <label className="block text-sm">
                        Price (£)
                        <input
                          value={row.price}
                          onChange={(event) => updateCategory(row.key, { price: event.target.value })}
                          inputMode="decimal"
                          className="field"
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        Description
                        <input
                          value={row.description}
                          onChange={(event) => updateCategory(row.key, { description: event.target.value })}
                          className="field"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {!isFree && mode === "edit" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Fallback price per person (£)
                <input
                  value={values.pricePerPerson}
                  onChange={(event) => patch({ pricePerPerson: event.target.value })}
                  inputMode="decimal"
                  className="field"
                />
              </label>
              <label className="block text-sm">
                Fallback family price (£)
                <input
                  value={values.familyPrice}
                  onChange={(event) => patch({ familyPrice: event.target.value })}
                  inputMode="decimal"
                  className="field"
                />
              </label>
            </div>
          ) : null}

          {!isFree ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">When to take payment</legend>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  checked={timing === "now"}
                  onChange={() => setTiming("now")}
                  className="mt-1 accent-burgundy"
                />
                <span>Straight after enrolment</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  checked={timing === "later"}
                  onChange={() => setTiming("later")}
                  className="mt-1 accent-burgundy"
                />
                <span>Later via payment link</span>
              </label>
            </fieldset>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              className="accent-burgundy"
            />
            Published on the site
          </label>
        </div>
      ) : null}

      {message ? (
        <p role="alert" className="text-sm text-burgundy">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-burgundy/10 pt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || pending}
          className="rounded-full border border-burgundy/20 px-4 py-2 text-sm font-semibold text-burgundy disabled:opacity-40"
        >
          Back
        </button>
        <button type="submit" disabled={pending} className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60">
          {pending
            ? "Saving…"
            : step < steps.length - 1
              ? "Continue"
              : mode === "create"
                ? "Create event"
                : "Save event"}
        </button>
      </div>
    </form>
  );
}
