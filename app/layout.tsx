import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Mock Stride", description: "Test stand-in for Stride's SFTP exports" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="inner">
            <a className="brand" href="/">
              Mock Stride<small>TEST DATA ONLY</small>
            </a>
            <nav aria-label="Main">
              <a href="/">Overview</a>
              <a href="/leads">Our leads</a>
              <a href="/patients">Patients</a>
              <a href="/exports">Files sent</a>
              <a href="/server">Our server</a>
              <a href="/tests">Test cases</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
