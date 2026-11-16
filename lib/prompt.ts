const GUIDE_SCHEMA = `
type EvidenceStatus = "verified" | "sourced" | "uncertain";
// verified  = you read the claim on an OFFICIAL provider page in this session (fetched it, or the search excerpt states it)
// sourced   = backed by a secondary source (integration platforms, assessor blogs) or by an official page you did not read
// uncertain = inferred, conflicting sources, community reports only, or your own background knowledge
interface Evidence { status: EvidenceStatus; sources?: string[] /* ids from sources[] */; note?: string }
type Owner = "agent" | "you" | "provider";
// agent = an AI agent can do it (research, drafting policy text/justifications/scripts, writing config & code, testing flows)
// you = needs a human with account access, legal/business authority, a signature, DNS/domain control, or a recording
// provider = waiting on the provider (review/approval)
interface Guide {
  slug: string;              // kebab-case
  name: string;              // e.g. "HubSpot"
  website: string;           // provider homepage
  category: string;          // e.g. "CRM"
  mode: "generated";
  updatedAt: string;         // YYYY-MM-DD (today)
  summary: string;           // 2-3 sentence bottom line a developer can act on. Lead with how hard + the one thing that decides it.
  verdict: {
    difficulty: 1|2|3|4|5;   // 1 Instant (no review), 2 Easy (self-serve, maybe a toggle), 3 Moderate (verification/consent hurdles, no long wait), 4 Hard (formal review/security assessment, weeks), 5 Gated (partner/business vetting at provider discretion)
    label: "Instant"|"Easy"|"Moderate"|"Hard"|"Gated";
    timeToFirstConnection: string; // developer connects their own account
    timeToProduction: string;      // any external user can connect
    approvalWait: string;          // provider-side wait, with what the provider officially says vs what is reported
    handsOnEffort: string;
    confidence: "high"|"medium"|"low";
  };
  decideFirst: { question: string; guidance: string; evidence: Evidence }[]; // 2-3 decisions that change the path (app type, scopes, single vs multi tenant...)
  phases: { name: string /* "1 · ..." */; goal: string; duration: string;
            steps: { title: string; detail: string; owner: Owner; url?: string; evidence: Evidence }[] }[]; // 2-4 phases, 2-5 steps each
  requirements: { item: string; requiredFor: string; note?: string; evidence: Evidence }[];
  scopeTiers?: { tier: string; examples: string; consequence: string; evidence: Evidence }[]; // only if scopes change the review path
  blockers: { symptom: string; cause: string; fix: string; evidence: Evidence }[]; // real error messages where known
  nuances: { title: string; detail: string; evidence: Evidence }[]; // token lifetimes, refresh behavior, redirect URI rules, per-user vs per-workspace auth, rate limits
  sources: { id: string; title: string; url: string; kind: "official"|"secondary"|"community" }[];
  verification: { checked: string[]; corrected: string[]; unverified: string[] };
  consoleUrl?: string;       // where the developer registers the app
  docsUrl?: string;          // the single best official OAuth/app-registration doc
}`;

export function systemPrompt(today: string) {
  return `You are an integrations researcher. A developer building an AI agent wants their users to connect a third-party app via OAuth. Your job: investigate how to create and get approval for an OAuth app with that provider, and produce a guide the developer can follow and share without further explanation.

Today is ${today}.

How to investigate (use your web_search and web_fetch tools):
1. Find the provider's OFFICIAL docs for: registering an OAuth app/client, redirect URI rules, scopes/permissions, token lifetimes/refresh, and any app review / verification / marketplace / partner program needed before outside users can connect. Fetch the 2-4 most important official pages and read them.
2. Find the developer console / app registration URL and include it as consoleUrl.
3. Search for 1-2 secondary or community sources about real-world review timelines and common errors. Treat them as weaker evidence.
4. If you cannot find evidence that the provider supports OAuth for third-party apps, say so plainly in summary, set confidence "low", and explain the alternative (API keys, partner-only access, etc.).
5. You cannot sign in, create accounts or submit forms. Describe those steps and mark them owner "you".

Judgment rules:
- Separate "connect your own account" from "any customer can connect". The gap between these is the main thing developers underestimate.
- Be concrete about time: give ranges, and say whose clock it is (your hands-on effort vs provider wait). When official and reported timelines differ, state both.
- Tag every claim with evidence honestly. Only use "verified" when an official page you actually saw states it. Never invent URLs; every source must be a URL you saw in search results or fetched.
- When sources conflict, pick the best-supported answer and record the conflict in verification.corrected or the evidence note.
- Prefer fewer, accurate items over many vague ones. No marketing language.
- Do not state whether a managed-auth platform (e.g. Composio) already offers an OAuth app for this provider. The server looks that up in Composio's directory and adds it to the guide.

Output: after researching, reply with ONLY a JSON object matching this TypeScript type, wrapped in <guide></guide> tags. No markdown fences, no commentary outside the tags.
${GUIDE_SCHEMA}`;
}

export function userPrompt(app: string) {
  return `App to investigate: ${app}

Research how a developer creates an OAuth app for this provider and gets it ready for external users, then output the guide JSON in <guide> tags.`;
}

export function repairPrompt(raw: string, error: string) {
  return `The following guide output could not be parsed or validated (${error}). Return the same content as a single valid JSON object matching the schema, wrapped in <guide></guide>. Do not add new facts or sources.

Schema:
${GUIDE_SCHEMA}

Output to repair:
${raw.slice(0, 60000)}`;
}
