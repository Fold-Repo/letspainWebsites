/** Detect whether the browser has a usable native date/time control. */
export function supportsNativeInput(type: "date" | "time") {
  if (typeof document === "undefined") return false;
  const input = document.createElement("input");
  input.setAttribute("type", type);
  const invalid = "not-a-valid-value";
  input.value = invalid;
  return input.type === type && input.value !== invalid;
}

export function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function formatDisplayDate(isoDate: string) {
  if (!isValidIsoDate(isoDate)) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatDisplayTime(hhmm: string) {
  if (!isValidTime(hhmm)) return "";
  const [hours, minutes] = hhmm.split(":").map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes));
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

/** Best-effort parse of older free-text labels into ISO date / HH:mm. */
export function parseLooseDate(label: string): string {
  const trimmed = label.trim();
  if (isValidIsoDate(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return "";
  const date = new Date(parsed);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLooseTime(label: string): string {
  const trimmed = label.trim().toLowerCase();
  if (isValidTime(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
