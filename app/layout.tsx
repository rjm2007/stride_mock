import Link from "next/link";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Mock Stride", description: "Test stand-in for Stride's SFTP exports" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="inner">
            <Link className="brand" href="/">
              Mock Stride<small>TEST DATA ONLY</small>
            </Link>
            <nav aria-label="Main">
              <Link href="/">Overview</Link>
              <Link href="/leads">Our leads</Link>
              <Link href="/patients">Patients</Link>
              <Link href="/exports">Files sent</Link>
              <Link href="/server">Our server</Link>
              <Link href="/tests">Test cases</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
