import type { Evidence, Guide, Owner } from "@/lib/types";
import { GuideActions } from "./GuideActions";
import { Meter } from "./Meter";

const OWNER_LABEL: Record<Owner, string> = { agent: "Agent", you: "You", provider: "Provider" };
function ManagedAuthNote({ m }: { m: NonNullable<Guide["managedAuth"]> }) {
  return (
    <aside className={`managed managed-${m.status}`} aria-label="Managed OAuth app">
      <div className="managed-head">
        <span className="managed-dot" aria-hidden />
        <h2>
          {m.status === "managed" && "You may not need your own OAuth app"}
          {m.status === "byo" && "You need your own OAuth app"}
          {m.status === "not-listed" && "You need your own OAuth app"}
        </h2>
      </div>
      {m.status === "managed" && (
        <p>
          Composio provides a managed OAuth app for <strong>{m.toolkit}</strong>, so your users can connect without you
          registering an app or waiting on a review. Follow this guide if you need your own name on the consent
          screen, scopes beyond Composio's defaults, or a quota that isn't shared with other Composio users.
        </p>
      )}
      {m.status === "byo" && (
        <p>
          Composio supports <strong>{m.toolkit}</strong>, but does not provide the OAuth app. You register your own
          and supply its client ID and secret, so this guide applies in full.
        </p>
      )}
      {m.status === "not-listed" && (
        <p>
          This app is not in Composio's managed OAuth directory, so there is no shared app to fall back on. This guide
          applies in full.
        </p>
      )}
      <p className="muted small">
        Looked up in <a href={m.url} target="_blank" rel="noreferrer">Composio's managed OAuth directory</a>, snapshot
        of {m.checkedAt}. Matched by name, so confirm on the toolkit page.
      </p>
    </aside>
  );
}

const STATUS_LABEL = { tested: "Tested", verified: "Verified", sourced: "Sourced", uncertain: "Uncertain" } as const;

function Ev({ e, sources }: { e: Evidence; sources: Guide["sources"] }) {
  const refs = (e.sources || []).map((id) => sources.findIndex((s) => s.id === id)).filter((i) => i >= 0);
  return (
    <span className="ev">
      <span className={`ev-tag ev-${e.status}`} title={e.note || undefined}>
        <span className="ev-dot" aria-hidden />
        {STATUS_LABEL[e.status]}
      </span>
      {refs.map((i) => (
        <a key={i} href={`#src-${i + 1}`} className="ev-ref" aria-label={`Source ${i + 1}`}>{i + 1}</a>
      ))}
      {e.note && <span className="ev-note">{e.note}</span>}
    </span>
  );
}

function OwnerTag({ o }: { o: Owner }) {
  return <span className={`owner owner-${o}`}><span className="owner-dot" aria-hidden />{OWNER_LABEL[o]}</span>;
}

export function GuideView({ guide: g, permalink }: { guide: Guide; permalink?: boolean }) {
  const steps = g.phases.flatMap((p) => p.steps);
  const counts = {
    agent: steps.filter((s) => s.owner === "agent").length,
    you: steps.filter((s) => s.owner === "you").length,
    provider: steps.filter((s) => s.owner === "provider").length,
  };
  const toc = [
    g.decideFirst.length && ["decide", "Decide first"],
    ["route", "Route to production"],
    g.requirements.length && ["requirements", "Requirements"],
    g.scopeTiers?.length && ["scopes", "Scope tiers"],
    g.blockers.length && ["stuck", "If you get stuck"],
    g.nuances.length && ["nuances", "Details that bite later"],
    ["trust", "How much to trust this"],
    ["sources", "Sources"],
  ].filter(Boolean) as [string, string][];
  let n = 0;

  return (
    <article className="guide">
      <div className="glow-panel guide-hero">
      <header className="guide-head">
        <div className="guide-kicker">
          <span className="muted">{g.category}</span>
          <span className={`pill ${g.mode === "curated" ? "pill-curated" : "pill-generated"}`}>
            {g.mode === "curated" ? "Curated" : "Agent-generated, not reviewed"}
          </span>
        </div>
        <h1>{g.name}</h1>
        <p className="guide-summary">{g.summary}</p>
        <GuideActions guide={g} permalink={permalink} />
      </header>
      </div>

      <section className="glance" aria-label="At a glance">
        <div className="glance-grade">
          <Meter d={g.verdict.difficulty} label={g.verdict.label} large />
          <span className="muted small">{g.verdict.confidence[0].toUpperCase() + g.verdict.confidence.slice(1)} confidence</span>
        </div>
        <dl className="glance-grid">
          <div><dt>Your own account</dt><dd>{g.verdict.timeToFirstConnection}</dd></div>
          <div><dt>Any user can connect</dt><dd>{g.verdict.timeToProduction}</dd></div>
          <div><dt>Waiting on the provider</dt><dd>{g.verdict.approvalWait}</dd></div>
          <div><dt>Your hands-on effort</dt><dd>{g.verdict.handsOnEffort}</dd></div>
        </dl>
        <div className="glance-foot">
          <div className="who">
            <span className="muted small">Who does the {steps.length} step{steps.length === 1 ? "" : "s"}</span>
            <div className="who-bar" aria-hidden>
              {counts.agent > 0 && <span className="w-agent" style={{ flex: counts.agent }} />}
              {counts.you > 0 && <span className="w-you" style={{ flex: counts.you }} />}
              {counts.provider > 0 && <span className="w-provider" style={{ flex: counts.provider }} />}
            </div>
            <div className="who-legend small">
              <span><span className="owner-dot o-agent" />Agent {counts.agent}</span>
              <span><span className="owner-dot o-you" />You {counts.you}</span>
              <span><span className="owner-dot o-provider" />Provider {counts.provider}</span>
            </div>
          </div>
          <div className="glance-links">
            {g.consoleUrl && <a className="btn btn-secondary" href={g.consoleUrl} target="_blank" rel="noreferrer">Developer console ↗</a>}
            {g.docsUrl && <a className="btn btn-ghost" href={g.docsUrl} target="_blank" rel="noreferrer">Official docs ↗</a>}
          </div>
        </div>
      </section>

      {g.managedAuth && <ManagedAuthNote m={g.managedAuth} />}

      <div className="guide-body">
        <nav className="toc" aria-label="On this page">
          <p className="toc-title">On this page</p>
          <ul>{toc.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul>
        </nav>

        <div className="guide-main">
          {g.decideFirst.length > 0 && (
            <section id="decide" className="gsec">
              <h2>Decide before you start</h2>
              <p className="gsec-sub">These choices change everything below.</p>
              <div className="decide">
                {g.decideFirst.map((d, i) => (
                  <div key={i} className="decide-item">
                    <h3>{d.question}</h3>
                    <p>{d.guidance}</p>
                    <Ev e={d.evidence} sources={g.sources} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="route" className="gsec">
            <h2>Route to production</h2>
            {g.phases.map((p, pi) => (
              <div key={pi} className="phase">
                <div className="phase-head">
                  <div>
                    <span className="phase-label">Phase {pi + 1} of {g.phases.length}</span>
                    <h3>{p.name.replace(/^\d+\s*·\s*/, "")}</h3>
                    <p className="muted small">{p.goal}</p>
                  </div>
                  <span className="phase-dur">{p.duration}</span>
                </div>
                <ol className="steps">
                  {p.steps.map((s, si) => {
                    n++;
                    return (
                      <li key={si} className={`step step-${s.owner}`}>
                        <span className="step-n" aria-hidden>{n}</span>
                        <div className="step-body">
                          <div className="step-top">
                            <h4>{s.title}</h4>
                            <OwnerTag o={s.owner} />
                          </div>
                          <p>{s.detail}{s.url && <> <a href={s.url} target="_blank" rel="noreferrer">Open ↗</a></>}</p>
                          <Ev e={s.evidence} sources={g.sources} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>

          {g.requirements.length > 0 && (
            <section id="requirements" className="gsec">
              <h2>Requirements</h2>
              <ul className="checklist">
                {g.requirements.map((r, i) => (
                  <li key={i}>
                    <span className="check" aria-hidden />
                    <div>
                      <p className="check-item">{r.item}</p>
                      <p className="muted small">Needed for: {r.requiredFor}{r.note ? `. ${r.note}` : ""}</p>
                      <Ev e={r.evidence} sources={g.sources} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {g.scopeTiers && g.scopeTiers.length > 0 && (
            <section id="scopes" className="gsec">
              <h2>How your scopes change the review</h2>
              <div className="tiers">
                {g.scopeTiers.map((t, i) => (
                  <div key={i} className="tier">
                    <h3>{t.tier}</h3>
                    <p className="mono small">{t.examples}</p>
                    <p>{t.consequence}</p>
                    <Ev e={t.evidence} sources={g.sources} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {g.blockers.length > 0 && (
            <section id="stuck" className="gsec">
              <h2>If you get stuck</h2>
              <div className="accordion">
                {g.blockers.map((b, i) => (
                  <details key={i}>
                    <summary>{b.symptom}</summary>
                    <div className="acc-body">
                      <p><span className="muted">Why:</span> {b.cause}</p>
                      <p><span className="muted">Fix:</span> {b.fix}</p>
                      <Ev e={b.evidence} sources={g.sources} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {g.nuances.length > 0 && (
            <section id="nuances" className="gsec">
              <h2>Details that bite later</h2>
              <ul className="notes">
                {g.nuances.map((x, i) => (
                  <li key={i}><h3>{x.title}</h3><p>{x.detail}</p><Ev e={x.evidence} sources={g.sources} /></li>
                ))}
              </ul>
            </section>
          )}

          <section id="trust" className="gsec">
            <h2>How much to trust this guide</h2>
            <div className="trust">
              <div className="trust-col">
                <h3><span className="t-icon t-ok" aria-hidden>✓</span>Checked</h3>
                <ul>{g.verification.checked.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
              <div className="trust-col">
                <h3><span className="t-icon t-fix" aria-hidden>↻</span>Corrected</h3>
                <ul>{g.verification.corrected.length ? g.verification.corrected.map((x, i) => <li key={i}>{x}</li>) : <li className="muted">Nothing needed correcting</li>}</ul>
              </div>
              <div className="trust-col">
                <h3><span className="t-icon t-q" aria-hidden>?</span>Not verified</h3>
                <ul>{g.verification.unverified.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            </div>

            {g.linkChecks && g.linkChecks.length > 0 && (
              <div className="linkcheck">
                <h3>Link test</h3>
                <p className="muted small">Run by the server while the guide was generated.</p>
                <ul>
                  {g.linkChecks.map((l, i) => (
                    <li key={i}>
                      <span className={`lc lc-${l.result}`}>{l.result.replace("-", " ")}</span>
                      <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                      <span className="muted small mono">{l.status ?? "no response"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="legend">
              <div><dt><span className="ev-tag ev-tested"><span className="ev-dot" />Tested</span></dt><dd>The server ran it</dd></div>
              <div><dt><span className="ev-tag ev-verified"><span className="ev-dot" />Verified</span></dt><dd>Matches an official page we read</dd></div>
              <div><dt><span className="ev-tag ev-sourced"><span className="ev-dot" />Sourced</span></dt><dd>Secondary source, or official page not read</dd></div>
              <div><dt><span className="ev-tag ev-uncertain"><span className="ev-dot" />Uncertain</span></dt><dd>Inferred, conflicting, or forum reports</dd></div>
            </dl>
          </section>

          <section id="sources" className="gsec">
            <h2>Sources</h2>
            <ol className="sources">
              {g.sources.map((s, i) => (
                <li key={s.id} id={`src-${i + 1}`}>
                  <span className="src-n">{i + 1}</span>
                  <div>
                    <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
                    <div className="muted small">
                      {s.kind}{s.retrieved ? ` · ${s.retrieved.replace("-", " ")}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="muted small">Last updated {g.updatedAt}</p>
          </section>
        </div>
      </div>
    </article>
  );
}
