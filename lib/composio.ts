import directory from "../data/composio-directory.json";
import type { ManagedAuth } from "./types";

// Looks an app up in a snapshot of Composio's managed OAuth directory
// (docs.composio.dev/toolkits/managed-auth). The model is never asked: it would guess.

interface Entry { name: string; slug: string }
const MANAGED = directory.managed as Entry[];
const BYO = directory.byo as Entry[];

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Spellings to try, most specific first: "Gmail (Google)" -> gmail · "Monday.com" -> monday
function candidates(name: string): string[] {
  const out = [name];
  const beforeParen = name.split(/[(/]/)[0].trim();
  if (beforeParen && beforeParen !== name) out.push(beforeParen);
  for (const c of [...out]) {
    const stripped = c.replace(/\.(com|io|so|dev|app|ai|co)\b/i, "").replace(/\b(online|app)\b/i, "").trim();
    if (stripped && stripped !== c) out.push(stripped);
  }
  const paren = name.match(/\(([^)]+)\)/)?.[1];
  if (paren) out.push(paren); // "X (Twitter)" -> twitter
  return out;
}

function exact(list: Entry[], name: string): Entry | undefined {
  for (const c of candidates(name)) {
    const n = norm(c);
    const hit = list.find((e) => norm(e.name) === n || e.slug === n);
    if (hit) return hit;
  }
}

// Whole-word containment, longest toolkit name first: "Microsoft Outlook / Graph" -> Outlook.
function contained(list: Entry[], name: string): Entry | undefined {
  const w = ` ${words(name.split("(")[0])} `;
  return [...list]
    .filter((e) => e.name.length >= 4 && !/\bmcp\b/i.test(e.name))
    .sort((a, b) => b.name.length - a.name.length)
    .find((e) => w.includes(` ${words(e.name)} `));
}

export function lookupManagedAuth(appName: string): ManagedAuth {
  const base = { url: directory.source, checkedAt: directory.retrievedAt };
  const hit = (status: "managed" | "byo", e: Entry): ManagedAuth => ({ status, toolkit: e.name, slug: e.slug, ...base });
  // Exact names win over partial ones, so "Dropbox Sign" is not mistaken for "Dropbox".
  const m1 = exact(MANAGED, appName);
  if (m1) return hit("managed", m1);
  const b1 = exact(BYO, appName);
  if (b1) return hit("byo", b1);
  const m2 = contained(MANAGED, appName);
  if (m2) return hit("managed", m2);
  const b2 = contained(BYO, appName);
  if (b2) return hit("byo", b2);
  return { status: "not-listed", ...base };
}
