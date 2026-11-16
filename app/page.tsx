import Link from "next/link";
import { LIBRARY } from "@/lib/guides";
import { AppSearch } from "@/components/AppSearch";
import { Meter } from "@/components/Meter";
import { Typewriter } from "@/components/Typewriter";
import { generatedGuides } from "@/lib/generated";

export default function Home() {
  const sorted = [...LIBRARY].sort((a, b) => a.verdict.difficulty - b.verdict.difficulty);
  const curatedSlugs = new Set(LIBRARY.map((g) => g.slug));
  const generated = generatedGuides().filter((g) => !curatedSlugs.has(g.slug));
  return (
    <div className="home">
      <section className="hero glow-panel">
        <span className="eyebrow">OAuth setup &amp; approval guides</span>
        <h1>Will your OAuth app take an hour or <Typewriter phrases={["a day?", "a week?", "a month?"]} /></h1>
        <p className="hero-sub">
          See what it takes before your users can click “Connect”: the steps, the reviews, the waits, and which parts an
          agent can do for you. If an app isn't in the library, an agent researches it live.
        </p>
        <AppSearch names={LIBRARY.map((g) => ({ slug: g.slug, name: g.name, website: g.website }))} />
        <div className="hero-stats">
          <span className="hero-stat">{LIBRARY.length} curated guides</span>
          <span className="hero-stat">Any other app in 1–3 minutes</span>
          <span className="hero-stat">Every claim tagged with its evidence</span>
        </div>
      </section>

      <section id="library" className="section">
        <div className="section-head">
          <h2>Library</h2>
          <p className="muted">Ordered from instant to gated.</p>
        </div>
        <ul className="cards">
          {sorted.map((g) => (
            <li key={g.slug}>
              <Link href={`/apps/${g.slug}`} className="card">
                <div className="card-top">
                  <div>
                    <h3>{g.name}</h3>
                    <span className="muted small">{g.category}</span>
                    {g.managedAuth?.status === "managed" && <span className="pill pill-managed">Managed app available</span>}
                  </div>
                  <Meter d={g.verdict.difficulty} label={g.verdict.label} />
                </div>
                <dl className="card-times">
                  <div><dt>Your own account</dt><dd>{g.verdict.timeToFirstConnection}</dd></div>
                  <div><dt>Any user can connect</dt><dd>{g.verdict.timeToProduction}</dd></div>
                </dl>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/generate" className="card card-new">
              <span className="plus" aria-hidden>+</span>
              <h3>Another app?</h3>
              <span className="muted small">Generate a guide for any app in 1–3 minutes</span>
            </Link>
          </li>
        </ul>
      </section>

      {generated.length > 0 && (
        <section id="generated" className="section">
          <div className="section-head">
            <h2>Written by the agent</h2>
            <p className="muted">Saved output from live runs. Nobody has reviewed or edited these.</p>
          </div>
          <ul className="cards">
            {generated.map((g) => (
              <li key={g.slug}>
                <Link href={`/apps/${g.slug}`} className="card">
                  <div className="card-top">
                    <div>
                      <h3>{g.name}</h3>
                      <span className="muted small">{g.category}</span>
                      {g.managedAuth?.status === "managed" && <span className="pill pill-managed">Managed app available</span>}
                    </div>
                    <Meter d={g.verdict.difficulty} label={g.verdict.label} />
                  </div>
                  <dl className="card-times">
                    <div><dt>Your own account</dt><dd>{g.verdict.timeToFirstConnection}</dd></div>
                    <div><dt>Any user can connect</dt><dd>{g.verdict.timeToProduction}</dd></div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>How a guide is made</h2>
        </div>
        <ol className="how">
          <li><h3>Research</h3><p>An agent reads the provider's official docs, then a few real-world reports about review times and errors.</p></li>
          <li><h3>Write</h3><p>It lays out the route from your first connection to production, and marks who does each step: an agent, you, or the provider.</p></li>
          <li><h3>Check</h3><p>The server checks each claim against the pages the agent actually read, downgrades anything unsupported, and tests the links.</p></li>
        </ol>
      </section>
    </div>
  );
}
