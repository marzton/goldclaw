#!/bin/bash
set -euo pipefail

# Sync secrets from GCP Secret Manager and Cloudflare KV to local .env.local
# Usage: ./scripts/sync-secrets.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$SCRIPT_DIR/.env.local"

echo "Syncing secrets from GCP Secret Manager and Cloudflare KV..."

# Create .env.local if it doesn't exist
touch "$ENV_LOCAL"

# Secrets to sync from GCP Secret Manager
GCP_SECRETS=(
  "github-token"
  "gmail-oauth-client-secret"
  "cloudflare-api-token"
  "meta-app-id"
  "meta-app-secret"
  "google-client-id"
  "google-client-secret"
  "pipeline-api-key"
)

# Fetch from GCP Secret Manager if available
if command -v gcloud &> /dev/null && gcloud auth application-default print-access-token &> /dev/null; then
  echo "Fetching secrets from GCP Secret Manager..."
  GCP_PROJECT="${GCP_PROJECT_ID:-goldshore-proj}"

  for secret in "${GCP_SECRETS[@]}"; do
    if gcloud secrets describe "$secret" --project="$GCP_PROJECT" &> /dev/null; then
      value=$(gcloud secrets versions access latest --secret="$secret" --project="$GCP_PROJECT" 2>/dev/null || echo "")
      if [ -n "$value" ]; then
        # Convert secret name to env var format
        env_var=$(echo "$secret" | tr '-' '_' | tr '[:lower:]' '[:upper:]')
        # Remove if exists, then add
        sed -i "/^${env_var}=/d" "$ENV_LOCAL" || true
        echo "${env_var}=${value}" >> "$ENV_LOCAL"
        echo "  ✓ ${env_var}"
      fi
    fi
  done
else
  echo "⚠ GCP Secret Manager not available (gcloud not authenticated)"
fi

# Fetch from Cloudflare KV if available
if command -v wrangler &> /dev/null; then
  echo "Fetching secrets from Cloudflare KV..."

  CF_SECRETS=(
    "meta:access_token"
    "meta:refresh_token"
    "google:oauth_tokens"
    "pipeline:api_keys"
  )

  for secret in "${CF_SECRETS[@]}"; do
    if wrangler kv:key get "$secret" --namespace-id SECRETS &> /dev/null; then
      value=$(wrangler kv:key get "$secret" --namespace-id SECRETS 2>/dev/null || echo "")
      if [ -n "$value" ]; then
        env_var=$(echo "$secret" | tr ':' '_' | tr '-' '_' | tr '[:lower:]' '[:upper:]')
        sed -i "/^CF_${env_var}=/d" "$ENV_LOCAL" || true
        echo "CF_${env_var}=${value}" >> "$ENV_LOCAL"
        echo "  ✓ CF_${env_var}"
      fi
    fi
  done
else
  echo "⚠ Cloudflare Wrangler not available"
fi

# Set .env.local permissions (user read/write only)
chmod 600 "$ENV_LOCAL"

echo ""
echo "✓ Secrets synced to .env.local"
echo "⚠ Never commit .env.local to git!"
