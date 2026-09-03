# ADR-0002 — `goldclaw` Cloudflare Worker: naming and setting review

- Status: Accepted (review only — no Cloudflare changes made)
- Date: 2026-09-03
- Task: follow-on to GSC-0001, requested via `marzton/goldclaw` chat session
- Scope: the live Cloudflare Worker named `goldclaw`
  (`dash.cloudflare.com/f77de112d2019e5456a3198a8bb50bd2/workers/services/view/goldclaw/production/domains`),
  account `f77de112d2019e5456a3198a8bb50bd2` (Gold Shore Labs).

## What was reviewed

Live Cloudflare state (via the Cloudflare Developer Platform MCP connector,
read-only) cross-checked against this repo's own `wrangler.jsonc`,
`src/worker.js`, `NAMING.md`, `CANON.md`, `LEXICON.md`, `REGISTRY.yaml`,
`docs/cf-infrastructure.md`, and `docs/integration-map.md`.

**Not reviewed:** the Worker's actual bound custom domain(s)/routes. The
Cloudflare Developer Platform MCP tools available to this session expose
Worker existence, script ID, and code, but not route/custom-domain
bindings — that page (`.../goldclaw/production/domains`) has to be read
directly in the dashboard. Everything below that depends on the live
domain binding is flagged `verify`, not asserted.

Confirmed via `workers_list` on both Cloudflare accounts this session can
reach (`f77de112d2019e5456a3198a8bb50bd2` Gold Shore Labs — 11 Workers,
and `d86cd71f0d1c8b8e08928a32e0c95ae3` — 0 Workers): **no Worker named
`gs-mcp` exists in either account.**

## Setting-by-setting review

| Setting | Live value | Question asked | Verdict |
|---|---|---|---|
| Worker name (top-level `name`) | `goldclaw` | Does the name describe what this Worker does, per `NAMING.md`'s app/service convention (short prefix + role, e.g. `gs-api`, planned `gsc-mcp`, `claw-gateway`)? | **No** — see "Naming analysis" below. Kept as-is this pass; see "Decision." |
| `env.prod.name` | `goldclaw` (explicitly pinned) | Does pinning this avoid the Wrangler auto-suffix trap documented in `goldshore-ai/CLAUDE.md` (`<name>-<env>` on deploy)? | **Yes, correct as-is.** Matches the pattern goldshore-ai already had to learn the hard way (`gs-web-prod`/`gs-api-prod` orphaning). Keep this pin regardless of the naming decision below. |
| `main` | `./src/worker.js` | Any naming implication? | None. Fine. |
| `compatibility_date` | `2026-07-22` | Meaningfully stale vs. today (2026-09-03)? | Minor drift, not a naming concern. Low priority — this Worker's surface (a handful of `Response.json`/redirect branches) doesn't depend on recent runtime features. Not blocking. |
| Bindings (KV/D1/R2/Queues/Secrets Store) | **None declared** in `wrangler.jsonc`; none returned by the platform for this script | Do any existing bindings violate `NAMING.md`'s `UPPER_SNAKE_CASE`, same-name-across-environments rule? | **N/A — nothing to violate.** If/when this Worker needs to persist OAuth client registrations or token state, that binding should be named for its *function* (e.g. `MCP_OAUTH_KV`), not `GOLDCLAW_*`, regardless of the Worker-name decision below — bindings name the resource's job, not the Worker's name. |
| Env vars read in code (`ACCESS_AUTHORIZATION_URL`, `ACCESS_CLIENT_ID`, `ACCESS_TEAM_DOMAIN`) | Optional; code falls back to hardcoded defaults (`goldshore.cloudflareaccess.com`, a literal Access client ID) when unset | Are these named/shaped per convention? | **Yes**, already `UPPER_SNAKE_CASE` and generic (not `GOLDCLAW_*`) — correctly scoped to *what they configure* (Cloudflare Access), not to the Worker's own name. One hygiene note, not a naming issue: `DEFAULT_ACCESS_CLIENT_ID` is a literal fallback baked into source rather than only ever coming from `env`. Access client IDs aren't secret, but baking in a production default makes the "optional" framing in the `wrangler.jsonc` comment slightly misleading — worth an explicit `ACCESS_CLIENT_ID` var instead of relying on the source default, next time this file is touched. Not addressed here (out of scope, no functional bug). |
| Custom domain / route | **Unverified this pass** — see "Not reviewed" above | Does the live domain match what the repo's own docs claim serves that traffic? | **Cannot confirm from here — this is the single fact that would most change the naming decision.** See "Open question requiring the dashboard" below. |

## Naming analysis

Two separate naming problems surfaced, not one:

### 1. The Worker's name doesn't describe its function, per `NAMING.md`

The live worker's own code identifies its job explicitly: an OAuth
front-door / discovery surface for an **MCP transport**
(`resource_name: "GoldShore MCP Portal"`, routes for
`/.well-known/oauth-authorization-server`, `/authorize`, `/callback`,
`/register`, `/token`, `/mcp`), gated behind Cloudflare Access. Nothing in
its code is `goldclaw`-repo-specific — it doesn't serve docs, ops tooling,
or cross-repo coordination. `NAMING.md`'s own planned-surface list already
has better-fitting names for exactly this role: `gsc-mcp` (planned Cortex
MCP surface) or `claw-gateway` (planned CLAW-facing gateway). Under
`NAMING.md`'s convention (repos are kebab-case nouns; *apps/services* are
short-prefix-plus-role), `goldclaw` reads as a repo name pressed into
service as a Worker name, not a service name.

### 2. `goldclaw` (the Worker) is not `GoldClaw` (the documented gs-api operator surface) — and nothing currently says so

This is new drift, not previously recorded anywhere in the canon set.
`docs/integration-map.md` and `docs/architecture-sop.md` both use
**"GoldClaw"** to mean a specific, already-implemented feature living
inside `goldshore-ai`: the `/goldclaw/*` routes in `apps/gs-api`, its
Google OAuth flow (`api.goldshore.ai/goldclaw/oauth/google/callback`), and
its admin UI at `goldshore.ai/admin/goldclaw` (`apps/gs-web`) — a
socials/operator automation surface, documented in
`goldshore-ai/docs/GOLDCLAW_INTEGRATIONS.md`.

The Cloudflare Worker literally named `goldclaw`, reviewed here, **is a
different thing entirely** — unrelated code, unrelated purpose, living in
a different repo (`marzton/goldclaw`, not `goldshore-ai`). Until this ADR,
no document in this repo's canon set (`LEXICON.md` included, which already
disambiguates `CLAW` the concept from `goldclaw` the repo) flagged that a
*third*, capitalization-only-distinguished "GoldClaw" exists as a live
feature name inside a completely different codebase. A human or agent
searching logs, dashboards, or `grep -i goldclaw` across the ecosystem
will hit both without any signal they're unrelated.

### 3. `docs/cf-infrastructure.md`'s claim about `mcp.goldshore.ai` does not match live Cloudflare state

`docs/integration-map.md:146` and `docs/cf-infrastructure.md:126` both
state `mcp.goldshore.ai` → Worker `gs-mcp`, CF Access Service-Token-only.
**No Worker named `gs-mcp` exists in either Cloudflare account this
session can reach.** Per `CANON.md`'s source-of-truth order, live
Cloudflare state outranks documentation — this is recorded as drift, not
silently reconciled (see `CANON.md` update alongside this ADR). Two
non-exclusive explanations are consistent with current evidence:

- `gs-mcp` was planned/documented but never actually deployed, and the
  `goldclaw` Worker's own OAuth-front-door code (self-described as
  incomplete: `/token` and `/register` return `501 oauth_not_configured`,
  `/mcp` returns `501` with a comment about "restoring `/authorize` and
  `/callback` first") is an early, still-unfinished attempt to be that
  front door under the wrong name.
- `gs-mcp` was deployed once, then deleted or renamed, and the docs were
  never updated (`docs/cf-infrastructure.md` self-reports its last live
  verification as 2026-07-08, over a month before this review).

Either way, **the question "should `goldclaw` be renamed" cannot be
answered independently of "does `goldclaw` currently receive traffic at
`mcp.goldshore.ai`, and is `gs-mcp` real, planned, or abandoned?"** — that
requires the domain/route binding this session's tools cannot read.

## Additional finding: this repo auto-deploys `goldclaw` to production on push

While this PR was open, Cloudflare's GitHub Git-integration bot posted a
"Deployment successful" build status against this very branch
(`claude/cortex-setup-state-p6i4c4`, commit `838c02b8`) for the `goldclaw`
Worker's **production** build
(`.../workers/services/view/goldclaw/production/builds/...`). That commit
contained **no code changes** — it only added documentation
(`docs/artifacts/ART-GSC-UI-0001.md`, `docs/open-work.md`). Cloudflare
still rebuilt and redeployed the Worker to production from it.

This means `goldclaw`'s Cloudflare Workers Build is wired directly to this
GitHub repository (likely on push to any branch, not just `main`/merge),
independent of PR review or merge state. That has two consequences beyond
this ADR's naming question:

1. It is now-verified evidence that **`goldclaw`'s Worker code is live and
   continuously deployed**, resolving one of `CANON.md`'s prior `verify`
   items ("whether `goldclaw`'s Worker code is currently deployed/live") —
   yes, it is, and automatically so on every push.
2. Every future branch push to this repo — including doc-only ones — has
   the side effect of a production redeploy. That's worth a human decision
   independent of this ADR (whether that's intended CI/CD behavior or an
   overly broad build trigger that should be scoped to `main`), but it is
   out of scope to change here: this ADR only records the observation,
   consistent with "record drift, don't silently reconcile."

## Decision

**Keep the Worker named `goldclaw` for this pass. Do not rename it now.**

This is a deliberate non-action, for three independent reasons, any one of
which would be sufficient alone:

1. **GSC-0001's own stop conditions apply.** `CANON.md` "What GSC-0001 does
   NOT do" explicitly rules out touching Cloudflare Workers/DNS/production
   this phase, and reserves Cortex-namespaced infrastructure (`gsc-*`) for
   GSC-0004. Renaming this Worker to `gsc-mcp` today — the name that best
   fits its actual function per `NAMING.md` — would claim a `GSC-CORTEX`
   surface (`REGISTRY.yaml`: `status: RESERVED`, no infrastructure exists
   yet) before Cortex infrastructure formally exists. That's exactly the
   kind of premature commitment the canon phase is designed to prevent.
2. **The Worker's own home is unsettled, independent of Cortex.** Per
   `CANON.md` "Goldclaw's current role," this repo's own docs (`AGENTS.md`,
   `CLAUDE.md`) already disagree about whether *any* deployable code
   belongs in `goldclaw` at all. Renaming this specific Worker without
   first resolving whether this OAuth-front-door code should live here,
   move into `gs-api` (which already owns MCP per
   `docs/architecture-sop.md` §2.3: `/mcp/*` via `mcp.goldshore.ai` "or
   folded route"), or be deleted as an abandoned `gs-mcp` duplicate, is
   polishing a label on code whose home is itself an open question.
3. **The deciding fact is unverified.** Whether this Worker is live traffic
   for `mcp.goldshore.ai` today changes the answer materially — a live,
   traffic-serving front door is not something to casually rename even
   with approval; a dead scaffold with zero real traffic is a much lower-
   stakes rename or deletion. This ADR does not know which it is.

**What would change this decision:** once someone with dashboard access
confirms (a) whether `goldclaw` is bound to `mcp.goldshore.ai` or another
domain, and (b) whether `gs-api`'s MCP route or a real `gs-mcp` Worker is
the intended long-term home for MCP traffic, the follow-up decision is
mechanical:

- If `goldclaw` **is** live MCP front-door traffic and is meant to stay a
  standalone Worker (not folded into `gs-api`) → rename to `gsc-mcp` only
  once GSC-0004 (Cortex preview infrastructure) is actually underway, not
  before; until then, leave named `goldclaw` and treat the current name as
  an accepted temporary label, same as the repo it lives in.
- If `goldclaw` is dead scaffold work superseded by folding MCP into
  `gs-api` per `docs/architecture-sop.md` §2.3 → the right action is likely
  **decommission**, not rename — record that as its own decision when
  confirmed, don't just relabel an unused Worker.
- Either way, `LEXICON.md` gets the disambiguation entry added below
  regardless of which path is chosen, since the name collision with the
  `gs-api` "GoldClaw" operator surface is real today and independent of
  what happens to this Worker.

## Consequences

- `LEXICON.md` gains a disambiguation entry: `goldclaw` (repo) /
  `goldclaw` (this Cloudflare Worker) / `GoldClaw` (the unrelated `gs-api`
  operator/socials surface) are three different things sharing a name.
- `CANON.md` "Unresolved facts requiring verification" gains two entries:
  the `gs-mcp` Worker's non-existence, and the live domain/route binding
  for the `goldclaw` Worker.
- `REGISTRY.yaml` gains a `worker`-class entry for the Cloudflare Worker
  itself, distinct from the existing `REPO-GOLDCLAW` repository entry,
  since a repo and the Worker deployed from it are different resources
  with potentially different names, lifecycles, and — per this ADR —
  potentially different eventual homes.
- No Cloudflare state changes as a result of this ADR. Any rename or
  decommission is future work requiring the verification above plus
  explicit approval (production Worker changes require sign-off per the
  Authority Model in `FOUNDATIONS.md`).

## Alternatives considered

- **Rename now to `gsc-mcp`, matching its actual function.** Rejected:
  claims a `RESERVED` Cortex surface before Cortex infrastructure exists,
  and doesn't resolve whether this code should live under Cortex naming at
  all versus being folded into `gs-api`'s existing MCP route ownership.
- **Rename now to something neutral like `mcp-oauth-frontdoor`, sidestepping
  the Cortex-naming question.** Rejected: still doesn't answer whether this
  code should exist as a standalone Worker at all once the `gs-mcp`/`gs-api`
  question is resolved — a neutral rename today could still need reversing
  next month, for no benefit gained now (this pass makes no Cloudflare
  changes regardless).
- **Do nothing / don't write this up.** Rejected: the `gs-mcp` non-existence
  and the `GoldClaw`-vs-`goldclaw` name collision are real, previously
  unrecorded facts that the next agent to touch MCP, OAuth, or Cloudflare
  routing in this ecosystem needs, per the canon's own "record drift, don't
  silently reconcile" rule.
