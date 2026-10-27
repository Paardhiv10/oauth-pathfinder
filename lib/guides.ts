import type { Guide } from "./types";
import gmail from "../data/guides/gmail.json";
import github from "../data/guides/github.json";
import slack from "../data/guides/slack.json";
import notion from "../data/guides/notion.json";
import outlook from "../data/guides/microsoft-outlook.json";
import linkedin from "../data/guides/linkedin.json";

// Curated library. Add a guide by dropping a JSON file in data/guides and importing it here
// (or use `npm run promote` on a generated guide).
export const LIBRARY: Guide[] = [github, slack, notion, outlook, gmail, linkedin] as unknown as Guide[];

export function getGuide(slug: string): Guide | undefined {
  return LIBRARY.find((g) => g.slug === slug);
}

export function findInLibrary(query: string): Guide | undefined {
  const q = query.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (!q) return undefined;
  return LIBRARY.find((g) => {
    const host = g.website.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();
    return (
      g.slug === q ||
      g.name.toLowerCase() === q ||
      g.name.toLowerCase().split(/[\s/()]+/).includes(q) ||
      host.startsWith(q) ||
      q.startsWith(host.split("/")[0])
    );
  });
}
