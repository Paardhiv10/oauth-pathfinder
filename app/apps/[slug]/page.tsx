import { notFound } from "next/navigation";
import { LIBRARY, getGuide } from "@/lib/guides";
import { GuideView } from "@/components/GuideView";
import { generatedGuides, getGeneratedGuide } from "@/lib/generated";

const find = (slug: string) => getGuide(slug) || getGeneratedGuide(slug);

export function generateStaticParams() {
  return [...LIBRARY, ...generatedGuides()].map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = find((await params).slug);
  return { title: g ? `${g.name}: OAuth setup guide · OAuth Pathfinder` : "Not found" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const g = find((await params).slug);
  if (!g) notFound();
  return <GuideView guide={g} permalink />;
}
