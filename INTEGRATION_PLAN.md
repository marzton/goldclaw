# Goldclaw Integration Plan

## Overview
Goldclaw is the prep/staging repo for AI agent work integrating:
- Meta Business (Gold Shore Labs HQ, Gold Shore Marketing, Gold Shore Ads)
- Google integrations (Console, Analytics, Ads)
- Pipeline & Admin APIs
- Cloudflare Zero Trust, KV, Workers

Local development on HP Treb via lacie SSD (1TB) with SSH access.

---

## Architecture

### Secrets Management (Free Tier)
- **GCP Secret Manager** (free: 6 secrets, unlimited versions)
  - github-token
  - gmail-oauth-client-secret
  - cloudflare-api-token
  
- **Cloudflare Workers KV** (free: 100K reads/day, 1K writes/day)
  - meta:access_token
  - meta:refresh_token
  - pipeline:api_keys
  - google:oauth_tokens

- **Local .env.local** (lacie/HP laptop)
  - Synced from GCP + CF KV via sync script
  - Never committed to git

### Source Structure

```
goldclaw/
├── src/
│   ├── lib/
│   │   ├── auth/              # Consolidated from goldshore-api
│   │   │   ├── jwt.ts         # JWT verification (from index.ts)
│   │   │   ├── bearer.ts      # Bearer token extraction
│   │   │   └── oauth.ts       # OAuth flows (Meta, Google, GitHub)
│   │   ├── secrets/           # Secrets abstraction
│   │   │   ├── gcp.ts         # GCP Secret Manager client
│   │   │   ├── cf-kv.ts       # Cloudflare KV client
│   │   │   ├── local-env.ts   # Local .env.local fallback
│   │   │   └── manager.ts     # Unified secrets API
│   │   ├── api/               # API patterns
│   │   │   ├── cors.ts        # From goldshore-api/lib/cors
│   │   │   ├── rate-limit.ts  # Rate limiting (from goldshore-api)
│   │   │   └── http.ts        # Request/response helpers
│   │   └── queue/             # Event queue patterns
│   │       ├── messages.ts    # Message types
│   │       └── handlers.ts    # Queue processing
│   ├── integrations/
│   │   ├── meta/              # Meta Business API
│   │   │   ├── auth.ts        # OAuth + token refresh
│   │   │   ├── ads.ts         # Ads API (campaigns, ad accounts)
│   │   │   ├── business.ts    # Business API (accounts, pages)
│   │   │   └── webhooks.ts    # Webhook handlers
│   │   ├── google/            # Google integrations
│   │   │   ├── auth.ts        # Gmail OAuth
│   │   │   ├── ads.ts         # Google Ads API
│   │   │   ├── sheets.ts      # Google Sheets (analytics)
│   │   │   └── search.ts      # Google Search Console
│   │   ├── pipeline/          # Pipeline & Admin APIs
│   │   │   ├── client.ts      # Pipeline API client
│   │   │   ├── admin.ts       # Admin API operations
│   │   │   └── models.ts      # Pipeline data models
│   │   └── github/            # From goldshore-api
│   │       ├── webhook.ts     # Webhook signature verify
│   │       └── auth.ts        # GitHub App auth
│   ├── workflows/             # Orchestration
│   │   ├── meta-ads.ts        # Meta ads sync workflow
│   │   ├── google-sync.ts     # Google data sync
│   │   ├── pipeline-ingest.ts # Pipeline data ingestion
│   │   └── auth-refresh.ts    # Token refresh workflows
│   ├── config/
│   │   ├── meta.config.ts     # Meta Business app config
│   │   ├── google.config.ts   # Google app config
│   │   ├── pipeline.config.ts # Pipeline endpoint config
│   │   └── types.ts           # Config type defs
│   └── workers/
│       └── goldshore/src/index.ts # Refactored with integrations
├── scripts/
│   ├── sync-secrets.sh        # Sync GCP + CF KV → .env.local
│   ├── setup-secrets.sh       # Initialize GCP + CF KV
│   └── test-integrations.ts   # Integration smoke tests
├── docs/
│   ├── setup.md               # Local dev setup (lacie, HP)
│   ├── secrets.md             # Secrets architecture
│   ├── meta-integration.md    # Meta Business workflows
│   ├── google-integration.md  # Google workflows
│   ├── pipeline-integration.md # Pipeline workflows
│   └── workflows.md           # Orchestration patterns
├── tests/
│   ├── unit/                  # Unit tests for lib/
│   └── integration/           # E2E tests (with mocks)
└── package.json
```

### Consolidation from Goldshore

| Source | Destination | Purpose |
|--------|-------------|---------|
| `goldshore-api/src/lib/cors.ts` | `src/lib/api/cors.ts` | CORS handling |
| `goldshore-api/src/index.ts` (JWT, rate limit) | `src/lib/auth/jwt.ts`, `src/lib/api/rate-limit.ts` | Auth & rate limiting |
| `goldshore-api/src/github/` | `src/integrations/github/` | GitHub webhook + auth |
| `goldshore-api/src/routes/` | `src/integrations/*/` | API route patterns |
| `goldclaw/workers/goldshore/src/index.ts` | Refactor with new integrations | Worker entry point |

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create src/lib structure (auth, secrets, api, queue)
- [ ] Consolidate JWT, rate limit, CORS from goldshore-api
- [ ] Set up GCP Secret Manager client
- [ ] Set up Cloudflare KV client
- [ ] Create local .env.local sync script

### Phase 2: Integrations (Week 2-3)
- [ ] Meta Business API (OAuth, campaigns, webhooks)
- [ ] Google integrations (Gmail, Ads, Sheets, Search Console)
- [ ] Pipeline API client
- [ ] Admin API patterns

### Phase 3: Workflows (Week 4)
- [ ] Meta ads sync workflow
- [ ] Google data sync workflow
- [ ] Pipeline ingest workflow
- [ ] Token refresh workflow

### Phase 4: Deploy (Week 5+)
- [ ] Promote to goldshore repos
- [ ] Update goldshore-ai, goldshore-gateway, goldshore-api
- [ ] Test in production

---

## Development Setup (HP Treb + Lacie)

```bash
# Clone goldclaw
git clone marzton/goldclaw ~/goldclaw

# SSH into lacie SSD
ssh hp-treb
cd /media/lacie/goldclaw

# Install dependencies
npm ci

# Sync secrets from GCP + CF KV
./scripts/sync-secrets.sh

# Start local dev (uses mock KV + local secrets)
npm run dev

# Run integration tests
npm run test:integration
```

---

## Secrets Configuration

### GCP Secret Manager
```bash
gcloud secrets create github-token --replication-policy="automatic"
gcloud secrets create gmail-oauth-client-secret --replication-policy="automatic"
gcloud secrets create cloudflare-api-token --replication-policy="automatic"
```

### Cloudflare KV
```bash
wrangler kv:namespace create SECRETS
# Add to wrangler.toml:
# kv_namespaces = [{ binding = "SECRETS", id = "..." }]
```

### Local Sync
```bash
# .env.local (never committed)
GCP_PROJECT_ID=goldshore-proj
CF_ACCOUNT_ID=account-123
CF_API_TOKEN=$(wrangler secret get CF_API_TOKEN)
```

---

## Next Steps

1. Create directory structure
2. Consolidate auth patterns from goldshore-api
3. Scaffold Meta Business integration
4. Scaffold Google integration
5. Create secrets manager
6. Wire up local sync scripts
