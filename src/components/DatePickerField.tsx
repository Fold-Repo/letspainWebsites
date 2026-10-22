"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";
import { formatDisplayDate, isValidIsoDate, supportsNativeInput } from "@/lib/datetime-input";
import "react-day-picker/style.css";

type Props = {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
};

function toDate(value: string) {
  if (!isValidIsoDate(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

export function DatePickerField({ label, value, onChange, required }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [useNative, setUseNative] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Calendar package first. If the browser has no usable date input either, stay on calendar.
    // If something goes wrong hydrating the calendar, fall back to the native control.
    try {
      setUseNative(false);
      setReady(true);
    } catch {
      setUseNative(supportsNativeInput("date"));
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
          type="date"
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="field"
        />
        {ready && supportsNativeInput("date") === false ? null : ready ? (
          <button type="button" className="mt-1 text-xs text-burgundy" onClick={() => setUseNative(false)}>
            Use calendar
          </button>
        ) : null}
      </label>
    );
  }

  const selected = toDate(value);

  return (
    <div className="block text-sm" ref={rootRef}>
      <span className="block">{label}</span>
      <div className="relative mt-1.5">
        <button
          type="button"
          id={id}
          className="field !mt-0 flex w-full items-center justify-between text-left"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={value ? "text-ink" : "text-ink/45"}>
            {value ? formatDisplayDate(value) : "Pick a date"}
          </span>
          <span aria-hidden className="text-burgundy">
            ▾
          </span>
        </button>
        {required ? (
          <input tabIndex={-1} className="sr-only" required value={value} onChange={() => undefined} aria-hidden />
        ) : null}
        {open ? (
          <div className="absolute z-30 mt-2 rounded-[1.1rem] border border-burgundy/15 bg-white p-3 shadow-[0_18px_40px_rgba(117,41,77,0.16)]">
            <DayPicker
              mode="single"
              selected={selected}
              defaultMonth={selected ?? new Date()}
              onSelect={(date) => {
                if (!date) {
                  onChange("");
                  return;
                }
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }}
              className="lap-day-picker"
            />
            <div className="mt-2 flex justify-between gap-2 border-t border-burgundy/10 pt-2">
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
              {supportsNativeInput("date") ? (
                <button
                  type="button"
                  className="text-xs text-burgundy"
                  onClick={() => {
                    setUseNative(true);
                    setOpen(false);
                  }}
                >
                  Use browser date
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
