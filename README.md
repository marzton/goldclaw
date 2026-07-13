# Goldclaw

Clean collaboration repo for Claude, Codex, OpenClaw planning, and Cloudflare Worker experiments.

## Layout

- `docs/` - Cross-repo ops docs: `integration-map.md` (master goldshore.ai/.org integration map), `cf-infrastructure.md`, `secrets-map.md`, `repo-index.md`, `open-work.md`, plus OpenClaw scaling notes, migration references, and implementation templates.
- `workers/goldshore/` - Cloudflare Workers + KV scaffold for Goldshore.
- `AGENTS.md` - Operating notes for AI coding agents working in this repo.

## Goldshore Worker

```powershell
cd workers\goldshore
npm ci
npm run types
npm run check
npm run dev
```

`npm run dev` uses local KV simulation. `npm run dev:remote` uses the Wrangler `remote` environment after a real KV namespace ID is added to `workers/goldshore/wrangler.jsonc`.

## Repo Rules

Keep local agent state, credentials, OAuth files, session logs, and machine-specific backups out of git. This repo should contain source, docs, examples, and automation only.
