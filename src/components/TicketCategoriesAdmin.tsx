"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatGbp } from "@/lib/money";
import type { TicketCategory } from "@/lib/ticket-categories";

export function TicketCategoriesAdmin({
  slug,
  initial,
}: {
  slug: string;
  initial: TicketCategory[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/events/${slug}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          kind: form.get("kind"),
          price: form.get("price"),
          seatsPerTicket: form.get("seatsPerTicket"),
          maxPerOrder: form.get("maxPerOrder"),
          sortOrder: form.get("sortOrder"),
          active: true,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Could not add ticket.");
        setPending(false);
        return;
      }
      event.currentTarget.reset();
      router.refresh();
      setMessage("Ticket type added.");
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  async function saveCategory(category: TicketCategory, form: FormData) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/events/${slug}/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          kind: form.get("kind"),
          price: form.get("price"),
          seatsPerTicket: form.get("seatsPerTicket"),
          maxPerOrder: form.get("maxPerOrder"),
          sortOrder: form.get("sortOrder"),
          active: form.get("active") === "on",
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Could not save ticket.");
        setPending(false);
        return;
      }
      router.refresh();
      setMessage("Ticket type saved.");
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  async function removeCategory(id: number) {
    if (!window.confirm("Remove this ticket type?")) return;
    setPending(true);
    await fetch(`/api/admin/events/${slug}/categories/${id}`, { method: "DELETE" });
    router.refresh();
    setPending(false);
  }

  return (
    <section className="mt-10 space-y-6">
      <div>
        <h2 className="font-display text-3xl">Ticket categories</h2>
        <p className="mt-2 text-sm text-ink/70">
          Guests pick these on the enrolment form. Seats count toward event capacity. A price of 0 is free.
        </p>
      </div>
      {initial.map((category) => (
        <form
          key={category.id}
          className="space-y-3 rounded-[1.2rem] border border-burgundy/10 bg-cream/40 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveCategory(category, new FormData(event.currentTarget));
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Name
              <input name="name" defaultValue={category.name} required className="field" />
            </label>
            <label className="block text-sm">
              Kind
              <select name="kind" defaultValue={category.kind} className="field">
                <option value="adult">Adult</option>
                <option value="child">Child</option>
                <option value="family">Family</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            Description
            <input name="description" defaultValue={category.description} className="field" />
          </label>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block text-sm">
              Price (£)
              <input
                name="price"
                defaultValue={(category.pricePence / 100).toFixed(2)}
                inputMode="decimal"
                className="field"
              />
            </label>
            <label className="block text-sm">
              Seats each
              <input name="seatsPerTicket" type="number" min={1} max={12} defaultValue={category.seatsPerTicket} className="field" />
            </label>
            <label className="block text-sm">
              Max per order
              <input name="maxPerOrder" type="number" min={1} max={20} defaultValue={category.maxPerOrder} className="field" />
            </label>
            <label className="block text-sm">
              Sort
              <input name="sortOrder" type="number" defaultValue={category.sortOrder} className="field" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input name="active" type="checkbox" defaultChecked={category.active} className="accent-burgundy" />
            Active on the public form
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="rounded-full bg-burgundy px-4 py-2 text-sm text-cream disabled:opacity-60">
              Save {category.name}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void removeCategory(category.id)}
              className="rounded-full border border-burgundy px-4 py-2 text-sm text-burgundy disabled:opacity-60"
            >
              Remove
            </button>
            <span className="self-center text-xs text-ink/50">
              {category.pricePence === 0 ? "Free" : formatGbp(category.pricePence)} · {category.seatsPerTicket} seat
              {category.seatsPerTicket === 1 ? "" : "s"}
            </span>
          </div>
        </form>
      ))}

      <form onSubmit={createCategory} className="space-y-3 rounded-[1.2rem] bg-white p-4">
        <h3 className="font-display text-2xl">Add ticket type</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Name
            <input name="name" required className="field" />
          </label>
          <label className="block text-sm">
            Kind
            <select name="kind" defaultValue="adult" className="field">
              <option value="adult">Adult</option>
              <option value="child">Child</option>
              <option value="family">Family</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          Description
          <input name="description" className="field" />
        </label>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-sm">
            Price (£)
            <input name="price" inputMode="decimal" placeholder="45.00" className="field" />
          </label>
          <label className="block text-sm">
            Seats each
            <input name="seatsPerTicket" type="number" min={1} max={12} defaultValue={1} className="field" />
          </label>
          <label className="block text-sm">
            Max per order
            <input name="maxPerOrder" type="number" min={1} max={20} defaultValue={8} className="field" />
          </label>
          <label className="block text-sm">
            Sort
            <input name="sortOrder" type="number" defaultValue={initial.length} className="field" />
          </label>
        </div>
        <button type="submit" disabled={pending} className="rounded-full bg-burgundy px-4 py-2 text-sm text-cream disabled:opacity-60">
          {pending ? "Saving…" : "Add ticket type"}
        </button>
      </form>
      {message ? <p className="text-sm text-ink/80">{message}</p> : null}
    </section>
  );
}
