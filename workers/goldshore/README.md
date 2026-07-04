# Goldshore Worker

Cloudflare Workers + Workers KV scaffold for local development, remote KV testing, and staging/production deploys from VS Code.

## Quick Start

```powershell
cd C:\Users\marst\goldclaw\workers\goldshore
npm install
npm run cf:login
npm run types
npm run dev
```

The local dev server starts on `http://localhost:8787` and uses Wrangler's local KV simulation.

## KV Namespaces

Create Cloudflare KV namespaces, then paste the printed IDs into `wrangler.jsonc`.

```powershell
npm run kv:create:staging
npm run kv:create:production
```

Update these placeholders:

- `env.staging.kv_namespaces[0].id`
- `env.production.kv_namespaces[0].id`
- `env.remote.kv_namespaces[0].id` when you want local code to talk to Cloudflare-hosted KV

## Local vs Remote

```powershell
npm run dev          # local Worker, local KV simulation
npm run dev:remote   # local Worker, remote Cloudflare KV binding
npm run dev:staging  # local Worker, staging config with local KV simulation
```

Remote KV mode depends on `"remote": true` in the `remote` Wrangler environment.

## Deploy

```powershell
npm run deploy:dry
npm run deploy:staging
npm run deploy:production
```

`npm run deploy` is an alias for production deploy.

## Test The API

```powershell
Invoke-RestMethod http://localhost:8787/health
Invoke-RestMethod -Method Put -Uri http://localhost:8787/kv/welcome -Body "hello goldshore"
Invoke-RestMethod http://localhost:8787/kv/welcome
Invoke-RestMethod http://localhost:8787/kv
```

## VS Code

Open this folder in VS Code, then use:

- Run and Debug: `Wrangler Dev: local KV`
- Run and Debug: `Wrangler Dev: remote KV`
- Tasks: namespace creation, type generation, dry-run deploy, and deploy commands

Keep `.dev.vars` and any real secrets out of git.
