export const dynamic = "force-static";

type Case = { id: string; title: string; steps: string[]; expect: string[] };

// Short version of the full test plan (Stride Sync Test Plan, same case ids). Keep both in step.
const CASES: Case[] = [
  {
    id: "B",
    title: "A Sheet lead books in Stride",
    steps: [
      "Add leads to the test Google Sheet (Action = Start cadence, birthday filled). Use a US number that can receive texts: texts to +91 numbers fail and pause the lead for review.",
      "Here: Our leads → “Create in Stride” on each, then book an Initial Evaluation on a future date.",
      "Overview → “Send changes now” (it waits a few seconds by itself), then wait 1–2 minutes.",
    ],
    expect: [
      "Our server → each lead: matched, booked, 0 planned calls/texts left.",
      "Dashboard: Booked column. Google Sheet: Booked. No more calls or texts.",
    ],
  },
  {
    id: "C1–C2",
    title: "Confirmed or moved visit",
    steps: ["Set a booked visit to Confirmed, or Move it to another future day/time. Send."],
    expect: ["The lead stays Booked. Our server: 1 change, no issues."],
  },
  {
    id: "C3–C8",
    title: "Cancel, Late Cancel, No Show, Delete",
    steps: [
      "On a booked lead’s visit choose Cancel, Late Cancel or No Show (Save), or press Delete. Send.",
      "Wait 6 more minutes and check again.",
    ],
    expect: [
      "Needs attention with the matching reason: “Cancelled in Stride”, “Late cancel in Stride”, “No show in Stride” or “Appointment removed in Stride”.",
      "Sheet: Outcome Status “Needs review: …” and the Action cell emptied. Calls/texts do NOT restart.",
      "Six minutes later nothing has flipped back to Booked.",
    ],
  },
  {
    id: "C5",
    title: "Patient rebooks",
    steps: ["After a cancel / no-show / delete, book a new future visit for the same patient. Send."],
    expect: ["The lead is Booked again; the Needs attention note disappears."],
  },
  {
    id: "C9",
    title: "Patient came (Checked In)",
    steps: ["Book a new future visit and set it to Checked In. Send."],
    expect: ["The lead stays (or becomes) Booked. Later used for Keap’s Completed tag."],
  },
  {
    id: "C10–C11",
    title: "Staff re-book from the Sheet after a cancel",
    steps: [
      "After a cancel: in the Sheet set Action = Booked and clear the Outcome Status cell.",
      "Later, book and cancel another visit here.",
    ],
    expect: ["The lead is Booked and stays Booked. A newer cancel is still flagged."],
  },
  {
    id: "Rule",
    title: "Two visits at the same time are refused",
    steps: ["Book (or Move) a visit into a date and time the same patient already has."],
    expect: ["A red message: “Stride does not allow this … Pick another time.” Nothing is saved (real Stride refuses it too)."],
  },
  {
    id: "A7",
    title: "The same booked person added to the Sheet again",
    steps: ["Add a new Sheet row with the same name, phone and birthday as a Booked lead."],
    expect: ["Sheet: “Already booked”, no Lead ID, no call. (A different birthday counts as a new referral.)"],
  },
  {
    id: "D",
    title: "Matching edge cases",
    steps: [
      "One-word Sheet name; a visit booked for yesterday; a walk-in added under Patients; two Sheet leads with the same name and birthday but different phones; a patient with the same name but another birthday; a patient added here without a birthday but with the lead’s phone.",
    ],
    expect: [
      "Booked / not booked (past visit) / unmatched / ambiguous (nobody booked) / unmatched / booked by name + phone.",
    ],
  },
  {
    id: "E",
    title: "Files",
    steps: [
      "Make a change and do not press Send: wait up to 7 minutes.",
      "Overview → “Send everything again”.",
    ],
    expect: [
      "Files sent shows a “5-minute timer” row and the change arrives.",
      "The full re-send loads with 0 changes and no lead changes status.",
    ],
  },
];

export default function Tests() {
  return (
    <>
      <div>
        <h1>Test cases</h1>
        <p className="muted">
          Short version of the full Stride Sync Test Plan (same case ids; ask Rudraksh for the link). Files go out every 5 minutes
          or with “Send changes now”; our server reads them 1–2 minutes later. Check results in “Our server” here, in the staff
          dashboard and in the Google Sheet.
        </p>
      </div>
      {CASES.map((c) => (
        <section className="card" key={c.title}>
          <h2>
            <span className="muted">{c.id} · </span>
            {c.title}
          </h2>
          <div className="grid">
            <div>
              <strong>Do</strong>
              <ol className="steps">
                {c.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
            <div>
              <strong>Expect</strong>
              <ul className="steps">
                {c.expect.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
