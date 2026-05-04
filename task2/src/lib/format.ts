import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function fmtDateInTz(iso: string, tz: string, pattern = "EEE, MMM d · h:mm a") {
  try {
    return formatInTimeZone(new Date(iso), tz, pattern) + ` (${tz})`;
  } catch {
    return format(new Date(iso), pattern);
  }
}

export function fmtRangeInTz(startIso: string, endIso: string, tz: string) {
  try {
    const start = formatInTimeZone(new Date(startIso), tz, "EEE, MMM d · h:mm a");
    const end = formatInTimeZone(new Date(endIso), tz, "h:mm a");
    return `${start} – ${end} (${tz})`;
  } catch {
    return `${format(new Date(startIso), "PPpp")} – ${format(new Date(endIso), "p")}`;
  }
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function buildIcs(opts: {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso: string;
}) {
  const dt = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Localhost//EN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@hopper`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(opts.startIso)}`,
    `DTEND:${dt(opts.endIso)}`,
    `SUMMARY:${esc(opts.title)}`,
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : "",
    opts.location ? `LOCATION:${esc(opts.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function googleCalUrl(opts: {
  title: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso: string;
}) {
  const dt = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${dt(opts.startIso)}/${dt(opts.endIso)}`,
    details: opts.description ?? "",
    location: opts.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function makeTicketCode(): string {
  // Client-side fallback ticket code generator (8-char uppercase alphanum)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}
