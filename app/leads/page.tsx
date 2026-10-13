import { createPatientFromLead } from "../actions";
import { sql } from "@/lib/db";
import { phone, when } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Leads() {
  const leads = await sql`select l.id, l.full_name, l.date_of_birth::text as dob, l.phone_e164, l.status,
      l.cadence_state, l.source_system, l.created_at, l.stride_patient_id,
      (select p.id from mock_stride.patients p where p.lead_id=l.id and p.deleted_at is null limit 1) as mock_patient_id
    from public.leads l order by l.created_at desc limit 100`;
  return (
    <>
      <div>
        <h1>Our leads</h1>
        <p className="muted">
          Leads from our Google Sheet and dashboard (demo database). “Create in Stride” copies a lead into Mock Stride
          with the same name, birthday and phone, as if they had booked on their own. Then book them an appointment.
        </p>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Birthday</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Our status</th>
                <th>Calls/texts</th>
                <th>Added</th>
                <th>In Stride</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{l.full_name}</td>
                  <td>{l.dob || "—"}</td>
                  <td>{phone(l.phone_e164)}</td>
                  <td>{l.source_system === "google_sheets" ? "Sheet" : l.source_system}</td>
                  <td>
                    <span className={`pill ${l.status === "booked" ? "good" : l.status === "needs_attention" ? "warn" : "plain"}`}>
                      {String(l.status).replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>{l.cadence_state === "active" ? "Running" : l.cadence_state}</td>
                  <td>{when(l.created_at)}</td>
                  <td>
                    {l.mock_patient_id ? (
                      <a href={`/patients/${l.mock_patient_id}`}>Patient {l.mock_patient_id}</a>
                    ) : (
                      <form action={createPatientFromLead} className="inline">
                        <input type="hidden" name="lead_id" value={l.id} />
                        <button className="small" type="submit">
                          Create in Stride
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
