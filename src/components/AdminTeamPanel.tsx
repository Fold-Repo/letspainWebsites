"use client";

import { useState } from "react";
import { AdminCreateUserForm } from "@/components/AdminCreateUserForm";
import { AdminRolesForm } from "@/components/AdminRolesForm";
import type { AdminRole } from "@/lib/roles";

type Row = { email: string; role: AdminRole; mfaEnabled: boolean };

export function AdminTeamPanel({ initial, selfEmail }: { initial: Row[]; selfEmail: string }) {
  const [rows, setRows] = useState(initial);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-2xl">Add user</h3>
        <p className="mt-1 text-sm text-ink/70">Create another admin with email, temporary password, and role.</p>
        <div className="mt-4">
          <AdminCreateUserForm
            onCreated={(admin) => {
              setRows((prev) => {
                if (prev.some((row) => row.email === admin.email)) return prev;
                return [...prev, admin].sort((a, b) => a.email.localeCompare(b.email));
              });
            }}
          />
        </div>
      </div>
      <div>
        <h3 className="font-display text-2xl">Team roles</h3>
        <p className="mt-1 text-sm text-ink/70">Change roles for people who already have access.</p>
        <div className="mt-4">
          <AdminRolesForm
            selfEmail={selfEmail}
            rows={rows}
            onRoleChange={(email, role) => {
              setRows((prev) => prev.map((row) => (row.email === email ? { ...row, role } : row)));
            }}
          />
        </div>
      </div>
    </div>
  );
}
