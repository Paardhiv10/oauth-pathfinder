import { DIFFICULTY_LABELS, type Evidence, type Guide, type Owner } from "./types";

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : v == null ? d : String(v));

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|io|so|dev|app|ai|co|net|org)(\/.*)?$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "app";
}

function evidence(v: any): Evidence {
  const status = ["tested", "verified", "sourced", "uncertain"].includes(v?.status) ? v.status : "uncertain";
  return {
    status,
    sources: arr(v?.sources).map((s) => str(s)).filter(Boolean),
    note: v?.note ? str(v.note) : undefined,
  };
}

function owner(v: unknown): Owner {
  return v === "agent" || v === "provider" ? v : "you";
}

// Coerces model output into a well-formed Guide. Throws only if the result is unusable.
export function normalizeGuide(input: any, appName: string): Guide {
  if (!input || typeof input !== "object") throw new Error("Guide is not an object");
  const d = Math.min(5, Math.max(1, Math.round(Number(input?.verdict?.difficulty) || 3))) as Guide["verdict"]["difficulty"];
  const name = str(input.name, appName) || appName;
  const sources = arr(input.sources)
    .map((s, i) => ({
      id: str(s?.id, `s${i + 1}`) || `s${i + 1}`,
      title: str(s?.title, s?.url),
      url: str(s?.url),
      kind: (["official", "secondary", "community"].includes(s?.kind) ? s.kind : "secondary") as Guide["sources"][number]["kind"],
    }))
    .filter((s) => /^https?:\/\//.test(s.url));

  const guide: Guide = {
    slug: slugify(str(input.slug) || name),
    name,
    website: str(input.website),
    category: str(input.category, "Other"),
    mode: "generated",
    updatedAt: new Date().toISOString().slice(0, 10),
    summary: str(input.summary),
    verdict: {
      difficulty: d,
      label: DIFFICULTY_LABELS[d],
      timeToFirstConnection: str(input?.verdict?.timeToFirstConnection, "Unknown"),
      timeToProduction: str(input?.verdict?.timeToProduction, "Unknown"),
      approvalWait: str(input?.verdict?.approvalWait, "Unknown"),
      handsOnEffort: str(input?.verdict?.handsOnEffort, "Unknown"),
      confidence: (["high", "medium", "low"].includes(input?.verdict?.confidence) ? input.verdict.confidence : "low") as any,
    },
    decideFirst: arr(input.decideFirst).map((x) => ({ question: str(x?.question), guidance: str(x?.guidance), evidence: evidence(x?.evidence) })),
    phases: arr(input.phases).map((p) => ({
      name: str(p?.name),
      goal: str(p?.goal),
      duration: str(p?.duration),
      steps: arr(p?.steps).map((s) => ({
        title: str(s?.title),
        detail: str(s?.detail),
        owner: owner(s?.owner),
        url: s?.url && /^https?:\/\//.test(str(s.url)) ? str(s.url) : undefined,
        evidence: evidence(s?.evidence),
      })),
    })),
    requirements: arr(input.requirements).map((r) => ({ item: str(r?.item), requiredFor: str(r?.requiredFor), note: r?.note ? str(r.note) : undefined, evidence: evidence(r?.evidence) })),
    scopeTiers: arr(input.scopeTiers).map((t) => ({ tier: str(t?.tier), examples: str(t?.examples), consequence: str(t?.consequence), evidence: evidence(t?.evidence) })),
    blockers: arr(input.blockers).map((b) => ({ symptom: str(b?.symptom), cause: str(b?.cause), fix: str(b?.fix), evidence: evidence(b?.evidence) })),
    nuances: arr(input.nuances).map((n) => ({ title: str(n?.title), detail: str(n?.detail), evidence: evidence(n?.evidence) })),
    sources,
    verification: {
      checked: arr(input?.verification?.checked).map((x) => str(x)),
      corrected: arr(input?.verification?.corrected).map((x) => str(x)),
      unverified: arr(input?.verification?.unverified).map((x) => str(x)),
    },
    consoleUrl: /^https?:\/\//.test(str(input.consoleUrl)) ? str(input.consoleUrl) : undefined,
    docsUrl: /^https?:\/\//.test(str(input.docsUrl)) ? str(input.docsUrl) : undefined,
  };
  if (!guide.summary || guide.phases.length === 0) throw new Error("Guide is missing a summary or phases");
  return guide;
}
