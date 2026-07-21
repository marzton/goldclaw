# Goldclaw MCP Server

The goldclaw MCP server orchestrates secrets synchronization, OAuth authentication flows, and API key management across Cloudflare, GitHub, GCP, and OpenClaw.

## Overview

```
Claude Code / Codex
       ↓
   .vscode/mcp.json
       ↓
goldclaw MCP Server (stdio)
       ↓
   ┌───────────────────────────────┐
   │                               │
   ├─ Secrets (get, set)          │
   ├─ OAuth flows (4 providers)   │
   ├─ Token refresh               │
   ├─ KV namespace discovery      │
   └─ Sync orchestration          │
       ↓
   ┌──────────────┬─────────────┬──────────────┐
   ↓              ↓              ↓              ↓
  GCP      Cloudflare         GitHub      OpenClaw
 Secrets     KV Storage      Secrets      API Keys
```

## Resources

### `secrets://kv-namespaces`
Lists available Cloudflare KV namespaces for secrets storage.

**Result**:
```json
{
  "namespaces": [
    { "id": "SECRETS", "name": "Global Secrets" },
    { "id": "META", "name": "Meta Business Secrets" },
    { "id": "GOOGLE", "name": "Google API Secrets" },
    { "id": "OPENCLAW", "name": "OpenClaw Integration" }
  ]
}
```

### `oauth://flows`
Shows active OAuth authentication flows with their state and expiry.

**Result**:
```json
{
  "active_flows": [
    {
      "provider": "openclaw",
      "state": "abc123...",
      "redirectUri": "http://127.0.0.1:8798/oauth/openclaw/callback",
      "ageSeconds": 45
    }
  ]
}
```

### `integrations://openclaw`
OpenClaw integration status and configuration.

**Result**:
```json
{
  "status": "ready",
  "oauth_configured": true,
  "api_key_status": "pending",
  "documentation": "https://developers.openclaw.ai",
  "scopes_required": [
    "agents:read",
    "agents:write",
    "workflows:read",
    "workflows:write"
  ]
}
```

### `secrets://sync-plan`
Current secrets synchronization plan (dry-run).

**Result**:
```json
{
  "plan": "dry-run",
  "sources": {
    "gcp_secret_manager": 8,
    "cloudflare_kv": 12,
    "local_env": 4
  },
  "targets": {
    "cloudflare_kv": 12,
    "github_secrets": 8
  },
  "status": "ready",
  "message": "Run 'apply-sync' to push changes to targets"
}
```

---

## Tools

### `sync-secrets`
Synchronize secrets from GCP Secret Manager and Cloudflare KV to targets.

**Parameters**:
- `mode` (string): `"dry-run"` (default) or `"apply"`
- `sources` (array): `["gcp", "cloudflare", "local"]` (default: both)
- `targets` (array): `["cloudflare", "github"]` (default: both)

**Example**:
```
User: Sync secrets to GitHub
Claude: Call sync-secrets with mode: "dry-run" first
Result: Shows 12 secrets ready to push
User: Apply it
Claude: Call sync-secrets with mode: "apply"
Result: Secrets pushed to GitHub
```

### `oauth-connect-openclaw`
Initiate OAuth flow for OpenClaw API key collection.

**Parameters**:
- `redirect_uri` (string): Callback URL (default: `http://127.0.0.1:8798/oauth/openclaw/callback`)
- `scopes` (array): OAuth scopes (default: agents & workflows read/write)

**Flow**:
1. Claude Code calls this tool
2. Server generates OAuth URL with state
3. Returns URL for user to visit
4. User authorizes in browser
5. Redirected to callback with authorization code
6. Claude Code exchanges code for token
7. Token stored in Cloudflare KV

**Result**:
```
OpenClaw OAuth Flow Started:

🔐 Authorization URL:
https://api.openclaw.ai/oauth/authorize?client_id=...&state=xyz123...

State: xyz123...
Callback: http://127.0.0.1:8798/oauth/openclaw/callback
Scopes: agents:read, agents:write, workflows:read, workflows:write

1. Open the URL above in your browser
2. Authorize the application
3. You'll be redirected to the callback URL with a code
4. Run 'oauth-exchange-code' with the code to complete authentication
```

### `oauth-connect-cloudflare`
Initiate PKCE OAuth flow for Cloudflare authentication.

**Parameters**:
- `redirect_uri` (string): Callback URL (default: `http://127.0.0.1:8798/oauth/cloudflare/callback`)
- `scopes` (array): Cloudflare scopes (KV read/write, account settings read)

**Notes**:
- Uses PKCE (Proof Key for Code Exchange) for security
- No client secret needed
- Code challenge sent with authorization request

### `oauth-connect-github`
Initiate OAuth flow for GitHub authentication.

**Parameters**:
- `redirect_uri` (string): Callback URL (default: `http://127.0.0.1:8798/oauth/github/callback`)
- `scopes` (array): GitHub scopes (repo, admin hooks, gist)

### `refresh-oauth-tokens`
Refresh expired OAuth tokens for integrated services.

**Parameters**:
- `services` (array): Which services to refresh (default: openclaw, cloudflare, github)

**Result**:
```json
[
  {
    "service": "openclaw",
    "status": "refreshed",
    "expiry": "2026-07-08T20:45:00.000Z"
  },
  {
    "service": "cloudflare",
    "status": "refreshed",
    "expiry": "2026-07-08T20:45:00.000Z"
  }
]
```

### `load-kv-namespaces`
Discover and load all Cloudflare KV namespaces.

**Parameters**:
- `account_id` (string): Cloudflare Account ID (uses env if not provided)

**Result**:
```json
{
  "account_id": "xxx...",
  "namespaces": [
    { "id": "xxx...", "name": "SECRETS", "keys_count": 24 },
    { "id": "yyy...", "name": "META", "keys_count": 8 }
  ]
}
```

### `get-secret`
Retrieve a secret from the unified secrets store.

**Parameters**:
- `key` (string): Secret key (required)
- `source` (string): Source to fetch from (`"auto"`, `"gcp"`, `"cloudflare"`, `"local"`)

**Result**:
```
Secret Retrieved:
Key: meta-access-token
Source: auto
Value: [REDACTED: meta-access-token]

⚠️ Never log actual secret values.
```

### `set-secret`
Store a secret in the unified secrets store.

**Parameters**:
- `key` (string): Secret key (required)
- `value` (string): Secret value (required)
- `ttl` (number): Time-to-live in seconds (KV only)

**Result**:
```
Secret Stored:
Key: openclaw-api-key
Stored in: GCP Secret Manager + Cloudflare KV

✅ Secret is now available to all agents via 'get-secret'
```

---

## OpenClaw OAuth Integration

### Step 1: Register OpenClaw App

Go to [https://developer.openclaw.ai/apps](https://developer.openclaw.ai/apps):

1. Create new OAuth application
2. Set redirect URI: `http://127.0.0.1:8798/oauth/openclaw/callback`
3. Grant scopes:
   - `agents:read` — List agents
   - `agents:write` — Create/update agents
   - `workflows:read` — List workflows
   - `workflows:write` — Create/update workflows
4. Save Client ID and Client Secret

### Step 2: Store Credentials

```bash
# Set environment variables or store in GCP Secret Manager
export OPENCLAW_CLIENT_ID="your-client-id"
export OPENCLAW_CLIENT_SECRET="your-client-secret"

# Or via goldclaw MCP
Claude: Store my OpenClaw credentials
Result: Credentials saved to GCP Secret Manager
```

### Step 3: Initiate OAuth

```
Claude Code: Connect to OpenClaw
└─ Calls: oauth-connect-openclaw
   └─ Returns OAuth URL
```

### Step 4: User Authorizes

1. User clicks authorization URL
2. Logs into OpenClaw
3. Approves scopes
4. Redirected to callback with code

### Step 5: Exchange Code for Token

```
Claude Code: (receives authorization code from callback)
└─ Calls: (internal) token exchange endpoint
   └─ Returns: access_token + refresh_token
      └─ Stored in: Cloudflare KV + GCP Secret Manager
```

### Step 6: Use Token in Agents

Once stored, any agent can:

```
Claude: List my OpenClaw agents
└─ Calls: get-secret("openclaw-access-token")
   └─ Returns: token
      └─ Uses: OpenClaw API with Bearer token
```

---

## Configuration

### Environment Variables

```bash
# Required
GCP_PROJECT_ID=goldshore-proj
CF_ACCOUNT_ID=your-account-id
CF_NAMESPACE_ID=SECRETS

# OAuth Clients
OPENCLAW_CLIENT_ID=your-client-id
OPENCLAW_CLIENT_SECRET=your-client-secret
CF_OAUTH_CLIENT_ID=your-client-id
GITHUB_OAUTH_CLIENT_ID=your-client-id
GITHUB_OAUTH_CLIENT_SECRET=your-client-secret

# Optional (for local testing)
GOLDCLAW_ENV=local
GOLDCLAW_DEBUG=true
```

### In VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "goldclaw": {
      "command": "node",
      "args": ["C:\\Users\\marst\\goldclaw\\server.js"],
      "env": {
        "GCP_PROJECT_ID": "goldshore-proj",
        "CF_ACCOUNT_ID": "local-env",
        "OPENCLAW_CLIENT_ID": "local-env"
      }
    }
  }
}
```

---

## Workflows

### Daily Secret Sync

```
Morning routine:
1. Claude Code: Sync secrets
2. Calls: sync-secrets(mode: "dry-run")
3. Review: Shows 12 secrets ready
4. Claude Code: Apply it
5. Calls: sync-secrets(mode: "apply")
6. Result: Secrets pushed to GitHub + Cloudflare KV
```

### Token Refresh on Schedule

```
Hourly cron (via Cloudflare Worker):
1. Check token expiry: get-secret("openclaw-access-token")
2. If exp < now + 1h: refresh-oauth-tokens(["openclaw"])
3. New token stored automatically
```

### New Agent Setup

```
Claude Code: Set up OpenClaw integration
1. Call: oauth-connect-openclaw
2. Return: Auth URL
3. User: Opens URL, authorizes
4. Callback: Code exchanged for token
5. Token: Stored in KV
6. Agent: Can now use OpenClaw APIs
```

---

## Troubleshooting

### "MCP server not found"

```bash
# Check server.js exists and is executable
ls -la goldclaw/server.js

# Verify .vscode/mcp.json path is correct
cat .vscode/mcp.json | grep goldclaw

# Restart VS Code
# Check Claude Code extension is enabled
```

### "OAuth callback not working"

```bash
# Check redirect URI matches exactly
# In OpenClaw app settings: http://127.0.0.1:8798/oauth/openclaw/callback

# Verify localhost is accessible
curl http://127.0.0.1:8798/

# Check firewall isn't blocking port 8798
```

### "Secret sync failed"

```bash
# Check GCP authentication
gcloud auth application-default print-access-token

# Check Cloudflare credentials
wrangler whoami

# Check GitHub token
gh auth status

# Run manual sync
./scripts/sync-secrets.sh
```

---

## Security

### Never Exposed
- Secret values (never logged)
- OAuth codes (deleted after exchange)
- Tokens (stored encrypted in KV)
- Client secrets (not transmitted over stdio)

### Always Audited
- GCP Secret Manager access logs
- Cloudflare KV write operations
- GitHub secrets updates
- OAuth token exchanges

### Local Only
- Stdio communication (no network)
- OAuth callbacks on localhost
- Tokens in memory during use
- File permissions: 600 on secrets files

---

## Next Steps

1. ✅ Implement MCP server (src/mcp/server.ts)
2. ✅ OAuth flows for 4 providers
3. ⏳ OAuth callback handler (Express app)
4. ⏳ Token exchange implementation
5. ⏳ Enable in .vscode/mcp.json
6. ⏳ Test with Claude Code
7. ⏳ Integrate with goldclaw workflows
