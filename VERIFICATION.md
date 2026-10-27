# Verification report

What was checked for the curated guides, what was corrected along the way, and what remains uncertain. Research date: **27 Oct 2026**.

## Method

1. For each app, searched official docs first, then integration-platform docs (Nango, Unified.to, Nylas, Prismatic) and community forums for real-world timelines and errors.
2. Read official pages in full where the details mattered most: Notion Authorization and LinkedIn Community Management App Review. Other official pages were checked against search excerpts of the official text.
3. Tagged every claim:

| Tag | Meaning |
|---|---|
| `tested` | We ran it. In the live generator this means the server's link test. |
| `verified` | Matches text on an official provider page that was retrieved |
| `sourced` | Secondary source, or an official page that wasn't retrieved |
| `uncertain` | Conflicting sources, community reports, or inference |

4. When sources disagreed, we followed the most authoritative and most recent one and recorded the conflict below.

## Corrections: sources that were wrong or out of date

| App | What a source said | What we found | Basis |
|---|---|---|---|
| Notion | Nango's integration notes: Notion has no refresh tokens and access tokens never expire | Notion's current Authorization docs return a `refresh_token` and document a refresh endpoint that returns a new token pair | Official page, read in full |
| Notion | Older tutorials: "integrations" at notion.so/my-integrations | Now called **connections**, at app.notion.com/developers/connections. Installation scope ("Any workspace" / "Selected workspaces only") is fixed when you create the connection | Official page, read in full |
| Gmail | A third-party guide (Unipile) lists `gmail.readonly` as *Sensitive*, meaning no security assessment | `gmail.readonly` is *Restricted*, so a CASA assessment is required. This is per Google's restricted-scope materials and two other integration platforms. Getting it wrong would hide a multi-week, paid step | Majority of sources, including Google's restricted list as cited by others |
| Gmail | A blanket "Gmail always needs a security audit" | Only *restricted* scopes need CASA. `gmail.send` is sensitive: demo video and justification, but no assessment | Multiple consistent sources |
| GitHub | Some Japanese-language versions of "Creating an OAuth app" say OAuth apps support multiple callback URLs and GitHub Apps don't | The English page says the opposite: OAuth Apps have **one** callback URL, GitHub Apps can have several | English official page (authoritative) |
| LinkedIn | Many guides: "Request the Marketing Developer Platform" | Access is now per product (e.g. Community Management API) with Development and Standard tiers. Secondary sources report MDP is closed to new apps | Official review page (read in full) + secondary sources |
| Microsoft | "MPN ID" | Now the **Partner One ID** of the Microsoft (AI) Cloud Partner Program. It must be the partner global account, not a location ID | Microsoft Learn excerpts |
| Slack | Docs links at api.slack.com | Docs have moved to docs.slack.dev, which we now cite | Official site |

## Things that surprised us, which is why they get prominent space

- **Google's official timeline and real experience differ.** Google says sensitive-scope verification can take up to 10 days. 2026 forum threads describe 5–8+ weeks stuck at "privacy policy review" with no email from Google. A third-party summary also notes that two official Google pages give different durations (3–5 vs 10 business days). We show both and plan around 2–4 weeks.
- **A rejected LinkedIn app can't re-apply.** The official page says to create a new app and start the Development tier again. This changes how carefully you should prepare the first submission.
- **Microsoft has no app review, but unverified apps can still be blocked.** Risk-based step-up consent (since Nov 2020) means ordinary users in other tenants may be unable to consent to an unverified multitenant app. This is effectively an approval gate.
- **Notion connections and GitHub org access are per user or per org.** The OAuth flow can succeed while the agent still sees nothing useful until the user shares pages or the org owner approves the app.

## Not verified

- **No live console runs.** We didn't register apps, submit reviews, or complete provider approvals. Those need signed-in accounts, real domains and, for Google, LinkedIn and Microsoft, a real business. Each guide says which steps need a human.
- **Durations:** Google sensitive and restricted review in practice, LinkedIn review (no official figure; third-party estimates of 4 weeks to 4 months), Microsoft Partner Program enrollment for a new company, and whether Notion public connections get a manual review before the Authorization URL appears.
- **CASA cost and duration** ($500–$4,500; 2–3 weeks for tier 2, 4–6 weeks for tier 3) come from Google's *Health API* verification page, not a Gmail-specific page. We show them as an indication only.
- **Slack Marketplace prerequisites** (5+ active workspaces, security review) come from a single secondary source.
- **GitHub redirect-URI matching rules** were confirmed on several Enterprise Server versions of the docs, not re-read on the current github.com page.

## Checks on the generator itself

`npm test` replays a realistic streamed Claude response, including web search, web fetch and the final guide, through the full pipeline. It asserts that:

- a `verified` claim backed by a fetched official page stays `verified`
- a `verified` claim citing only a blog is downgraded to `sourced`
- a claim citing a URL the agent never retrieved is downgraded to `uncertain`
- a model-claimed `tested` with no source becomes `uncertain` (only the server can mark things tested)
- the link test classifies a login redirect as `login-wall` and a 404 as `not-found`, and records broken links under "Not verified"

The `/api/generate` streaming route was also run end to end against a mock Anthropic server, and against the real API with an invalid key to check that errors surface cleanly in the UI. **A live run with a real key wasn't possible in the build environment.** Run one or two apps after deploying, before the demo.
