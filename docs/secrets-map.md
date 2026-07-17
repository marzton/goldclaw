# Secrets Map

Secret names by repo. No values here — values live in GitHub Actions Secrets.
For detailed instructions on what each secret is and where to get it, see
`docs/secrets-reference.md` in `marzton/goldshore-ai`.

For the full CF infrastructure map (Workers, KV, D1, R2, Access Applications),
see `docs/cf-infrastructure.md` in this repo.

---

## CF Service Token (cross-repo — agents and Workers)

Used by AI agents and automated Workers to authenticate through Cloudflare Access
on protected endpoints. Add to every repo that makes machine-to-machine calls
to CF Access-protected services.

| Secret Name | Purpose |
|-------------|--------|
| `CF_ACCESS_CLIENT_ID` | CF Service Token Client ID (header: `CF-Access-Client-Id`) |
| `CF_ACCESS_CLIENT_SECRET` | CF Service Token Client Secret (header: `CF-Access-Client-Secret`) |

Required header pair for every request to a CF Access-protected endpoint:
```
CF-Access-Client-Id: <CF_ACCESS_CLIENT_ID>
CF-Access-Client-Secret: <CF_ACCESS_CLIENT_SECRET>
```

Create / rotate at: **Zero Trust → Access → Service Tokens**  
Add the token as an auth rule in each Access Application policy.

> ⚠️ If a Service Token was ever shared in plain text (chat, email, logs), treat it as
> compromised and delete it immediately before creating a replacement.

---

## Cloudflare OAuth Client (dash.cloudflare.com — CF as IDP)

Distinct from the CF Service Token above. This is Cloudflare acting as an
**OAuth 2.0 / OIDC identity provider** for a registered client app (e.g. an
agent or dashboard doing "Sign in with Cloudflare"), not CF Access gating a
protected hostname. No repo in this org currently registers a CF OAuth
client — this section documents the mechanism and naming convention for
when one does.

Register at: https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/
(Dashboard tab on that page, or `POST /accounts/$ACCOUNT_ID/oauth_clients` via API)

### Endpoints

| Purpose | Endpoint |
|---------|----------|
| JWKS | `https://dash.cloudflare.com/.well-known/jwks.json` |
| OIDC discovery | `https://dash.cloudflare.com/.well-known/openid-configuration` |
| Authorization | `https://dash.cloudflare.com/oauth2/auth` |
| Token | `https://dash.cloudflare.com/oauth2/token` |
| Revoke | `https://dash.cloudflare.com/oauth2/revoke` |
| Session logout | `https://dash.cloudflare.com/oauth2/logout` |
| User info | `https://dash.cloudflare.com/oauth2/userinfo` |

### Secret storage (multi-field credential pair)

| Secret Name | Purpose |
|-------------|--------|
| `CF_OAUTH_CLIENT_ID` | Client ID from the `oauth_clients` registration |
| `CF_OAUTH_CLIENT_SECRET` | Current client secret |

Store both as GitHub Actions secrets in whichever repo consumes the OAuth
flow — same per-repo settings URL pattern as every other secret in this doc
(`https://github.com/marzton/<repo>/settings/secrets/actions`).

### Rotation (dual-secret, zero-downtime)

Each OAuth client can hold **two secrets at once**, so rotation never causes
an outage:

1. `POST https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/oauth_clients/$CLIENT_ID/rotate_secret`
   → issues a new secret alongside the existing (still-valid) one.
2. Update `CF_OAUTH_CLIENT_SECRET` to the new value in every consuming repo.
3. `GET .../oauth_clients/$CLIENT_ID` — if `has_rotated_secret: true`, an old
   secret is still live and must be deleted next.
4. `DELETE https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/oauth_clients/$CLIENT_ID/rotate_secret`
   → deletes the old secret, completing the rotation.

Both calls need `Authorization: Bearer $API_TOKEN` (a CF API token scoped for
OAuth client management) and `Content-Type: application/json`.

> ⚠ Do not run step 4 until every consumer is confirmed running on the new
> secret from step 2 — deleting the old secret before rollout finishes is
> what turns a routine rotation into an outage.

---

## marzton/goldshore-ai

Settings: https://github.com/marzton/goldshore-ai/settings/secrets/actions

| Secret Name | Purpose |
|-------------|--------|
| `CLOUDFLARE_API_TOKEN` | General ops: Workers, D1, KV, R2, Access, DNS |
| `CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN` | Scoped deploy token for goldshore-ai Workers only |
| `CF_ACCESS_CLIENT_ID` | CF Service Token — agent auth through CF Access |
| `CF_ACCESS_CLIENT_SECRET` | CF Service Token secret |
| `GOOGLE_CHAT_WEBHOOK` | CI failure + weekly reminder notifications |
| `GOOGLE_CLIENT_ID` | GCP OAuth 2.0 client ID |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API |
| `GH_PAT` | GitHub PAT (`repo` + `workflow` scopes) |

---

## marzton/goldshore-gateway

Settings: https://github.com/marzton/goldshore-gateway/settings/secrets/actions

| Secret Name | Purpose |
|-------------|--------|
| `CLOUDFLARE_API_TOKEN` | Workers deploy — currently **expired**, renewal unblocks PR #213 |
| `CF_ACCESS_CLIENT_ID` | CF Service Token — gateway auth through CF Access |
| `CF_ACCESS_CLIENT_SECRET` | CF Service Token secret |
| `GOOGLE_CHAT_WEBHOOK` | CI notifications |

---

## marzton/goldclaw (this repo)

Settings: https://github.com/marzton/goldclaw/settings/secrets/actions

| Secret Name | Purpose |
|-------------|--------|
| `CLOUDFLARE_API_TOKEN` | CF API access for ops scripts |
| `CF_ACCESS_CLIENT_ID` | CF Service Token — agent auth |
| `CF_ACCESS_CLIENT_SECRET` | CF Service Token secret |

---

## Cross-repo Actions secret inventory (names only)

Observed in `.github/workflows/` across all `marzton/*` repos (2026-07-08 sweep).
Use this list when auditing which token names exist before creating new ones —
prefer reusing a canonical name over minting another variant.

| Family | Secret names in use |
|--------|--------------------|
| Cloudflare account/zone | `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `CF_ZONE_ID` |
| Cloudflare API tokens | `CLOUDFLARE_API_TOKEN`, `CF_API_TOKEN`, `CF_USER_TOKEN`, `CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN`, `CLOUDFLARE_BUILD_API_TOKEN`, `CLOUDFLARE_API_TOKEN_GS_CONTROL`, `CLOUDFLARE_MOTHER_BUILD_TOKEN`, `CF_WORKERS_BUILDS`, `LOGPUSH_ADMIN_TOKEN`, `CF_WEB_ANALYTICS_TOKEN` |
| Cloudflare legacy auth (⚠ retire) | `CF_AUTH_KEY`, `CF_AUTH_EMAIL` |
| CF Access service token | `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` |
| GitHub | `GH_PAT`, `GH_TOKEN`, `GS_DISPATCH_TOKEN`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET` |
| AI / agents | `ANTHROPIC_API_KEY`, `CODEX_USAGE_USD`, `CODEX_BUDGET_USD`, `CODEX_JWT_HS256_KEY` |
| KV id injection (goldshore critique/site) | `KV_SITE_{PROD,PREVIEW,DEV}`, `KV_SESSIONS_{PROD,PREVIEW,DEV}`, `KV_PROMPT_{PROD,PREVIEW,DEV}`, `KV_CACHE_{PROD,PREVIEW,DEV}` |
| Notifications / misc | `GOOGLE_CHAT_WEBHOOK`, `MOBILE_WEBHOOK_URL`, `AGENT_WEBHOOK_URL`, `POLICY_APPLY_TOKEN`, `PUBLIC_GOLDSHORE_API_TOKEN` |

The `CF_*` / `CLOUDFLARE_*` duplication (e.g. `CF_API_TOKEN` vs
`CLOUDFLARE_API_TOKEN`) is historical drift — canonical names are the
`CLOUDFLARE_*` forms documented above.

---

## OAuth / provider secrets (Worker-side, not Actions)

Socials and provider OAuth (Google, Meta/Instagram, X, sandbox) live as
**Worker secrets on `gs-api`**, not Actions secrets — full table in
`goldshore-ai/docs/GOLDCLAW_INTEGRATIONS.md`. Broker OAuth (Schwab, Robinhood)
lives on `gs-trading`. Trading tokens rotate through `GS_TRADING_KV` after the
initial OAuth handshake. See `docs/integration-map.md` §2 for the complete
OAuth / service-account table (including the GCP `github-storage-access`
service account and its pending key revocation).

---

## Cloudflare token permissions reference

See `docs/cf-infrastructure.md` → "CF API Token Permissions" for the full
permission table to use when creating or renewing `CLOUDFLARE_API_TOKEN`.

Short version for renewal:
- **General ops token** (`CLOUDFLARE_API_TOKEN`): Workers + KV + D1 + R2 + Access + DNS Edit — Gold Shore Labs account, all zones
- **Deploy token** (`CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN`): Workers Scripts + KV + D1 + R2 + Routes Edit — scoped to `goldshore.ai` zone only

Dashboard: https://dash.cloudflare.com/profile/api-tokens  
Account ID: `f77de112d2019e5456a3198a8bb50bd2`
