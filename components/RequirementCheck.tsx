"use client";
import { useEffect, useState } from "react";

// A tick box for one requirement. The tick is remembered in this browser only.
export function RequirementCheck({ id, label }: { id: string; label: string }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    try { setDone(localStorage.getItem(id) === "1"); } catch {}
  }, [id]);

  const toggle = (checked: boolean) => {
    setDone(checked);
    try {
      if (checked) localStorage.setItem(id, "1");
      else localStorage.removeItem(id);
    } catch {}
  };

  return <input type="checkbox" className="check" checked={done} onChange={(e) => toggle(e.target.checked)} aria-label={`Done: ${label}`} />;
}
