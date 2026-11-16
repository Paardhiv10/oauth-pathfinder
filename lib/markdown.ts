import type { Evidence, Guide } from "./types";

const OWNER = { agent: "🤖 Agent can do", you: "🧑 You", provider: "⏳ Provider" } as const;
const tag = (e: Evidence) => `\`${e.status}\`${e.note ? ` _(${e.note})_` : ""}`;

export function guideToMarkdown(g: Guide): string {
  const L: string[] = [];
  L.push(`# ${g.name}: OAuth app setup guide`, "");
  L.push(`> ${g.summary}`, "");
  L.push(`**Difficulty:** ${g.verdict.label} (${g.verdict.difficulty}/5) · **Confidence:** ${g.verdict.confidence} · **Updated:** ${g.updatedAt} · **Type:** ${g.mode === "curated" ? "Curated" : "Agent-generated, not human-reviewed"}`, "");
  L.push(`| | |`, `|---|---|`);
  L.push(`| First connection (your account) | ${g.verdict.timeToFirstConnection} |`);
  L.push(`| Production (any user) | ${g.verdict.timeToProduction} |`);
  L.push(`| Approval wait | ${g.verdict.approvalWait} |`);
  L.push(`| Hands-on effort | ${g.verdict.handsOnEffort} |`, "");
  if (g.managedAuth) {
    const m = g.managedAuth;
    const line =
      m.status === "managed"
        ? `Composio provides a managed OAuth app for ${m.toolkit}, so you may not need your own. You still need your own app for your name on the consent screen, extra scopes, or a dedicated quota.`
        : m.status === "byo"
          ? `Composio supports ${m.toolkit} but you bring your own OAuth app, so this guide applies in full.`
          : `Not in Composio's managed OAuth directory, so you need your own OAuth app.`;
    L.push(`**Managed app:** ${line} ([directory](${m.url}), checked ${m.checkedAt})`, "");
  }
  if (g.consoleUrl) L.push(`Developer console: ${g.consoleUrl}  `);
  if (g.docsUrl) L.push(`Main docs: ${g.docsUrl}`, "");

  if (g.decideFirst.length) {
    L.push(`## Decide first`, "");
    g.decideFirst.forEach((d) => L.push(`- **${d.question}** ${d.guidance} ${tag(d.evidence)}`));
    L.push("");
  }
  L.push(`## Steps`, "");
  g.phases.forEach((p) => {
    L.push(`### ${p.name} (${p.duration})`, `_${p.goal}_`, "");
    p.steps.forEach((s) => L.push(`- [ ] **${s.title}** (${OWNER[s.owner]}): ${s.detail}${s.url ? ` [link](${s.url})` : ""} ${tag(s.evidence)}`));
    L.push("");
  });
  if (g.requirements.length) {
    L.push(`## Requirements`, "", `| Requirement | Needed for | Evidence |`, `|---|---|---|`);
    g.requirements.forEach((r) => L.push(`| ${r.item}${r.note ? ` (${r.note})` : ""} | ${r.requiredFor} | ${r.evidence.status} |`));
    L.push("");
  }
  if (g.scopeTiers?.length) {
    L.push(`## Scope tiers`, "", `| Tier | Examples | Consequence |`, `|---|---|---|`);
    g.scopeTiers.forEach((t) => L.push(`| ${t.tier} | ${t.examples} | ${t.consequence} |`));
    L.push("");
  }
  if (g.blockers.length) {
    L.push(`## If you get stuck`, "");
    g.blockers.forEach((b) => L.push(`- **${b.symptom}**: ${b.cause}. **Fix:** ${b.fix} ${tag(b.evidence)}`));
    L.push("");
  }
  if (g.nuances.length) {
    L.push(`## Nuances`, "");
    g.nuances.forEach((n) => L.push(`- **${n.title}**: ${n.detail} ${tag(n.evidence)}`));
    L.push("");
  }
  L.push(`## What was checked`, "");
  g.verification.checked.forEach((x) => L.push(`- ✅ ${x}`));
  g.verification.corrected.forEach((x) => L.push(`- ✏️ Corrected: ${x}`));
  g.verification.unverified.forEach((x) => L.push(`- ❓ Not verified: ${x}`));
  L.push("");
  if (g.linkChecks?.length) {
    L.push(`## Link test`, "");
    g.linkChecks.forEach((l) => L.push(`- ${l.label}: ${l.result} (${l.status ?? "no response"}) ${l.url}`));
    L.push("");
  }
  L.push(`## Sources`, "");
  g.sources.forEach((s) => L.push(`- [${s.id}] [${s.title}](${s.url}) (${s.kind}${s.retrieved ? `, ${s.retrieved}` : ""})`));
  L.push("", `_Evidence key: tested = we ran it · verified = matches an official page we read · sourced = secondary or unread official source · uncertain = inferred or conflicting._`);
  return L.join("\n");
}
