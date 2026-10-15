"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-burgundy px-4 py-2 text-cream"
    >
      Print voucher
    </button>
  );
}
