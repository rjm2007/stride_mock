import { CLINIC_TZ } from "./db";

export function when(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    timeZone: CLINIC_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ago(value: Date | string | null | undefined): string {
  if (!value) return "never";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

export function phone(value: string | null | undefined): string {
  const d = (value || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : value || "—";
}

export function statusPill(status: string): string {
  const s = status.toLowerCase();
  if (s === "checked in") return "pill good";
  if (s === "cancel" || s === "late cancel") return "pill bad";
  if (s === "no show") return "pill warn";
  if (s === "confirmed") return "pill info";
  return "pill plain";
}

export function todayInClinic(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: CLINIC_TZ });
}
