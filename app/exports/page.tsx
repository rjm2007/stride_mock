import { sql } from "@/lib/db";
import { when } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Exports() {
  const exports = await sql`select * from mock_stride.exports order by id desc limit 100`;
  return (
    <>
      <div>
        <h1>Files sent</h1>
        <p className="muted">
          Every export Mock Stride made. “Nothing changed” means no file was needed. The number after each file is its row
          count.
        </p>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Started</th>
                <th>How</th>
                <th>Changes since</th>
                <th>Result</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((e) => (
                <tr key={e.id}>
                  <td className="num">{e.id}</td>
                  <td>{when(e.started_at)}</td>
                  <td>{e.trigger === "timer" ? "5-minute timer" : e.trigger === "full" ? "Full export" : "Button"}</td>
                  <td>{e.since ? when(e.since) : "Everything"}</td>
                  <td>
                    <span className={`pill ${e.status === "sent" ? "good" : e.status === "failed" ? "bad" : "plain"}`}>
                      {e.status === "nothing" ? "Nothing changed" : e.status === "sent" ? "Sent" : e.status}
                    </span>
                    {e.error ? <div className="muted">{e.error}</div> : null}
                  </td>
                  <td>
                    {(e.files as { name: string; rows: number }[]).map((f) => (
                      <div key={f.name}>
                        <code>{f.name}</code> ({f.rows})
                      </div>
                    ))}
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
