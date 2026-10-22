"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: string;
};

export function PasswordField({ label, hint, className = "field", id, ...inputProps }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm" htmlFor={inputId}>
      <span className="text-ink/70">{label}</span>
      <span className="relative mt-0.5 block">
        <input
          {...inputProps}
          id={inputId}
          type={visible ? "text" : "password"}
          className={`${className} pr-16`}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-1 text-xs font-semibold tracking-wide text-burgundy/80 uppercase transition hover:text-burgundy"
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
      {hint ? <span className="mt-1 block text-xs text-ink/55">{hint}</span> : null}
    </label>
  );
}
