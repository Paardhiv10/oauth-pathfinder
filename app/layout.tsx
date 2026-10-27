import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OAuth Pathfinder",
  description: "How hard is it to get an OAuth app approved? Setup and approval guides for agent builders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="top">
          <Link href="/" className="brand"><span className="brand-mark" aria-hidden />OAuth Pathfinder</Link>
          <span className="top-links">
            <Link href="/#library">Library</Link>
            <Link href="/generate">Generate a guide</Link>
          </span>
        </nav>
        <main>{children}</main>
        <footer className="foot">
          Guides describe provider requirements as of their date. Check the linked official sources before you submit anything.
        </footer>
      </body>
    </html>
  );
}
