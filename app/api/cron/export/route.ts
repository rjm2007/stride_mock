import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { runExport } from "@/lib/export";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

// Called every 5 minutes by a timer (cron on our server, or scripts/timer.mjs locally).
async function handle(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [state] = await sql`select auto_send from mock_stride.state where id=1`;
  if (!state?.auto_send) return NextResponse.json({ status: "paused" });
  const result = await runExport("timer");
  return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
}

export const GET = handle;
export const POST = handle;
