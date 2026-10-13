export const dynamic = "force-static";

type Case = { title: string; steps: string[]; expect: string[] };

const CASES: Case[] = [
  {
    title: "1. A Sheet lead books on their own",
    steps: [
      "Add 5 leads to the test Google Sheet (use team phone numbers; real calls/texts go out).",
      "Wait until they appear under “Our leads” here and calls/texts are running.",
      "For 2 of them: “Create in Stride”, then book an Initial Evaluation tomorrow.",
      "Wait up to 5 minutes for the file, then 1–2 minutes for our server.",
    ],
    expect: [
      "“Our server” → those 2 leads: Matched, booked, 0 planned calls/texts left.",
      "Google Sheet shows Booked for them.",
      "No more calls or texts to those 2 numbers.",
    ],
  },
  {
    title: "2. Leads that did not book carry on",
    steps: ["Leave the other 3 leads alone."],
    expect: ["They stay in their normal calls/texts; status unchanged."],
  },
  {
    title: "3. A walk-in who is not one of our leads",
    steps: ["Patients → add a new patient with a made-up name, book a Follow-up."],
    expect: ["“Our server” shows the files loaded.", "No lead changes anywhere."],
  },
  {
    title: "4. A booked lead cancels",
    steps: ["Open a booked lead’s patient page, set the visit to Cancel, Save."],
    expect: [
      "After the next file: the lead shows “needs attention” with “Stride appointment cancelled”.",
      "Calls/texts do NOT restart (0 planned).",
    ],
  },
  {
    title: "5. A visit is deleted instead of cancelled",
    steps: ["Book another lead, wait for “booked”, then Delete the visit."],
    expect: [
      "Same as test 4. (Stride sends deletes without the appointment id; our server finds it by date and time.)",
    ],
  },
  {
    title: "6. A visit is moved",
    steps: ["Move a booked lead’s visit to another day/time."],
    expect: ["The lead stays booked.", "Our server shows an Appointments file with 1 change."],
  },
  {
    title: "7. A patient is checked in",
    steps: ["Set a visit to Checked In."],
    expect: ["File loaded with 1 change; the lead stays booked (used later for Keap’s Completed tag)."],
  },
  {
    title: "8. A visit in the past does not count",
    steps: ["Copy a new lead into Stride and book a visit for yesterday."],
    expect: ["The lead is matched but NOT marked booked; calls/texts continue."],
  },
  {
    title: "9. Patient details change",
    steps: ["Change a patient’s mobile number, Save."],
    expect: ["A Patients file with 1 change is loaded; nothing else happens to the lead."],
  },
  {
    title: "10. Manual send and re-send",
    steps: [
      "Overview → Pause the 5-minute sending, make a change, press “Send changes now”.",
      "Then press “Send everything again”.",
    ],
    expect: [
      "The manual send arrives within a minute.",
      "The full re-send is loaded with 0 changes (our server ignores what it already has).",
      "Resume the 5-minute sending afterwards.",
    ],
  },
];

export default function Tests() {
  return (
    <>
      <div>
        <h1>Test cases</h1>
        <p className="muted">
          For the test session. Times: files go out every 5 minutes (or press “Send changes now”); our server reads them 1–2 minutes
          later. Write down what you see next to each case.
        </p>
      </div>
      {CASES.map((c) => (
        <section className="card" key={c.title}>
          <h2>{c.title}</h2>
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
