# Verification report

What was checked for the curated guides, what was corrected along the way, and what remains uncertain. Research date: **27 Oct 2026**. Gmail and LinkedIn were re-checked against the official pages on **12 Nov 2026** (see below).

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
| Gmail | A third-party guide (Unipile) lists `gmail.readonly` as *Sensitive*, meaning no security assessment | `gmail.readonly` is *Restricted*, so a CASA assessment can be required. Getting it wrong would hide a multi-week, paid step | Google's Gmail scopes page, read in full on 12 Nov 2026. The first version rested on secondary sources only |
| Gmail | A blanket "Gmail always needs a security audit" | Only *restricted* scopes need CASA. `gmail.send` is sensitive: demo video and justification, but no assessment | Multiple consistent sources |
| GitHub | Some Japanese-language versions of "Creating an OAuth app" say OAuth apps support multiple callback URLs and GitHub Apps don't | The English page says the opposite: OAuth Apps have **one** callback URL, GitHub Apps can have several | English official page (authoritative) |
| LinkedIn | Many guides: "Request the Marketing Developer Platform" | Access is now per product (e.g. Community Management API) with Development and Standard tiers. Secondary sources report MDP is closed to new apps | Official review page (read in full) + secondary sources |
| Microsoft | "MPN ID" | Now the **Partner One ID** of the Microsoft (AI) Cloud Partner Program. It must be the partner global account, not a location ID | Microsoft Learn excerpts |
| Slack | Docs links at api.slack.com | Docs have moved to docs.slack.dev, which we now cite | Official site |

## Re-check of the two hardest guides (12 Nov 2026)

The first pass leaned on search excerpts for Gmail. Four official pages were then read in full and compared with the guides claim by claim.

| Page read in full | What it confirmed | What changed in the guide |
|---|---|---|
| Google: Sensitive scope verification | "Up to 10 days"; public homepage; privacy policy on the same domain; Search Console domain verification; a justification per scope; a demo video | Domain-verification and sensitive-tier claims raised from `sourced` to `verified` |
| Google: Choose Gmail API scopes | The tier of every scope the guide names. `gmail.labels` is Non-sensitive, `gmail.send` is Sensitive, and `gmail.readonly`, `gmail.modify`, `gmail.compose`, `gmail.insert`, `gmail.metadata`, `gmail.settings.basic`, `gmail.settings.sharing` and `mail.google.com` are Restricted | Scope-tier claims raised to `verified`; `gmail.settings.*` spelled out as the two real scopes |
| Google: Restricted scope verification | "Several weeks"; CASA; an assessment at least every 12 months | **Corrected:** the guide said restricted scopes always need the assessment. The page ties it to storing or transmitting the data on servers. The guide now states the condition |
| LinkedIn: Community Management App Review | All 16 claims that cite it | **Sharpened:** a rejection at the Standard tier also means a new app and a new Development tier request. **Added:** a second app can reuse an existing Standard approval |

Results:

- **Gmail:** verified claims went from 6 to 12 of 31. Confidence was **lowered from high to medium**, because the requirements are now confirmed but real review times still rest on forum reports.
- **LinkedIn:** no claim was wrong. One was made more precise and one detail was added.
- **Still not confirmed for Gmail:** the assessment cost (Google's restricted-scope page gives none), and the Google Cloud Help pages on the 100-user cap, 7-day token expiry and brand verification, which were seen as search excerpts only.

## Composio managed-app status

Each guide says whether Composio already provides an OAuth app for that provider. This is a lookup in a snapshot of [Composio's managed OAuth directory](https://docs.composio.dev/toolkits/managed-auth) taken on 12 Nov 2026 (126 managed toolkits, 275 bring-your-own), stored in `data/composio-directory.json`. The model is not asked, because it would guess.

- All six curated apps are listed as managed.
- Of the 100 apps in `data/app-list.json`: 59 managed, 22 bring-your-own, 19 not listed.
- The match is by name, so the guide shows which toolkit it matched and asks the reader to confirm. Two known soft matches: "Zoho CRM" matches "Zoho", and "Dropbox Paper" matches "Dropbox".
- Not checked: whether the managed app's default scopes cover a given use case. For LinkedIn in particular, a managed app does not remove LinkedIn's own product gating.

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

The `/api/generate` streaming route was also run end to end against a mock Anthropic server, and against the real API with an invalid key to check that errors surface cleanly in the UI. ## Live runs of the generator

### On Claude (16 Nov 2026), the version that ships

| Run | Result | What it showed |
|---|---|---|
| Calendly | Moderate, medium confidence, 74s, 7 searches, 3 official pages read, 33 claims with none downgraded, 7 of 8 links reachable, about $0.10 | The full path works on the cheapest model. The guide left its scope-tiers section empty although it read Calendly's scopes page |

| TikTok | Moderate, medium confidence, 81s, 5 searches, 5 pages read, 40 claims with none downgraded, about $0.08. All 8 links gave no response to the link test | TikTok's developer site refuses automated requests. The guide reports that as "no response", not "broken", and asks the reader to open the links in a browser |
| Plausible Analytics | Reported that Plausible has no OAuth for third-party apps, only per-team API keys on a paid plan. 63s, 4 searches, about $0.06 | The "no OAuth" case is handled. The grade came out as Gated, which fits "you cannot build this" better than it fits a review |
| Typeform (on the deployed site) | Easy, medium confidence, 6 searches, 30 claims, 5 of 5 links reachable, about $0.08 | The deployed route works end to end, including the access code |

All runs used `claude-haiku-5-5`. The first three guides are saved unedited in `data/generated/`. `claude-sonnet-5-5` has not been run live.

### On Gemini's free tier (12 Nov 2026), since removed

The first version used a free Gemini key, with the server doing its own web search and page reading. What happened, including the failures:

| Run | Search | Result | What it showed |
|---|---|---|---|
| Linear | DuckDuckGo worked | Easy, 71s, 5 pages read, 19 claims, none downgraded | The full path worked: search, plan, read, write, checks |
| TikTok | Blocked | First attempt rated itself high confidence while three of its seven "read" pages were the site's empty app shell | **Bug found and fixed:** confidence is now capped by the official pages actually read, whatever the model claims. That cap is still in the shipped version |
| TikTok (re-run) | Blocked | Hard, medium confidence, 102s. Two guessed URLs correctly rejected as 404 | The guide says search was unavailable |
| Linear (re-run) | Blocked | Low confidence; 5 of 6 guessed URLs were 404 | Without search the agent could not find Linear's developer docs. It said so rather than filling the gap. Not kept as an example |
| Plausible Analytics | Blocked | Correctly reported that Plausible has no OAuth for third-party apps, only API keys | The "no OAuth" case is handled |
| Calendly | Blocked | **Failed:** every Gemini model tried returned 503 "busy" | Free-tier capacity was too unreliable for a live demo |

Why it was removed:

- Gemini's built-in Google Search is refused on the free tier (HTTP 429 on the first request).
- DuckDuckGo, the keyless search used instead, refused requests after about six searches from one address.
- Gemini's free models returned "busy" often enough that a live run could not be relied on.

None of the saved example guides come from these runs; all three were regenerated on Claude.

`npm test` also covers the Composio lookup: exact names, typed variants ("Monday.com", "notion.so", "Gmail (Google)"), a bring-your-own entry that shares a prefix with a managed one ("Dropbox Sign"), and an unknown app.
