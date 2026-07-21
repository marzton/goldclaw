# Open Work Log

Running log of in-flight PRs, blockers, and pending actions across goldshore repos.
Update when status changes. Most-recent entries at the top of each section.

> Full refresh: 2026-07-13.

---

## In-flight PRs

| PR | Repo | Branch | Status | Notes |
|----|------|--------|--------|-------|
| #5621 | `goldshore-ai` | `claude/gs-web-admin-zero-trust` | 🟡 Draft | Gates `/admin` + `/api/admin` with CF Access JWT check (fail-closed 401); restores corrupted `lead-submissions.ts`/`forms/index.ts` imports. CI green (gs-api-build-test, gs-web-build, lint-test-build, CodeQL, GitGuardian); only pre-existing/unrelated Cloudflare Pages+Workers infra checks (`gs-admin`, `gs-signals-prod`) still fail. Reviewed 2026-07-13 — one actionable finding open: CSV export (`buildCsv`/`escapeCsvValue` in `lead-submissions.ts`) has no formula-injection escaping for the leading `=`/`+`/`-`/`@` case; public contact-form data flows into it. `mergeable_state: blocked` (draft). Still needs the manual Zero Trust Access Application for `goldshore.ai/admin/*` — no MCP/API tool can provision that. |
| #6 | `goldclaw` | `claude/goldshore-infrastructure-integration-ywmxlt` | 🟡 Draft, clean | `docs/architecture-sop.md` — ratifies target architecture (gateway+API merge into one Worker, MCP folds into `gs-api`, admin is sub-routes not a separate app, D1 ownership rules, phased roadmap). Docs-only, no CI in this repo. Awaiting mark-ready/merge. |

---

## Pending user actions (cannot be done by Claude)

| Action | Where | Priority |
|--------|-------|----------|
| Local git triage on HP Laptop: `codex/add-workflow-mirror-badge-2026-07-03` is 117 commits behind `main`, 1 ahead, dirty tree | HP Laptop, `goldshore-ai` local clone | 🔴 High — don't auto-pull/merge until triaged |
| Untracked `apps/gs-mcp/` on that same local branch violates the two-app rule (`AGENTS.md`, `architecture-sop.md` §2.3 both say MCP folds into `apps/gs-api` as `/mcp/*` routes, not a new app dir) — move logic into `gs-api` before committing, or keep untracked/gitignored as scratch | HP Laptop, `goldshore-ai` local clone | 🔴 High |
| Create Self-hosted Access Application for `goldshore.ai/admin/*` (+ `/api/admin/*`) in Zero Trust → Access → Applications | Cloudflare dashboard | 🔴 High — unblocks real auth for PR #5621; the 401 in-code is defense-in-depth only |
| Generate a Cloudflare API token scoped for Workers Scripts:Edit + Pages:Edit + Account Settings:Read, for the Cloudflare Pages/Workers cleanup audit (renamed-but-undeletable Pages projects like `goldshore-api`→`gs-goldclaw-pages`, legacy `gs-admin` Pages project, Worker inventory drift vs. `infra/INFRASTRUCTURE.md` Gate 1) | New token: https://dash.cloudflare.com/profile/api-tokens | 🟡 Medium — session has no Pages API access and can't delete Workers without it |
| Complete Atlassian/Rovo OAuth flow — endpoint config already migrated off deprecated `/v1/sse` to `/v1/mcp/authv2` locally, but the OAuth handshake itself hasn't been finished | HP Laptop, Claude connector settings | 🟡 Medium |
| Add `workflow` scope to local `gh` CLI auth if that session will push `.github/workflows/*` changes (`gh auth refresh -s workflow`) | HP Laptop | 🟢 Low — only matters if workflow files change from that session |
| Optional provider secrets still missing (core secret sync passes without them): `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_OAUTH_CLIENT_SECRET`, `OAUTH_TOKEN_ENCRYPTION_KEY`, `META_APP_SECRET`, `STRIPE_API_KEY`, `MAILCHANNELS_SENDER_EMAIL`, `ACLED_API_KEY`, `MARKET_DATA_API_KEY`, `RESEND_API_KEY`, `FORMSPREE_ENDPOINT` | Secret Sync app (127.0.0.1:8798) / GitHub Actions secrets | 🟢 Low — optional |
| Renew `CLOUDFLARE_API_TOKEN` and add to `goldshore-gateway` secrets | https://github.com/marzton/goldshore-gateway/settings/secrets/actions | 🟡 Medium — unconfirmed whether still needed since PR #213 merged 2026-07-07; reverify |
| Create `GOOGLE_CHAT_WEBHOOK` and add to `goldshore-ai` + `goldshore-gateway` secrets | GitHub Actions secrets in both repos | 🟡 Medium — enables failure notifications; unconfirmed if done |
| Revoke old GCP `github-storage-access` service account key | https://console.cloud.google.com/iam-admin/serviceaccounts | 🔴 High if not already done — old key was exposed in chat |

---

## Recently completed

| Date | Item |
|------|------|
| 2026-07-13 | `goldclaw#6` opened — `docs/architecture-sop.md` ratifies target architecture after full live-state audit |
| 2026-07-13 | `goldshore-ai#5621` opened and reviewed — CF Access gate for `/admin` surface |
| 2026-07-12 | `goldshore-ai#5620` merged — fixed `gs-admin-build` `@goldshore/auth` workspace-resolution deadlock |
| 2026-07-12 | `goldshore-ai#5619` merged — restored corrupted `gs-web` routes (`index.astro`, `api/forms/[slug].ts`, dangling import call sites) |
| 2026-07-12 | `goldshore-ai#5618` merged — fixed `gs-api` `env.production`/`env.prod` split and dead risk-radar D1/R2/KV IDs |
| 2026-07-12 | `goldshore-ai#5617` merged (`infrastructure-guard.yml` heading-reference fix, Phase 0) then reverted same day via `#5622` — reason not given by reverter; unresolved, worth asking before redoing |
| 2026-07-08 | `goldclaw#5` merged — `docs/integration-map.md` master cross-subsystem map, live CF state refresh (24 Workers, 28 KV, 6 D1, 7 R2), 11 drift findings |
| 2026-07-08 | `goldclaw#1` merged — established goldclaw as cross-repo ops hub |
| 2026-07-08 | `goldshore-ai#5492` closed without merge — dev tooling/CI notifications/CLAUDE.md breadcrumbs; superseded, not landed |
| 2026-07-07 | `goldshore-gateway#213` merged |
| 2026-07-04 | `GOOGLE_ADS_DEVELOPER_TOKEN` rotated |

---

## Open questions carried from `architecture-sop.md` (not yet decided)

- `staging.goldshore.ai` / `gs-web-staging` — still needed, or dead?
- `goldshore-gateway` repo-root admin dashboard's fate — same as `apps/gs-admin`, or does it do something unique? No feature comparison run yet.
- `goldshore-core`'s undocumented `apps/goldshore-ai` Pages project with a direct `gs_platform_db` bind — intentional shared access, or dead and removable?
