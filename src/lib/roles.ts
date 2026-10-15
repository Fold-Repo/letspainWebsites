export const adminRoles = ["owner", "editor", "door"] as const;

export type AdminRole = (typeof adminRoles)[number];

export type AdminCapability =
  | "events"
  | "bookings"
  | "partnerships"
  | "check_in"
  | "settings"
  | "audit"
  | "payment_links";

const capabilities: Record<AdminRole, AdminCapability[]> = {
  owner: ["events", "bookings", "partnerships", "check_in", "settings", "audit", "payment_links"],
  editor: ["events", "bookings", "partnerships", "check_in", "payment_links"],
  door: ["check_in"],
};

export function isAdminRole(value: string): value is AdminRole {
  return (adminRoles as readonly string[]).includes(value);
}

export function can(role: AdminRole, capability: AdminCapability) {
  return capabilities[role].includes(capability);
}

export function homePathForRole(role: AdminRole) {
  return role === "door" ? "/admin/check-in" : "/admin";
}

export function roleLabel(role: AdminRole) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  return "Door";
}
