# Meta Business Integration Guide

Setup and workflows for Meta Business API (Gold Shore Labs HQ, Gold Shore Marketing, Gold Shore Ads).

## Overview

Goldclaw provides:
- OAuth2 authentication with Meta Business
- Campaign management (list, pause, resume, update)
- Ad account access and insights
- Webhook handling for real-time events
- Token refresh workflows

## Configuration

### 1. Meta App Setup (developers.facebook.com)

```
1. Go to https://developers.facebook.com
2. Create new app → Business → Manage Ads
3. Add products → Marketing API
4. App Roles: Grant "Developer" or "Admin" roles
5. Create test user for development (if needed)
```

### 2. Get App Credentials

```bash
# In App Dashboard → Settings → Basic
export META_APP_ID="your-app-id"
export META_APP_SECRET="your-app-secret"

# Store in GCP Secret Manager
echo "$META_APP_ID" | gcloud secrets versions add meta-app-id --data-file=-
echo "$META_APP_SECRET" | gcloud secrets versions add meta-app-secret --data-file=-
```

### 3. Get Business ID

```bash
# After OAuth flow, you'll get business ID
# Or query it:
curl "https://graph.facebook.com/me/businesses?access_token=YOUR_TOKEN"

# Store in config
echo "META_BUSINESS_ID=your-business-id" >> .env.local
```

## OAuth Flow

### Authorization URL

```typescript
import { MetaClient } from "./src/integrations/meta/client";

const client = new MetaClient({
  appId: "YOUR_APP_ID",
  appSecret: "YOUR_APP_SECRET",
  businessId: "YOUR_BUSINESS_ID"
});

// Generate auth URL
const redirectUri = "https://localhost:3000/auth/meta/callback";
const scope = [
  "ads_management",
  "pages_read_engagement",
  "business_management",
  "instagram_basic"
].join(",");

const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
  `client_id=${client.appId}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&scope=${encodeURIComponent(scope)}` +
  `&response_type=code`;

// User visits authUrl, authorizes, gets redirected to /callback?code=...
```

### Exchange Code for Token

```typescript
async function handleMetaCallback(code: string, redirectUri: string) {
  const token = await client.exchangeCodeForToken(code, redirectUri);
  
  // Store tokens in CF KV
  const secretsManager = createWorkerSecretsManager(GOLDSHORE_KV);
  await secretsManager.setSecret("meta:access_token", token.access_token);
  await secretsManager.setSecret("meta:refresh_token", token.refresh_token);
}
```

## API Usage

### Get Ad Accounts

```typescript
const accounts = await client.getAdAccounts();
// [
//   {
//     account_id: "act_123456789",
//     business_name: "Gold Shore Labs HQ",
//     currency: "USD",
//     ...
//   },
//   { ... }
// ]
```

### List Campaigns

```typescript
const campaigns = await client.getCampaigns("act_123456789");
// [
//   {
//     id: "cam_123",
//     name: "Q3 2024 - Brand Awareness",
//     objective: "BRAND_AWARENESS",
//     status: "ACTIVE",
//     effective_status: "ACTIVE",
//     ...
//   },
//   { ... }
// ]
```

### Pause/Resume Campaign

```typescript
// Pause
await client.updateCampaign("cam_123", { status: "PAUSED" });

// Resume
await client.updateCampaign("cam_123", { status: "ACTIVE" });
```

### Get Campaign Insights

```typescript
const insights = await client.getCampaignInsights("cam_123", {
  time_range: JSON.stringify({ since: "2024-01-01", until: "2024-01-31" }),
  fields: "spend,impressions,clicks,conversions,cost_per_action_type"
});
// { data: [ { spend: "1234.56", impressions: 50000, ... } ] }
```

## Workflows

### Daily Campaign Sync

```typescript
// workflows/meta-ads.ts
import { MetaClient } from "../integrations/meta/client";

export async function syncMetaCampaigns(env: Env) {
  const client = new MetaClient({
    appId: await secrets.requireSecret("META_APP_ID"),
    appSecret: await secrets.requireSecret("META_APP_SECRET"),
    businessId: env.META_BUSINESS_ID,
    accessToken: await secrets.getSecret("meta:access_token")
  });

  // Get all ad accounts
  const accounts = await client.getAdAccounts();

  for (const account of accounts) {
    // Get campaigns
    const campaigns = await client.getCampaigns(account.account_id);

    // Get insights
    for (const campaign of campaigns) {
      const insights = await client.getCampaignInsights(campaign.id, {
        fields: "spend,impressions,clicks,conversions"
      });

      // Store in KV cache
      await env.GOLDSHORE_KV.put(
        `meta:campaign:${campaign.id}`,
        JSON.stringify({ campaign, insights }),
        { expirationTtl: 86400 } // 24 hours
      );
    }
  }
}
```

### Token Refresh (Automatic)

```typescript
// workflows/auth-refresh.ts
// Runs on a schedule (via Worker cron trigger)

export async function refreshMetaTokens(env: Env, secrets: SecretsManager) {
  const refreshToken = await secrets.getSecret("meta:refresh_token");
  if (!refreshToken) {
    console.warn("No refresh token available");
    return;
  }

  const client = new MetaClient({
    appId: await secrets.requireSecret("META_APP_ID"),
    appSecret: await secrets.requireSecret("META_APP_SECRET"),
    businessId: env.META_BUSINESS_ID,
    refreshToken
  });

  const newToken = await client.refreshAccessToken(refreshToken);
  await secrets.setSecret("meta:access_token", newToken.access_token);
}
```

### Webhook Verification

```typescript
// integrations/meta/webhooks.ts
import { verifyGitHubWebhook } from "../lib/webhook";

export async function verifyMetaWebhook(
  signature: string,
  payload: string,
  appSecret: string
): Promise<boolean> {
  // Meta uses HMAC-SHA256 with app secret
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  const expected = `sha256=${toHex(digest)}`;
  return timingSafeEqual(expected, signature);
}
```

## Monitoring & Alerts

### Campaign Status Changes

Set up webhook to notify on:
- Campaign status changes (ACTIVE → PAUSED)
- Budget limit reached
- Account spending limit reached
- Campaign schedule triggered

```json
{
  "object": "adaccount",
  "entry": [
    {
      "id": "act_123456789",
      "changes": [
        {
          "value": {
            "campaign_id": "cam_123",
            "status": "PAUSED",
            "reason": "Budget limit reached"
          },
          "field": "campaign"
        }
      ],
      "time": 1704067200
    }
  ]
}
```

## Troubleshooting

### "Invalid OAuth token"

```bash
# Token expired or revoked
npm run refresh-tokens

# Or manually refresh
curl -X GET "https://graph.facebook.com/oauth/access_token" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET" \
  -d "grant_type=fb_exchange_token" \
  -d "fb_exchange_token=LONG_LIVED_TOKEN"
```

### "App not installed on user"

```bash
# User needs to authorize app and add it to their business
# Regenerate OAuth URL and have user re-authorize
```

### Rate Limiting

Meta has rate limits: 200 calls per user per hour, 600 per app.
Goldclaw implements caching and batching to minimize calls:

```typescript
// Get all insights in one batch request
const batchRequests = campaigns.map(c => ({
  method: "GET",
  relative_url: `${c.id}?fields=insights.date_preset(lifetime).fields(spend,impressions)`
}));

const response = await fetch("https://graph.facebook.com/v18.0/?batch=...", {
  method: "POST",
  body: JSON.stringify({ batch: batchRequests })
});
```

## Gold Shore Accounts

### Gold Shore Labs HQ
- Business ID: `LABS_HQ_ID`
- Ad Account: `act_LABS_HQ_ACCOUNT`
- Access level: Full (admin)

### Gold Shore Marketing
- Business ID: `MARKETING_ID`
- Ad Account: `act_MARKETING_ACCOUNT`
- Access level: Campaign management

### Gold Shore Ads
- Business ID: `ADS_ID`
- Ad Account: `act_ADS_ACCOUNT`
- Access level: Campaign management + reporting

See `.env.local` for account IDs.

## Next Steps

1. Complete OAuth flow with all three accounts
2. Deploy sync workflow (campaign data)
3. Set up insights monitoring
4. Integrate with pipeline for lead tracking
5. Add Google Ads integration (mirror structure)
