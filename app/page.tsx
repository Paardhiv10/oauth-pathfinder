import Link from "next/link";
import { LIBRARY } from "@/lib/guides";
import { AppSearch } from "@/components/AppSearch";

export default function Home() {
  const sorted = [...LIBRARY].sort((a, b) => a.verdict.difficulty - b.verdict.difficulty);
  return (
    <>
      <section className="hero">
        <h1>Will your OAuth app take an hour or a month?</h1>
        <p className="lede">
          Look up an app to see what it takes before your users can click “Connect”. You'll get the steps, the reviews, the
          waits, and which parts an agent can do for you. If an app isn't here, an agent researches it and writes the guide live.
        </p>
        <AppSearch names={LIBRARY.map((g) => ({ slug: g.slug, name: g.name, website: g.website }))} />
      </section>

      <section id="library" className="library">
        <h2>Curated guides</h2>
        <p className="muted">Sorted from instant to gated. Each claim is tagged with how it was checked.</p>
        <table className="tbl lib-table">
          <thead>
            <tr><th>App</th><th>Difficulty</th><th>Your own account</th><th>Any user can connect</th><th>Main hurdle</th></tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.slug}>
                <td><Link href={`/apps/${g.slug}`} className="lib-name">{g.name}</Link><div className="muted small">{g.category}</div></td>
                <td>
                  <span className={`chip d${g.verdict.difficulty}`}>{g.verdict.label}</span>
                </td>
                <td>{g.verdict.timeToFirstConnection}</td>
                <td>{g.verdict.timeToProduction}</td>
                <td className="small">{g.decideFirst[0]?.question}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="how">
        <h2>How a guide is made</h2>
        <ol className="how-steps">
          <li><h3>Research</h3><p>An agent searches and reads the provider's official docs, then a couple of real-world reports about review times and errors.</p></li>
          <li><h3>Write</h3><p>It writes a route from your first connection to production. Each step says whether an agent can do it, you must, or you're waiting on the provider.</p></li>
          <li><h3>Check</h3><p>The server checks every claim against the pages the agent actually saw, downgrades anything unsupported, and tests the console and docs links.</p></li>
        </ol>
      </section>
    </>
  );
}
