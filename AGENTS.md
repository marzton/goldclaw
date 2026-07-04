# Agent Notes

This repository is the clean home for Goldclaw work: Claude/Codex coordination, OpenClaw planning docs, and Cloudflare Worker code.

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
