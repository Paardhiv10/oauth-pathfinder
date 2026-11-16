import type { Guide } from "./types";
import { systemPrompt, userPrompt, repairPrompt } from "./prompt";
import { normalizeGuide } from "./normalize";
import { applyEvidenceCheck, type RetrievalLog } from "./evidence";
import { probeGuideLinks } from "./probe";
import { lookupManagedAuth } from "./composio";

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "search"; query: string }
  | { type: "results"; query?: string; urls: { url: string; title: string }[] }
  | { type: "fetch"; url: string }
  | { type: "fetched"; url: string; ok: boolean; error?: string }
  | { type: "writing"; chars: number }
  | { type: "check"; message: string }
  | { type: "done"; guide: Guide }
  | { type: "error"; message: string };

type Emit = (e: AgentEvent) => void;

const API_URL = `${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`;

interface ToolConfig {
  fetchTool: boolean;
  betaHeader: boolean;
}

function headers(apiKey: string, cfg: ToolConfig) {
  const h: Record<string, string> = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
  if (cfg.fetchTool && cfg.betaHeader) h["anthropic-beta"] = "web-fetch-2025-09-10";
  return h;
}

function tools(cfg: ToolConfig) {
  const t: unknown[] = [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }];
  if (cfg.fetchTool) t.push({ type: "web_fetch_20250910", name: "web_fetch", max_uses: 6, max_content_tokens: 12000 });
  return t;
}

interface Usage { input: number; output: number; searches: number }

// US dollars per million tokens (input, output). Web search is billed at $10 per 1,000 searches.
const PRICES: Record<string, [number, number]> = {
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

function usageSummary(model: string, u: Usage): string {
  const tokens = `${u.input.toLocaleString("en-US")} input and ${u.output.toLocaleString("en-US")} output tokens, ${u.searches} web searches`;
  const price = PRICES[model];
  if (!price) return `Claude usage: ${tokens}`;
  const cost = (u.input * price[0] + u.output * price[1]) / 1e6 + u.searches * 0.01;
  return `Claude usage: ${tokens}, about $${cost.toFixed(2)} at list prices`;
}

// Streams one Messages API call, forwarding progress events, and returns the content blocks.
async function streamOnce(
  apiKey: string,
  model: string,
  cfg: ToolConfig,
  system: string,
  messages: unknown[],
  emit: Emit,
  log: RetrievalLog,
  signal?: AbortSignal
): Promise<{ content: any[]; stopReason: string | null; usage: Usage }> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(apiKey, cfg),
    body: JSON.stringify({ model, max_tokens: 16000, system, messages, tools: tools(cfg), stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Anthropic API ${res.status}: ${text.slice(0, 400)}`);
    (err as any).status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const blocks: any[] = [];
  const partialJson: Record<number, string> = {};
  let stopReason: string | null = null;
  const usage: Usage = { input: 0, output: 0, searches: 0 };
  let textChars = 0;
  let lastWritingEmit = 0;
  const toolNames: Record<string, string> = {};
  const toolInputs: Record<string, any> = {};

  const handle = (evt: any) => {
    switch (evt.type) {
      case "content_block_start": {
        const b = { ...evt.content_block };
        if (b.type === "text") b.text = b.text || "";
        if (b.type === "thinking") b.thinking = b.thinking || "";
        if (b.type === "server_tool_use") {
          partialJson[evt.index] = "";
          toolNames[b.id] = b.name;
        }
        if (b.type === "web_search_tool_result") {
          const query = toolInputs[b.tool_use_id]?.query;
          if (Array.isArray(b.content)) {
            const urls = b.content
              .filter((r: any) => r.type === "web_search_result")
              .map((r: any) => ({ url: r.url, title: r.title }));
            urls.forEach((u: any) => log.searchResults.add(u.url));
            emit({ type: "results", query, urls: urls.slice(0, 6) });
          } else if (b.content?.type === "web_search_tool_result_error") {
            emit({ type: "status", message: `Search error: ${b.content.error_code}` });
          }
        }
        if (b.type === "web_fetch_tool_result") {
          const c = b.content;
          if (c?.type === "web_fetch_result") {
            log.fetched.add(c.url);
            emit({ type: "fetched", url: c.url, ok: true });
          } else {
            const url = toolInputs[b.tool_use_id]?.url;
            emit({ type: "fetched", url: url || "(unknown)", ok: false, error: c?.error_code });
          }
        }
        blocks[evt.index] = b;
        break;
      }
      case "content_block_delta": {
        const b = blocks[evt.index];
        if (!b) break;
        if (evt.delta.type === "text_delta") {
          b.text += evt.delta.text;
          textChars += evt.delta.text.length;
          if (textChars - lastWritingEmit > 400) {
            lastWritingEmit = textChars;
            emit({ type: "writing", chars: textChars });
          }
        } else if (evt.delta.type === "input_json_delta") {
          partialJson[evt.index] = (partialJson[evt.index] || "") + evt.delta.partial_json;
        } else if (evt.delta.type === "thinking_delta") {
          // Thinking blocks must go back unchanged when a paused turn is resumed.
          b.thinking += evt.delta.thinking;
        } else if (evt.delta.type === "signature_delta") {
          b.signature = evt.delta.signature;
        }
        break;
      }
      case "content_block_stop": {
        const b = blocks[evt.index];
        if (b?.type === "server_tool_use") {
          try {
            b.input = JSON.parse(partialJson[evt.index] || "{}");
          } catch {
            b.input = {};
          }
          toolInputs[b.id] = b.input;
          if (b.name === "web_search") {
            log.queries.push(b.input.query);
            emit({ type: "search", query: b.input.query });
          }
          if (b.name === "web_fetch") emit({ type: "fetch", url: b.input.url });
        }
        // Citations are not used; dropping them keeps the resumed request valid.
        if (b?.type === "text") delete b.citations;
        break;
      }
      case "message_start": {
        const u = evt.message?.usage || {};
        usage.input = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
        break;
      }
      case "message_delta": {
        if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
        // Cumulative for the request: input grows as search results and pages are read.
        const u = evt.usage || {};
        if (u.input_tokens != null) usage.input = u.input_tokens + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
        if (u.output_tokens != null) usage.output = u.output_tokens;
        if (u.server_tool_use?.web_search_requests != null) usage.searches = u.server_tool_use.web_search_requests;
        break;
      }
      case "error":
        throw new Error(`Stream error: ${JSON.stringify(evt.error)}`);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const data = dataLine.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        handle(JSON.parse(data));
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return { content: blocks.filter(Boolean), stopReason, usage };
}

async function callNoTools(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(apiKey, { fetchTool: false, betaHeader: false }),
    body: JSON.stringify({ model, max_tokens: 16000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return json.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

export function extractGuideJson(text: string): unknown {
  const m = text.match(/<guide>([\s\S]*?)<\/guide>/);
  let raw = m ? m[1] : text;
  raw = raw.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in output");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function runAgent(app: string, emit: Emit, opts: { apiKey: string; model: string; signal?: AbortSignal }) {
  const today = new Date().toISOString().slice(0, 10);
  const system = systemPrompt(today);
  const log: RetrievalLog = { queries: [], searchResults: new Set(), fetched: new Set() };
  let cfg: ToolConfig = { fetchTool: true, betaHeader: true };
  const messages: any[] = [{ role: "user", content: userPrompt(app) }];

  emit({ type: "status", message: `Investigating “${app}” — searching official docs` });

  let finalText = "";
  const total: Usage = { input: 0, output: 0, searches: 0 };
  for (let turn = 0; turn < 5; turn++) {
    let result;
    try {
      result = await streamOnce(opts.apiKey, opts.model, cfg, system, messages, emit, log, opts.signal);
    } catch (e: any) {
      // Retry without the beta header, then without the fetch tool, if the API rejects them.
      if (e.status === 400 && cfg.betaHeader) {
        cfg = { ...cfg, betaHeader: false };
        emit({ type: "status", message: "Retrying without beta header" });
        turn--;
        continue;
      }
      if (e.status === 400 && cfg.fetchTool) {
        cfg = { fetchTool: false, betaHeader: false };
        emit({ type: "status", message: "Web fetch unavailable — continuing with search only" });
        turn--;
        continue;
      }
      throw e;
    }
    total.input += result.usage.input;
    total.output += result.usage.output;
    total.searches += result.usage.searches;
    const text = result.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    finalText += text;
    if (result.stopReason === "refusal") {
      throw new Error("The model declined this request. Try the app's plain name or its website.");
    }
    if (result.stopReason === "pause_turn") {
      // Long server-tool turn: send the partial assistant turn back so the model continues.
      messages.push({ role: "assistant", content: result.content });
      emit({ type: "status", message: "Continuing research…" });
      continue;
    }
    break;
  }

  emit({ type: "status", message: usageSummary(opts.model, total) });
  return finalizeGuide(finalText, app, log, emit, (raw, err) => callNoTools(opts.apiKey, opts.model, repairPrompt(raw, err)));
}

// Parses the model's draft, fits it to the schema, then runs the evidence check, link test and
// Composio lookup before the guide is shown.
async function finalizeGuide(
  finalText: string,
  app: string,
  log: RetrievalLog,
  emit: Emit,
  repair: (raw: string, error: string) => Promise<string>
) {
  const today = new Date().toISOString().slice(0, 10);
  emit({ type: "status", message: "Draft written — validating structure" });
  let parsed: unknown;
  try {
    parsed = extractGuideJson(finalText);
  } catch (e: any) {
    emit({ type: "status", message: `Output needed repair (${e.message}) — repairing` });
    const repaired = await repair(finalText, e.message);
    parsed = extractGuideJson(repaired);
  }

  let guide = normalizeGuide(parsed, app);

  emit({ type: "check", message: `Evidence check: comparing ${guide.sources.length} cited sources against ${log.fetched.size} fetched pages and ${log.searchResults.size} search results` });
  const report = applyEvidenceCheck(guide, log);
  guide = report.guide;
  emit({ type: "check", message: report.summary });

  emit({ type: "check", message: "Testing links: developer console, docs, and official sources" });
  guide.linkChecks = await probeGuideLinks(guide);
  // "Broken" means the site answered with an error. No answer at all usually means the site
  // refuses automated requests, which says nothing about the link.
  const bad = guide.linkChecks.filter((l) => l.result === "not-found" || (l.result === "error" && l.status !== null));
  const silent = guide.linkChecks.filter((l) => l.result === "error" && l.status === null);
  const fine = guide.linkChecks.length - bad.length - silent.length;
  emit({
    type: "check",
    message: `Link test: ${fine}/${guide.linkChecks.length} reachable or behind login${bad.length ? ` · ${bad.length} broken` : ""}${silent.length ? ` · ${silent.length} gave no response` : ""}`,
  });
  if (bad.length) {
    guide.verification.unverified.push(...bad.map((b) => `Link test failed for ${b.label} (${b.url}): ${b.status ?? b.result}`));
  }
  if (silent.length) {
    guide.verification.unverified.push(
      `Link test got no response from ${silent.length} link(s) on ${[...new Set(silent.map((s) => new URL(s.url).hostname))].join(", ")}. The site may refuse automated requests; open them in a browser to confirm.`
    );
  }

  // Confidence is capped by what was actually read, whatever the model claimed.
  const officialRead = guide.sources.filter((s) => s.kind === "official" && s.retrieved === "fetched").length;
  const cap = officialRead === 0 ? "low" : officialRead < 2 ? "medium" : "high";
  const rank = { low: 0, medium: 1, high: 2 } as const;
  if (rank[guide.verdict.confidence] > rank[cap]) {
    guide.verification.corrected.push(
      `Confidence lowered from ${guide.verdict.confidence} to ${cap}: ${
        officialRead === 0 ? "no official page was read in full" : "only one official page was read in full"
      }.`
    );
    guide.verdict.confidence = cap;
    emit({ type: "check", message: `Confidence capped at ${cap} (${officialRead} official page${officialRead === 1 ? "" : "s"} read in full)` });
  }
  guide.managedAuth = lookupManagedAuth(guide.name);
  if (guide.managedAuth.status === "not-listed") {
    const byInput = lookupManagedAuth(app);
    if (byInput.status !== "not-listed") guide.managedAuth = byInput;
  }
  const ma = guide.managedAuth;
  emit({
    type: "check",
    message:
      ma.status === "managed"
        ? `Composio directory: managed OAuth app available (${ma.toolkit})`
        : ma.status === "byo"
          ? `Composio directory: ${ma.toolkit} is supported, but you bring your own OAuth app`
          : "Composio directory: not listed, so you need your own OAuth app",
  });

  guide.verification.unverified.push(
    "Nobody signed in to the provider's console or created an app for this guide. The steps are taken from the documentation, not from a setup attempt."
  );
  guide.verification.checked.unshift(
    `Agent ran ${log.queries.length} searches and read ${log.fetched.size} pages on ${today}`
  );

  emit({ type: "done", guide });
  return guide;
}
