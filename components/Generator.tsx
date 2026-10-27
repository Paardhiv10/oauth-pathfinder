"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Guide } from "@/lib/types";
import { GuideView } from "./GuideView";

type LogItem = { kind: string; text: string; sub?: string[]; ok?: boolean };

const EXAMPLES = ["HubSpot", "Airtable", "Zoom", "Dropbox", "Calendly", "Strava"];

function host(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}

export function Generator() {
  const params = useSearchParams();
  const [app, setApp] = useState(params.get("app") || "");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogItem[]>([]);
  const [chars, setChars] = useState(0);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const started = useRef(false);
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const add = (item: LogItem) => setLog((l) => [...l, item]);

  async function run(name: string, force = false) {
    if (!name.trim() || running) return;
    setRunning(true); setGuide(null); setError(""); setLog([]); setChars(0);
    t0.current = Date.now(); setElapsed(0);
    history.replaceState(null, "", `/generate?app=${encodeURIComponent(name.trim())}`);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: name.trim(), force, accessCode: code || undefined }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 401) setNeedsCode(true);
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) !== -1) {
          const line = buf.slice(0, i); buf = buf.slice(i + 2);
          if (!line.startsWith("data:")) continue;
          const e = JSON.parse(line.slice(5));
          if (e.type === "status") add({ kind: "status", text: e.message });
          if (e.type === "search") add({ kind: "search", text: `Searched: ${e.query}` });
          if (e.type === "results") add({ kind: "results", text: `${e.urls.length} results`, sub: e.urls.map((u: any) => host(u.url)) });
          if (e.type === "fetch") add({ kind: "fetch", text: `Reading ${e.url}` });
          if (e.type === "fetched" && !e.ok) add({ kind: "fetch", text: `Couldn't read ${e.url} (${e.error || "error"})`, ok: false });
          if (e.type === "writing") setChars(e.chars);
          if (e.type === "check") add({ kind: "check", text: e.message });
          if (e.type === "done") setGuide(e.guide);
          if (e.type === "error") setError(e.message);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    const a = params.get("app");
    if (a && !started.current) { started.current = true; run(a); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="gen">
      {!guide && (
        <section className="gen-intro">
          <h1>Generate a guide for any app</h1>
          <p className="lede">An agent reads the provider's docs, works out the path to production, and checks its own sources. This usually takes 1–3 minutes.</p>
        </section>
      )}
      <form className="search" onSubmit={(e) => { e.preventDefault(); run(app, true); }}>
        <label htmlFor="gen-app" className="sr-only">App name or website</label>
        <input id="gen-app" value={app} onChange={(e) => setApp(e.target.value)} placeholder="App name or website" disabled={running} />
        {needsCode && <input className="code-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" aria-label="Access code" />}
        <button type="submit" disabled={running || !app.trim()}>{running ? `Researching… ${elapsed}s` : guide ? "Regenerate" : "Generate guide"}</button>
      </form>
      {!running && !guide && !log.length && (
        <p className="examples">Try: {EXAMPLES.map((x) => <button key={x} className="link" onClick={() => { setApp(x); run(x); }}>{x}</button>)}</p>
      )}

      {(log.length > 0 || running) && (
        <section className={`trail ${guide ? "trail-done" : ""}`} aria-live="polite">
          <h2>{guide ? "What the agent did" : "Agent at work"}</h2>
          <ol>
            {log.map((l, i) => (
              <li key={i} className={`t-${l.kind} ${l.ok === false ? "t-fail" : ""}`}>
                {l.text}
                {l.sub && <span className="t-sub">{l.sub.join(", ")}</span>}
              </li>
            ))}
            {running && chars > 0 && <li className="t-writing">Writing the guide… {Math.round(chars / 1000)}k characters</li>}
            {running && <li className="t-pending">Working</li>}
          </ol>
        </section>
      )}

      {error && (
        <div className="error-box" role="alert">
          <strong>Generation stopped.</strong> {error}
          <div>Try again, or pick a <a href="/#library">curated guide</a>.</div>
        </div>
      )}

      {guide && <GuideView guide={guide} />}
    </div>
  );
}
