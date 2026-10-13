import { CLINIC_TZ, sql } from "./db";
import { ENTITY_ORDER, type Entity, fileName, toCsv } from "./csv";
import { uploadFiles } from "./sftp";

export type ExportResult = {
  status: "sent" | "nothing" | "failed" | "busy";
  files: { name: string; rows: number }[];
  error?: string;
};

const TS = (column: string) => `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS')`;
const PHONE = (column: string) =>
  `case when length(${column})=10 then '('||substr(${column},1,3)||') '||substr(${column},4,3)||'-'||substr(${column},7,4) else ${column} end`;

// One query per file type. `since` null = full export (everything that is not deleted);
// otherwise every row changed after `since` up to the export moment, deletes included.
function changedRows(entity: Entity, since: Date | null, until: Date) {
  const window = since
    ? sql`t.modified_at > ${since} and t.modified_at <= ${until}`
    : sql`t.deleted_at is null and t.modified_at <= ${until}`;
  const action = sql.unsafe(`case when t.deleted_at is not null then 'Delete' else 'Upsert' end`);
  switch (entity) {
    case "locations":
      return sql`select t.id::text as "Id", t.name as "Name", t.address_1 as "Address 1", t.city as "City",
        t.state as "State", t.zip as "Zip Code", t.phone as "Phone Number",
        ${sql.unsafe(TS("t.created_at"))} as "Created Date Time", ${sql.unsafe(TS("t.modified_at"))} as "Modified Date Time",
        ${action} as "Action", case when t.is_active then 'True' else 'False' end as "Is Active"
        from mock_stride.locations t where ${window} order by t.modified_at, t.id`;
    case "users":
      return sql`select t.id::text as "Id", t.first_name as "First Name", t.last_name as "Last Name", t.email as "Email",
        t.credentials as "Credentials", t.npi as "NPI",
        ${sql.unsafe(TS("t.created_at"))} as "Created Date Time", ${sql.unsafe(TS("t.modified_at"))} as "Modified Date Time",
        case when t.is_active then 'TRUE' else 'FALSE' end as "Active", ${action} as "Action"
        from mock_stride.users t where ${window} order by t.modified_at, t.id`;
    case "patients":
      return sql`select t.id::text as "Id", t.first_name as "First Name", t.last_name as "Last Name",
        to_char(t.date_of_birth, 'YYYY-MM-DD') as "Date Of Birth", t.address_1 as "Address 1", t.city as "City",
        t.state as "State", t.zip as "Zip", t.gender as "Gender",
        (select to_char((min(a.appt_date + a.start_time) at time zone ${CLINIC_TZ}) at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') || '+00:00'
           from mock_stride.appointments a where a.patient_id=t.id and a.deleted_at is null
           and a.status not in ('Cancel','Late Cancel')) as "First Appointment",
        (select to_char((max(a.appt_date + a.start_time) at time zone ${CLINIC_TZ}) at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') || '+00:00'
           from mock_stride.appointments a where a.patient_id=t.id and a.deleted_at is null
           and a.status not in ('Cancel','Late Cancel')) as "Latest Appointment",
        t.personal_email as "Personal Email", case when t.personal_email is not null then 'P' end as "Preferred Email",
        ${sql.unsafe(PHONE("t.mobile_phone"))} as "Mobile Phone Number",
        ${sql.unsafe(PHONE("t.home_phone"))} as "Home Phone Number",
        case when t.mobile_phone is not null then 'M' when t.home_phone is not null then 'H' end as "Preferred Phone Number",
        ${sql.unsafe(TS("t.created_at"))} as "Created Date Time", ${sql.unsafe(TS("t.modified_at"))} as "Modified Date Time",
        ${action} as "Action", case when t.marketing_opt_in then 'True' else 'False' end as "Marketing Opt-in"
        from mock_stride.patients t where ${window} order by t.modified_at, t.id`;
    case "patient_cases":
      return sql`select t.patient_id::text as "Patient Id", p.first_name||' '||p.last_name as "Patient Name",
        to_char(p.date_of_birth, 'YYYY-MM-DD') as "Patient Date Of Birth", t.id::text as "Id", t.title as "Title",
        t.status as "Status",
        ${sql.unsafe(TS("t.created_at"))} as "Created Date Time", ${sql.unsafe(TS("t.modified_at"))} as "Modified Date Time",
        ${action} as "Action"
        from mock_stride.cases t join mock_stride.patients p on p.id=t.patient_id where ${window} order by t.modified_at, t.id`;
    case "appointments":
      // Real Stride leaves Appointment Id and Created Date Time empty on Delete rows;
      // our importer finds the appointment by case + date + start time instead.
      return sql`select t.patient_id::text as "Patient Id", p.first_name||' '||p.last_name as "Patient Name",
        to_char(p.date_of_birth, 'YYYY-MM-DD') as "Patient Date Of Birth", t.case_id::text as "Case Id", c.title as "Case Title",
        case when t.deleted_at is null then t.id::text end as "Appointment Id", 'Patient Appointment' as "Category",
        t.type_name as "Appointment Type", t.type_id::text as "Appointment Type Id", t.payment_type as "Payment Type",
        to_char(t.appt_date, 'YYYY-MM-DD') as "Date", to_char(t.start_time, 'FMHH12:MI AM') as "Start Time",
        to_char(t.end_time, 'FMHH12:MI AM') as "End Time", t.status as "Status", t.place_of_service as "Place of Service",
        t.location_id::text as "Location Id", l.name as "Location Name", t.clinician_id::text as "Primary Attendee Id",
        u.first_name||' '||u.last_name as "Primary Attendee Name",
        case when t.deleted_at is null then ${sql.unsafe(TS("t.created_at"))} end as "Created Date Time",
        ${sql.unsafe(TS("t.modified_at"))} as "Modified Date Time", ${action} as "Action"
        from mock_stride.appointments t join mock_stride.patients p on p.id=t.patient_id
        join mock_stride.cases c on c.id=t.case_id join mock_stride.locations l on l.id=t.location_id
        join mock_stride.users u on u.id=t.clinician_id where ${window} order by t.modified_at, t.id`;
  }
}

/**
 * Build and upload one export, the way Stride does every 5 minutes.
 * The watermark only moves after a successful upload, so a failed export is simply
 * repeated next time (our importer ignores rows it already has).
 */
export async function runExport(trigger: "timer" | "button" | "full"): Promise<ExportResult> {
  // Only rows changed at least 5 seconds ago go out, and the watermark stops there.
  // A save that is still committing while we read gets its turn next time instead of
  // being skipped forever (seen in testing: a timer export and a click 0.5 s apart).
  const [lock] = await sql`update mock_stride.state set exporting_since=now()
    where id=1 and (exporting_since is null or exporting_since < now() - interval '5 minutes')
    returning last_success_at, now() as started_at, now() - interval '5 seconds' as cutoff, auto_send`;
  if (!lock) return { status: "busy", files: [], error: "another export is still running" };
  const startedAt: Date = lock.started_at;
  const cutoff: Date = lock.cutoff;
  const since: Date | null = trigger === "full" ? null : lock.last_success_at;
  const [exportRow] = await sql`insert into mock_stride.exports(started_at, trigger, since)
    values(${startedAt}, ${trigger}, ${since}) returning id`;
  const result: ExportResult = { status: "nothing", files: [] };
  try {
    const uploads = [];
    for (const entity of ENTITY_ORDER) {
      const rows = await changedRows(entity, since, cutoff);
      if (!rows.length) continue;
      const name = fileName(entity, startedAt);
      uploads.push({ name, content: toCsv(entity, rows as unknown as Record<string, unknown>[]) });
      result.files.push({ name, rows: rows.length });
    }
    if (uploads.length) {
      await uploadFiles(uploads);
      result.status = "sent";
    }
    await sql`update mock_stride.state set last_success_at=${cutoff}, exporting_since=null where id=1`;
    await sql`update mock_stride.exports set status=${result.status}, files=${sql.json(result.files)},
      finished_at=now() where id=${exportRow.id}`;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await sql`update mock_stride.state set exporting_since=null where id=1`;
    await sql`update mock_stride.exports set status='failed', files=${sql.json(result.files)},
      error=${message.slice(0, 500)}, finished_at=now() where id=${exportRow.id}`;
    return { status: "failed", files: result.files, error: message };
  }
}
