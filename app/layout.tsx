import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "OAuth Pathfinder",
  description: "How hard is it to get an OAuth app approved? Setup and approval guides for agent builders.",
};

// Runs before first paint: applies the saved theme, and moves an access code from the link
// (?code=...) into this browser's storage so the reviewer never has to type it.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;var u=new URL(location.href),c=u.searchParams.get("code");if(c){localStorage.setItem("accessCode",c);u.searchParams.delete("code");history.replaceState(null,"",u.pathname+u.search+u.hash);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="nav">
          <div className="nav-inner">
            <Link href="/" className="brand">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                <circle cx="6" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
                <path d="M10 12h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M16 12v4M20 12v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              OAuth Pathfinder
            </Link>
            <nav className="nav-links" aria-label="Main">
              <Link href="/#library" className="nav-hide-sm">Library</Link>
              <Link href="/generate">Generate</Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="page">{children}</main>
        <footer className="footer">
          <div className="footer-inner">
            Guides describe provider requirements as of their date. Check the linked official sources before you submit anything.
          </div>
        </footer>
      </body>
    </html>
  );
}
