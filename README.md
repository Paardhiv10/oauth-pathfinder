# OAuth Pathfinder

**How long will it take before your users can click "Connect"?**

**Live:** https://oauthpathfinder.vercel.app (generating a new guide asks for an access code)

You're building an AI agent and want users to connect GitHub, Gmail or LinkedIn. First you have to create an OAuth app with each provider, and some providers make you pass a review. OAuth Pathfinder tells you, for a given app:

- **How hard it is.** A five-step grade: Instant, Easy, Moderate, Hard, Gated.
- **Two separate timelines.** When *you* can connect your own account, and when *any customer* can. Developers underestimate the gap between these most.
- **The route.** Phases and steps, each tagged *agent can do this*, *you do this*, or *provider's turn* (waiting on a review).
- **Requirements, scope tiers, blockers and fixes.** Using the real error messages where they're known.
- **Whether you need your own app at all.** Each guide checks Composio's managed OAuth directory and says if a managed app already exists.
- **How much to trust it.** Every claim is tagged `tested`, `verified`, `sourced` or `uncertain` and linked to its sources. Each guide ends with what was checked, what was corrected, and what couldn't be verified.

There are six curated guides. For any other app, an agent researches and writes the guide live in about 1–2 minutes. You can watch it search, read pages and check itself while it works.

## Run it

```bash
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY to enable live generation
npm run dev                     # http://localhost:3000
npm test                        # offline end-to-end test of the agent pipeline (no API key needed)
```

The curated library works without a key. Live generation needs `ANTHROPIC_API_KEY` (paid, from platform.claude.com).

**Deploy:** push to GitHub, import into Vercel, set `ANTHROPIC_API_KEY` and `ACCESS_CODE` so strangers can't spend your API budget. The generate route sets `maxDuration = 300`.

**Cost:** about $0.10 per guide on the default model, `claude-haiku-5-5`. That is measured on one run (Calendly, 16 Nov 2026: 231k input tokens, 16k output tokens, 7 web searches). Web search is most of the cost. Each run prints its own token use and cost in the progress log.

| Env var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Live generation on Claude with its built-in web search and fetch |
| `ANTHROPIC_MODEL` | Optional; defaults to `claude-haiku-5-5`. `claude-sonnet-5-5` is stronger and costs more |
| `ACCESS_CODE` | Optional; the generate page asks for it before running. A link ending in `?code=<the code>` fills it in for that browser |
| `ANTHROPIC_BASE_URL` | Optional; used for testing against a mock API |

## What's in the library, and why these six

The apps were picked to cover the main ways setup gets hard, not just the most popular apps:

| App | Grade | What makes it different |
|---|---|---|
| GitHub | Instant | No review at all. The main choice is OAuth App vs GitHub App, and orgs may need to approve your app |
| Slack | Easy | Self-serve, but apps are locked to one workspace until you turn on distribution |
| Notion | Easy | Per-user, per-page access. The install scope can't be changed later. Older guides say there are no refresh tokens; that's now wrong |
| Microsoft Outlook / Graph | Moderate | No review, but users in other companies may be unable to consent without publisher verification |
| Gmail | Hard | Your choice of scopes decides whether you need a paid annual security assessment |
| LinkedIn | Gated | Business vetting at LinkedIn's discretion. A rejection means starting over with a new app |

## Key decisions

1. **The main question is "when can my customers connect?", not "how do I get a client ID?"** Every provider gives you credentials in minutes, and most docs stop there. Each guide splits *first connection* from *production* and says whose clock each wait is on: your effort or the provider's review.
2. **Scope choice comes first.** For Gmail, `gmail.send` takes about 10 days of review while `gmail.readonly` brings in a security assessment that repeats every year. So every guide opens with "Decide before you start". Those are the choices that change the route.
3. **Evidence is enforced in code, not just requested in the prompt.** The prompt asks the agent to tag claims honestly. After that, `lib/evidence.ts` checks each cited source against the pages the agent *actually* searched or fetched:
   - "verified" without a retrieved official page becomes "sourced"
   - a claim citing a URL the agent never saw becomes "uncertain"
   - "tested" is reserved for things the server ran itself

   Every downgrade is listed in the guide.
4. **The agent attempts what it safely can.** It can't sign in to developer consoles or submit forms. Those steps need a person, and pretending otherwise would be wrong. What the server *does* run is a link test: it requests the developer console, the docs and every official source, and classifies each as reachable, login wall, blocked or broken. Broken links go into "Not verified".
5. **Each step says who does it.** For an agent builder, the useful split is what an agent can do (draft the privacy-policy section, scope justifications and demo-video script; write the callback code; test the flow) versus what needs a human (DNS, legal entity, recording, submitting). The bar under the verdict shows that split for every guide.
6. **Shareable without a database.** Curated guides have permanent URLs (`/apps/github`). A generated guide is compressed into the URL fragment (`/g#…`), so the link holds the whole guide. Nothing is stored server-side, and the fragment is never sent to the server. Guides also export as Markdown, to paste into a ticket or PR, and as JSON.
7. **"Do I need my own app?" is answered by lookup, not by the model.** A developer on Composio may be able to skip the whole route. Each guide looks the app up in a dated snapshot of Composio's managed OAuth directory (`data/composio-directory.json`: 126 managed, 275 bring-your-own) and shows one of three answers: managed app available, supported but bring your own, or not listed. The guide names the toolkit it matched so a wrong match is visible.
8. **A route to 100 apps that keeps humans in the loop.** `npm run generate-library` runs the same agent over `data/app-list.json` (100 apps) and writes guides to `data/generated/`. They're labelled *Agent-generated · not human-reviewed* and only enter the curated library after review.

## How generation works

```
POST /api/generate  (Server-Sent Events)
  ├─ research    Claude searches the web (up to 8 searches) and reads pages (up to 6)
  ├─ write       Claude writes the guide as JSON, tagging each claim with its sources
  ├─ normalize   coerce to the schema, clamp the grade, validate URLs and owners
  ├─ evidence    downgrade claims not backed by retrieved sources (deterministic)
  ├─ link test   request the console, docs and official sources; record HTTP results
  ├─ confidence  cap the rating by how many official pages were read in full
  └─ directory   look the app up in the Composio managed-OAuth snapshot
```

The model does the research with Claude's built-in web search and fetch tools (`lib/agent.ts`). The server records every search result and every page the model fetched, and the checks after the draft run against that record, not against what the model says it read. If the draft isn't valid JSON, one repair request is made.

It was run live on 16 Nov 2026 with `claude-haiku-5-5`: Calendly took 74 seconds, 7 searches and 3 page reads, and cost about $0.10. Identical requests are cached in memory for 6 hours.

An earlier version ran on Gemini's free tier with keyless web search. It was removed because it failed too often for a live demo; `VERIFICATION.md` records what happened.

## Limitations

- **No real console runs.** Neither the agent nor I signed in to provider consoles or submitted a review. The guides describe those steps, but this run didn't execute them. See `VERIFICATION.md`.
- **Review times are soft.** Providers rarely publish them, and when they do, forum reports often disagree. We show both and mark community-only claims `uncertain`.
- **One model provider, no fallback.** If the Claude API is down or the key has no credit, generation fails with the provider's error message.
- **Generated guides vary between runs.** The evidence check limits overclaiming, but the agent can still miss a requirement it never found. The confidence rating and the "Not verified" list are there for this reason.
- **The link test is basic.** Many consoles answer bots with 403 or a login redirect. The test separates "blocked" and "login wall" from "broken", but it can't tell whether a page's content is right.
- **Cache and rate limiting are in-memory.** They are per serverless instance. Production would need a shared store (KV/Redis) and per-user limits.
- **The Composio lookup is a snapshot matched by name.** It goes stale as Composio adds toolkits, and it doesn't check whether the managed app's scopes fit your use case.
- **The library is small.** It has 6 curated guides plus a batch script and a 100-app list, not 100 reviewed guides.

## Project layout

```
app/                 pages: home + library, /apps/[slug], /generate, /g (shared), /api/generate
components/          GuideView (the guide), Generator (live run), GuideActions (share/export)
lib/agent.ts         the Claude agent, plus the checks every generated guide goes through
lib/generate.ts      reads the model and key from the environment
lib/evidence.ts      deterministic evidence check
lib/probe.ts         link testing
lib/composio.ts      lookup in the Composio managed-OAuth directory snapshot
lib/prompt.ts        system prompt + guide schema given to the model
data/guides/*.json   curated guides
data/generated/*.json  guides the agent wrote, saved unedited
data/app-list.json   100 target apps for the batch script
data/composio-directory.json   snapshot of Composio's managed OAuth directory (12 Nov 2026)
scripts/             offline pipeline test, batch generator
VERIFICATION.md      what was checked, corrected, and left unverified
```

No credentials are committed. `.env*` is gitignored.
