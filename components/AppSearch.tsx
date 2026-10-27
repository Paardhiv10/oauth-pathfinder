"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { slug: string; name: string; website: string };

export function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AppSearch({ names }: { names: Item[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const norm = (s: string) => s.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").trim();
  const nq = norm(q);
  const matches = nq ? names.filter((n) => norm(n.name).includes(nq) || norm(n.website).includes(nq) || n.slug.includes(nq)) : [];

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nq) return;
    if (matches.length === 1) router.push(`/apps/${matches[0].slug}`);
    else router.push(`/generate?app=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="search-wrap">
      <form className="search" onSubmit={go} role="search">
        <SearchIcon />
        <label htmlFor="app" className="sr-only">App name or website</label>
        <input id="app" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search an app, e.g. HubSpot or airtable.com" autoComplete="off" />
        <button type="submit" className="btn btn-primary">{matches.length === 1 ? "Open guide" : "Generate guide"}</button>
      </form>
      {nq && (
        <p className="search-hint">
          {matches.length > 0 ? (
            <>
              In the library:{" "}
              {matches.map((m) => <a key={m.slug} href={`/apps/${m.slug}`}>{m.name}</a>)}
              <span className="muted"> · or </span>
              <a href={`/generate?app=${encodeURIComponent(q.trim())}`}>generate a fresh guide</a>
            </>
          ) : (
            <>Not in the library. The agent will research “{q.trim()}” live, which takes about 1–3 minutes.</>
          )}
        </p>
      )}
    </div>
  );
}
