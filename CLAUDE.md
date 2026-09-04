# CLAUDE.md — goldclaw

goldclaw is the cross-repo ops and knowledge hub for the goldshore ecosystem.
It absorbs the planned `claude-codex` role: a shared reference for AI agents
(Claude Code, Codex, Gemini) working across goldshore repositories.

No deployable code lives here. This repo is agent-facing documentation and ops only.

> **Note (GSC-0001, 2026-09-03):** this repo also contains `src/worker.js`,
> `workers/`, `wrangler.jsonc`, and `server.js` — Worker/MCP-server code
> that predates this "no deployable code" statement. That's a documented
> drift, not a contradiction to silently paper over — see `CANON.md`
> ("Goldclaw's current role").

**Read `FOUNDATIONS.md`, `CANON.md`, `LEXICON.md`, and `REGISTRY.yaml`
first.** They are the shared Gold Shore Cortex (GSC) canon and are
authoritative over anything below — this file stays a thin pointer, not a
duplicate. See `docs/HANDOFF.md` for the cross-agent handoff protocol and
`docs/CAPABILITIES.md` for the runtime capability manifest format.

---

## What lives here

| Path | Purpose |
|------|--------|
| `docs/repo-index.md` | Authoritative map of every goldshore repo — domain, status, canonical apps |
| `docs/open-work.md` | Running log of in-flight PRs, blockers, pending actions across all repos |
| `docs/secrets-map.md` | Secret names by repo (no values — values live in GitHub Actions Secrets) |
| `docs/cf-infrastructure.md` | Complete Cloudflare resource map: Workers, KV, D1, R2, Access Applications |
| `docs/integration-map.md` | Master cross-subsystem integration map — how Web, Gateway, Signals, Ops, Org, AI, API, MCP, Admin, Socials, Trading, Pages, email, OAuth, agents, and devices share information across goldshore.ai + goldshore.org |
| `docs/architecture-sop.md` | **Canonical target architecture (decided).** Domain-by-domain ownership (website/admin/API+gateway+MCP+GoldClaw/mail/database/workflow/subscription), repo→role map, naming conventions, and phased execution roadmap. Read this before proposing new Workers or repos. |
| `docs/DRIVE_MIRROR.md` | Convention for mirroring artifacts, decisions, and handoffs into the GS Cortex Google Drive workspace — folder IDs, category→folder mapping, and what triggers a mirror-write. |

---

## Agent conventions

- **Claude Code** is the primary agent for `goldshore-ai` and `goldclaw`.
- **Codex** reviews PRs; its comments appear as GitHub review events.
- **Gemini** (Antigravity) handles local IDE sessions on HP Laptop.
- When handing off between agents, update `docs/open-work.md` before ending the session.

---

## Cloudflare infrastructure

All CF resources (Workers, KV, D1, R2, Access Applications) are documented in
`docs/cf-infrastructure.md`. Key facts agents must know:

- **Account ID**: `f77de112d2019e5456a3198a8bb50bd2` (Gold Shore Labs)
- **Historical snapshot (2026-07-08):** 24 Workers deployed across
  goldshore.ai, goldshore.org, armsway.com, banproof.me; 28 KV namespaces,
  6 D1 databases, 7 R2 buckets. **Not re-verified in full** — treat as
  stale until refreshed.
- **Partial re-observation (2026-09-03, ADR-0002 review):** a live
  `workers_list` call against this same account found **11 Workers**, not
  24. Only the Worker count was checked this pass — KV/D1/R2 counts are
  unverified either way. Recorded as drift per `CANON.md`'s source-of-truth
  order (live state outranks documentation); not reconciled by editing the
  2026-07-08 figure, since that would erase evidence of which count came
  from where. A full Cloudflare resource re-audit is still open work.
- For CF Access-protected endpoints, agents must send `CF-Access-Client-Id` /
  `CF-Access-Client-Secret` headers from the `CF_ACCESS_CLIENT_ID` /
  `CF_ACCESS_CLIENT_SECRET` GitHub Actions Secrets
- See `docs/secrets-map.md` for which secrets belong in which repo

---

## Current cross-repo PR branch

`claude/risk-radar-fra-epo-2wk5mk` — mirrors the cross-repo feature branch.

Use this branch only when continuing the current cross-repo Claude handoff.
For unrelated future work, create a task-specific branch. Never push directly to
`main` without explicit user permission.

---

## Goldshore ecosystem at a glance

Two product domains:

| Domain | Canonical repo | Purpose |
|--------|---------------|--------|
| `goldshore.ai` | `marzton/goldshore-ai` | Commercial AI product, platform app, API |
| `goldshore.org` | `marzton/goldshore` | Data intelligence / research / trading arm |

See `docs/repo-index.md` for the full repo map.
