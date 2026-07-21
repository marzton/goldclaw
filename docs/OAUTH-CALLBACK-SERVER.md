# OAuth Callback Server for Goldclaw

Lightweight Express server to handle OAuth callbacks from OpenClaw, Cloudflare, and GitHub.

## Overview

When users authorize OAuth flows, they're redirected to `http://127.0.0.1:8798/oauth/{provider}/callback`. This server handles those callbacks and exchanges authorization codes for tokens.

```
Browser (user authorizes)
    ↓
    └─→ https://api.openclaw.ai/oauth/authorize?redirect_uri=http://127.0.0.1:8798/oauth/openclaw/callback&code=...
    ↓
Redirected to: http://127.0.0.1:8798/oauth/openclaw/callback?code=auth_code&state=xyz
    ↓
OAuth Callback Server
    ├─ Validates state
    ├─ Exchanges code for token
    └─ Stores token in Cloudflare KV
    ↓
Browser: "Success! You can close this window"
```

## Setup

### 1. Create Callback Server

**File**: `src/mcp/oauth-server.ts`

```typescript
import express, { Request, Response } from 'express';
import { SecretsManager } from '../lib/secrets/manager';

interface OAuthProvider {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
}

const providers: Record<string, OAuthProvider> = {
  openclaw: {
    tokenEndpoint: 'https://api.openclaw.ai/oauth/token',
    clientId: process.env.OPENCLAW_CLIENT_ID || '',
    clientSecret: process.env.OPENCLAW_CLIENT_SECRET || '',
  },
  cloudflare: {
    tokenEndpoint: 'https://dash.cloudflare.com/oauth2/token',
    clientId: process.env.CF_OAUTH_CLIENT_ID || '',
    clientSecret: '', // PKCE uses no secret
  },
  github: {
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || '',
  },
};

export function createOAuthServer(secrets: SecretsManager, port = 8798) {
  const app = express();

  // Store OAuth states temporarily (replace with persistent storage in production)
  const states = new Map<string, { provider: string; timestamp: number }>();

  app.get('/oauth/:provider/callback', async (req: Request, res: Response) => {
    const { provider } = req.params;
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send(
        `OAuth Error: ${error}<br><pre>${req.query.error_description || ''}</pre>`
      );
    }

    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }

    // Validate state
    const stateData = states.get(state as string);
    if (!stateData) {
      return res.status(400).send('Invalid state parameter');
    }

    // Check state age (5 minutes)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      states.delete(state as string);
      return res.status(400).send('State expired');
    }

    try {
      const oauthProvider = providers[provider];
      if (!oauthProvider) {
        return res.status(400).send(`Unknown provider: ${provider}`);
      }

      // Exchange code for token
      const tokenResponse = await fetch(oauthProvider.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          client_id: oauthProvider.clientId,
          client_secret: oauthProvider.clientSecret,
          redirect_uri: `http://127.0.0.1:8798/oauth/${provider}/callback`,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error(`Token exchange failed for ${provider}:`, error);
        return res.status(400).send(`Token exchange failed: ${error}`);
      }

      const tokenData = await tokenResponse.json();

      // Store token in secrets manager
      const tokenKey = `${provider}:access_token`;
      const refreshKey = `${provider}:refresh_token`;

      await secrets.setSecret(tokenKey, tokenData.access_token);

      if (tokenData.refresh_token) {
        await secrets.setSecret(refreshKey, tokenData.refresh_token);
      }

      // Clean up state
      states.delete(state as string);

      // Success response
      res.send(`
        <html>
          <head>
            <title>Authorization Successful</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
                     margin: 40px; line-height: 1.6; }
              .success { color: #22863a; background: #f0f6fc; padding: 16px; border-radius: 6px; }
              .details { background: #f5f5f5; padding: 12px; border-radius: 4px; margin-top: 16px; 
                        font-family: monospace; }
              code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h2>✅ Authorization Successful</h2>
              <p><strong>${provider}</strong> authentication completed!</p>
            </div>
            <div class="details">
              <strong>Token stored:</strong> <code>${tokenKey}</code><br>
              <strong>Provider:</strong> ${provider}<br>
              <strong>Expires in:</strong> ${tokenData.expires_in}s
            </div>
            <p style="margin-top: 24px; color: #666;">
              You can close this window and return to Claude Code.
            </p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error(`OAuth callback error for ${provider}:`, error);
      res.status(500).send(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'goldclaw-oauth-server' });
  });

  const server = app.listen(port, () => {
    console.log(`[goldclaw-oauth] Listening on http://127.0.0.1:${port}`);
  });

  return { app, server, states };
}
```

### 2. Integrate with Main Server

**Update**: `src/mcp/server.ts`

```typescript
import { createOAuthServer } from './oauth-server';

class GoldclawMCPServer {
  private oauthServer: any;

  async run() {
    // ... existing MCP setup ...

    // Start OAuth callback server on port 8798
    const secretsManager = new SecretsManager({
      gcpEnabled: true,
      cfKvEnabled: true,
      localEnvEnabled: true,
    });

    this.oauthServer = createOAuthServer(secretsManager);
  }
}
```

### 3. Update Package.json

Add dependencies:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@types/express": "^4.17.0",
    "@modelcontextprotocol/sdk": "^0.1.0",
    "tsx": "^3.14.0"
  },
  "scripts": {
    "dev:mcp": "tsx watch src/mcp/server.ts",
    "build:mcp": "tsc src/mcp/server.ts --outDir dist",
    "start:mcp": "node dist/mcp/server.js"
  }
}
```

---

## How It Works

### 1. MCP Tool: `oauth-connect-openclaw`

```
Claude Code:
│
└─ Calls: oauth-connect-openclaw()
   └─ Goldclaw MCP generates:
      - OAuth URL
      - State (random)
      - Stores state locally with timestamp
      └─ Returns URL to user
```

### 2. User Authorizes

```
User:
│
├─ Opens URL in browser
├─ Logs into OpenClaw
├─ Approves scopes
└─ Browser redirected to callback
   └─ http://127.0.0.1:8798/oauth/openclaw/callback?code=xyz&state=abc
```

### 3. Callback Server Processes

```
OAuth Callback Server (http://127.0.0.1:8798):
│
├─ Receives: code + state
├─ Validates: state is known & not expired
├─ Exchanges: code for token (via OpenClaw API)
├─ Stores: token in Cloudflare KV
│          token in GCP Secret Manager
├─ Cleans: deletes state
└─ Returns: Success page
```

### 4. Agent Uses Token

```
Claude Code:
│
└─ Later: get-secret("openclaw:access_token")
   └─ Cloudflare KV or GCP Secret Manager
      └─ Returns: bearer token
         └─ Use in OpenClaw API requests
```

---

## Security Considerations

### State Validation
- Random state generated per flow
- State stored with timestamp
- State deleted after successful exchange
- Prevents CSRF attacks

### Token Storage
- Never logged or displayed
- Stored in encrypted Cloudflare KV
- Backed up in GCP Secret Manager
- TTL set for short-lived tokens

### Redirect URI Validation
- Must match exactly what was registered
- Checked on authorization request
- Checked on token exchange
- Prevents redirect attacks

### Client Secret
- Stored in environment only
- Not transmitted over MCP (stdio)
- Never sent to browser
- Cloudflare OAuth uses PKCE (no secret needed)

---

## Testing OAuth Flow Locally

### 1. Start OAuth Server

```bash
cd goldclaw
npm run dev:mcp
# [goldclaw-oauth] Listening on http://127.0.0.1:8798
```

### 2. In Claude Code

```
Claude: Connect to OpenClaw
```

### 3. Follow OAuth Flow

```
1. Claude returns: https://api.openclaw.ai/oauth/authorize?...
2. You open link in browser
3. Log in and authorize
4. Redirected to: http://127.0.0.1:8798/oauth/openclaw/callback?code=xyz&state=abc
5. Callback server exchanges code
6. Success page shows
7. Token stored in Cloudflare KV
```

### 4. Verify Token

```bash
# Check Cloudflare KV
wrangler kv:key get "openclaw:access_token" --namespace-id=SECRETS

# Or via Claude
Claude: Get my OpenClaw token
```

---

## Troubleshooting

### "Connection refused" on callback

```bash
# Check if server is running
curl http://127.0.0.1:8798/health

# If not, start it
npm run dev:mcp

# Check firewall isn't blocking port 8798
# Windows: netstat -ano | findstr :8798
# Mac/Linux: lsof -i :8798
```

### "State mismatch" error

```bash
# State expired (> 5 minutes)
# Or state wasn't registered
# Solution: Start new OAuth flow
Claude: Connect to OpenClaw again
```

### "Token exchange failed"

```bash
# Check OpenClaw client ID/secret are correct
export OPENCLAW_CLIENT_ID="your-actual-client-id"
export OPENCLAW_CLIENT_SECRET="your-actual-secret"

# Check redirect URI matches exactly in OpenClaw app settings
# Must be: http://127.0.0.1:8798/oauth/openclaw/callback

# Check OAuth server logs
npm run dev:mcp  # shows errors
```

### "Can't store token"

```bash
# Check Cloudflare authentication
wrangler whoami

# Check KV namespace exists
wrangler kv:namespace list

# Check GCP authentication
gcloud auth application-default print-access-token
```

---

## Production Deployment

When deploying goldclaw to production:

1. **Use Cloudflare Pages/Workers** for OAuth callback server
2. **Update redirect URIs** to production domain
3. **Store secrets** in GCP Secret Manager (not env vars)
4. **Enable HTTPS** for all OAuth flows
5. **Implement persistent state storage** (e.g., Durable Objects)
6. **Add request logging** for audit trail
7. **Set up alerts** for failed token exchanges
8. **Rotate credentials** regularly

---

## Next Steps

- [ ] Implement OAuth callback server (src/mcp/oauth-server.ts)
- [ ] Add Express dependency
- [ ] Update package.json scripts
- [ ] Test OAuth flow locally
- [ ] Integrate with VS Code MCP config
- [ ] Document credentials setup
