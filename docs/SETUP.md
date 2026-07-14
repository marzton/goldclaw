# Goldclaw Setup Guide

Local development environment for prep workflows on HP Treb + lacie SSD.

## Prerequisites

- HP Treb laptop with lacie 1TB SSD connected
- SSH access to lacie
- Node.js 18+
- `gcloud` CLI (for GCP Secret Manager)
- `wrangler` CLI (for Cloudflare Workers KV)
- GitHub account (personal access token)

## Quick Start (Local on HP Treb)

### 1. Clone and Install

```bash
# Clone goldclaw to lacie SSD
ssh hp-treb
cd /media/lacie
git clone https://github.com/marzton/goldclaw.git
cd goldclaw

# Install dependencies
npm ci
```

### 2. Set Up Secrets

#### GCP Secret Manager (Free Tier)

```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Create secrets
GCP_PROJECT="goldshore-proj"
gcloud secrets create github-token --replication-policy="automatic" --project="$GCP_PROJECT"
gcloud secrets create gmail-oauth-client-secret --replication-policy="automatic" --project="$GCP_PROJECT"
gcloud secrets create cloudflare-api-token --replication-policy="automatic" --project="$GCP_PROJECT"
gcloud secrets create meta-app-id --replication-policy="automatic" --project="$GCP_PROJECT"
gcloud secrets create meta-app-secret --replication-policy="automatic" --project="$GCP_PROJECT"
gcloud secrets create google-client-id --replication-policy="automatic" --project="$GCP_PROJECT"
gcloud secrets create google-client-secret --replication-policy="automatic" --project="$GCP_PROJECT"

# Add secret values
echo "your-github-token" | gcloud secrets versions add github-token --data-file=- --project="$GCP_PROJECT"
echo "your-gmail-secret" | gcloud secrets versions add gmail-oauth-client-secret --data-file=- --project="$GCP_PROJECT"
# ... etc
```

#### Cloudflare Workers KV (Free Tier)

```bash
# Create KV namespace
wrangler kv:namespace create SECRETS

# Add the namespace ID to wrangler.toml in workers/goldshore/

# Add secrets to KV
wrangler kv:key put "meta:access_token" "..." --namespace-id=<NAMESPACE_ID>
wrangler kv:key put "meta:refresh_token" "..." --namespace-id=<NAMESPACE_ID>
wrangler kv:key put "google:oauth_tokens" "{...}" --namespace-id=<NAMESPACE_ID>
```

#### Environment Variables (Local .env.local)

```bash
# Create .env.local (never commit!)
cp .env.example .env.local

# Edit with your values
cat > .env.local <<EOF
GCP_PROJECT_ID=goldshore-proj
CF_ACCOUNT_ID=your-account-id
CF_API_TOKEN=your-cf-token
GOLDSHORE_ENV=local
GOLDSHORE_JWT_SECRET=your-local-secret
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=60
EOF

# Sync from GCP + CF KV
./scripts/sync-secrets.sh
```

### 3. Start Development

```bash
# In goldclaw/ directory

# Lint and type-check
npm run check

# Run local KV simulation
npm run dev

# Run with remote KV (production-like)
npm run dev:remote

# Run tests
npm run test
npm run test:integration
```

### 4. File Structure

```
goldclaw/
├── src/
│   ├── lib/
│   │   ├── auth/        # JWT, bearer token extraction
│   │   ├── secrets/     # GCP, CF KV, local env abstraction
│   │   ├── api/         # CORS, rate limiting, HTTP helpers
│   │   └── queue/       # Event queue patterns
│   ├── integrations/
│   │   ├── meta/        # Meta Business API client
│   │   ├── google/      # Google APIs (Ads, Sheets, Search Console)
│   │   ├── pipeline/    # Pipeline API client
│   │   └── github/      # GitHub webhook + app auth
│   ├── workflows/       # Orchestration for sync, refresh, ingest
│   └── config/          # Configuration types
├── workers/
│   └── goldshore/src/index.ts  # Cloudflare Worker entry
├── scripts/
│   ├── sync-secrets.sh  # Sync GCP + CF KV → .env.local
│   └── setup-secrets.sh # Initialize GCP + CF KV
├── docs/                # Integration guides
└── tests/               # Unit + integration tests
```

## SSH Access (From non-HP Treb)

If working remotely:

```bash
# Add to ~/.ssh/config
Host hp-treb
  HostName <ip-or-hostname>
  User <username>
  IdentityFile ~/.ssh/id_rsa

# Mount lacie via SSH
# (requires sshfs: brew install sshfs on Mac, apt install sshfs on Linux)
sshfs hp-treb:/media/lacie ~/mnt/lacie

# Or work directly over SSH
ssh hp-treb
cd /media/lacie/goldclaw
npm run dev
```

## Secrets Hierarchy

Secrets are checked in this order:

1. **Local .env.local** (fastest, dev only)
2. **Cloudflare Workers KV** (free tier, synced from GCP)
3. **GCP Secret Manager** (source of truth, free tier)

This allows:
- **Local dev**: Use .env.local (fast, no network)
- **Integration tests**: Use CF KV (simulates production)
- **Production**: Use GCP Secret Manager (centralized, auditable)

## Common Tasks

### Add a new integration

```bash
# 1. Create integration directory
mkdir -p src/integrations/my-service/{types.ts,client.ts}

# 2. Implement API client
# - types.ts: interfaces for API responses
# - client.ts: HTTP client with auth

# 3. Add config
# src/config/my-service.config.ts

# 4. Create workflow (if needed)
# src/workflows/my-service-sync.ts

# 5. Test it
npm run test
```

### Refresh OAuth tokens

```bash
# Token refresh is handled by workflows/auth-refresh.ts
# Can be triggered manually:
npm run refresh-tokens

# Or on a schedule (configured in worker)
```

### Promote changes to live repos

Once validated in goldclaw:

```bash
# 1. Create feature branch in goldclaw
git checkout -b feature/meta-ads-integration

# 2. Test thoroughly
npm run test:integration

# 3. Create PR
gh pr create --title "Add Meta ads workflow"

# 4. After merge, copy to goldshore-ai
cp src/integrations/meta goldshore-ai/src/integrations/
# Update imports, test, push
```

## Troubleshooting

### "Secret not found" error

```bash
# Check if secret exists in GCP
gcloud secrets describe meta-app-id --project=goldshore-proj

# Or CF KV
wrangler kv:key get "meta:access_token" --namespace-id=<ID>

# Or run sync script
./scripts/sync-secrets.sh
```

### "Unauthorized" from Meta/Google APIs

- Check token hasn't expired: `jq '.exp' <<< $(echo ${token} | cut -d '.' -f 2 | base64 -d)`
- Verify token is in right format (Bearer: `Authorization: Bearer <token>`)
- Run `npm run refresh-tokens` to get new token

### Local KV not persisting

- Local KV is in-memory only (for dev)
- Use `npm run dev:remote` to test with persistent KV
- Production uses Cloudflare's remote KV

## Next Steps

1. **Complete Meta Business integration**: `docs/meta-integration.md`
2. **Set up Google integrations**: `docs/google-integration.md`
3. **Create pipeline workflows**: `docs/pipeline-integration.md`
4. **Run integration tests**: `npm run test:integration`
5. **Deploy worker**: `wrangler publish`
