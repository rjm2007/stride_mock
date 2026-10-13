# Mock Stride (test tool)

Pretends to be the Stride EHR so we can test our SFTP import end to end without real patient data.
Staff add fake patients and appointments in a small web app; every 5 minutes it uploads the changes as
Stride-format CSV files to our real SFTP server (`stride@<our SFTP server>:/incoming`), which the backend's
`stride-worker` imports into the **demo** database.

- Live: https://mock-stride.vercel.app (Vercel project `mock-stride`, team "nuriq"). Password = `MOCK_STRIDE_PASSWORD`.
- Data: schema `mock_stride` in the **demo** Supabase project (`sql/schema.sql`). Reads `public.leads`,
  `public.stride_import_files`, `public.service_heartbeats`, `public.stride_patients` for its screens.
- Timer: `/etc/cron.d/mock-stride-timer` on the EC2 server calls `GET /api/cron/export` every 5 minutes with
  `Authorization: Bearer $CRON_SECRET` (header file `/root/.mock-stride-cron-header`). Delete both to stop.
- SFTP login: our own test key (`.secrets/sftp_key`, never committed) in `/home/stride/.ssh/authorized_keys`
  next to Stride's real key later. Remove the `mock-stride-test-key` line when testing ends.

## Files

| Path | What |
| --- | --- |
| `lib/export.ts` | Builds one export: rows changed since the last successful one (or everything), Stride columns, Delete rows without Appointment Id (like Stride), watermark only moves on success |
| `lib/csv.ts` | Exact Stride headers, CSV escaping, `<type>_<YYYYMMDDHHMMSS>.csv` names (UTC) |
| `lib/sftp.ts` | Upload as `.part`, then rename; verifies the server fingerprint when `SFTP_HOST_FINGERPRINT` is set |
| `app/actions.ts` | Everything the buttons do (create from lead, book, status, move, delete, send now/full, pause) |
| `app/*/page.tsx` | Overview, Our leads, Patients, patient page, Files sent, Our server, Test cases |
| `middleware.ts` | Basic auth for the app; `/api/cron/*` uses the bearer secret instead |
| `scripts/timer.mjs` | Local 5-minute timer when running on a laptop |

## Run locally

```bash
cp .env.example .env.local   # fill in; values for the team are in .secrets/ (not committed)
npm install && npm run build && npm start      # http://localhost:3100
MOCK_STRIDE_URL=http://localhost:3100 CRON_SECRET=... npm run timer
```

## Deploy

Code lives in GitHub `rjm2007/stride_mock` (branch `main`); Vercel project `mock-stride` builds from it.
Env vars live only in the Vercel project settings (values for the team are in `.secrets/`, never committed).
After changing env vars, redeploy.

## Rules

- Test data only (fake names, 555 numbers, `@example.test`). Never point it at the production database.
- Things it does to our system are real: a lead copied in and booked gets marked booked on the demo server
  and its calls/texts stop.
