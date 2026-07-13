# Cloudflare Infrastructure — Gold Shore Labs

Account ID: `f77de112d2019e5456a3198a8bb50bd2`  
Dashboard: https://dash.cloudflare.com/f77de112d2019e5456a3198a8bb50bd2

This document is the canonical agent reference for all Cloudflare resources.
Do not duplicate this in individual repo CLAUDE.md files — link here instead.

> Last verified against the live account: **2026-07-08** (24 Workers, 28 KV
> namespaces, 6 D1 databases, 7 R2 buckets). For how these resources connect
> across subsystems and repos, see `docs/integration-map.md`.

---

## Workers

| Worker Name | Purpose / Hostname | Status |
|-------------|-------------------|--------|
| `gs-web-app` | Main web app — `goldshore.ai` | ✅ Active |
| `gs-api` | Primary API — `api.goldshore.ai` | ✅ Active |
| `gs-agent` | AI agent runtime | ✅ Active |
| `gs-agent-prod` | AI agent runtime (prod tag) | ✅ Active |
| `gs-mcp` | Model Context Protocol server | ✅ Active |
| `gs-gateway-prod` | API gateway / routing | ✅ Active |
| `gs-trading-prod` | Trading engine — `goldshore.org/dash` | ✅ Active |
| `gs-signals-prod` | Market signals pipeline | ✅ Active |
| `gs-core-worker-prod` | Core platform ops | ✅ Active |
| `gs-mail` | Transactional email routing | ✅ Active |
| `gs-platform` | Platform landing / routing | ✅ Active |
| `gs-www-redirect-prod` | www → apex redirect | ✅ Active |
| `gs-www-redirect-production` | www → apex redirect (alt) | ✅ Active |
| `gs-web-prod` | Deploy channel for gs-web (prod tag) | ✅ Active |
| `gs-web-preview` | Preview channel for gs-web | Preview |
| `gs-api-preview` | Preview channel for gs-api | Preview |
| `banproof` | Ban/block enforcement | ✅ Active |
| `banproof-me` | banproof.me public site | ✅ Active |
| `banproof-email-router` | banproof email handling | ✅ Active |
| `armsway-com-prod` | armsway.com site | ✅ Active |
| `partners-in-pools` | Partners in Pools project | ✅ Active |
| `gs-core-worker` | Core worker (legacy — superseded by prod tag) | Legacy |
| `gs-todo` | Internal todo / scratch Worker | Internal |
| `goldshore-ai` | Legacy Worker (superseded by gs-web-app) | Legacy |

---

## KV Namespaces

| Namespace Title | ID | Primary Consumer |
|----------------|-----|------------------|
| `GOLDSHORE-AI` | `5f13370575784c9dacff522121104cb3` | gs-web-app |
| `GOLDSHORE-API` | `9cc2209906a94851b704be57543987a9` | gs-api |
| `GOLDSHORE-ORG` | `a59a5e2f446348629f59fb21ea69d795` | goldshore.org workers |
| `GOLDSHORE-ADMIN` | `d02c0c7951a244a7987e23d8af16b7b2` | admin tooling |
| `GATEWAY_KV` | `17840f9b6ac64cb1a51aeff085efe24c` | gs-gateway-prod |
| `GS_AGENT_KV` | `25a1eeba1de14e06af18c45b1b2c9743` | gs-agent / gs-agent-prod |
| `GS_TRADING_KV` | `9b3314c3b7af40a284a8c9b6e2990709` | gs-trading-prod |
| `GS_TRADING_KV_PREVIEW` | `2c14b79b76e6453ab57c6dde6116a11d` | gs-trading preview |
| `GS_CONTROL_LOGS` | `a52e94cb331c4e3db08f2aa507e6df09` | audit / ops |
| `GS_CONTROL_LOGS_PREVIEW` | `09e43cb8bd4749fdaaed0dc9d4ff2284` | audit preview |
| `GS_ADMIN_KV_PREVIEW` | `1f71a79b34db4090824954634dbd78c3` | admin preview |
| `GS_CONFIG` | `68f52b467dc0413991b2195ef9081cae` | global config |
| `GS_AI_CACHE` | `a02882aa2e2248158505d3a0aac8e9e2` | gs-agent AI response cache |
| `KV_CACHE` | `895b3586e1ce46c5b33f7a2fdbdad314` | general cache |
| `RR_CACHE` | `0b56873b6d7b451f9279481920a15447` | risk-radar cache |
| `gs-signals-cache-preview` | `3c7b2eade8d94448a324d7a6fef2dd3d` | signals preview |
| `BANPROOF-ME` | `714ee6be6df54291a4a4ade053e9f9ae` | banproof |
| `RMARSTON-COM` | `a854b3393b5c412bb945742ecb3eda1b` | rmarston.com |
| `goldshore-remote-GOLDSHORE_KV` | `0ea0d244a69f4bb48c38009418498ca7` | remote dev |
| `goldshore-staging-GOLDSHORE_KV` | `a836649d51354698bf589db04885e4a6` | staging |
| `goldshore-production-GOLDSHORE_KV` | `f18aa1552b6b4239af9ae7486766f502` | production (legacy goldshore worker) |
| `GS_API_KV` | `e0b8b807191346c3b0afc25fe716d2cd` | gs-api primary KV |
| `GS_API_KV_PREVIEW` | `d4d20cee39094b999dea3f7e5f4c533a` | gs-api preview |
| `GS_CONFIG_PREVIEW` | `dddc8b83775c41e58208bf8de87b7052` | gs-control preview config |
| `KV_SESSIONS` | `d0b889d0ba314b42892f5b959356ceda` | gs-admin / goldshore-admin sessions |
| `gs-web-app-session` | `e9f3d677cf67460e8870c647db43b46b` | gs-web-app sessions |
| `gs-signals-cache` | `f8cc5b1dd1ec49d7a3f7bf9acc5f2b1d` | gs-signals-prod cache |
| `banproof-waitlist` | `eea96e387176489db416472c1d28af2f` | banproof waitlist |

---

## D1 Databases

| Database Name | UUID | Purpose |
|--------------|------|--------|
| `gs_platform_db` | `9703574e-adb7-481e-8d98-96f8ce5f8a90` | Core platform data |
| `gs_audit_db` | `1ae71d76-188f-481b-91d9-db2d39013f68` | Audit log / compliance |
| `gs_signals_db` | `76af4653-7f44-417b-b46e-250143d906fd` | Market signals data |
| `gs_jobs_db` | `750c469c-788d-49e8-9254-77231cffd70f` | Background jobs / workflows |
| `risk-radar-db` | `b0bf3b0e-a7d0-49ae-ac82-4f19450b2ce2` | Risk Radar feature data |
| `goldshore-paper-trading` | `af94f483-b98b-41c5-aa23-3fbed2764b52` | Paper trading simulation |

---

## R2 Buckets

| Bucket Name | Created | Purpose |
|------------|---------|--------|
| `gs-assets` | 2026-03-09 | Production static assets |
| `gs-assets-preview` | 2026-03-09 | Preview static assets |
| `gs-control-state` | 2026-06-18 | Control plane state persistence |
| `gs-job-artifacts` | 2026-05-10 | Background job output artifacts |
| `gs-telemetry-storage` | 2026-04-17 | Telemetry / observability data |
| `risk-radar-raw` | 2026-06-26 | Risk Radar raw ingested data |
| `user-uploads` | 2026-04-19 | User-uploaded files |

---

## CF Access Applications (Required — not yet confirmed active)

For protected subdomains to show the Cloudflare authentication screen, each hostname
must have a **Self-hosted Access Application** configured in:
**Zero Trust → Access → Applications → Add an application → Self-hosted**

| App Name | Application Domain | Worker | Auth Type | Policy |
|----------|-------------------|--------|-----------|--------|
| Dashboard | `goldshore.ai/app/` | `gs-web-app` | Email / GitHub SSO | Authenticated users |
| Admin | `admin.goldshore.org` | `gs-core-worker-prod` | Email / GitHub SSO | Authenticated users |
| Trading | `goldshore.org/dash` | `gs-trading-prod` | Email / GitHub SSO | Authenticated users |
| MCP | `mcp.goldshore.ai` | `gs-mcp` | Service Token | Service Token only |
| API | `api.goldshore.ai` | `gs-api` | Service Token + Email | Both |
| Agent | `agent.goldshore.ai` | `gs-agent-prod` | Service Token | Service Token only |
| Signals | `signals.goldshore.ai` | `gs-signals-prod` | Email / GitHub SSO | Authenticated users |
| Gateway | `gateway.goldshore.ai` | `gs-gateway-prod` | Service Token | Service Token only |

### Prerequisites for Access to intercept traffic

1. **DNS must be orange-clouded** — each subdomain's DNS record must be proxied through
   Cloudflare (orange cloud, not grey). Grey-cloud = CF Access never sees the request.
2. **Access Application must exist** for the exact hostname/path.
3. **Policy must be attached** to the application ("Allow everyone" bypasses auth entirely).
4. **Worker route must match** the hostname — if the Worker isn't bound to that hostname,
   CF Access has nothing to protect.

### Verifying DNS proxy status

For each subdomain, run:
```
curl -s "https://cloudflare.com/cdn-cgi/trace" -H "Host: <subdomain>" | grep colo
```
Or check in: Cloudflare Dashboard → your zone → DNS → look for orange cloud icon.

---

## Agent Authentication Through CF Access

AI agents (Claude Code, Codex, automated CI Workers) authenticate to CF Access-protected
endpoints using a **Service Token** — not the user's SSO session.

Required headers for every request to a protected endpoint:
```
CF-Access-Client-Id: <value of CF_ACCESS_CLIENT_ID secret>
CF-Access-Client-Secret: <value of CF_ACCESS_CLIENT_SECRET secret>
```

The Service Token must be added as an allowed authentication method in each Access
Application's policy (under "Add a rule" → "Service Token").

Store the credentials in GitHub Actions Secrets and Cloudflare Worker secrets —
never in code or chat messages.

---

## CF API Token Permissions

For the `CLOUDFLARE_API_TOKEN` used by agents and CI to manage CF resources:

| Permission | Level | Scope |
|-----------|-------|-------|
| Workers Scripts | Edit | Gold Shore Labs account |
| Workers Routes | Edit | All zones |
| Workers KV Storage | Edit | Gold Shore Labs account |
| D1 | Edit | Gold Shore Labs account |
| R2 Storage | Edit | Gold Shore Labs account |
| Cloudflare Pages | Edit | Gold Shore Labs account |
| Account Settings | Read | Gold Shore Labs account |
| Zone Settings | Edit | All zones |
| DNS | Edit | All zones (for route management) |
| Access: Apps and Policies | Edit | Gold Shore Labs account |
| Access: Service Tokens | Edit | Gold Shore Labs account |

Token creation: https://dash.cloudflare.com/profile/api-tokens → Create Token → Custom Token
