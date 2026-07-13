# Agent Sync Quick Start

Get Claude Code, Codex, and agents synchronized across local, remote tunnel, and lacie in 30 minutes.

## Prerequisites

```bash
# Install required CLIs
brew install gh wrangler  # macOS
# or
choco install gh wrangler  # Windows (if using Chocolatey)
# or install manually from GitHub/Cloudflare
```

**Verify installations:**
```bash
gh --version      # GitHub CLI
wrangler --version  # Cloudflare Wrangler
```

---

## Step 1: Authenticate (5 min)

### GitHub

```bash
gh auth login

# Select: GitHub.com
# Select: HTTPS
# Select: Authenticate with your GitHub credentials
# Select: Y (for git credential helper)
```

Verify:
```bash
gh auth status
gh repo list  # Should list your repos
```

### Cloudflare

```bash
wrangler login

# Opens browser → Approve → Returns to terminal
# Saves OAuth token to ~/.wrangler/default.toml
```

Verify:
```bash
wrangler whoami
```

### Google Cloud (for GCP Secret Manager)

```bash
gcloud auth application-default login

# Opens browser → Approve → Returns to terminal
```

Verify:
```bash
gcloud auth list
gcloud secrets list --project=goldshore-proj
```

---

## Step 2: Configure VS Code MCP (5 min)

1. **Open `.vscode/mcp.json`** (we created this for you)

2. **Verify it has:**
   - `cloudflare` (Wrangler stdio)
   - `github` (GitHub CLI stdio)
   - `goldclaw` (disabled for now, will enable later)

3. **Restart VS Code** to load MCP servers

4. **Test in Claude Code chat:**
   ```
   /test cloudflare mcp
   /test github mcp
   ```

---

## Step 3: Sync Secrets Locally (5 min)

```bash
cd C:\Users\marst\goldclaw

# Make script executable (Windows: skip, already executable)
chmod +x scripts/sync-secrets.sh  # macOS/Linux

# Run sync
./scripts/sync-secrets.sh

# Result:
# ✓ GITHUB_TOKEN
# ✓ GMAIL_OAUTH_CLIENT_SECRET
# ✓ CLOUDFLARE_API_TOKEN
# ✓ CF_META_ACCESS_TOKEN
# ... etc
```

Verify:
```bash
cat .env.local | head -10
ls -la .env.local  # Should be: -rw------- (600)
```

---

## Step 4: Test Local MCP (5 min)

**In VS Code, open Claude Code chat and try:**

### Test GitHub MCP
```
List my GitHub repos using GitHub MCP
```

Claude should:
- Use GitHub MCP
- Call `gh repo list`
- Return your repositories

### Test Cloudflare MCP
```
List my Cloudflare Workers using Cloudflare MCP
```

Claude should:
- Use Cloudflare MCP
- Call `wrangler publish --dry-run`
- Return worker status

---

## Step 5: Remote Tunnel Setup (10 min)

### Start Tunnel on HP Treb

```bash
# SSH into HP Treb
ssh hp-treb

# Start tunnel
code tunnel

# You'll see:
# Tunnel URL: https://vscode.dev/tunnel/hp-treb/...
# Connection token: xxxxxxx
```

Leave this running.

### Connect from Local VS Code

1. **Open Command Palette** (Cmd+Shift+P / Ctrl+Shift+P)
2. **Type**: `Remote-Tunnels: Connect to Tunnel`
3. **Select**: `hp-treb`
4. **Opens**: Remote workspace

You're now in HP Treb!

### Clone goldclaw to Lacie (on Remote)

```bash
# You're now in remote VS Code

# SSH into lacie from HP Treb
ssh localhost  # or just navigate if mounted

# Navigate to lacie
cd /media/lacie

# Clone goldclaw
git clone https://github.com/marzton/goldclaw.git
cd goldclaw

# Install
npm ci

# Sync secrets (remote)
./scripts/sync-secrets.sh
```

### Copy MCP Config to Remote

```bash
# Copy .mcp.json to HP Treb workspace
cp .mcp.json ~/goldclaw/

# VS Code should auto-reload MCP servers in remote context
```

---

## Step 6: Test Remote Tunnel (5 min)

**In remote Claude Code chat:**

```
Deploy to Cloudflare Workers using goldclaw from lacie SSD
```

Claude should:
- Run from HP Treb context
- Access `/media/lacie/goldclaw`
- Use Cloudflare MCP in remote context
- Deploy worker

---

## Three Environments: Status Check

### Local (Your Machine)
```bash
# Check local setup
gh repo list  # GitHub MCP works? ✓
wrangler whoami  # Cloudflare MCP works? ✓
cat .env.local | wc -l  # Secrets synced? ✓
```

### Remote Tunnel (HP Treb)
```bash
# SSH to HP Treb (outside of VS Code)
ssh hp-treb

# Check remote setup
gh repo list  # ✓
wrangler whoami  # ✓
cat ~/goldclaw/.env.local | wc -l  # ✓
```

### Lacie SSD (via Remote Tunnel)
```bash
# In remote VS Code terminal
cd /media/lacie/goldclaw

# Check lacie setup
npm run check  # TypeScript check
npm run test  # Run tests
./scripts/sync-secrets.sh  # Sync again
```

---

## Goldclaw MCP (Optional, for Now)

The goldclaw MCP server is **disabled** in `.vscode/mcp.json` because we need to implement it first.

**To enable later:**
1. Implement `src/mcp/server.ts`
2. Add `src/mcp/tools/` (sync-secrets, oauth, etc.)
3. Change `"disabled": true` → `"disabled": false`
4. Restart VS Code

For now, you can call the sync script directly:
```bash
./scripts/sync-secrets.sh
```

---

## Common Commands

### Refresh Secrets (Any Environment)
```bash
cd goldclaw
./scripts/sync-secrets.sh
```

### Deploy Worker (Local or Remote)
```bash
wrangler publish
```

### Create GitHub Secret (Local or Remote)
```bash
gh secret set MY_SECRET --body "value"
```

### List Cloudflare KV Keys (Local or Remote)
```bash
wrangler kv:key list --namespace-id=SECRETS
```

---

## Troubleshooting

### "MCP server not found"
```bash
# Check if wrangler/gh are installed
which wrangler  # or: where wrangler (Windows)
which gh        # or: where gh (Windows)

# Restart VS Code
# Check .vscode/mcp.json path is correct
```

### "Permission denied: .env.local"
```bash
# Fix permissions
chmod 600 .env.local

# Or recreate
rm .env.local
./scripts/sync-secrets.sh
```

### "OAuth failed" on remote
```bash
# Remote might not have browser access
# Run `gcloud auth login` on HP Treb directly:
ssh hp-treb
gcloud auth login  # Opens browser on HP Treb, or gives device code

# Then retry sync
./scripts/sync-secrets.sh
```

### "Token expired"
```bash
# Refresh all tokens
npm run refresh-tokens

# Or manually for one service:
gcloud secrets versions access latest --secret=meta-access-token
```

---

## What's Next

1. ✅ **Local MCP setup** (GitHub, Cloudflare)
2. ✅ **Remote Tunnel to HP Treb**
3. ✅ **Goldclaw repo on lacie**
4. ⏳ **Implement goldclaw MCP server** (src/mcp/)
5. ⏳ **Enable goldclaw in .vscode/mcp.json**
6. ⏳ **Test end-to-end workflows**
7. ⏳ **Deploy to production**

---

## Tips

- **Keep remote tunnel running** — Pin it on HP Treb
- **Sync secrets after OAuth changes** — `./scripts/sync-secrets.sh`
- **Use `.env.local` locally, `.mcp.json` for MCP servers** — They complement each other
- **Test each MCP individually** — Verify `gh`, `wrangler` work before using in Claude Code
- **Check permissions on .env.local** — Should be 600 (readable/writable by user only)

---

## Session Checklist

Every time you start working:

```bash
# Local machine
[ ] VS Code open
[ ] Claude Code extension loaded
[ ] GitHub CLI authenticated
[ ] Cloudflare CLI authenticated
[ ] .vscode/mcp.json loaded

# HP Treb
[ ] code tunnel running
[ ] SSH access working
[ ] gh / wrangler installed
[ ] .mcp.json present

# Lacie
[ ] Mounted or SSH accessible
[ ] goldclaw cloned
[ ] npm ci complete
[ ] .env.local synced
```

Once all checked, you're ready to use agents across all three environments! 🚀
