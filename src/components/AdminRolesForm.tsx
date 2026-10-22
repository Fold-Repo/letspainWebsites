"use client";

import { useState } from "react";
import { adminRoles, roleLabel, type AdminRole } from "@/lib/roles";

type Row = { email: string; role: AdminRole; mfaEnabled: boolean };

export function AdminRolesForm({
  rows,
  selfEmail,
  onRoleChange,
}: {
  rows: Row[];
  selfEmail: string;
  onRoleChange: (email: string, role: AdminRole) => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function changeRole(email: string, role: AdminRole) {
    setPending(email);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Could not update role.");
        setPending(null);
        return;
      }
      onRoleChange(email, role);
      setMessage(`Updated ${email} to ${roleLabel(role)}.`);
      setPending(null);
    } catch {
      setError("Could not reach the server.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-burgundy/10 rounded-[1.2rem] bg-white">
        {rows.map((row) => (
          <li key={row.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{row.email}</p>
              <p className="text-ink/55">MFA {row.mfaEnabled ? "on" : "off"}</p>
            </div>
            <select
              className="field !mt-0 w-auto min-w-[8rem]"
              value={row.role}
              disabled={pending === row.email || (row.email === selfEmail && row.role === "owner")}
              onChange={(event) => void changeRole(row.email, event.target.value as AdminRole)}
            >
              {adminRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-sm text-burgundy">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-ink/70">{message}</p> : null}
    </div>
  );
}
