import type { AgentEvent } from "@/lib/agent";
import { generateGuide, isConfigured, modelName } from "@/lib/generate";
import { findInLibrary } from "@/lib/guides";
import type { Guide } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300; // research + writing usually takes 1–3 minutes
export const dynamic = "force-dynamic";

// Small in-memory cache so repeated demos of the same app don't re-spend tokens.
const cache = new Map<string, { at: number; guide: Guide }>();
const TTL = 6 * 60 * 60 * 1000;

// Tells the generate page whether to show the access-code box.
export function GET() {
  return Response.json({ configured: isConfigured(), needsCode: Boolean(process.env.ACCESS_CODE) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const app = String(body.app || "").trim().slice(0, 120);
  const force = Boolean(body.force);

  if (!app) return Response.json({ error: "Enter an app name or website" }, { status: 400 });
  if (!isConfigured()) {
    return Response.json(
      { error: "Live generation is not configured: set ANTHROPIC_API_KEY on the server (see README)." },
      { status: 503 }
    );
  }
  if (process.env.ACCESS_CODE && body.accessCode !== process.env.ACCESS_CODE) {
    const error = body.accessCode ? "That access code was not accepted. Check it and try again." : "Enter the access code to generate a guide.";
    return Response.json({ error }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      const keepAlive = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 15000);
      try {
        const lib = findInLibrary(app);
        if (lib && !force) {
          send({ type: "status", message: `${lib.name} is already in the curated library — generating a fresh agent version anyway for comparison.` });
        }
        const key = app.toLowerCase();
        const hit = cache.get(key);
        if (hit && !force && Date.now() - hit.at < TTL) {
          send({ type: "status", message: "Served from cache (generated in the last 6 hours). Use “Regenerate” for a fresh run." });
          send({ type: "done", guide: hit.guide });
        } else {
          send({ type: "status", message: `Model: ${modelName()}` });
          const guide = await generateGuide(app, send, req.signal);
          cache.set(key, { at: Date.now(), guide });
        }
      } catch (e: any) {
        const msg: string = e?.message || "Generation failed";
        send({
          type: "error",
          message: /fetch failed|ECONNREFUSED|ENOTFOUND/i.test(msg)
            ? "The server couldn't reach the model API. Check the network and the API key, then try again."
            : msg,
        });
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
