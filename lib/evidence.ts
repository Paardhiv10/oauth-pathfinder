import type { Evidence, Guide } from "./types";

export interface RetrievalLog {
  queries: string[];
  searchResults: Set<string>;
  fetched: Set<string>;
}

export function normUrl(u: string) {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "").replace(/\.md$/, "")).toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

function lookup(url: string, log: RetrievalLog): "fetched" | "search-result" | "not-retrieved" {
  const n = normUrl(url);
  const match = (set: Set<string>) => [...set].some((s) => {
    const m = normUrl(s);
    return m === n || m.startsWith(n) || n.startsWith(m);
  });
  if (match(log.fetched)) return "fetched";
  if (match(log.searchResults)) return "search-result";
  return "not-retrieved";
}

/**
 * Deterministic evidence check run on every generated guide:
 *  1. Mark each cited source as fetched / seen in search / never retrieved by the agent.
 *  2. "verified" requires at least one OFFICIAL source the agent actually retrieved; otherwise -> "sourced".
 *  3. Claims whose only sources were never retrieved (possible hallucinated URL) -> "uncertain".
 *  4. Claims with no sources at all can't be better than "uncertain".
 *  5. "tested" is reserved for things this app actually ran (link probes), so model-claimed "tested" -> "verified" (then re-checked).
 */
export function applyEvidenceCheck(guide: Guide, log: RetrievalLog) {
  const sources = guide.sources.map((s) => ({ ...s, retrieved: lookup(s.url, log) }));
  const byId = new Map(sources.map((s) => [s.id, s]));
  let downgradedToSourced = 0;
  let downgradedToUncertain = 0;
  let total = 0;

  const check = (e: Evidence): Evidence => {
    total++;
    const next: Evidence = { ...e, sources: (e.sources || []).filter((id) => byId.has(id)) };
    if (next.status === "tested") next.status = "verified";
    const cited = next.sources!.map((id) => byId.get(id)!);
    const retrieved = cited.filter((s) => s.retrieved !== "not-retrieved");
    if (next.status !== "uncertain" && cited.length === 0) {
      next.status = "uncertain";
      next.note = [next.note, "No source cited"].filter(Boolean).join(" · ");
      downgradedToUncertain++;
    } else if (next.status !== "uncertain" && retrieved.length === 0) {
      next.status = "uncertain";
      next.note = [next.note, "Cited source was never retrieved by the agent"].filter(Boolean).join(" · ");
      downgradedToUncertain++;
    } else if (next.status === "verified" && !retrieved.some((s) => s.kind === "official")) {
      next.status = "sourced";
      next.note = [next.note, "No official page retrieved for this claim"].filter(Boolean).join(" · ");
      downgradedToSourced++;
    }
    return next;
  };

  const g: Guide = {
    ...guide,
    sources,
    decideFirst: guide.decideFirst.map((x) => ({ ...x, evidence: check(x.evidence) })),
    phases: guide.phases.map((p) => ({ ...p, steps: p.steps.map((s) => ({ ...s, evidence: check(s.evidence) })) })),
    requirements: guide.requirements.map((r) => ({ ...r, evidence: check(r.evidence) })),
    scopeTiers: guide.scopeTiers?.map((t) => ({ ...t, evidence: check(t.evidence) })),
    blockers: guide.blockers.map((b) => ({ ...b, evidence: check(b.evidence) })),
    nuances: guide.nuances.map((n) => ({ ...n, evidence: check(n.evidence) })),
    verification: { ...guide.verification, corrected: [...guide.verification.corrected] },
  };

  const unretrieved = sources.filter((s) => s.retrieved === "not-retrieved");
  if (downgradedToSourced + downgradedToUncertain > 0) {
    g.verification.corrected.push(
      `Automated evidence check downgraded ${downgradedToSourced + downgradedToUncertain} of ${total} claims (${downgradedToSourced} to "sourced", ${downgradedToUncertain} to "uncertain") because the agent had not actually retrieved an official source for them.`
    );
  }
  if (unretrieved.length) {
    g.verification.unverified.push(
      `${unretrieved.length} cited source(s) were not seen by the agent during research and may be from memory: ${unretrieved.map((s) => s.title).join("; ")}`
    );
  }
  const summary = `Evidence check: ${total} claims · ${downgradedToSourced} → sourced · ${downgradedToUncertain} → uncertain · ${unretrieved.length} unretrieved source(s)`;
  return { guide: g, summary };
}
