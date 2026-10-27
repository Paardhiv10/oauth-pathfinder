/**
 * Batch path to the full 100-app library.
 * Runs the same agent used for live generation over data/app-list.json and writes
 * data/generated/<slug>.json. Generated guides are marked "generated" and stay out of the
 * curated library until a human reviews them and moves them to data/guides/.
 *
 *   ANTHROPIC_API_KEY=... npm run generate-library -- --limit 10 --concurrency 2
 */
import fs from "node:fs";
import path from "node:path";
import { runAgent } from "../lib/agent";
import { slugify } from "../lib/normalize";

const args = process.argv.slice(2);
const flag = (n: string, d: number) => { const i = args.indexOf(`--${n}`); return i >= 0 ? Number(args[i + 1]) : d; };
const limit = flag("limit", 100);
const concurrency = flag("concurrency", 2);
const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
if (!apiKey) { console.error("Set ANTHROPIC_API_KEY"); process.exit(1); }

const outDir = path.join(process.cwd(), "data/generated");
fs.mkdirSync(outDir, { recursive: true });
const curated = new Set(fs.readdirSync(path.join(process.cwd(), "data/guides")).map((f) => f.replace(/\.json$/, "")));
const apps: string[] = JSON.parse(fs.readFileSync("data/app-list.json", "utf8"));
const queue = apps
  .filter((a) => !curated.has(slugify(a)) && !fs.existsSync(path.join(outDir, `${slugify(a)}.json`)))
  .slice(0, limit);

console.log(`${queue.length} apps to generate (skipping curated and already generated)`);
let done = 0, failed = 0;
async function worker() {
  while (queue.length) {
    const app = queue.shift()!;
    try {
      const g = await runAgent(app, () => {}, { apiKey: apiKey!, model });
      fs.writeFileSync(path.join(outDir, `${g.slug}.json`), JSON.stringify(g, null, 2));
      done++;
      console.log(`✓ ${app} → ${g.verdict.label} (${g.verdict.confidence} confidence)`);
    } catch (e: any) {
      failed++;
      console.log(`✗ ${app}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
console.log(`Done: ${done} generated, ${failed} failed. Review data/generated/ before moving files into data/guides/.`);
