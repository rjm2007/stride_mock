"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { APPOINTMENT_TYPES, STATUSES, digits, sql } from "@/lib/db";
import { runExport } from "@/lib/export";

const text = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? "").trim();
  return value || null;
};

// US numbers as 10 digits (exported as (xxx) xxx-xxxx, like Stride); international
// test numbers (+91…) kept in E.164 so team phones still reach our matcher.
function phone10(value: string | null): string | null {
  const d = digits(value);
  if (d.length === 10) return d;
  const raw = (value || "").replace(/[^\d+]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(raw) ? raw : null;
}

// Real Stride refuses a second visit in the same case at the same start ("Appointment Date+Case
// combination already exists"). Mock Stride allowed it, and then a Delete row (which has no
// Appointment Id) matched two visits, so our server could not tell which one was deleted.
// Returns the refusal text, or null. Callers redirect back with it: a thrown error would only show
// Next.js's generic "Application error" page in production.
async function doubleBookingRefusal(caseId: number, date: string, time: string, exceptId = 0) {
  const [clash] = await sql`select id from mock_stride.appointments where case_id=${caseId} and deleted_at is null
    and appt_date=${date} and start_time=${time}::time and id<>${exceptId}`;
  return clash
    ? `Stride does not allow this: visit ${clash.id} is already booked for this patient on ${date} at ${time}. Pick another time.`
    : null;
}

function backWithError(patientId: number, message: string): never {
  redirect(`/patients/${patientId}?error=${encodeURIComponent(message)}`);
}

function refresh(...paths: string[]) {
  for (const path of ["/", "/patients", "/leads", ...paths]) revalidatePath(path);
}

// A patient row carries First/Latest Appointment, so Stride exports the patient again
// whenever one of their appointments changes. Do the same.
async function touchPatient(patientId: number | undefined) {
  if (patientId) await sql`update mock_stride.patients set modified_at=now() where id=${patientId}`;
}

export async function createPatient(form: FormData) {
  const first = text(form, "first_name");
  const last = text(form, "last_name");
  if (!first || !last) throw new Error("First and last name are required");
  const [row] = await sql`insert into mock_stride.patients
    (first_name,last_name,date_of_birth,gender,personal_email,mobile_phone,address_1,city,state,zip)
    values(${first},${last},${text(form, "date_of_birth")},${text(form, "gender")},${text(form, "email")},
      ${phone10(text(form, "mobile_phone"))},${text(form, "address_1")},${text(form, "city")},
      ${text(form, "state")},${text(form, "zip")}) returning id`;
  refresh();
  redirect(`/patients/${row.id}`);
}

// Copy one of our leads into Stride exactly, so our matcher (same name + birthday,
// or name + phone) links them — like a lead who books by themselves.
export async function createPatientFromLead(form: FormData) {
  const leadId = text(form, "lead_id");
  const [lead] = await sql`select id, full_name, first_name, last_name, date_of_birth, phone_e164, email
    from public.leads where id=${leadId}`;
  if (!lead) throw new Error("Lead not found");
  const parts = String(lead.full_name || "").trim().split(/\s+/);
  const first = lead.first_name || parts[0];
  const last = lead.last_name || parts.slice(1).join(" ") || parts[0];
  const [existing] = await sql`select id from mock_stride.patients where lead_id=${lead.id} and deleted_at is null`;
  if (existing) redirect(`/patients/${existing.id}`);
  const [row] = await sql`insert into mock_stride.patients
    (first_name,last_name,date_of_birth,personal_email,mobile_phone,lead_id)
    values(${first},${last},${lead.date_of_birth},${lead.email},${phone10(lead.phone_e164)},${lead.id}) returning id`;
  refresh();
  redirect(`/patients/${row.id}`);
}

export async function updatePatient(form: FormData) {
  const id = Number(form.get("id"));
  await sql`update mock_stride.patients set first_name=coalesce(${text(form, "first_name")},first_name),
    last_name=coalesce(${text(form, "last_name")},last_name), personal_email=${text(form, "email")},
    mobile_phone=${phone10(text(form, "mobile_phone"))}, modified_at=now() where id=${id}`;
  refresh(`/patients/${id}`);
}

export async function deletePatient(form: FormData) {
  const id = Number(form.get("id"));
  await sql`update mock_stride.patients set deleted_at=now(), modified_at=now() where id=${id} and deleted_at is null`;
  refresh(`/patients/${id}`);
}

export async function bookAppointment(form: FormData) {
  const patientId = Number(form.get("patient_id"));
  const type = APPOINTMENT_TYPES.find((t) => t.id === Number(form.get("type_id")));
  const date = text(form, "date");
  const time = text(form, "time");
  if (!type || !date || !time) throw new Error("Type, date and time are required");
  // Stride books every visit under a case; reuse the patient's open one or start one.
  const [found] = await sql`select id from mock_stride.cases where patient_id=${patientId}
    and deleted_at is null and status='A' order by id desc limit 1`;
  const caseId =
    found?.id ??
    (await sql`insert into mock_stride.cases(patient_id,title) values(${patientId},'Physical Therapy') returning id`)[0].id;
  const refusal = await doubleBookingRefusal(caseId, date, time);
  if (refusal) backWithError(patientId, refusal);
  await sql`insert into mock_stride.appointments
    (patient_id,case_id,type_id,type_name,appt_date,start_time,end_time,location_id,clinician_id,status)
    values(${patientId},${caseId},${type.id},${type.name},${date},${time}::time,
      ${time}::time + make_interval(mins => ${type.minutes}),${Number(form.get("location_id"))},
      ${Number(form.get("clinician_id"))},${text(form, "status") ?? "Unmarked"})`;
  await touchPatient(patientId);
  refresh(`/patients/${patientId}`);
}

export async function setAppointmentStatus(form: FormData) {
  const status = text(form, "status");
  if (!status || !(STATUSES as readonly string[]).includes(status)) throw new Error("Unknown status");
  const [row] = await sql`update mock_stride.appointments set status=${status}, modified_at=now()
    where id=${Number(form.get("id"))} returning patient_id`;
  await touchPatient(row?.patient_id);
  refresh(`/patients/${row?.patient_id}`);
}

export async function rescheduleAppointment(form: FormData) {
  const date = text(form, "date");
  const time = text(form, "time");
  if (!date || !time) throw new Error("Date and time are required");
  const [current] = await sql`select case_id, patient_id from mock_stride.appointments where id=${Number(form.get("id"))}`;
  if (current) {
    const refusal = await doubleBookingRefusal(current.case_id, date, time, Number(form.get("id")));
    if (refusal) backWithError(current.patient_id, refusal);
  }
  const [row] = await sql`update mock_stride.appointments set appt_date=${date}, end_time=${time}::time + (end_time - start_time),
    start_time=${time}::time, modified_at=now() where id=${Number(form.get("id"))} returning patient_id`;
  await touchPatient(row?.patient_id);
  refresh(`/patients/${row?.patient_id}`);
}

export async function deleteAppointment(form: FormData) {
  const [row] = await sql`update mock_stride.appointments set deleted_at=now(), modified_at=now()
    where id=${Number(form.get("id"))} and deleted_at is null returning patient_id`;
  await touchPatient(row?.patient_id);
  refresh(`/patients/${row?.patient_id}`);
}

export async function sendNow() {
  // An export only takes changes at least 5 seconds old (see runExport). Waiting here means a change
  // saved just before the click is never reported as "Nothing changed".
  await new Promise((resolve) => setTimeout(resolve, 6000));
  await runExport("button");
  refresh("/exports", "/server");
}

export async function sendFull() {
  await runExport("full");
  refresh("/exports", "/server");
}

export async function toggleAutoSend() {
  await sql`update mock_stride.state set auto_send = not auto_send where id=1`;
  refresh("/exports");
}
