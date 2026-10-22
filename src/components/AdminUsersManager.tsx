"use client";

import { useState, type FormEvent } from "react";
import { AdminCreateUserForm } from "@/components/AdminCreateUserForm";
import { adminRoles, roleLabel, type AdminRole } from "@/lib/roles";

export type AdminUserRow = {
  id: number;
  email: string;
  role: AdminRole;
  mfaEnabled: boolean;
  protected: boolean;
};

export function AdminUsersManager({
  initial,
  selfEmail,
}: {
  initial: AdminUserRow[];
  selfEmail: string;
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("editor");
  const [editPassword, setEditPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function startEdit(row: AdminUserRow) {
    setEditing(row.email);
    setEditRole(row.role);
    setEditPassword("");
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditing(null);
    setEditPassword("");
    setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const body: { role?: AdminRole; password?: string } = { role: editRole };
      if (editPassword.trim()) body.password = editPassword;
      const response = await fetch(`/api/admin/users/${encodeURIComponent(editing)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { message?: string; admin?: AdminUserRow };
      if (!response.ok || !data.admin) {
        setError(data.message ?? "Could not update that user.");
        setPending(false);
        return;
      }
      setRows((prev) => prev.map((row) => (row.email === data.admin!.email ? data.admin! : row)));
      setMessage(`Updated ${data.admin.email}.`);
      setEditing(null);
      setEditPassword("");
      setPending(false);
    } catch {
      setError("Could not reach the server.");
      setPending(false);
    }
  }

  async function removeUser(row: AdminUserRow) {
    if (row.protected) {
      setError("The seeded first admin cannot be deleted.");
      return;
    }
    if (row.email === selfEmail) {
      setError("You cannot delete your own account while signed in.");
      return;
    }
    if (!window.confirm(`Delete admin ${row.email}? They will lose access immediately.`)) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(row.email)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Could not delete that user.");
        setPending(false);
        return;
      }
      setRows((prev) => prev.filter((item) => item.email !== row.email));
      if (editing === row.email) cancelEdit();
      setMessage(`Deleted ${row.email}.`);
      setPending(false);
    } catch {
      setError("Could not reach the server.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold text-ink">Add user</h3>
        <p className="mt-1 text-sm text-ink/60">Create an admin with email, temporary password, and role.</p>
        <div className="mt-4">
          <AdminCreateUserForm
            onCreated={(admin) => {
              setRows((prev) => {
                if (prev.some((row) => row.email === admin.email)) return prev;
                const next: AdminUserRow = {
                  id: admin.id ?? Date.now(),
                  email: admin.email,
                  role: admin.role,
                  mfaEnabled: admin.mfaEnabled,
                  protected: Boolean(admin.protected),
                };
                return [...prev, next].sort((a, b) => a.id - b.id);
              });
            }}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-ink">Team</h3>
        <p className="mt-1 text-sm text-ink/60">
          Edit roles or reset passwords. The seeded first admin (from{" "}
          <code className="text-xs">ADMIN_EMAIL</code>) cannot be deleted.
        </p>

        <ul className="mt-4 divide-y divide-burgundy/10 overflow-hidden rounded-[1.2rem] border border-burgundy/10 bg-white">
          {rows.map((row) => {
            const isEditing = editing === row.email;
            return (
              <li key={row.email} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink break-all">{row.email}</p>
                    <p className="mt-1 text-xs text-ink/55">
                      {roleLabel(row.role)} · MFA {row.mfaEnabled ? "on" : "off"}
                      {row.protected ? " · Seeded (protected)" : ""}
                      {row.email === selfEmail ? " · You" : ""}
                    </p>
                  </div>
                  {!isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(row)}
                        className="rounded-full border border-burgundy/20 bg-cream px-3.5 py-1.5 text-xs font-semibold text-burgundy disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending || row.protected || row.email === selfEmail}
                        title={
                          row.protected
                            ? "Seeded admin cannot be deleted"
                            : row.email === selfEmail
                              ? "Cannot delete yourself"
                              : "Delete user"
                        }
                        onClick={() => void removeUser(row)}
                        className="rounded-full border border-burgundy/15 px-3.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-burgundy/40 hover:text-burgundy disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <form onSubmit={saveEdit} className="mt-4 space-y-3 rounded-xl bg-cream/60 p-4">
                    <label className="block text-sm">
                      <span className="text-ink/70">Role</span>
                      <select
                        className="field"
                        value={editRole}
                        disabled={row.protected || (row.email === selfEmail && row.role === "owner")}
                        onChange={(event) => setEditRole(event.target.value as AdminRole)}
                      >
                        {adminRoles.map((role) => (
                          <option key={role} value={role} disabled={row.protected && role !== "owner"}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                      {row.protected ? (
                        <span className="mt-1 block text-xs text-ink/55">Seeded admin must remain an owner.</span>
                      ) : null}
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink/70">New password (optional)</span>
                      <input
                        type="password"
                        minLength={8}
                        autoComplete="new-password"
                        value={editPassword}
                        onChange={(event) => setEditPassword(event.target.value)}
                        className="field"
                        placeholder="Leave blank to keep current"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-cream disabled:opacity-60"
                      >
                        {pending ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={cancelEdit}
                        className="rounded-full border border-burgundy/20 px-4 py-2 text-xs font-semibold text-ink/70"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </li>
            );
          })}
          {rows.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-ink/55">No admin users yet.</li>
          ) : null}
        </ul>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-burgundy">
            {error}
          </p>
        ) : null}
        {message ? <p className="mt-3 text-sm text-ink/70">{message}</p> : null}
      </section>
    </div>
  );
}
