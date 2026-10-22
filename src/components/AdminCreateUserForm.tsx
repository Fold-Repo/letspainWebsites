"use client";

import { useState, type FormEvent } from "react";
import { adminRoles, roleLabel, type AdminRole } from "@/lib/roles";

type Created = { id?: number; email: string; role: AdminRole; mfaEnabled: boolean; protected?: boolean };

export function AdminCreateUserForm({ onCreated }: { onCreated: (admin: Created) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("editor");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = (await response.json()) as { message?: string; admin?: Created };
      if (!response.ok || !data.admin) {
        setError(data.message ?? "Could not create that user.");
        setPending(false);
        return;
      }
      onCreated(data.admin);
      setMessage(`Created ${data.admin.email} as ${roleLabel(data.admin.role)}.`);
      setEmail("");
      setPassword("");
      setRole("editor");
      setPending(false);
    } catch {
      setError("Could not reach the server.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-[1.2rem] bg-white p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink/70">Email</span>
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink/70">Temporary password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
          />
        </label>
      </div>
      <label className="block text-sm sm:max-w-xs">
        <span className="text-ink/70">Role</span>
        <select
          className="field"
          value={role}
          onChange={(event) => setRole(event.target.value as AdminRole)}
        >
          {adminRoles.map((option) => (
            <option key={option} value={option}>
              {roleLabel(option)}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-ink/55">
        Share the temporary password securely. They sign in at /admin and can enable MFA from Settings if they are an
        owner.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-burgundy">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-ink/70">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-burgundy px-5 py-2.5 text-sm text-cream disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
