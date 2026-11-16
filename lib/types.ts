// Guide schema shared by curated guides (data/guides/*.json) and agent-generated guides.

export type EvidenceStatus = "tested" | "verified" | "sourced" | "uncertain";
// tested = actually attempted · verified = read on an official page · sourced = secondary source
// or an official page that was not retrieved · uncertain = inferred or conflicting

export interface Evidence {
  status: EvidenceStatus;
  sources?: string[]; // ids from Guide.sources
  note?: string;
}

export type Owner = "agent" | "you" | "provider";
// Who does the step: an AI agent, a human with account access or authority, or the provider's review.

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

// Whether Composio already provides an OAuth app for this provider. Looked up in a dated snapshot
// of Composio's directory by the server, never claimed by the model.
export interface ManagedAuth {
  status: "managed" | "byo" | "not-listed";
  // managed = Composio provides the app · byo = bring your own app · not-listed = not in the directory
  toolkit?: string; // the directory entry this app was matched to
  slug?: string;
  url: string;
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
  managedAuth?: ManagedAuth;
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
