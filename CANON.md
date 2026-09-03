# CANON.md — What Is True Now

This file is the current-state snapshot. Unlike `FOUNDATIONS.md`, it is
expected to change as facts change. When it does, update the "Last verified"
line and note what changed in `docs/open-work.md`.

Last verified: 2026-09-03 (GSC-0001 bootstrap pass, in `marzton/goldclaw`
only — see "Verification scope" below).

## Verification scope for this pass

GSC-0001 was executed with GitHub access scoped to `marzton/goldclaw` only.
Facts about `goldshore-ai`, `gearswipe.com`, `risk-radar`, `rmarston-com`,
`Marston-Portfolio`, and legacy Gold Shore repos below are carried over from
`goldclaw`'s own existing docs (`docs/repo-index.md`, `docs/architecture-sop.md`,
`docs/open-work.md`, `docs/cf-infrastructure.md`), **not** freshly re-audited
against those repos' live manifests in this pass. They are marked `verify`
where the existing docs themselves flag uncertainty. GSC-0002 (capability
inventory) should widen GitHub scope and re-confirm from live
manifests/workflows per the source-of-truth order below.

## Source-of-truth order

When documentation, local state, Cloudflare, or deployed behavior disagree,
resolve in this order — do not silently reconcile, record the drift instead:

1. Live deployed behavior, when safely verifiable
2. Runtime/provider configuration (Cloudflare dashboard, `wrangler` output)
3. Current deployment manifests (`wrangler.toml`/`.jsonc`)
4. GitHub Actions / CI workflows
5. Canonical repository documentation (`AGENTS.md`, `README.md`, SOP docs)
6. Historical documentation
7. Conversation/memory — context only, never deployment truth

## Current canonical production repos

| Domain | Canonical repo | Status |
|---|---|---|
| `goldshore.ai` (commercial AI product, platform app, API) | `marzton/goldshore-ai` | ✅ Primary, per `docs/repo-index.md` and `docs/architecture-sop.md` (decided 2026-07-12) |
| `goldshore.org` (data intelligence / research / trading arm) | `marzton/goldshore` | ✅ Active, per `docs/repo-index.md` |
| GearSwipe | `marzton/gearswipe.com` | Treated as canonical per issue GSC-0001 constraints; not independently re-audited this pass — `verify` |

`goldshore-ai` is a two-app monorepo: `apps/gs-web` (Astro) and `apps/gs-api`
(Worker, which also absorbs the former gateway/platform routing — see
`docs/architecture-sop.md` §1). All other `apps/*` stubs in `goldshore-ai`
are legacy/validation-only, not routed to.

## Goldclaw's current role

`marzton/goldclaw` is the **temporary pre-Cortex coordination repository**.
It is not renamed as part of GSC-0001. It currently holds:

- Cross-repo docs (`docs/repo-index.md`, `docs/open-work.md`,
  `docs/secrets-map.md`, `docs/cf-infrastructure.md`,
  `docs/integration-map.md`, `docs/architecture-sop.md`)
- The GSC canon being established by this task
- Worker code under `workers/` and `src/worker.js` (an MCP OAuth front-door
  for `mcp.goldshore.ai`) plus `server.js` / `mcp.json` (a local MCP server)

**Drift note:** `AGENTS.md` in this repo states "No deployable code lives
here" / this repo is "the clean home for ... Cloudflare Worker code," while
`CLAUDE.md` (this repo's own root doc) states "No deployable code lives
here. This repo is agent-facing documentation and ops only." These two
statements conflict with each other and with the actual repo contents
(`src/worker.js`, `workers/`, `wrangler.jsonc`, `server.js` are present and
non-trivial). Recorded as drift, not silently resolved. `verify`: whether
`goldclaw`'s Worker code is live/deployed, or vestigial and pending removal
once its function fully moves into `gs-api`.

## Cortex status

**Planned / incubating.** No Cortex infrastructure exists yet. This document
set (`FOUNDATIONS.md`, `CANON.md`, `LEXICON.md`, `NAMING.md`,
`REGISTRY.yaml`, `docs/DECISIONS/ADR-0001-system-taxonomy.md`,
`docs/HANDOFF.md`, `docs/CAPABILITIES.md`) is GSC-0001: the canon phase. No
Worker, D1 database, KV namespace, R2 bucket, or queue for Cortex has been
created. GSC-0004 (preview infrastructure bootstrap) is explicitly
follow-on and not part of this pass.

## Legacy / superseded repository handling

Do not infer ownership from a repo name. Per `docs/repo-index.md`'s
migration plan (Phase 4, in progress as of `docs/open-work.md`):

| Repo | Status | Action |
|---|---|---|
| `goldshore-ops` | Superseded | Archive (KV template stub, never built, no CI) |
| `goldshore-web` | Superseded | Archive (deprecated Pages project, replaced by `gs-web`) |
| `goldshore-api` | Superseded | Archive (rebuild-target duplicate; live routes are in `gs-api`) |
| `goldshore-admin` | Superseded, not yet archived | Superseded by `gs-web`/`gs-api` `/admin/*` routes; keep standalone until an explicit migration plan is approved |
| `goldshore-core` | Migration target identified | `banproof-me` Worker migrates into `gs-api` routes/queues; do not create a new `apps/*` Worker for it |
| `goldshore-gateway` | Migration target identified | Gateway routing consolidated into `gs-api`; keep repo until traffic verification, then archive |
| `goldshore-org` | Status TBD | `verify` |

None of these repos are renamed, merged, or archived by GSC-0001. This table
restates existing decisions already recorded in `docs/repo-index.md` and
`docs/open-work.md`; it does not authorize new action.

## What GSC-0001 does NOT do

Per issue #58 and the bootstrap prompt, this pass explicitly does not:
rename `goldclaw`; create a `goldshore-cortex` repo; archive or merge any
repo; deploy anything to production; touch Cloudflare DNS, Workers,
databases, secrets, OAuth, or IAM; or commit credentials, `.dev.vars`, OAuth
material, or local session transcripts.

## Current cross-repo PR branch

`claude/risk-radar-fra-epo-2wk5mk` — per `CLAUDE.md` and
`docs/repo-index.md`, this mirrors an in-flight cross-repo feature branch
unrelated to GSC-0001. GSC-0001 work lives on its own branch
(`claude/gsc-bootstrap-foundation-8uji3d`), not that one.

## Unresolved facts requiring verification

- Whether `gearswipe.com` repo content matches the GearSwipe description in
  this canon (not independently audited this pass).
- Whether `risk-radar`, `rmarston-com`, and `Marston-Portfolio` repos exist
  under those exact names/paths and what they currently deploy.
- Whether `goldclaw`'s own Worker code (`src/worker.js`, `workers/`) is
  currently deployed and serving *live traffic*. **Partially narrowed,
  2026-09-03, still disputed:** Cloudflare's GitHub Git-integration bot
  confirmed a "production" build/deploy fires on a push to a non-`main`
  feature branch carrying a docs-only commit — so the Worker's Cloudflare
  Workers Build is wired to this repo and does something on every push,
  independent of PR merge state. Whether that something is a live traffic
  shift or just a new version upload is contested by a separate,
  independent investigation of this same repo — see
  `docs/DECISIONS/ADR-0002-goldclaw-worker-naming.md` "Additional finding"
  for both readings; not resolved without a live dashboard check.
- `goldshore-org` status.
- Full legacy Gold Shore repo list — `docs/repo-index.md` names
  `goldshore-ops`, `goldshore-web`, `goldshore-api`, `goldshore-admin`,
  `goldshore-core`, `goldshore-gateway`, `goldshore-org`; the bootstrap
  prompt also lists `goldshore`, `goldshore-labs` as potential additional
  legacy repos not otherwise evidenced in this pass.
- **The `gs-mcp` Worker does not exist.** `docs/cf-infrastructure.md` and
  `docs/integration-map.md` both document `mcp.goldshore.ai` as served by a
  Worker named `gs-mcp`. A live `workers_list` check (2026-09-03) against
  both Cloudflare accounts reachable from this session (Gold Shore Labs
  `f77de112d2019e5456a3198a8bb50bd2`: 11 Workers; and
  `d86cd71f0d1c8b8e08928a32e0c95ae3`: 0 Workers) found no Worker by that
  name in either. Per the source-of-truth order above, live Cloudflare
  state wins — `gs-mcp` is either undeployed, deleted, or renamed, and the
  docs referencing it are stale. See
  `docs/DECISIONS/ADR-0002-goldclaw-worker-naming.md`.
- **Whether the `goldclaw` Cloudflare Worker actually serves
  `mcp.goldshore.ai`.** The live Worker named `goldclaw` runs OAuth
  front-door/discovery code that self-describes as intended for an MCP
  transport (`resource_name: "GoldShore MCP Portal"`), which is suspicious
  alongside the missing `gs-mcp` Worker above — but this session's
  Cloudflare tooling cannot read the Worker's bound custom domain/routes to
  confirm it. Verify from the dashboard's Domains & Routes tab for that
  Worker, or via `wrangler` with account access, before deciding whether
  `goldclaw` is live production MCP traffic or an unused scaffold.
