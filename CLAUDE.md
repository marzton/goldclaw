# CLAUDE.md — goldclaw

goldclaw is the cross-repo ops and knowledge hub for the goldshore ecosystem.
It absorbs the planned `claude-codex` role: a shared reference for AI agents
(Claude Code, Codex, Gemini) working across goldshore repositories.

No deployable code lives here. This repo is agent-facing documentation and ops only.

---

## What lives here

| Path | Purpose |
|------|---------|
| `docs/repo-index.md` | Authoritative map of every goldshore repo — domain, status, canonical apps |
| `docs/open-work.md` | Running log of in-flight PRs, blockers, pending actions across all repos |
| `docs/secrets-map.md` | Secret names by repo (no values — values live in GitHub Actions Secrets) |

---

## Agent conventions

- **Claude Code** is the primary agent for `goldshore-ai` and `goldclaw`.
- **Codex** reviews PRs; its comments appear as GitHub review events.
- **Gemini** (Antigravity) handles local IDE sessions on HP Laptop.
- When handing off between agents, update `docs/open-work.md` before ending the session.

---

## Active feature branch

`claude/risk-radar-fra-epo-2wk5mk` — mirrors the cross-repo feature branch.

Development branch rule: all work in this and sibling repos goes on
`claude/risk-radar-fra-epo-2wk5mk`. Never push directly to `main` without explicit
user permission.

---

## Goldshore ecosystem at a glance

Two product domains:

| Domain | Canonical repo | Purpose |
|--------|---------------|--------|
| `goldshore.ai` | `marzton/goldshore-ai` | Commercial AI product, platform app, API |
| `goldshore.org` | `marzton/goldshore` | Data intelligence / research / trading arm |

See `docs/repo-index.md` for the full repo map.
