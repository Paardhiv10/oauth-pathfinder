"use client";
import { useState } from "react";
import LZString from "lz-string";
import type { Guide } from "@/lib/types";
import { guideToMarkdown } from "@/lib/markdown";

export function encodeGuide(g: Guide) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(g));
}

export function GuideActions({ guide }: { guide: Guide }) {
  const [msg, setMsg] = useState("");
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2200);
  };

  const shareUrl = () =>
    guide.mode === "curated" ? `${location.origin}/apps/${guide.slug}` : `${location.origin}/g#${encodeGuide(guide)}`;

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(done);
    } catch {
      flash("Couldn't copy. Your browser blocked clipboard access.");
    }
  };

  const download = (content: string, name: string, type: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="actions">
      <button className="btn btn-primary btn-sm" onClick={() => copy(shareUrl(), "Link copied")}>Copy share link</button>
      <button className="btn btn-secondary btn-sm" onClick={() => copy(guideToMarkdown(guide), "Markdown copied")}>Copy Markdown</button>
      <button className="btn btn-ghost btn-sm" onClick={() => download(guideToMarkdown(guide), `${guide.slug}-oauth-guide.md`, "text/markdown")}>Download .md</button>
      {guide.mode === "generated" && (
        <button className="btn btn-ghost btn-sm" onClick={() => download(JSON.stringify(guide, null, 2), `${guide.slug}.json`, "application/json")}>Download JSON</button>
      )}
      <span className={`toast ${msg ? "show" : ""}`} role="status">{msg}</span>
    </div>
  );
}
