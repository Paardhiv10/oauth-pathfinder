import type { Guide, LinkCheck } from "./types";

const LOGIN_HINTS = /(login|signin|sign-in|sign_in|auth|accounts\.|sso|oauth\/authorize)/i;

// Actually requests a URL from the server and classifies what a developer will hit.
export async function probe(url: string, label: string): Promise<LinkCheck> {
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (OAuth Pathfinder link check)", accept: "text/html,*/*" },
    });
    const finalUrl = res.url || url;
    let result: LinkCheck["result"];
    if (res.status === 404 || res.status === 410) result = "not-found";
    else if (res.status === 401) result = "login-wall";
    else if (res.status === 403 || res.status === 429 || res.status === 999) result = "blocked";
    else if (res.status >= 500) result = "error";
    else if (finalUrl !== url && LOGIN_HINTS.test(new URL(finalUrl).host + new URL(finalUrl).pathname)) result = "login-wall";
    else if (finalUrl.replace(/\/$/, "") !== url.replace(/\/$/, "")) result = "redirect";
    else result = "reachable";
    return { url, label, status: res.status, result, finalUrl: finalUrl !== url ? finalUrl : undefined, checkedAt };
  } catch {
    return { url, label, status: null, result: "error", checkedAt };
  } finally {
    clearTimeout(t);
  }
}

export async function probeGuideLinks(guide: Guide): Promise<LinkCheck[]> {
  const targets: { url: string; label: string }[] = [];
  if (guide.consoleUrl) targets.push({ url: guide.consoleUrl, label: "Developer console" });
  if (guide.docsUrl) targets.push({ url: guide.docsUrl, label: "Main OAuth docs" });
  for (const s of guide.sources.filter((s) => s.kind === "official")) {
    if (targets.length >= 8) break;
    if (!targets.some((t) => t.url === s.url)) targets.push({ url: s.url, label: s.title });
  }
  return Promise.all(targets.map((t) => probe(t.url, t.label)));
}
