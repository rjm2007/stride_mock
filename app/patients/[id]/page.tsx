import { notFound } from "next/navigation";
import {
  bookAppointment,
  deleteAppointment,
  deletePatient,
  rescheduleAppointment,
  setAppointmentStatus,
  updatePatient,
} from "../../actions";
import { APPOINTMENT_TYPES, CLINIC_TZ, STATUSES, sql } from "@/lib/db";
import { phone, statusPill, todayInClinic, when } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isInteger(patientId)) notFound();
  const [p] = await sql`select p.*, p.date_of_birth::text as dob, l.full_name as lead_name, l.status as lead_status,
      l.cadence_state as lead_cadence
    from mock_stride.patients p left join public.leads l on l.id=p.lead_id where p.id=${patientId}`;
  if (!p) notFound();
  const appointments = await sql`select a.*, a.appt_date::text as day, to_char(a.start_time,'FMHH12:MI AM') as starts,
      to_char(a.start_time,'HH24:MI') as start_value, u.first_name||' '||u.last_name as clinician, l.name as location
    from mock_stride.appointments a join mock_stride.users u on u.id=a.clinician_id
    join mock_stride.locations l on l.id=a.location_id where a.patient_id=${patientId}
    order by a.deleted_at nulls first, a.appt_date desc, a.start_time desc`;
  const clinicians = await sql`select id, first_name||' '||last_name as name from mock_stride.users where deleted_at is null order by id`;
  const locations = await sql`select id, name from mock_stride.locations where deleted_at is null order by id`;
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA", { timeZone: CLINIC_TZ });

  return (
    <>
      <div>
        <a href="/patients">← Patients</a>
        <h1>
          {p.first_name} {p.last_name} {p.deleted_at ? <span className="pill bad">Deleted</span> : null}
        </h1>
        <p className="muted">
          Stride patient {p.id} · birthday {p.dob || "—"} · {phone(p.mobile_phone)} · {p.personal_email || "no email"} · last
          changed {when(p.modified_at)}
        </p>
        {p.lead_name ? (
          <p>
            Copied from our lead <strong>{p.lead_name}</strong> — our status now:{" "}
            <span className={`pill ${p.lead_status === "booked" ? "good" : "plain"}`}>
              {String(p.lead_status).replace(/_/g, " ")}
            </span>{" "}
            (calls/texts: {p.lead_cadence})
          </p>
        ) : null}
      </div>

      {!p.deleted_at ? (
        <section className="card">
          <h2>Book an appointment</h2>
          <form action={bookAppointment} className="stack">
            <input type="hidden" name="patient_id" value={p.id} />
            <label>
              Visit type
              <select name="type_id" defaultValue="1452">
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.minutes} min)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input name="date" type="date" required defaultValue={tomorrow} />
            </label>
            <label>
              Start time
              <input name="time" type="time" required defaultValue="10:00" step={900} />
            </label>
            <label>
              Clinician
              <select name="clinician_id">
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location
              <select name="location_id">
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <button type="submit">Book</button>
            </div>
          </form>
          <p className="muted">Today in the clinic is {todayInClinic()}. Only future, non-cancelled visits count as “booked”.</p>
        </section>
      ) : null}

      <section className="card">
        <h2>Appointments</h2>
        {appointments.length === 0 ? <p className="muted">None yet.</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Id</th>
                <th>Type</th>
                <th>When</th>
                <th>Clinician</th>
                <th>Status</th>
                <th>Change status</th>
                <th>Move</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td className="num">{a.id}</td>
                  <td>{a.type_name}</td>
                  <td>
                    {a.day} {a.starts}
                    <br />
                    <span className="muted">{a.location}</span>
                  </td>
                  <td>{a.clinician}</td>
                  <td>
                    {a.deleted_at ? <span className="pill bad">Deleted</span> : <span className={statusPill(a.status)}>{a.status}</span>}
                  </td>
                  <td>
                    {!a.deleted_at ? (
                      <form action={setAppointmentStatus} className="inline">
                        <input type="hidden" name="id" value={a.id} />
                        <select name="status" defaultValue={a.status} aria-label="Status">
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button className="small secondary" type="submit">
                          Save
                        </button>
                      </form>
                    ) : null}
                  </td>
                  <td>
                    {!a.deleted_at ? (
                      <form action={rescheduleAppointment} className="inline">
                        <input type="hidden" name="id" value={a.id} />
                        <input name="date" type="date" defaultValue={a.day} aria-label="New date" required />
                        <input name="time" type="time" defaultValue={a.start_value} aria-label="New time" step={900} required />
                        <button className="small secondary" type="submit">
                          Move
                        </button>
                      </form>
                    ) : null}
                  </td>
                  <td>
                    {!a.deleted_at ? (
                      <form action={deleteAppointment} className="inline">
                        <input type="hidden" name="id" value={a.id} />
                        <button className="small danger" type="submit">
                          Delete
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!p.deleted_at ? (
        <section className="card">
          <h2>Edit patient</h2>
          <form action={updatePatient} className="stack">
            <input type="hidden" name="id" value={p.id} />
            <label>
              First name
              <input name="first_name" defaultValue={p.first_name} />
            </label>
            <label>
              Last name
              <input name="last_name" defaultValue={p.last_name} />
            </label>
            <label>
              Mobile phone
              <input name="mobile_phone" defaultValue={phone(p.mobile_phone) === "—" ? "" : phone(p.mobile_phone)} />
            </label>
            <label>
              Email
              <input name="email" type="email" defaultValue={p.personal_email || ""} />
            </label>
            <div>
              <button type="submit">Save changes</button>
            </div>
          </form>
          <form action={deletePatient}>
            <input type="hidden" name="id" value={p.id} />
            <button className="danger" type="submit">
              Delete this patient in Stride
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
