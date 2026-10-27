"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { slug: string; name: string; website: string };

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
    <form className="search" onSubmit={go}>
      <label htmlFor="app" className="sr-only">App name or website</label>
      <input id="app" value={q} onChange={(e) => setQ(e.target.value)} placeholder="App name or website, e.g. HubSpot, airtable.com" autoComplete="off" />
      <button type="submit">{matches.length === 1 ? "Open guide" : "Generate guide"}</button>
      {nq && (
        <div className="search-hint">
          {matches.length > 0 ? (
            <>In the library: {matches.map((m) => <a key={m.slug} href={`/apps/${m.slug}`}>{m.name}</a>)} · or{" "}
              <a href={`/generate?app=${encodeURIComponent(q.trim())}`}>generate a fresh one</a></>
          ) : (
            <>Not in the library yet. The agent will research “{q.trim()}” live (about 1–3 minutes).</>
          )}
        </div>
      )}
    </form>
  );
}
