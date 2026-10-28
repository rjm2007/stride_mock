import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __mockStrideSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Supabase's pooler runs in transaction mode: prepared statements must be off (the default).
  // On the demo server the database is the `db` container next to this app (no public port,
  // no TLS): there DATABASE_SSL=disable.
  return postgres(url, {
    prepare: process.env.DATABASE_PREPARE === "true",
    max: 3,
    idle_timeout: 20,
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  });
}

type Sql = ReturnType<typeof postgres>;

// One pool per server process (and per hot reload in dev), opened on first use so a
// build without DATABASE_URL still works.
function pool(): Sql {
  return globalThis.__mockStrideSql ?? (globalThis.__mockStrideSql = connect());
}

export const sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_target, _this, args) => (pool() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_target, prop) => Reflect.get(pool(), prop),
}) as Sql;

export const CLINIC_TZ = process.env.CLINIC_TIMEZONE || "America/New_York";

// Clinical visit types from Stride's sandbox list (ids match the backend's booking setup).
export const APPOINTMENT_TYPES = [
  { id: 1452, name: "Initial Evaluation", minutes: 60 },
  { id: 1451, name: "Follow-up", minutes: 45 },
  { id: 1453, name: "Progress Note", minutes: 45 },
  { id: 1454, name: "Reevaluation", minutes: 45 },
  { id: 1455, name: "Recertification", minutes: 45 },
  { id: 1456, name: "Consultation", minutes: 30 },
] as const;

// What Stride's exports write in the Status column.
export const STATUSES = ["Unmarked", "Confirmed", "Checked In", "No Show", "Late Cancel", "Cancel"] as const;

export function digits(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
}
