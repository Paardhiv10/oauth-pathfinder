import type { Evidence, Guide, Owner } from "@/lib/types";
import { GuideActions } from "./GuideActions";

const OWNER_LABEL: Record<Owner, string> = { agent: "Agent can do this", you: "You do this", provider: "Provider's turn" };

function Ev({ e, sources }: { e: Evidence; sources: Guide["sources"] }) {
  const refs = (e.sources || [])
    .map((id) => sources.findIndex((s) => s.id === id))
    .filter((i) => i >= 0);
  return (
    <span className={`ev ev-${e.status}`} title={e.note || undefined}>
      <span className="ev-dot" aria-hidden />
      {e.status}
      {refs.map((i) => (
        <a key={i} href={`#src-${i + 1}`} className="ev-ref">[{i + 1}]</a>
      ))}
      {e.note && <span className="ev-note">{e.note}</span>}
    </span>
  );
}

function Grade({ d }: { d: number }) {
  return (
    <span className={`grade grade-${d}`} aria-label={`Difficulty ${d} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= d ? "on" : ""} />
      ))}
    </span>
  );
}

export function GuideView({ guide: g }: { guide: Guide }) {
  const steps = g.phases.flatMap((p) => p.steps);
  const counts = {
    agent: steps.filter((s) => s.owner === "agent").length,
    you: steps.filter((s) => s.owner === "you").length,
    provider: steps.filter((s) => s.owner === "provider").length,
  };
  let n = 0;
  return (
    <article className="guide">
      <header className="guide-head">
        <div className="guide-title-row">
          <h1>{g.name}</h1>
          <span className={`badge badge-${g.mode}`}>{g.mode === "curated" ? "Curated" : "Agent-generated · not human-reviewed"}</span>
        </div>
        <p className="lede">{g.summary}</p>
        <GuideActions guide={g} />
      </header>

      <section className="verdict" aria-label="At a glance">
        <div className={`verdict-grade d${g.verdict.difficulty}`}>
          <Grade d={g.verdict.difficulty} />
          <strong>{g.verdict.label}</strong>
          <span className="muted">Confidence: {g.verdict.confidence}</span>
        </div>
        <dl className="verdict-times">
          <div><dt>Connect your own account</dt><dd>{g.verdict.timeToFirstConnection}</dd></div>
          <div><dt>Any user can connect</dt><dd>{g.verdict.timeToProduction}</dd></div>
          <div><dt>Waiting on the provider</dt><dd>{g.verdict.approvalWait}</dd></div>
          <div><dt>Your hands-on effort</dt><dd>{g.verdict.handsOnEffort}</dd></div>
        </dl>
        <div className="split" aria-label="Who does the work">
          <span className="o-agent" style={{ flexGrow: counts.agent || 0.01 }}>{counts.agent} agent</span>
          <span className="o-you" style={{ flexGrow: counts.you || 0.01 }}>{counts.you} you</span>
          <span className="o-provider" style={{ flexGrow: counts.provider || 0.01 }}>{counts.provider} provider</span>
        </div>
        <p className="links">
          {g.consoleUrl && <a href={g.consoleUrl} target="_blank" rel="noreferrer">Open developer console</a>}
          {g.docsUrl && <a href={g.docsUrl} target="_blank" rel="noreferrer">Official docs</a>}
        </p>
      </section>

      {g.decideFirst.length > 0 && (
        <section>
          <h2>Decide before you start</h2>
          <ul className="decide">
            {g.decideFirst.map((d, i) => (
              <li key={i}>
                <h3>{d.question}</h3>
                <p>{d.guidance}</p>
                <Ev e={d.evidence} sources={g.sources} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Route to production</h2>
        <ol className="route">
          {g.phases.map((p, pi) => (
            <li key={pi} className="phase">
              <div className="phase-head">
                <h3>{p.name}</h3>
                <span className="phase-dur">{p.duration}</span>
              </div>
              <p className="muted">{p.goal}</p>
              <ol className="steps">
                {p.steps.map((s, si) => {
                  n++;
                  return (
                    <li key={si} className={`step o-${s.owner}`}>
                      <span className="step-n">{n}</span>
                      <div>
                        <div className="step-top">
                          <h4>{s.title}</h4>
                          <span className={`owner owner-${s.owner}`}>{OWNER_LABEL[s.owner]}</span>
                        </div>
                        <p>{s.detail} {s.url && <a href={s.url} target="_blank" rel="noreferrer">Open</a>}</p>
                        <Ev e={s.evidence} sources={g.sources} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      {g.requirements.length > 0 && (
        <section>
          <h2>Requirements checklist</h2>
          <table className="tbl">
            <thead><tr><th>Requirement</th><th>Needed for</th><th>Evidence</th></tr></thead>
            <tbody>
              {g.requirements.map((r, i) => (
                <tr key={i}>
                  <td>{r.item}{r.note && <div className="muted small">{r.note}</div>}</td>
                  <td>{r.requiredFor}</td>
                  <td><Ev e={r.evidence} sources={g.sources} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {g.scopeTiers && g.scopeTiers.length > 0 && (
        <section>
          <h2>How your scopes change the review</h2>
          <table className="tbl">
            <thead><tr><th>Tier</th><th>Examples</th><th>What it triggers</th></tr></thead>
            <tbody>
              {g.scopeTiers.map((t, i) => (
                <tr key={i}>
                  <td><strong>{t.tier}</strong></td>
                  <td className="code">{t.examples}</td>
                  <td>{t.consequence}<div><Ev e={t.evidence} sources={g.sources} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {g.blockers.length > 0 && (
        <section>
          <h2>If you get stuck</h2>
          <div className="blockers">
            {g.blockers.map((b, i) => (
              <details key={i}>
                <summary>{b.symptom}</summary>
                <p><strong>Why:</strong> {b.cause}</p>
                <p><strong>Fix:</strong> {b.fix}</p>
                <Ev e={b.evidence} sources={g.sources} />
              </details>
            ))}
          </div>
        </section>
      )}

      {g.nuances.length > 0 && (
        <section>
          <h2>Details that bite later</h2>
          <ul className="nuances">
            {g.nuances.map((x, i) => (
              <li key={i}><h3>{x.title}</h3><p>{x.detail}</p><Ev e={x.evidence} sources={g.sources} /></li>
            ))}
          </ul>
        </section>
      )}

      <section className="proof">
        <h2>How much to trust this guide</h2>
        <div className="proof-cols">
          <div><h3>Checked</h3><ul>{g.verification.checked.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div><h3>Corrected</h3><ul>{g.verification.corrected.length ? g.verification.corrected.map((x, i) => <li key={i}>{x}</li>) : <li className="muted">Nothing corrected</li>}</ul></div>
          <div><h3>Not verified</h3><ul>{g.verification.unverified.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>
        {g.linkChecks && g.linkChecks.length > 0 && (
          <>
            <h3>Link test (run by the server while generating)</h3>
            <table className="tbl">
              <thead><tr><th>Link</th><th>Result</th><th>HTTP</th></tr></thead>
              <tbody>
                {g.linkChecks.map((l, i) => (
                  <tr key={i}>
                    <td><a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>{l.finalUrl && <div className="muted small">→ {l.finalUrl}</div>}</td>
                    <td><span className={`lc lc-${l.result}`}>{l.result}</span></td>
                    <td>{l.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <p className="legend">
          <span className="ev ev-tested"><span className="ev-dot" />tested</span> we ran it ·{" "}
          <span className="ev ev-verified"><span className="ev-dot" />verified</span> matches an official page we read ·{" "}
          <span className="ev ev-sourced"><span className="ev-dot" />sourced</span> secondary source, or official page not read in full ·{" "}
          <span className="ev ev-uncertain"><span className="ev-dot" />uncertain</span> inferred, conflicting, or community reports only
        </p>
      </section>

      <section>
        <h2>Sources</h2>
        <ol className="sources">
          {g.sources.map((s, i) => (
            <li key={s.id} id={`src-${i + 1}`}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>{" "}
              <span className={`kind kind-${s.kind}`}>{s.kind}</span>
              {s.retrieved && <span className="muted small"> · {s.retrieved}</span>}
            </li>
          ))}
        </ol>
        <p className="muted small">Updated {g.updatedAt}</p>
      </section>
    </article>
  );
}
