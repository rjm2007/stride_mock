import { createPatient } from "../actions";
import { sql } from "@/lib/db";
import { phone, when } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Patients() {
  const patients = await sql`select p.*, p.date_of_birth::text as dob,
      (select count(*) from mock_stride.appointments a where a.patient_id=p.id and a.deleted_at is null)::int as appts,
      l.full_name as lead_name
    from mock_stride.patients p left join public.leads l on l.id=p.lead_id
    order by p.deleted_at nulls first, p.id desc`;
  return (
    <>
      <div>
        <h1>Patients</h1>
        <p className="muted">
          People in Mock Stride. Add a walk-in here, or use “Our leads” to copy one of our leads in.
        </p>
      </div>

      <section className="card">
        <h2>Add a walk-in patient</h2>
        <form action={createPatient} className="stack">
          <label>
            First name
            <input name="first_name" required />
          </label>
          <label>
            Last name
            <input name="last_name" required />
          </label>
          <label>
            Birthday
            <input name="date_of_birth" type="date" />
          </label>
          <label>
            Gender
            <select name="gender" defaultValue="">
              <option value="">—</option>
              <option value="F">F</option>
              <option value="M">M</option>
              <option value="O">O</option>
            </select>
          </label>
          <label>
            Mobile phone
            <input name="mobile_phone" placeholder="(561) 555-0100" />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="name@example.test" />
          </label>
          <label>
            Address
            <input name="address_1" />
          </label>
          <label>
            City
            <input name="city" />
          </label>
          <label>
            State
            <input name="state" maxLength={2} placeholder="CA" />
          </label>
          <label>
            Zip
            <input name="zip" />
          </label>
          <div>
            <button type="submit">Add patient</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>All patients</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stride id</th>
                <th>Name</th>
                <th>Birthday</th>
                <th>Phone</th>
                <th>From our lead</th>
                <th>Appointments</th>
                <th>Changed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className="num">{p.id}</td>
                  <td>
                    {p.first_name} {p.last_name} {p.deleted_at ? <span className="pill bad">Deleted</span> : null}
                  </td>
                  <td>{p.dob || "—"}</td>
                  <td>{phone(p.mobile_phone)}</td>
                  <td>{p.lead_name || "—"}</td>
                  <td className="num">{p.appts}</td>
                  <td>{when(p.modified_at)}</td>
                  <td>
                    <a href={`/patients/${p.id}`}>Open</a>
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
