# Secrets Map

Secret names by repo. No values here — values live in GitHub Actions Secrets.
For detailed instructions on what each secret is and where to get it, see
`docs/secrets-reference.md` in `marzton/goldshore-ai`.

---

## marzton/goldshore-ai

Settings: https://github.com/marzton/goldshore-ai/settings/secrets/actions

| Secret Name | Purpose |
|-------------|--------|
| `CLOUDFLARE_API_TOKEN` | General ops: Workers, D1, KV, R2 |
| `CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN` | Scoped deploy token for goldshore-ai Workers only |
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
| `GOOGLE_CHAT_WEBHOOK` | CI notifications |

---

## Cloudflare token permissions reference

For full permission details (what to tick when creating tokens in the CF dashboard),
see the conversation on 2026-07-04 or re-ask Claude Code.

Short version for renewal:
- **General ops token** (`CLOUDFLARE_API_TOKEN`): Workers Scripts + KV + D1 + R2 + Pages + Account Settings (all Edit/Read) across Gold Shore Labs account, all zones
- **Deploy token** (`CLOUDFLARE_GOLDSHORE_AI_DEPLOY_TOKEN`): Workers Scripts + KV + D1 + R2 + Workers Routes (Edit) scoped to `goldshore.ai` zone only

Dashboard: https://dash.cloudflare.com/profile/api-tokens
Account ID: `f77de112d2019e5456a3198a8bb50bd2`
