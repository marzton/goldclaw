# Agent Notes

This repository is the clean home for Goldclaw work: Claude/Codex coordination, OpenClaw planning docs, and Cloudflare Worker code.

## Read this first

Before anything else, read (in order): `FOUNDATIONS.md`, `CANON.md`,
`LEXICON.md`, `REGISTRY.yaml`. They are the shared canon for the Gold Shore
Cortex (GSC) effort and take precedence over anything below if the two ever
disagree — this file stays thin on purpose and should not duplicate
doctrine that belongs there. See `docs/HANDOFF.md` before resuming or
handing off in-progress work, and `docs/CAPABILITIES.md` before assuming
what tools/connectors are available to your session.

## Boundaries

- Do not copy files from `C:\Users\marst\.claude` wholesale.
- Do not commit `.credentials.json`, session transcripts, local backups, `.dev.vars`, OAuth material, or tool-result logs.
- Keep generated dependencies out of git.
- Prefer scoped changes inside `docs/` or `workers/<name>/`.

## Checks

For the Goldshore Worker:

```powershell
cd workers\goldshore
npm ci
npm run types
npm run check
```

Local Wrangler runtime may require the latest Microsoft Visual C++ Redistributable on Windows.
