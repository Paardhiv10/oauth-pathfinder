// Guide schema shared by curated guides (data/guides/*.json) and agent-generated guides.

export type EvidenceStatus = "tested" | "verified" | "sourced" | "uncertain";
// tested    = a step was actually attempted (e.g. a URL was probed, a flow was run)
// verified  = the claim matches text on an official provider page retrieved during research (fetched, or a search excerpt)
// sourced   = backed by a secondary source, or an official page the researcher did not actually retrieve
// uncertain = inferred, conflicting sources, or community reports only

export interface Evidence {
  status: EvidenceStatus;
  sources?: string[]; // ids from Guide.sources
  note?: string;
}

export type Owner = "agent" | "you" | "provider";
// agent    = an AI agent can do this for you (research, drafting, config, code, testing)
// you      = needs a human with account access, legal authority, or a decision
// provider = waiting on the provider (review, approval)

export interface Step {
  title: string;
  detail: string;
  owner: Owner;
  url?: string;
  evidence: Evidence;
}

export interface Phase {
  name: string;
  goal: string;
  duration: string;
  steps: Step[];
}

export interface Requirement {
  item: string;
  requiredFor: string; // e.g. "Production", "Public distribution", "Always"
  note?: string;
  evidence: Evidence;
}

export interface Blocker {
  symptom: string;
  cause: string;
  fix: string;
  evidence: Evidence;
}

export interface Nuance {
  title: string;
  detail: string;
  evidence: Evidence;
}

export interface ScopeTier {
  tier: string;
  examples: string;
  consequence: string;
  evidence: Evidence;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  kind: "official" | "secondary" | "community";
  retrieved?: "fetched" | "search-result" | "not-retrieved";
}

export interface LinkCheck {
  url: string;
  label: string;
  status: number | null;
  result: "reachable" | "redirect" | "login-wall" | "blocked" | "not-found" | "error";
  finalUrl?: string;
  checkedAt: string;
}

export interface Guide {
  slug: string;
  name: string;
  website: string;
  category: string;
  mode: "curated" | "generated";
  updatedAt: string;
  summary: string; // the bottom line, 1-2 sentences
  verdict: {
    difficulty: 1 | 2 | 3 | 4 | 5;
    label: "Instant" | "Easy" | "Moderate" | "Hard" | "Gated";
    timeToFirstConnection: string; // you can connect your own account
    timeToProduction: string; // any user can connect
    approvalWait: string;
    handsOnEffort: string;
    confidence: "high" | "medium" | "low";
  };
  decideFirst: { question: string; guidance: string; evidence: Evidence }[];
  phases: Phase[];
  requirements: Requirement[];
  scopeTiers?: ScopeTier[];
  blockers: Blocker[];
  nuances: Nuance[];
  sources: Source[];
  verification: {
    checked: string[];
    corrected: string[];
    unverified: string[];
  };
  linkChecks?: LinkCheck[];
  consoleUrl?: string;
  docsUrl?: string;
}

export const DIFFICULTY_LABELS: Record<number, Guide["verdict"]["label"]> = {
  1: "Instant",
  2: "Easy",
  3: "Moderate",
  4: "Hard",
  5: "Gated",
};
