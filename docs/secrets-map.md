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

## Cloudflare token permissions reference

See `docs/cf-infrastructure.md` → "CF API Token Permissions" for the full
permission table to use when creating or renewing `CLOUDFLARE_API_TOKEN`.

Short version for renewal:
- **General ops token** (`CLOUDFLARE_API_TOKEN`): Workers + KV + D1 + R2 + Access + DNS Edit — Gold Shore Labs account, all zones
- **Deploy token** (`CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN`): Workers Scripts + KV + D1 + R2 + Routes Edit — scoped to `goldshore.ai` zone only

Dashboard: https://dash.cloudflare.com/profile/api-tokens  
Account ID: `f77de112d2019e5456a3198a8bb50bd2`
