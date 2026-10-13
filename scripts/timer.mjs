// Local stand-in for the 5-minute timer: calls the export endpoint like the server cron does.
//   MOCK_STRIDE_URL=http://localhost:3100 CRON_SECRET=... npm run timer
const base = (process.env.MOCK_STRIDE_URL || "http://localhost:3100").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
const everyMs = Number(process.env.EVERY_SECONDS || 300) * 1000;
if (!secret) throw new Error("CRON_SECRET is required");

async function tick() {
  try {
    const response = await fetch(`${base}/api/cron/export`, { headers: { Authorization: `Bearer ${secret}` } });
    console.log(new Date().toISOString(), response.status, await response.text());
  } catch (error) {
    console.error(new Date().toISOString(), "timer call failed:", error.message);
  }
}

await tick();
setInterval(tick, everyMs);
