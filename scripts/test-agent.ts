/**
 * Offline end-to-end test of the generation pipeline.
 * Replays a realistic Anthropic streaming response (server tool use: web_search + web_fetch, then the guide JSON),
 * and fake link-probe responses, then asserts on parsing, the evidence check and the link test.
 * Run: npm test
 */
import assert from "node:assert/strict";
import { runAgent, extractGuideJson, type AgentEvent } from "../lib/agent";

const guideJson = {
  slug: "acme-crm",
  name: "Acme CRM",
  website: "https://acme.example",
  category: "CRM",
  summary: "Self-serve OAuth app; marketplace review only needed for listing.",
  verdict: { difficulty: 2, timeToFirstConnection: "20 min", timeToProduction: "Same day", approvalWait: "None", handsOnEffort: "1 hour", confidence: "high" },
  decideFirst: [{ question: "Public or private app?", guidance: "Public for customers.", evidence: { status: "verified", sources: ["off"] } }],
  phases: [
    {
      name: "1 · Register", goal: "Get credentials", duration: "20 min",
      steps: [
        { title: "Create app", detail: "In the dev portal.", owner: "you", evidence: { status: "verified", sources: ["off"] } },
        { title: "Claimed from a blog", detail: "x", owner: "agent", evidence: { status: "verified", sources: ["blog"] } },
        { title: "Claimed from a URL never seen", detail: "x", owner: "agent", evidence: { status: "sourced", sources: ["ghost"] } },
        { title: "No source at all", detail: "x", owner: "robot", evidence: { status: "tested" } },
      ],
    },
  ],
  requirements: [], blockers: [], nuances: [],
  sources: [
    { id: "off", title: "Acme — OAuth docs", url: "https://developers.acme.example/oauth", kind: "official" },
    { id: "blog", title: "Someone's blog", url: "https://blog.example/acme-oauth", kind: "secondary" },
    { id: "ghost", title: "Imagined page", url: "https://acme.example/made-up", kind: "official" },
  ],
  verification: { checked: [], corrected: [], unverified: [] },
  consoleUrl: "https://developers.acme.example/apps",
  docsUrl: "https://developers.acme.example/oauth",
};

function sse(events: any[]) {
  const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  // split into odd-sized chunks to exercise the parser's buffering
  const chunks: Uint8Array[] = [];
  const enc = new TextEncoder().encode(text);
  for (let i = 0; i < enc.length; i += 97) chunks.push(enc.slice(i, i + 97));
  return new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(x)); c.close(); } });
}

const finalText = `Here is the guide.\n<guide>${JSON.stringify(guideJson)}</guide>`;
const anthropicEvents = [
  { type: "message_start", message: { id: "m1" } },
  { type: "content_block_start", index: 0, content_block: { type: "server_tool_use", id: "srv1", name: "web_search", input: {} } },
  { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"query": "acme ' } },
  { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: 'oauth app"}' } },
  { type: "content_block_stop", index: 0 },
  { type: "content_block_start", index: 1, content_block: { type: "web_search_tool_result", tool_use_id: "srv1", content: [
    { type: "web_search_result", url: "https://developers.acme.example/oauth", title: "OAuth", encrypted_content: "x" },
    { type: "web_search_result", url: "https://blog.example/acme-oauth", title: "Blog", encrypted_content: "y" },
  ] } },
  { type: "content_block_stop", index: 1 },
  { type: "content_block_start", index: 2, content_block: { type: "server_tool_use", id: "srv2", name: "web_fetch", input: {} } },
  { type: "content_block_delta", index: 2, delta: { type: "input_json_delta", partial_json: '{"url":"https://developers.acme.example/oauth"}' } },
  { type: "content_block_stop", index: 2 },
  { type: "content_block_start", index: 3, content_block: { type: "web_fetch_tool_result", tool_use_id: "srv2", content: { type: "web_fetch_result", url: "https://developers.acme.example/oauth", content: {} } } },
  { type: "content_block_stop", index: 3 },
  { type: "content_block_start", index: 4, content_block: { type: "text", text: "" } },
  ...finalText.match(/[\s\S]{1,300}/g)!.map((t) => ({ type: "content_block_delta", index: 4, delta: { type: "text_delta", text: t } })),
  { type: "content_block_stop", index: 4 },
  { type: "message_delta", delta: { stop_reason: "end_turn" } },
  { type: "message_stop" },
];

let apiCalls = 0;
globalThis.fetch = (async (url: any) => {
  const u = String(url);
  if (u.startsWith("https://api.anthropic.com")) {
    apiCalls++;
    return new Response(sse(anthropicEvents), { status: 200 });
  }
  if (u.includes("made-up")) return new Response("nope", { status: 404 });
  if (u.endsWith("/apps")) {
    const r = new Response("login", { status: 200 });
    Object.defineProperty(r, "url", { value: "https://login.acme.example/signin?next=/apps" });
    return r;
  }
  return new Response("ok", { status: 200 });
}) as typeof fetch;

(async () => {
  // unit: extraction tolerates fences and chatter
  assert.deepEqual(extractGuideJson('blah <guide>```json\n{"a":1}\n```</guide>'), { a: 1 });

  const events: AgentEvent[] = [];
  const guide = await runAgent("Acme CRM", (e) => events.push(e), { apiKey: "test", model: "test" });

  assert.equal(apiCalls, 1);
  assert.ok(events.some((e) => e.type === "search" && e.query === "acme oauth app"), "search query streamed");
  assert.ok(events.some((e) => e.type === "fetched" && e.ok), "fetch result streamed");
  assert.ok(events.some((e) => e.type === "done"));

  const steps = guide.phases[0].steps;
  assert.equal(guide.verdict.label, "Easy");
  assert.equal(steps[0].evidence.status, "verified", "official + fetched stays verified");
  assert.equal(steps[1].evidence.status, "sourced", "verified from a blog is downgraded to sourced");
  assert.equal(steps[2].evidence.status, "uncertain", "never-retrieved source is downgraded to uncertain");
  assert.equal(steps[3].evidence.status, "uncertain", "model-claimed 'tested' with no source becomes uncertain");
  assert.equal(steps[3].owner, "you", "invalid owner normalised");
  assert.equal(guide.sources.find((s) => s.id === "off")!.retrieved, "fetched");
  assert.equal(guide.sources.find((s) => s.id === "ghost")!.retrieved, "not-retrieved");

  const lc = Object.fromEntries(guide.linkChecks!.map((l) => [l.url, l.result]));
  assert.equal(lc["https://developers.acme.example/apps"], "login-wall");
  assert.equal(lc["https://acme.example/made-up"], "not-found");
  assert.ok(guide.verification.corrected.some((c) => c.includes("downgraded 3")), "downgrades reported");
  assert.ok(guide.verification.unverified.some((c) => c.includes("Imagined page")));

  console.log("✓ pipeline test passed");
  console.log(events.filter((e) => e.type === "check").map((e: any) => "  " + e.message).join("\n"));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
