"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Guide } from "@/lib/types";
import { GuideView } from "./GuideView";
import { SearchIcon } from "./AppSearch";

type LogItem = { kind: string; text: string; sub?: string[]; ok?: boolean };

const EXAMPLES = ["HubSpot", "Airtable", "Zoom", "Dropbox", "Calendly", "Strava"];

function savedCode() {
  try { return localStorage.getItem("accessCode") || ""; } catch { return ""; }
}

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
        body: JSON.stringify({ app: name.trim(), force, accessCode: code || savedCode() || undefined }),
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
          if (e.type === "search") add({ kind: "search", text: `Searched “${e.query}”` });
          if (e.type === "results") add({ kind: "results", text: `${e.urls.length} result${e.urls.length === 1 ? "" : "s"}`, sub: e.urls.map((u: any) => host(u.url)) });
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

  // Ask the server whether a code is needed, and fill in one that arrived with the link.
  useEffect(() => {
    setCode(savedCode());
    fetch("/api/generate").then((r) => r.json()).then((j) => setNeedsCode(Boolean(j.needsCode))).catch(() => {});
  }, []);

  useEffect(() => {
    const a = params.get("app");
    if (a && !started.current) { started.current = true; run(a); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searches = log.filter((l) => l.kind === "search").length;
  const reads = log.filter((l) => l.kind === "fetch" && l.ok !== false).length;

  const searchBox = (
    <div className="search-wrap">
      <form className="search" onSubmit={(e) => { e.preventDefault(); run(app, true); }}>
        <SearchIcon />
        <label htmlFor="gen-app" className="sr-only">App name or website</label>
        <input id="gen-app" value={app} onChange={(e) => setApp(e.target.value)} placeholder="App name or website" disabled={running} />
        {needsCode && <input className="code-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" aria-label="Access code" />}
        <button type="submit" className="btn btn-primary" disabled={running || !app.trim()}>
          {running ? <><span className="spinner" aria-hidden />Researching</> : guide ? "Regenerate" : "Generate guide"}
        </button>
      </form>
      {needsCode && !code && !running && (
        <p className="search-hint">Generating a guide on this demo needs the access code from the submission note.</p>
      )}
      {!running && !guide && !log.length && (
        <p className="search-hint">
          Try{" "}
          {EXAMPLES.map((x) => (
            <button key={x} className="chip-btn" onClick={() => { setApp(x); run(x); }}>{x}</button>
          ))}
        </p>
      )}
    </div>
  );

  return (
    <div className="gen">
      {!guide && (
        <section className="hero hero-sm glow-panel">
          <span className="eyebrow">Live agent</span>
          <h1>Generate a guide for any app</h1>
          <p className="hero-sub">An agent reads the provider's docs, works out the route to production, and checks its own sources. This usually takes 1–3 minutes.</p>
          {searchBox}
        </section>
      )}
      {guide && <div className="gen-bar">{searchBox}</div>}
      {(log.length > 0 || running) && (
        <details className="activity" open={!guide}>
          <summary>
            <span className={`activity-dot ${running ? "live" : error ? "err" : "ok"}`} aria-hidden />
            <span className="activity-title">{running ? "Agent at work" : error ? "Run stopped" : "Research trail"}</span>
            <span className="muted small">
              {searches} search{searches === 1 ? "" : "es"} · {reads} page{reads === 1 ? "" : "s"} read{running ? ` · ${elapsed}s` : ""}
            </span>
          </summary>
          <ol className="activity-log" aria-live="polite">
            {log.map((l, i) => (
              <li key={i} className={`a-${l.kind} ${l.ok === false ? "a-fail" : ""}`}>
                <span className="a-text">{l.text}</span>
                {l.sub && <span className="a-sub">{l.sub.join(" · ")}</span>}
              </li>
            ))}
            {running && chars > 0 && <li className="a-writing"><span className="a-text">Writing the guide, {Math.round(chars / 1000)}k characters so far</span></li>}
          </ol>
        </details>
      )}

      {error && (
        <div className="alert" role="alert">
          <strong>Generation stopped.</strong> {error}
          <p className="small">Try again, or open a <a href="/#library">guide from the library</a>.</p>
        </div>
      )}

      {guide && <GuideView guide={guide} />}
    </div>
  );
}
