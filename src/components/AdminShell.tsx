"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { can, roleLabel, type AdminCapability, type AdminRole } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  capability: AdminCapability;
  match?: (path: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "Reservations",
    capability: "bookings",
    match: (path) => path === "/admin",
  },
  {
    href: "/admin/events",
    label: "Events",
    capability: "events",
    match: (path) => path.startsWith("/admin/events"),
  },
  {
    href: "/admin/partnerships",
    label: "Partnerships",
    capability: "partnerships",
    match: (path) => path.startsWith("/admin/partnerships"),
  },
  {
    href: "/admin/check-in",
    label: "Check-in",
    capability: "check_in",
    match: (path) => path.startsWith("/admin/check-in"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    capability: "settings",
    match: (path) => path.startsWith("/admin/settings"),
  },
  {
    href: "/admin/audit",
    label: "Audit",
    capability: "audit",
    match: (path) => path.startsWith("/admin/audit"),
  },
];

function NavIcon({ label }: { label: string }) {
  const common = "h-5 w-5";
  switch (label) {
    case "Reservations":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
    case "Events":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
        </svg>
      );
    case "Partnerships":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0" />
        </svg>
      );
    case "Check-in":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "Settings":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </svg>
      );
    default:
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
  }
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function AdminShell({
  email,
  role,
  children,
}: {
  email: string;
  role: AdminRole;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const firstName = email.split("@")[0]?.split(/[._-]/)[0] ?? "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const links = navItems.filter((item) => can(role, item.capability));
  const canCreateEvent = can(role, "events");

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const sidebar = (
    <aside className="admin-sidebar flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white/10">
          <Image src="/logo.jpg" alt="" fill className="object-cover" sizes="40px" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Let&apos;s All Paints</p>
          <p className="text-[11px] tracking-wide text-white/55">Back office</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map((item) => {
          const active = item.match ? item.match(pathname) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`admin-nav-link ${active ? "admin-nav-link-active" : ""}`}
            >
              <NavIcon label={item.label} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 px-4 pb-6">
        {canCreateEvent ? (
          <div className="admin-sidebar-card">
            <p className="text-sm font-medium text-white">Plan the next hangout</p>
            <p className="mt-1 text-xs text-white/65">Set Adult, Child and Family prices when you create an event.</p>
            <Link
              href="/admin/events/new"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-burgundy"
            >
              + New event
            </Link>
          </div>
        ) : null}
        <div className="rounded-2xl bg-white/5 px-3 py-3">
          <p className="truncate text-sm text-white">{email}</p>
          <p className="text-xs text-white/50">{roleLabel(role)}</p>
          <button type="button" onClick={() => void logout()} className="mt-3 text-xs font-medium text-pink">
            Log out
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="admin-app">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">{sidebar}</div>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full w-72 max-w-[85vw] shadow-2xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="admin-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-burgundy/10 bg-white text-burgundy lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {greeting()}, {displayName}
              </h1>
              <p className="text-sm text-ink/50">Manage hangouts, tickets, and the door.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="admin-chip hidden sm:inline-flex">
              View site
            </Link>
            {canCreateEvent ? (
              <Link href="/admin/events/new" className="admin-btn-primary hidden sm:inline-flex">
                New event
              </Link>
            ) : null}
          </div>
        </header>
        <main id="content" className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}
