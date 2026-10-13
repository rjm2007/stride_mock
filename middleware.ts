import { NextResponse, type NextRequest } from "next/server";

// The whole app is behind one password (Basic auth, any username). The timer
// endpoint uses its own bearer secret instead, so it can run unattended.
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/cron/")) return NextResponse.next();
  const password = process.env.MOCK_STRIDE_PASSWORD;
  if (!password) return new NextResponse("MOCK_STRIDE_PASSWORD is not set", { status: 503 });
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
    } catch {
      // fall through to the challenge
    }
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Mock Stride"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
