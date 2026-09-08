# Goldshore Repo Index

Authoritative map of every repo in the `marzton` goldshore ecosystem.
Update this file when repos are created, archived, or change status.

---

## Active — goldshore.ai domain

| Repo | What it deploys | Canonical apps | Status |
|------|----------------|---------------|--------|
| `marzton/goldshore-ai` | `goldshore.ai/*`, `api.goldshore.ai/*` | `apps/gs-web` (Astro), `apps/gs-api` (Worker) | ✅ Primary |
| `marzton/goldshore-gateway` | Former `gs-platform` gateway Worker | standalone Worker | Historical/archive candidate; cutover evidence pending |

### goldshore-ai legacy stubs (do not route new work here)

Per `AGENTS.md` in `goldshore-ai`: the repo is a two-app monorepo (`gs-web` + `gs-api`).
All other `apps/*` in `goldshore-ai` are retained only for workspace validation.

| App stub | Worker name | Note |
|----------|------------|------|
| `apps/gs-admin` | `gs-admin` | Legacy — superseded by standalone `goldshore-admin` |
| `apps/gs-mcp` | `gs-mcp` | Legacy |
| `apps/gs-cron` | `gs-cron` | Legacy |
| `apps/gs-signals` | `gs-signals` | Legacy |
| `apps/gs-gateway` | `gs-platform` | STUB only — real code in `goldshore-gateway` |

---

## Active — goldshore.org domain

| Repo | What it deploys | Notes |
|------|----------------|-------|
| `marzton/goldshore` | `.org` domain apps | `goldshore-agent`, `goldshore-api`, `goldshore-mcp`, `goldshore-web`; broker integrations (Fidelity, Robinhood, TOS) |
| `marzton/goldshore-core` | `banproof-me` Worker | Security/ban-check; called by gateway on every request. Built with Antigravity + Codex. Migration target: `apps/gs-api` routes/queues in `goldshore-ai`; do not create a new `apps/*` Worker. |

---

## Standalone admin / tooling

| Repo | What it deploys | Status |
|------|----------------|--------|
| `marzton/goldshore-admin` | `admin.goldshore.org` (Pages) | Active standalone admin; `goldshore-ai/apps/gs-admin` is legacy/out-of-scope unless the two-app policy changes |
| `marzton/goldshore-api` | standalone API | Confirm parity with `goldshore/apps/goldshore-api` → archive |
| `marzton/goldshore-ops` | — | Archive candidate — KV template stub, never built |
| `marzton/goldshore-web` | — | Deprecated — remove from CI |
| `marzton/goldshore-org` | `.org` site | Status TBD |

---

## Agent / tooling repos

| Repo | Purpose | Status |
|------|---------|--------|
| `marzton/goldclaw` | Cross-repo ops hub (this repo) | ✅ Active |
| `marzton/goldshore-ai` (`.github/workflows/`) | CI: Lighthouse, CF deploy, token management, Codex review, Chat notify | ✅ Active |

---

## Migration plan

| Priority | Repo | Action |
|----------|------|--------|
| 1 | `goldshore-ops` | Archive |
| 2 | `goldshore-web` | Remove from CI → archive |
| 3 | `goldshore-core` | Migrate `banproof-me` → `goldshore-ai/apps/gs-api` routes/queues → archive |
| 4 | `goldshore-api` | Confirm parity → archive standalone |
| 5 | `goldshore-admin` | Keep standalone until an explicit admin migration plan preserves the two-app policy |
| 6 | `goldshore-gateway` | Keep standalone gateway; `goldshore-ai/apps/gs-gateway` remains a validation stub |

---

## Key shared identifiers

| Resource | Value |
|----------|-------|
| Cloudflare Account ID (Gold Shore Labs) | `f77de112d2019e5456a3198a8bb50bd2` |
| Current cross-repo PR branch | `claude/risk-radar-fra-epo-2wk5mk` |
| pnpm version | 9 |
| Node target | see per-app `package.json` `engines` field |
