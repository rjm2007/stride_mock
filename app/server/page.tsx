import Link from "next/link";
import { sql } from "@/lib/db";
import { ago, when } from "@/lib/format";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = {
  patients: "Patients",
  patient_cases: "Cases",
  appointments: "Appointments",
  users: "Clinicians",
  locations: "Locations",
  unknown: "Unrecognized",
};

// Read-only view of what our backend did with the files (same demo database).
export default async function ServerView() {
  const [beat] = await sql`select last_seen_at, details from public.service_heartbeats where service='stride-worker'`;
  const files = await sql`select file_name, entity, status, row_count, applied_count, unchanged_count, issue_count,
      error, received_at, processed_at from public.stride_import_files order by received_at desc, id desc limit 30`;
  const leads = await sql`select l.full_name, l.status, l.cadence_state, l.needs_review, l.review_reason, l.status_changed_at,
      (select count(*) from public.outreach_events o where o.lead_id=l.id and o.status='planned')::int as planned,
      p.id as mock_patient_id, sp.lead_match_status
    from mock_stride.patients p join public.leads l on l.id=p.lead_id
    left join public.stride_patients sp on sp.stride_id=p.id
    where p.deleted_at is null order by l.status_changed_at desc nulls last`;
  const details = (beat?.details ?? {}) as Record<string, unknown>;
  const alive = beat && Date.now() - new Date(beat.last_seen_at).getTime() < 5 * 60000;

  return (
    <>
      <div>
        <h1>Our server</h1>
        <p className="muted">What our backend did with the files Mock Stride sent (read from the demo database).</p>
      </div>

      <section className={`notice ${!beat ? "warn" : !alive ? "bad" : details.enabled ? "good" : "warn"}`}>
        {!beat
          ? "Our import service has never reported in."
          : !alive
            ? `Our import service has not reported in since ${when(beat.last_seen_at)}.`
            : details.enabled
              ? `Our import service is running and ON (last check ${ago(beat.last_seen_at)}). Files waiting in the SFTP inbox: ${details.inbox_waiting ?? 0}.`
              : "Our import service is running but switched OFF (STRIDE_IMPORT_ENABLED=false): files will wait in the inbox."}
      </section>

      <section className="card">
        <h2>Our leads that were copied into Stride</h2>
        <p className="muted">
          Expected: a future, non-cancelled visit → <strong>booked</strong> and no planned calls/texts. A cancelled booking →{" "}
          <strong>needs attention</strong>.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Stride patient</th>
                <th>Matched?</th>
                <th>Our status</th>
                <th>Calls/texts</th>
                <th>Planned calls/texts left</th>
                <th>Review note</th>
                <th>Status changed</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.mock_patient_id}>
                  <td>{l.full_name}</td>
                  <td className="num">
                    <Link href={`/patients/${l.mock_patient_id}`}>{l.mock_patient_id}</Link>
                  </td>
                  <td>
                    {l.lead_match_status ? (
                      <span className={`pill ${l.lead_match_status === "matched" ? "good" : "warn"}`}>{l.lead_match_status}</span>
                    ) : (
                      <span className="pill plain">not received yet</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${l.status === "booked" ? "good" : l.status === "needs_attention" ? "warn" : "plain"}`}>
                      {String(l.status).replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>{l.cadence_state}</td>
                  <td className="num">{l.planned}</td>
                  <td>{l.needs_review ? l.review_reason : "—"}</td>
                  <td>{when(l.status_changed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Files our server received</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Received</th>
                <th>File</th>
                <th>Type</th>
                <th>Result</th>
                <th>Rows</th>
                <th>Changed</th>
                <th>Skipped/notes</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={`${f.file_name}-${f.received_at}`}>
                  <td>{when(f.received_at)}</td>
                  <td>
                    <code>{f.file_name}</code>
                  </td>
                  <td>{KIND[f.entity] ?? f.entity}</td>
                  <td>
                    <span className={`pill ${f.status === "processed" ? "good" : f.status === "rejected" ? "bad" : "warn"}`}>
                      {f.status === "processed" ? "Loaded" : f.status === "rejected" ? "Not loaded" : f.status}
                    </span>
                    {f.error ? <div className="muted">{f.error}</div> : null}
                  </td>
                  <td className="num">{f.row_count}</td>
                  <td className="num">{f.applied_count}</td>
                  <td className="num">{f.issue_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
