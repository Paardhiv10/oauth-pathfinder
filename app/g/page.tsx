"use client";
import { useEffect, useState } from "react";
import LZString from "lz-string";
import type { Guide } from "@/lib/types";
import { GuideView } from "@/components/GuideView";

// Shared agent-generated guide. The whole guide lives in the URL fragment, so sharing needs no database
// and the fragment is never sent to the server.
export default function SharedGuide() {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    try {
      const raw = LZString.decompressFromEncodedURIComponent(location.hash.slice(1));
      if (!raw) throw new Error();
      setGuide(JSON.parse(raw));
    } catch {
      setErr("This share link is incomplete or damaged. Ask for the link again, or generate the guide yourself.");
    }
  }, []);
  if (err) return <p className="empty">{err} <a href="/generate">Generate a guide</a></p>;
  if (!guide) return <p className="empty">Loading guide…</p>;
  return <GuideView guide={guide} />;
}
