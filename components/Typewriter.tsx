"use client";
import { useEffect, useState } from "react";

// Types and deletes each phrase in turn. Renders the last phrase on the server and when the
// visitor prefers reduced motion; screen readers always get that fixed phrase.
export function Typewriter({ phrases }: { phrases: string[] }) {
  const last = phrases.length - 1;
  const [index, setIndex] = useState(last);
  const [shown, setShown] = useState(phrases[last].length);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const phrase = phrases[index];
    const atEnd = !deleting && shown === phrase.length;
    const atStart = deleting && shown === 0;
    const delay = atEnd ? 1800 : atStart ? 350 : deleting ? 45 : 95;
    const id = setTimeout(() => {
      if (atEnd) setDeleting(true);
      else if (atStart) { setDeleting(false); setIndex((index + 1) % phrases.length); }
      else setShown(shown + (deleting ? -1 : 1));
    }, delay);
    return () => clearTimeout(id);
  }, [phrases, index, shown, deleting]);

  return (
    <span className="typer">
      <span className="sr-only">{phrases[last]}</span>
      <span className="hl" aria-hidden>{phrases[index].slice(0, shown)}</span>
      <span className="caret" aria-hidden />
    </span>
  );
}
