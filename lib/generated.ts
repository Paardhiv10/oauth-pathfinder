import fs from "node:fs";
import path from "node:path";
import type { Guide } from "./types";
import { lookupManagedAuth } from "./composio";

// Unreviewed guides the agent wrote, kept in data/generated/ as examples of live output.
// Server-only: read from disk at build time and shown apart from the curated library.
let cache: Guide[] | null = null;

export function generatedGuides(): Guide[] {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "data/generated");
  if (!fs.existsSync(dir)) return (cache = []);
  cache = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Guide)
    .map((g) => ({ ...g, mode: "generated" as const, managedAuth: g.managedAuth || lookupManagedAuth(g.name) }))
    .sort((a, b) => a.verdict.difficulty - b.verdict.difficulty || a.name.localeCompare(b.name));
  return cache;
}

export function getGeneratedGuide(slug: string) {
  return generatedGuides().find((g) => g.slug === slug);
}
