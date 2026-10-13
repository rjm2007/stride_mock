import { sendFull, sendNow, toggleAutoSend } from "./actions";
import { sql } from "@/lib/db";
import { ago, when } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const [state] = await sql`select * from mock_stride.state where id=1`;
  const [counts] = await sql`select
    (select count(*) from mock_stride.patients where deleted_at is null)::int as patients,
    (select count(*) from mock_stride.appointments where deleted_at is null
      and appt_date >= current_date and status not in ('Cancel','Late Cancel'))::int as upcoming,
    (select count(*) from mock_stride.patients where deleted_at is null and lead_id is not null)::int as from_leads,
    (select count(*) from mock_stride.exports where status='sent')::int as files_sent`;
  const exports = await sql`select * from mock_stride.exports order by id desc limit 5`;
  const last = exports[0];
  const pending = await sql`select
    (select count(*) from mock_stride.patients where modified_at > coalesce(${state.last_success_at}::timestamptz, '-infinity'::timestamptz))::int +
    (select count(*) from mock_stride.appointments where modified_at > coalesce(${state.last_success_at}::timestamptz, '-infinity'::timestamptz))::int +
    (select count(*) from mock_stride.cases where modified_at > coalesce(${state.last_success_at}::timestamptz, '-infinity'::timestamptz))::int as n`;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Mock Stride</h1>
          <p className="muted">
            Pretends to be Stride. Every 5 minutes it sends what changed here to our SFTP server, in Stride’s exact file
            format.
          </p>
        </div>
      </div>

      <section className={`notice ${last?.status === "failed" ? "bad" : state.auto_send ? "good" : "warn"}`}>
        <strong>
          {state.auto_send ? "Sending every 5 minutes is ON." : "Sending every 5 minutes is PAUSED."}
        </strong>{" "}
        Last file sent {ago(state.last_success_at)}
        {last?.status === "failed" ? ` · last attempt failed: ${last.error}` : ""} · {pending[0].n} change(s) waiting to
        be sent.
      </section>

      <div className="row">
        <form action={sendNow}>
          <button type="submit">Send changes now</button>
        </form>
        <form action={sendFull}>
          <button type="submit" className="secondary">
            Send everything again (full export)
          </button>
        </form>
        <form action={toggleAutoSend}>
          <button type="submit" className="secondary">
            {state.auto_send ? "Pause the 5-minute sending" : "Resume the 5-minute sending"}
          </button>
        </form>
      </div>

      <div className="grid">
        <div className="card stat">
          <span className="muted">Patients</span>
          <span className="n">{counts.patients}</span>
        </div>
        <div className="card stat">
          <span className="muted">Created from our leads</span>
          <span className="n">{counts.from_leads}</span>
        </div>
        <div className="card stat">
          <span className="muted">Upcoming appointments</span>
          <span className="n">{counts.upcoming}</span>
        </div>
        <div className="card stat">
          <span className="muted">Exports sent</span>
          <span className="n">{counts.files_sent}</span>
        </div>
      </div>

      <section className="card">
        <h2>Recent exports</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>How</th>
                <th>Result</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((e) => (
                <tr key={e.id}>
                  <td>{when(e.started_at)}</td>
                  <td>{e.trigger === "timer" ? "5-minute timer" : e.trigger === "full" ? "Full export" : "Button"}</td>
                  <td>
                    <span className={`pill ${e.status === "sent" ? "good" : e.status === "failed" ? "bad" : "plain"}`}>
                      {e.status === "nothing" ? "Nothing changed" : e.status === "sent" ? "Sent" : e.status}
                    </span>
                  </td>
                  <td>
                    {(e.files as { name: string; rows: number }[]).map((f) => `${f.name} (${f.rows})`).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a href="/exports">All exports →</a>
      </section>
    </>
  );
}
