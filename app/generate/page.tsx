import { Suspense } from "react";
import { Generator } from "@/components/Generator";

export const metadata = { title: "Generate a guide · OAuth Pathfinder" };

export default function Page() {
  return (
    <Suspense fallback={<p className="empty">Loading…</p>}>
      <Generator />
    </Suspense>
  );
}
