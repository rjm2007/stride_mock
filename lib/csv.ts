// Column names copied exactly from Stride's sample export (2026-04-09). Columns we
// have no data for stay empty, exactly as many do in real exports.
export const HEADERS: Record<string, string[]> = {
  locations:
    "Id,Name,Address 1,Address 2,City,State,Zip Code,Phone Number,Fax Number,Created Date Time,Modified Date Time,Action,Is Active".split(","),
  users: "Id,First Name,Last Name,Email,Credentials,License,NPI,Created Date Time,Modified Date Time,Active,Action".split(","),
  patients:
    "Id,External Id,First Name,Last Name,Date Of Birth,Address 1,Address 2,City,State,Zip,Marital Status,Gender,Occupation,First Appointment,Latest Appointment,Personal Email,Work Email,Preferred Email,Mobile Phone Number,Home Phone Number,Work Phone Number,Preferred Phone Number,Emergency Contact Name,Emergency Contact Relationship,Emergency Contact Phone Number,Referral Source,Referral Details,Primary Care Provider Id,Primary Care Provider Name,Primary Care Provider NPI,Created Date Time,Modified Date Time,Action,Marketing Opt-in".split(","),
  patient_cases:
    "Patient Id,Patient Name,Patient Date Of Birth,Id,Title,Details,Last Appointment,Status,Referring Provider Id,Referring Provider Name,Referring Provider NPI,Certification Start Date,Certification End Date,Diagnosis Code 1,Diagnosis Code 2,Diagnosis Code 3,Diagnosis Code 4,Diagnosis Code 5,Diagnosis Code 6,Diagnosis Code 7,Diagnosis Code 8,Diagnosis Code 9,Diagnosis Code 10,Diagnosis Code 11,Diagnosis Code 12,Primary Patient Insurance Id,Primary Patient Insurance Payer Id,Primary Patient Insurance Payer Name,Primary Patient Insurance Member Id,Primary Patient Insurance Current Auth Number,Primary Patient Insurance Current Auth Start Date,Primary Patient Insurance Current Auth End Date,Primary Patient Insurance Current Auth Visits Allowed,Secondary Patient Insurance Id,Secondary Patient Insurance Payer Id,Secondary Patient Insurance Payer Name,Secondary Patient Insurance Member Id,Secondary Patient Insurance Current Auth Number,Secondary Patient Insurance Current Auth Start Date,Secondary Patient Insurance Current Auth End Date,Secondary Patient Insurance Current Auth Visits Allowed,Tertiary Patient Insurance Id,Tertiary Patient Insurance Payer Id,Tertiary Patient Insurance Payer Name,Tertiary Patient Insurance Member Id,Tertiary Patient Insurance Current Auth Number,Tertiary Patient Insurance Current Auth Start Date,Tertiary Patient Insurance Current Auth End Date,Tertiary Patient Insurance Current Auth Visits Allowed,Created Date Time,Modified Date Time,Action".split(","),
  appointments:
    "Patient Id,Patient Name,Patient Date Of Birth,Case Id,Case Title,Appointment Id,Category,Appointment Type,Appointment Type Id,Subject,Payment Type,Date,Start Time,End Time,Status,Place of Service,Location Id,Location Name,Primary Attendee Id,Primary Attendee Name,Details,Created Date Time,Modified Date Time,Action".split(","),
};

// Parents before children, the order our importer reads them in.
export const ENTITY_ORDER = ["locations", "users", "patients", "patient_cases", "appointments"] as const;
export type Entity = (typeof ENTITY_ORDER)[number];

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(entity: Entity, rows: Record<string, unknown>[]): string {
  const header = HEADERS[entity];
  const lines = [header.map(cell).join(",")];
  for (const row of rows) lines.push(header.map((column) => cell(row[column])).join(","));
  // Stride's sample files use Windows line endings.
  return lines.join("\r\n") + "\r\n";
}

// patients_20261011153000.csv — the export moment in UTC, like Stride.
export function fileName(entity: Entity, at: Date): string {
  const stamp = at.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return `${entity}_${stamp}.csv`;
}
