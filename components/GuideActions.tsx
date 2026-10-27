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
    setTimeout(() => setMsg(""), 2500);
  };

  const shareUrl = () =>
    guide.mode === "curated"
      ? `${location.origin}/apps/${guide.slug}`
      : `${location.origin}/g#${encodeGuide(guide)}`;

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(done);
    } catch {
      flash("Copy failed. Select and copy manually.");
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
      <button onClick={() => copy(shareUrl(), "Link copied")}>Copy share link</button>
      <button onClick={() => copy(guideToMarkdown(guide), "Markdown copied")}>Copy as Markdown</button>
      <button onClick={() => download(guideToMarkdown(guide), `${guide.slug}-oauth-guide.md`, "text/markdown")}>Download .md</button>
      {guide.mode === "generated" && (
        <button onClick={() => download(JSON.stringify(guide, null, 2), `${guide.slug}.json`, "application/json")}>Download JSON</button>
      )}
      <span className="flash" role="status">{msg}</span>
    </div>
  );
}
