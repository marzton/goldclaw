# Goldshore Architecture — Standard Operating Procedure

> **Status: DECIDED.** This document is the canonical target architecture for the
> `goldshore.ai` / `goldshore.org` platform. It resolves the open questions in
> `goldshore-ai/infra/INFRASTRUCTURE.md` (Gates 1–7) and the ambiguity around the
> gateway/redirect worker. Where this SOP conflicts with an older doc, this SOP
> wins — update the older doc to match, don't split the difference.
>
> Decided: 2026-07-12 · Supersedes ambient/agent-suggested architecture where it
> was never explicitly ratified. Written after a live audit of Cloudflare state,
> all `wrangler.toml`/`.jsonc` configs, and CI across every repo in scope.

---

## 0. The rule everything below follows

**Cloudflare Workers are multi-handler, not single-purpose.** One Worker script
can export `fetch()`, `scheduled()` (cron), `queue()` (consumer), and `email()`
(inbound mail) simultaneously, and can hold dozens of route patterns across
multiple hostnames and zones. This is *not* a limitation to work around with
extra Workers — it is the platform's actual model. A second Worker is only
justified when at least one of these is true:

1. **Different trust boundary** — e.g. a public marketing site vs. an
   Access-gated API. (Reason `gs-web` and `gs-api` are two apps, not one.)
2. **Different release cadence / blast radius** — a change that must ship
   independently without risking the main app. (Reason the www→apex redirect
   stays its own tiny Worker — see §7.)
3. **Genuinely external ownership** — a different product, team, or customer
   engagement that happens to live on Cloudflare (Armsway, Partners in Pools,
   rmarston.com). Not Goldshore's own internal architecture.

Every extra Worker in the account that doesn't meet one of these three bars is
overhead: another `wrangler.toml` to keep in sync, another binding-drift
surface, another Access application, another thing that silently goes stale.
The live-state audit (2026-07-11/12) found real, current breakage caused by
exactly this kind of unjustified fragmentation — see
`docs/integration-map.md` §6 and the audit findings folded into this doc.

---

## 1. Decision: Gateway + API are one deployable

**You asked whether gateway and API should be combined. Yes — as one Worker,
not one repo.** Reasoning:

- The "gateway" responsibilities today are: CF Access JWT validation on
  `/api/*`, CORS, and proxying to a backend. `gs-api` is that backend. Routing
  a request through a separate gateway Worker to reach `gs-api` adds a network
  hop for zero benefit — Cloudflare Workers don't need an API-gateway tier the
  way a VM/container stack does; edge routing (multiple hostnames → one
  script) and in-script `Hono`/`itty-router` dispatch do the job natively.
- This was already half-decided in the code before I got here:
  `apps/gs-api/wrangler.toml`'s `[env.production].routes` already lists
  `agent.goldshore.ai/*`, `mail.goldshore.ai/*`, `ops.goldshore.ai/*`,
  `trading.goldshore.ai/*`, `dashboard.goldshore.ai/*`, `dash.goldshore.ai/*`
  directly — not routed through `gs-gateway`/`gs-platform` at all. The
  gateway's only remaining unique job is `gw.goldshore.ai` and the
  ban-check/signals proxy hops, both of which are services `gs-api` should
  call directly as service bindings (already true for banproof-me and
  gs-signals-prod — the gateway is a middleman, not a required hop).
- `infra/INFRASTRUCTURE.md`'s own "Legacy service bindings to unwind" table
  already recommends folding `SECURITY` (banproof-me), `SIGNALS`
  (gs-signals-prod), `MAIL` (gs-mail), and `CORE` (gs-core-worker) into
  `gs-api`. This SOP ratifies that and extends it to the gateway's auth/proxy
  role too.

**What this means concretely:**
- `gs-api` owns `api.goldshore.ai`, `gw.goldshore.ai`, `agent.goldshore.ai`,
  `mail.goldshore.ai`, `ops.goldshore.ai`, `trading.goldshore.ai`,
  `dashboard.goldshore.ai`, `dash.goldshore.ai`, `api.goldshore.org` — all as
  routes on the *same* Worker script, dispatched internally by path/host.
- The standalone `marzton/goldshore-gateway` repo's *gateway Worker*
  (`gs-platform`/`gs-gateway`) is retired once traffic cutover is verified
  (see Phase 3, §9). Its CF Access JWT validation logic and ban-check /
  signals service-binding calls move into `apps/gs-api/src/routes/`.
- The **www→apex redirect stays separate** — see §7. That's a different
  question from the gateway/API one, and you're right that it's been useful:
  it's cheap, stateless, and has never been the source of a single bug in the
  audit. Don't fold it into gs-api; don't touch it.
- **goldshore-gateway the repo** doesn't have to disappear — its root app is a
  separate admin dashboard (React Router 7 + Hono), which is its own
  unresolved question (§3). The *gateway Worker subdirectory* inside that repo
  is what retires.

---

## 2. Domain-by-domain SOP

### 2.1 Front page website — `apps/gs-web` (goldshore-ai)

- **Owns:** `goldshore.ai`, `goldshore.org`, `preview.goldshore.ai`,
  `staging.goldshore.ai` (if kept).
- **Stack:** Astro + `@astrojs/cloudflare` adapter, deployed as a Cloudflare
  **Worker with Assets** (not Pages — see Phase 1 fix, §9).
- **Owns UI for:** marketing pages, docs, and *all* admin/trading/platform
  front-ends as sub-routes (`/admin`, `/app`, `/developer`). No separate
  frontend app is canonical, full stop — that's what AGENTS.md already says
  and it's correct.
- **Backend calls:** always through `api.goldshore.ai` (never a direct D1/KV
  bind from the frontend Worker for anything the API already owns — see the
  "Move gs-web storage bindings behind gs-api" direction that's already been
  started but not finished; `gs-web` should stop holding its own
  `PLATFORM_DB`/`GS_ASSETS` bindings once the equivalent gs-api routes exist).

### 2.2 Admin — sub-routes of `gs-web` + `gs-api`, not a separate app

Right now there are **three** things calling themselves "the admin
dashboard": `apps/gs-admin` (Pages, in goldshore-ai), the standalone
`marzton/goldshore-admin` repo (deploys now disabled, correctly deferring to
goldshore-ai), and the **root app of `marzton/goldshore-gateway`** (React
Router 7 + Hono admin dashboard — a third, previously undocumented one).

**Decision:** `apps/gs-web` (`/admin/*` routes) + `apps/gs-api`
(`/admin/*` API routes, Access-gated) is canonical. `goldshore-admin`
standalone is already retired correctly — leave it as-is. **The
`goldshore-gateway` repo root admin dashboard needs a decision from you**:
either (a) it's actually the same thing as `apps/gs-admin` and should be
retired too, or (b) it does something the canonical admin doesn't yet and its
useful parts get ported into `gs-web`/`gs-api` before retiring the shell.
I haven't compared their feature sets — flag if you want that comparison run
before Phase 4.

### 2.3 API / Gateway / Agent / MCP / GoldClaw — `apps/gs-api` (goldshore-ai)

One Worker, multiple route namespaces:

| Route namespace | Handles |
|---|---|
| `/api/*` (via `api.goldshore.ai`) | Core platform API |
| `/goldclaw/*` | GoldClaw operator surface — **already correctly here**, no change |
| `/mcp/*` (via `mcp.goldshore.ai` or folded route) | MCP tool server — see below |
| Internal dispatch for `gw`/`agent`/`ops` hosts | Gateway/auth/proxy logic, ported from goldshore-gateway |

**MCP decision:** fold `gs-mcp` into `gs-api` as `/mcp/*`, reusing the same
CF Access Service Token gate it already has. The one legitimate reason to keep
it separate would be a stateful transport (long-lived SSE/WebSocket) needing
isolation — Workers support both `fetch()`-based SSE streaming and Durable
Objects for stateful connections *inside* `gs-api` already (it already has a
Durable Object, `AUTH_SESSION`), so there's no platform constraint forcing a
split. Fold it in unless you know of a specific reason not to.

**GoldClaw:** already correctly implemented as `gs-api` routes +
`gs-web` admin UI per `goldshore-ai/docs/GOLDCLAW_INTEGRATIONS.md`. No change
— this is the model the rest of the platform should follow.

### 2.4 Mail handling — `apps/gs-api`'s `email()` handler

AGENTS.md already states this correctly: inbound email via Cloudflare Email
Routing → `gs-api`'s `email()` export; outbound via routes under
`apps/gs-api/src/routes/mail.ts`. `gs-mail` as a standalone Worker is legacy
and should be retired once its queue consumers
(`gs-platform-checkout-events-*`, `gs-platform-contact-events-*`) are moved to
`gs-api`'s own `queue()` handler.

### 2.5 Database — three D1s, one owner each, no exceptions

| D1 | Owner (only writer) | Read access |
|---|---|---|
| `gs_platform_db` | `gs-api` | `gs-web` may read via API, not direct bind, once §2.1's migration lands |
| `gs_audit_db` | `gs-api` (write), any Worker may write audit rows via a shared `AUDIT` service binding to `gs-api` — never a direct D1 bind from a satellite | — |
| `gs_signals_db` | `gs-api` (after signals migration, §2.6) | — |

**Live databases not yet in this table** (`gs_jobs_db`, `risk-radar-db`,
`goldshore-paper-trading`) need an explicit ownership decision — see §9 Phase
1. Right now `gs-api`'s config references a *fourth, non-existent* risk-radar
database under a different name (`gs_risk_radar_db`) than the real live one
(`risk-radar-db`) — that's a bug, not a design choice; fix it to point at the
real database or don't bind it at all.

**Rule going forward:** a database only exists in exactly one
`wrangler.toml` binding block that's actually part of the deployed
environment. If you need read access from elsewhere, it's a service-binding
call to the owner, never a second direct D1 bind. This single rule would have
prevented most of the drift the audit found.

### 2.6 Workflow — Cloudflare Workflows + Queues, inside `gs-api`

Scheduled/long-running work (signal evaluation, queue consumers, cron jobs)
belongs in `gs-api`'s `scheduled()` and `queue()` handlers, or as a
Cloudflare Workflow bound to `gs-api`. `gs-signals-prod` and
`gs-core-worker(-prod)` are the legacy satellites doing this today outside
the two-app model — migrate their cron/queue logic in, then retire the
Workers. Market-data ingestion volume is the one thing worth checking before
retiring `gs-signals-prod` (if it's polling continuously at a rate that would
dominate `gs-api`'s own request/CPU budget, keep it separate and document
*why* here rather than leaving it undocumented like today).

### 2.7 Subscription / access tiers — Cloudflare Access + Stripe, enforced in `gs-api`

Three tiers already defined in `infra/INFRASTRUCTURE.md`:

| Tier | Label | Gate |
|---|---|---|
| 1 | Public | No auth |
| 2 | Member | Stripe subscription check in `gs-api`, independent of CF Access |
| 3 | Admin | CF Access (identity-based policy) + `gs-api` role check |

Stripe billing logic (webhooks, subscription status) lives in `gs-api`
alongside GoldClaw's other provider integrations — same
draft-first/encrypted-token pattern already used for Google/Meta/X OAuth.

### 2.8 Signals / Trading — folds into `gs-api` + `gs-web`, per §2.6

`gs-trading(-prod)`'s brokerage OAuth (Schwab, Robinhood), risk engine, and
dashboard backend move into `gs-api`; the dashboard UI moves into `gs-web`
under `/app/trading`. Same reasoning as admin: one frontend, one backend,
Access-gated by Tier 2/3 above.

---

## 3. Repo → role map (uses existing public repos, no new repos)

| Repo | Role after this SOP | Action |
|---|---|---|
| `marzton/goldshore-ai` | **Canonical monorepo.** `apps/gs-web` (frontend, all UI) + `apps/gs-api` (all backend: API, gateway, agent, mail, MCP, GoldClaw, workflows, subscriptions) | Primary build target for all new work |
| `marzton/goldshore-gateway` | Gateway Worker subdirectory retires into `gs-api` (§1). Repo root's admin dashboard app — decision pending, see §2.2 | Partial retire |
| `marzton/goldshore-admin` | Already correctly retired (deploys disabled, defers to goldshore-ai) | No action — done right |
| `marzton/goldshore-api` | Standalone API predates `gs-api`; confirm no unique logic remains, then archive | Archive after parity check |
| `marzton/goldshore` (.org) | `goldshore-org` Worker's routes (`goldshore.org/*`, `www.goldshore.org/*`) conflict live with `gs-web-prod`/`gs-www-redirect-prod` (§9 Phase 2 — active bug, not hypothetical). Broker integrations (`broker-fidelity`, `broker-robinhood`, `broker-tos`) and research/rules packages are legitimate `.org`-specific IP — keep those; retire the router Worker once `gs-web` confirmed serving `.org` | Partial retire + route fix |
| `marzton/goldshore-core` | Hosts `apps/banproof-me` (external security product — keep, see §3.1) **and** an undocumented `apps/goldshore-ai` Pages project bound directly to `gs_platform_db` — this answers the canonical doc's open "Gate 1b: is the `goldshore-ai` worker a stub?" question: no, it's live, from this repo. Needs your call on whether that's intentional shared-DB access or should be removed | Needs decision, see §9 |
| `marzton/banproof-me` | External product (banproof.me) — stays external per §3.1 | No action |
| Armsway, Partners in Pools, rmarston.com | Client/personal sites — external by design (Rule 3, §0) | No action |

### 3.1 What legitimately stays external

Per the three-bar test in §0: **banproof-me stays a separate Worker.** It's a
distinct product with its own domain (banproof.me), its own trust boundary
(it's a security/reputation service *called by* gs-api, not a sub-feature of
it), and it's explicitly described as "built with Antigravity + Codex" as its
own thing. `gs-api` should call it via a service binding (already does), not
absorb its codebase. Same logic for Armsway, Partners in Pools, and
rmarston.com — client work, correctly external, not part of this
consolidation at all.

---

## 4. Naming & binding conventions (the SOP part)

These rules exist because every concrete bug the audit found was a
convention violation, not a hard problem:

1. **One environment name per app, used everywhere.** `gs-api` currently
   splits bindings across `[env.production]` (what actually deploys) and
   `[env.prod]` (dead weight) — pick one name (`prod`, matching `gs-web`'s
   convention) and update `package.json`'s deploy script to match. Never let
   a wrangler.toml have two environment blocks that look like variants of the
   same name.
2. **Resource IDs are copy-pasted from `wrangler kv namespace list` /
   `wrangler d1 list` / `wrangler r2 bucket list` output, never invented.**
   Every dead-ID bug this audit found (gs-api's fake risk-radar D1/R2/KV,
   goldshore-gateway's dead D1, goldshore-core's dead KV) was a hand-typed or
   copy-adjusted ID that never matched a real resource.
3. **One hostname, one owning Worker, checked by CI.** The
   `infrastructure-guard.yml` mechanism in goldshore-ai is the right idea —
   it's just currently broken (its heading-text search doesn't match the
   current doc structure; fix is mechanical, see §9 Phase 0) and it only
   covers `apps/*` inside that one repo. Cross-repo route collisions
   (`.org` apex, the `admin.goldshore.ai` one already fixed) need the same
   kind of check but can't run in a single repo's CI — `docs/repo-index.md`
   and `docs/cf-infrastructure.md` in *this* repo (goldclaw) are the
   practical place to keep the cross-repo route table current until/unless
   you want a scheduled cross-repo audit job.
4. **Binding names are valid identifiers.** No spaces (`"GS_WEB PROD"` is a
   live bug right now — see integration-map §6 finding #1). If a linter for
   this doesn't exist, it's a 20-line addition to `infrastructure-guard.yml`.
5. **A worker only deploys via one path.** `goldshore-gateway`'s deploy is a
   manual `workflow_dispatch` → `repository_dispatch` chain depending on an
   unverified repo variable (`WORKER_NAME`) falling back to the *repo name*
   if unset. Fragile by construction — once the gateway Worker retires this
   stops mattering; if any cross-repo dispatch pattern like this survives
   elsewhere, the fallback branch should be removed so it fails loudly
   instead of silently deploying under the wrong name.

---

## 5. What this SOP deliberately does *not* decide

- Whether `staging.goldshore.ai` / `gs-web-staging` is still needed — no
  evidence either way from the audit; keep if you're using it, delete if not.
- The `goldshore-gateway` repo-root admin dashboard's fate (§2.2) — needs a
  feature comparison against `apps/gs-admin` before a call is made.
- Whether the `goldshore-core`/`apps/goldshore-ai` Pages project's direct
  `gs_platform_db` access (§3) is intentional. If it's serving real traffic,
  document it as a fourth reader-writer of that database with an explicit
  reason; if it's dead, remove it.

These are flagged, not silently decided, because they need information I
don't have (usage data, your intent) rather than an engineering trade-off.

---

## 6. Phased execution roadmap

Not a one-shot migration — each phase is independently mergeable and
low-risk on its own.

| Phase | Work | Risk | Repos touched |
|---|---|---|---|
| **0** | Fix `infrastructure-guard.yml`'s broken heading references (mechanical, ~10 lines) | None — restores an existing check to working order | goldshore-ai |
| **1** | Fix `gs-api`'s `env.production`/`env.prod` split; remove dead risk-radar resource IDs or point them at the real `risk-radar-db`/`risk-radar-raw`/`RR_CACHE` | Low — config-only, verify with `--dry-run` before merge | goldshore-ai |
| **2** | Resolve the live `goldshore.org`/`www.goldshore.org` route collision between `goldshore-org` (marzton/goldshore) and `gs-web-prod`/`gs-www-redirect-prod` (goldshore-ai) | Medium — whichever loses the route goes dark; needs a deliberate cutover, not a race | goldshore, goldshore-ai |
| **3** | Port gateway auth/proxy + ban-check/signals dispatch into `gs-api` routes; cut `gw`/`agent` traffic over; retire `goldshore-gateway`'s gateway Worker | Medium-high — application code, needs real testing | goldshore-ai, goldshore-gateway |
| **4** | Migrate mail (`gs-mail`), MCP (`gs-mcp`), signals (`gs-signals-prod`), core-worker (`gs-core-worker`), trading (`gs-trading`) into `gs-api`; retire each satellite after traffic verification | Highest — most application code, do one satellite at a time | goldshore-ai + each satellite's repo |

I can start on Phase 0 and Phase 1 right now — they're the two fixes I
already have full, dry-run-verified evidence for. Say the word and I'll push
both as separate PRs. Phases 2–4 need your sign-off on sequencing (and, for
Phase 2, a decision on which worker keeps the `.org` apex) before I touch
live routes.
