// Runs the live agent over data/app-list.json (or names after --apps) and writes unreviewed
// guides to data/generated/.  npm run generate-library -- --limit 10 --apps "Linear" --verbose
import fs from "node:fs";
import path from "node:path";
import { generateGuide, isConfigured, modelName } from "../lib/generate";
import { slugify } from "../lib/normalize";

const args = process.argv.slice(2);
const flag = (n: string, d: number) => { const i = args.indexOf(`--${n}`); return i >= 0 ? Number(args[i + 1]) : d; };
const limit = flag("limit", 100);
const concurrency = flag("concurrency", 1);
for (const line of fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8").split("\n") : []) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
if (!isConfigured()) { console.error("Set ANTHROPIC_API_KEY in .env.local"); process.exit(1); }
console.log(`Model: ${modelName()}`);
const verbose = args.includes("--verbose");
const only = args.includes("--apps") ? args.slice(args.indexOf("--apps") + 1).filter((a) => !a.startsWith("--")) : null;

const outDir = path.join(process.cwd(), "data/generated");
fs.mkdirSync(outDir, { recursive: true });
const curated = new Set(fs.readdirSync(path.join(process.cwd(), "data/guides")).map((f) => f.replace(/\.json$/, "")));
const apps: string[] = only || JSON.parse(fs.readFileSync("data/app-list.json", "utf8"));
const queue = apps
  .filter((a) => !curated.has(slugify(a)) && !fs.existsSync(path.join(outDir, `${slugify(a)}.json`)))
  .slice(0, limit);

console.log(`${queue.length} apps to generate (skipping curated and already generated)`);
let done = 0, failed = 0;
async function worker() {
  while (queue.length) {
    const app = queue.shift()!;
    try {
      const started = Date.now();
      const g = await generateGuide(app, (e) => {
        if (!verbose) return;
        if (e.type === "status" || e.type === "check") console.log(`   ${e.message}`);
        if (e.type === "search") console.log(`   search: ${e.query}`);
        if (e.type === "fetched") console.log(`   read ${e.ok ? "ok " : "FAIL"} ${e.url}${e.error ? ` (${e.error})` : ""}`);
      });
      console.log(`   ${Math.round((Date.now() - started) / 1000)}s`);
      fs.writeFileSync(path.join(outDir, `${g.slug}.json`), JSON.stringify(g, null, 2));
      done++;
      console.log(`✓ ${app} → ${g.verdict.label} (${g.verdict.confidence} confidence)`);
    } catch (e: any) {
      failed++;
      console.log(`✗ ${app}: ${e.message}`);
    }
  }
}
Promise.all(Array.from({ length: concurrency }, worker)).then(() => {
  console.log(`Done: ${done} generated, ${failed} failed. Review data/generated/ before moving files into data/guides/.`);
  process.exit(failed && !done ? 1 : 0);
});
