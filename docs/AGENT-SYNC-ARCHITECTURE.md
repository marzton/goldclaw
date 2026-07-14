# AI Agent Synchronization Architecture

Synchronize Claude Code, Codex, and other agents across local & remote environments using VS Code, Remote Tunnels, Cloudflare, and GitHub — all orchestrated by goldclaw MCP.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOLDCLAW MCP (Orchestrator)                 │
│  - Secret sync (GCP, CF KV, GitHub)                            │
│  - OAuth token refresh                                         │
│  - Credential distribution                                     │
│  - Agent state sync                                            │
└────────────────┬──────────────────────┬──────────────────────┬─┘
                 │                      │                      │
         ┌───────▼──────────┐   ┌──────▼──────────┐   ┌───────▼──────────┐
         │   CLOUDFLARE     │   │     GITHUB      │   │  GCP SECRET MGR  │
         │  ┌────────────┐  │   │  ┌───────────┐  │   │  ┌────────────┐  │
         │  │ KV Storage │  │   │  │  Secrets  │  │   │  │  Secrets   │  │
         │  ├────────────┤  │   │  ├───────────┤  │   │  ├────────────┤  │
         │  │ Workers    │  │   │  │ MCP Svr   │  │   │  │  API Keys  │  │
         │  ├────────────┤  │   │  └───────────┘  │   │  └────────────┘  │
         │  │ MCP Svr    │  │   │                 │   │                   │
         │  └────────────┘  │   │                 │   │                   │
         └───────┬──────────┘   └────────┬────────┘   └────────┬──────────┘
                 │                      │                      │
         ┌───────▼──────────────────────▼──────────────────────▼──────────┐
         │                   GOLDCLAW SECRET SYNC                        │
         │  - Load from GCP / CF KV / GitHub                            │
         │  - Merge & deduplicate                                       │
         │  - Dry-run plan                                              │
         │  - Apply to targets                                          │
         └────────────────┬─────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────────┬──────────────────────┐
         │                                     │                      │
    ┌────▼────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  VS CODE LOCAL  │  │  REMOTE TUNNEL   │  │  HP TREB + LACIE │
    │                 │  │  (HP Treb)       │  │  (Local Dev SSD) │
    │ ┌─────────────┐ │  │                  │  │                  │
    │ │ Claude Code │ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │
    │ │ Extension   │ │  │ │ Claude Code  │ │  │ │ Claude Code  │ │
    │ ├─────────────┤ │  │ ├──────────────┤ │  │ │ (SSH)        │ │
    │ │ .env.local  │ │  │ │ .env.local   │ │  │ ├──────────────┤ │
    │ ├─────────────┤ │  │ ├──────────────┤ │  │ │ .env.local   │ │
    │ │ .mcp.json   │ │  │ │ .mcp.json    │ │  │ ├──────────────┤ │
    │ │ Cloudflare  │ │  │ │ Cloudflare   │ │  │ │ .mcp.json    │ │
    │ │ GitHub MCP  │ │  │ │ GitHub MCP   │ │  │ │ Cloudflare   │ │
    │ └─────────────┘ │  │ └──────────────┘ │  │ │ GitHub MCP   │ │
    └────────────────┘  └──────────────────┘  │ └──────────────┘ │
                                               │                  │
                                               │ /media/lacie/    │
                                               │ goldclaw/        │
                                               └──────────────────┘
```

## Three Environments

### 1. Local (Your Machine)
**Purpose**: Primary development, VS Code with Claude Code extension

**Configuration**:
- `~/.vscode/mcp.json` — Claude Code MCP servers
- `~/.mcp.json` — Claude Code global MCP
- `~/.cursor/mcp.json` — Cursor editor (if used)
- `.env.local` (local to project) — Local secrets

**MCP Servers**:
- `cloudflare` — Cloudflare Workers, KV, Pages
- `cloudflare-docs` — Cloudflare documentation
- `github` — GitHub API, repos, secrets
- `goldclaw` — Goldclaw orchestrator (custom)

**Credentials**:
- GitHub personal access token
- Cloudflare API token (or OAuth PKCE)
- Local copies of active secrets

---

### 2. Remote Tunnel (HP Treb)
**Purpose**: Remote development via VS Code Remote Tunnels

**Setup**:
```bash
# On HP Treb
code tunnel

# Then in local VS Code:
# - Connect to tunnel
# - Opens remote workspace
# - Runs Claude Code extension in remote context
```

**Configuration**:
- Same `.mcp.json` as local (synced via git)
- Same `.env.local` structure
- Shares `.git/config` with local
- Direct SSH fallback: `ssh hp-treb`

**Why**: Access full dev environment, run long-lived processes, debug lacie SSD integration

---

### 3. Lacie SSD (Local Development)
**Purpose**: Persistent storage for goldclaw, work-in-progress code, large datasets

**Access**:
- SSH direct: `ssh hp-treb` → `cd /media/lacie/goldclaw`
- Remote Tunnel: VS Code → remote workspace → SSH into lacie
- SSHFS mount: `sshfs hp-treb:/media/lacie ~/mnt/lacie` (Mac/Linux)

**What lives here**:
- `/media/lacie/goldclaw/` — Full repo
- `/media/lacie/goldclaw/.env.local` — Synced secrets (never committed)
- `/media/lacie/goldclaw/src/` — Source code (synced with git)
- `/media/lacie/goldclaw/node_modules/` — Dependencies (not synced)

**Why**: 1TB of isolated space, doesn't clutter local machine, persistent across sessions

---

## Secrets Flow

### Hierarchy (Checked in This Order)

```
1. Local .env.local (fastest, dev only)
   ↓ (if not found)
2. Cloudflare Workers KV (free tier, synced from source of truth)
   ↓ (if not found)
3. GCP Secret Manager (source of truth, auditable)
```

### Sync Mechanism

**Daily/On-Demand Sync**:
```bash
# Run from any environment
./scripts/sync-secrets.sh

# 1. Connects to GCP Secret Manager (via gcloud auth)
# 2. Fetches all secrets
# 3. Connects to Cloudflare KV (via wrangler)
# 4. Fetches CF KV secrets
# 5. Merges into .env.local
# 6. Updates .env.local (600 permissions)
# 7. Notifies: "Secrets synced, never commit .env.local"
```

**Automatic Token Refresh** (via goldclaw MCP):
```typescript
// Cloudflare OAuth token expires
// Goldclaw MCP runs hourly refresh:
// - Check token expiry
// - Call OAuth provider (Meta, Google, GitHub)
// - Get new token
// - Store in CF KV
// - Sync to .env.local
// - Agents pick up fresh token
```

---

## MCP Configuration

### Local VS Code (.vscode/mcp.json)

```json
{
  "servers": {
    "cloudflare": {
      "transport": "stdio",
      "command": "wrangler",
      "args": ["mcp"]
    },
    "cloudflare-docs": {
      "transport": "http",
      "url": "https://mcp-cloudflare-docs.cloudflare.com"
    },
    "github": {
      "transport": "stdio",
      "command": "gh",
      "args": ["mcp"]
    },
    "goldclaw": {
      "transport": "stdio",
      "command": "node",
      "args": ["~/goldclaw/server.js"],
      "env": {
        "GOLDCLAW_ENV": "local",
        "GCP_PROJECT_ID": "goldshore-proj",
        "CF_ACCOUNT_ID": "your-account-id"
      }
    }
  }
}
```

### Remote Tunnel (.mcp.json - synced)

Same as above, but run in remote HP Treb context. Goldclaw MCP picks up:
- Remote git state
- Remote .env.local (synced via script)
- Remote Cloudflare context (wrangler in remote)

---

## Agent Coordination

### Claude Code (Local)
```
VS Code Extension → .vscode/mcp.json → Cloudflare, GitHub, Goldclaw MCP
                  ↓
              .env.local (local secrets)
                  ↓
          Can interact with Cloudflare, GitHub, goldclaw
```

### Claude Code (Remote via Tunnel)
```
VS Code Remote Tunnel → .mcp.json → Cloudflare, GitHub, Goldclaw MCP
                      ↓
                  .env.local (remote, synced)
                      ↓
          Can interact with HP Treb services, lacie SSD
```

### Codex (Code Review Agent)
```
GitHub → PR comment → Codex (runs in cloud)
                  ↓
      .github/workflows/*.yml → calls goldclaw MCP (if auth'd)
                  ↓
      Can access: GitHub secrets, Cloudflare config (read-only)
```

### Gemini / Other Agents (SSH sessions on HP Treb)
```
SSH hp-treb → IDE session → goldclaw MCP
           ↓
       .env.local (HP Treb)
           ↓
   Can run workflows, sync secrets, deploy to Cloudflare
```

---

## Setup Checklist

### Phase 1: Local Setup (Your Machine)

- [ ] VS Code with Claude Code extension installed
- [ ] GitHub CLI (`gh`) installed
- [ ] Wrangler CLI (`wrangler`) installed
- [ ] Cloudflare account + API token
- [ ] GitHub account + personal access token
- [ ] Create `.vscode/mcp.json` with servers
- [ ] Run `npm ci` in goldclaw
- [ ] Run `./scripts/sync-secrets.sh`
- [ ] Test: `gh repo list` (GitHub MCP works)
- [ ] Test: `wrangler publish` (Cloudflare MCP works)

### Phase 2: Remote Tunnel Setup (HP Treb)

- [ ] SSH access to hp-treb configured
- [ ] `code tunnel` running on HP Treb
- [ ] VS Code Remote Tunnel extension installed
- [ ] Connect to remote tunnel from local
- [ ] Clone goldclaw to `/media/lacie/goldclaw`
- [ ] Sync `.mcp.json` to HP Treb
- [ ] Run `./scripts/sync-secrets.sh` on remote
- [ ] Test MCP servers in remote context

### Phase 3: Goldclaw MCP Setup

- [ ] goldclaw MCP server implemented (`src/mcp/`)
- [ ] MCP manifest (`mcp.json`) created
- [ ] Secrets resource schema defined
- [ ] Sync tools implemented (dry-run, apply)
- [ ] OAuth flows wired up
- [ ] Token refresh automation
- [ ] Tested with Claude Code (local)
- [ ] Tested with Claude Code (remote tunnel)

### Phase 4: Automation & Monitoring

- [ ] Cron job for daily secret sync (lacie SSD)
- [ ] Token refresh scheduled (hourly)
- [ ] Sync status logging
- [ ] Alert on missing secrets
- [ ] Sync history tracking

---

## Example Workflows

### Workflow 1: Deploy to Cloudflare from Local VS Code

```
Claude Code (local) → goldclaw MCP → Get CF token from .env.local
                                  → wrangler publish
                                  → Returns deployment status
```

### Workflow 2: Sync Secrets from Remote Tunnel (HP Treb)

```
Claude Code (remote) → goldclaw MCP (remote)
                    → ./scripts/sync-secrets.sh
                    → Read GCP Secret Manager
                    → Write CF KV
                    → Sync to .env.local (remote)
                    → SSH back to local? Or keep remote-only?
```

### Workflow 3: GitHub Secrets Update (Codex PR Review)

```
Codex (cloud) → GitHub MCP → Read PR changes
             → goldclaw MCP? (need cloud auth)
             → Check if secrets need update
             → Comment: "Detected new env vars, run `npm sync-secrets`"
```

### Workflow 4: Meta Business Sync (Lacie → Cloudflare → GitHub)

```
Claude Code (remote) → SSH lacie
                    → cd /media/lacie/goldclaw
                    → npm run sync:meta-campaigns
                    → Writes to CF KV: meta:campaigns:*
                    → goldclaw MCP syncs to GitHub secrets
                    → Codex can read via GitHub MCP
```

---

## Security Model

### Never Logged/Exposed
- Secret values (never in logs, console, or commits)
- API tokens
- OAuth credentials
- Private keys

### Always Audited
- Who accessed a secret (GCP Secret Manager audit log)
- When a sync happened (sync script logs)
- Which agent requested what
- Token refresh events

### Locally Contained
- `.env.local` never committed
- Secrets only in memory during process execution
- File permissions: 600 (user read/write only)
- SSH tunnels are encrypted end-to-end

---

## Troubleshooting

### "MCP server not found" in VS Code

```bash
# Check if server is installed
wrangler --version
gh --version

# Check .vscode/mcp.json path is correct
# Restart VS Code
# Check Claude Code extension is enabled
```

### Secrets not syncing to remote

```bash
# SSH to HP Treb
ssh hp-treb

# Run sync script manually
cd /media/lacie/goldclaw
./scripts/sync-secrets.sh

# Check .env.local was updated
cat .env.local | head -20

# Check permissions
ls -la .env.local  # Should be: -rw------- (600)
```

### Token expired, agents can't authenticate

```bash
# Manually refresh via goldclaw MCP
npm run refresh-tokens

# Or via Claude Code:
# Call: goldclaw MCP → refresh-oauth-tokens()

# Check token in KV
wrangler kv:key get "meta:access_token"

# If missing, run sync
./scripts/sync-secrets.sh
```

---

## Next Steps

1. **Create `.vscode/mcp.json`** — Configure Claude Code MCP servers
2. **Test GitHub MCP** — `gh repo list` in Claude Code
3. **Test Cloudflare MCP** — `wrangler publish --dry-run` in Claude Code
4. **Implement goldclaw MCP** — `src/mcp/` server definition
5. **Wire Remote Tunnel** — VS Code → HP Treb → lacie goldclaw
6. **Deploy to Production** — Once all three environments validated
