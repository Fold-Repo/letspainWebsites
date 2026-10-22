"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatDisplayTime, isValidTime, supportsNativeInput } from "@/lib/datetime-input";

type Props = {
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
  required?: boolean;
};

function buildSlots() {
  const slots: string[] = [];
  for (let hour = 8; hour <= 22; hour += 1) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === 22 && minute > 0) break;
      slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return slots;
}

export function TimePickerField({ label, value, onChange, required }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [useNative, setUseNative] = useState(false);
  const [ready, setReady] = useState(false);
  const slots = useMemo(() => buildSlots(), []);

  useEffect(() => {
    try {
      setUseNative(false);
      setReady(true);
    } catch {
      setUseNative(supportsNativeInput("time"));
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || useNative) {
    return (
      <label className="block text-sm" htmlFor={id}>
        {label}
        <input
          id={id}
          type="time"
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="field"
        />
        {ready ? (
          <button type="button" className="mt-1 text-xs text-burgundy" onClick={() => setUseNative(false)}>
            Use time list
          </button>
        ) : null}
      </label>
    );
  }

  const display = isValidTime(value) ? formatDisplayTime(value) : "";

  return (
    <div className="block text-sm" ref={rootRef}>
      <span className="block">{label}</span>
      <div className="relative mt-1.5">
        <button
          type="button"
          id={id}
          className="field !mt-0 flex w-full items-center justify-between text-left"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={display ? "text-ink" : "text-ink/45"}>{display || "Pick a time"}</span>
          <span aria-hidden className="text-burgundy">
            ▾
          </span>
        </button>
        {required ? (
          <input tabIndex={-1} className="sr-only" required value={value} onChange={() => undefined} aria-hidden />
        ) : null}
        {open ? (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[1.1rem] border border-burgundy/15 bg-white shadow-[0_18px_40px_rgba(117,41,77,0.16)]">
            <ul className="max-h-56 overflow-y-auto py-1" role="listbox" aria-label={label}>
              {slots.map((slot) => (
                <li key={slot}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={slot === value}
                    className={`flex w-full px-4 py-2 text-left text-sm ${
                      slot === value ? "bg-burgundy/10 font-semibold text-burgundy" : "text-ink hover:bg-cream"
                    }`}
                    onClick={() => {
                      onChange(slot);
                      setOpen(false);
                    }}
                  >
                    {formatDisplayTime(slot)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-between gap-2 border-t border-burgundy/10 px-3 py-2">
              <button
                type="button"
                className="text-xs text-ink/55"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
              {supportsNativeInput("time") ? (
                <button
                  type="button"
                  className="text-xs text-burgundy"
                  onClick={() => {
                    setUseNative(true);
                    setOpen(false);
                  }}
                >
                  Use browser time
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
