import { notFound } from "next/navigation";
import { LIBRARY, getGuide } from "@/lib/guides";
import { GuideView } from "@/components/GuideView";

export function generateStaticParams() {
  return LIBRARY.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  return { title: g ? `${g.name}: OAuth setup guide · OAuth Pathfinder` : "Not found" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  return <GuideView guide={g} />;
}
