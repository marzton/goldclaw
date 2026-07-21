#!/bin/bash
set -euo pipefail

# Setup Cloudflare Certificates for Zero Trust
# Validates certificates and stores them in GCP Secret Manager

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="${SCRIPT_DIR}/certs"
DOWNLOADS_DIR="${HOME}/Downloads"
GCP_PROJECT="${GCP_PROJECT_ID:-goldshore-proj}"

# Certificate files
CERT_G2="${DOWNLOADS_DIR}/certificate 6.19.2031.pem"
CERT_G1="${DOWNLOADS_DIR}/certificate.pem"

# Fingerprints (for validation)
FINGERPRINT_G2="65:6F:86:D2:22:90:22:28:07:4B:AF:92:9D:C3:38:70:AC:61:0D:E7:A2:94:A4:E2:BD:DB:A1:86:D4:15:71:62"
FINGERPRINT_G1="A7:3F:F8:D7:C3:09:72:BC:95:A2:40:E6:E0:0A:59:8B:25:75:E5:97:2F:5C:47:09:5B:69:5B:4A:D2:4C:E1:DE"

echo "================================================"
echo "Cloudflare Certificate Setup for Zero Trust"
echo "================================================"
echo ""

# 1. Verify certificates exist
echo "✓ Step 1: Verify certificates exist"
if [ ! -f "$CERT_G2" ]; then
  echo "❌ Missing: $CERT_G2"
  exit 1
fi
if [ ! -f "$CERT_G1" ]; then
  echo "❌ Missing: $CERT_G1"
  exit 1
fi
echo "  ✓ Found certificate G2"
echo "  ✓ Found certificate G1"
echo ""

# 2. Validate certificate format
echo "✓ Step 2: Validate certificate format"
if openssl x509 -in "$CERT_G2" -noout &> /dev/null; then
  echo "  ✓ G2 certificate format valid"
else
  echo "❌ G2 certificate format invalid"
  exit 1
fi
if openssl x509 -in "$CERT_G1" -noout &> /dev/null; then
  echo "  ✓ G1 certificate format valid"
else
  echo "❌ G1 certificate format invalid"
  exit 1
fi
echo ""

# 3. Extract and verify fingerprints
echo "✓ Step 3: Verify certificate fingerprints"
G2_FP=$(openssl x509 -in "$CERT_G2" -noout -fingerprint -sha256 | cut -d'=' -f2)
G1_FP=$(openssl x509 -in "$CERT_G1" -noout -fingerprint -sha256 | cut -d'=' -f2)

if [ "$G2_FP" == "$FINGERPRINT_G2" ]; then
  echo "  ✓ G2 fingerprint matches: $G2_FP"
else
  echo "⚠️  G2 fingerprint mismatch"
  echo "  Expected: $FINGERPRINT_G2"
  echo "  Got:      $G2_FP"
fi

if [ "$G1_FP" == "$FINGERPRINT_G1" ]; then
  echo "  ✓ G1 fingerprint matches: $G1_FP"
else
  echo "⚠️  G1 fingerprint mismatch"
  echo "  Expected: $FINGERPRINT_G1"
  echo "  Got:      $G1_FP"
fi
echo ""

# 4. Check certificate expiry
echo "✓ Step 4: Check certificate expiry"
G2_EXPIRY=$(openssl x509 -in "$CERT_G2" -noout -enddate | cut -d'=' -f2)
G1_EXPIRY=$(openssl x509 -in "$CERT_G1" -noout -enddate | cut -d'=' -f2)
echo "  G2 Expires: $G2_EXPIRY"
echo "  G1 Expires: $G1_EXPIRY"
echo ""

# 5. Copy to goldclaw certs directory
echo "✓ Step 5: Copy certificates to goldclaw"
mkdir -p "$CERT_DIR"
cp "$CERT_G2" "$CERT_DIR/cloudflare-gateway-ca-g2.pem"
cp "$CERT_G1" "$CERT_DIR/cloudflare-gateway-ca-g1.pem"
echo "  ✓ Copied to $CERT_DIR"
chmod 600 "$CERT_DIR"/*.pem
echo ""

# 6. Store in GCP Secret Manager
echo "✓ Step 6: Store in GCP Secret Manager"
if command -v gcloud &> /dev/null; then
  if gcloud auth application-default print-access-token &> /dev/null; then
    echo "  Storing certificates in GCP..."

    # Create or update secrets
    if gcloud secrets describe cloudflare-ca-g2 --project="$GCP_PROJECT" &> /dev/null; then
      echo "  Creating new version: cloudflare-ca-g2"
      gcloud secrets versions add cloudflare-ca-g2 \
        --data-file="$CERT_DIR/cloudflare-gateway-ca-g2.pem" \
        --project="$GCP_PROJECT"
    else
      echo "  Creating secret: cloudflare-ca-g2"
      gcloud secrets create cloudflare-ca-g2 \
        --data-file="$CERT_DIR/cloudflare-gateway-ca-g2.pem" \
        --replication-policy="automatic" \
        --project="$GCP_PROJECT"
    fi

    if gcloud secrets describe cloudflare-ca-g1 --project="$GCP_PROJECT" &> /dev/null; then
      echo "  Creating new version: cloudflare-ca-g1"
      gcloud secrets versions add cloudflare-ca-g1 \
        --data-file="$CERT_DIR/cloudflare-gateway-ca-g1.pem" \
        --project="$GCP_PROJECT"
    else
      echo "  Creating secret: cloudflare-ca-g1"
      gcloud secrets create cloudflare-ca-g1 \
        --data-file="$CERT_DIR/cloudflare-gateway-ca-g1.pem" \
        --replication-policy="automatic" \
        --project="$GCP_PROJECT"
    fi

    echo "  ✓ Stored in GCP Secret Manager"
  else
    echo "  ⚠️  GCP auth not available, skipping Secret Manager storage"
  fi
else
  echo "  ⚠️  gcloud CLI not found, skipping Secret Manager storage"
fi
echo ""

# 7. Create .env entry
echo "✓ Step 7: Update environment configuration"
cat > "$SCRIPT_DIR/.env.cloudflare" <<EOF
# Cloudflare Zero Trust Certificates
CF_CA_CERT_G2=${CERT_DIR}/cloudflare-gateway-ca-g2.pem
CF_CA_CERT_G1=${CERT_DIR}/cloudflare-gateway-ca-g1.pem

# Fingerprints for validation
CF_CA_FINGERPRINT_G2=${FINGERPRINT_G2}
CF_CA_FINGERPRINT_G1=${FINGERPRINT_G1}

# Certificate settings
CF_CERTIFICATE_PINNING=true
CF_ZERO_TRUST_ENABLED=true
EOF
echo "  ✓ Created: $SCRIPT_DIR/.env.cloudflare"
echo ""

# 8. System certificate store (optional)
echo "✓ Step 8: System certificate store installation (optional)"
echo ""
echo "  To trust these certificates system-wide, run:"
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "  sudo security add-certificates -d -r trustRoot -k /Library/Keychains/System.keychain \\"
  echo "    \"$CERT_DIR/cloudflare-gateway-ca-g2.pem\""
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "  sudo cp \"$CERT_DIR/cloudflare-gateway-ca-g2.pem\" /usr/local/share/ca-certificates/"
  echo "  sudo update-ca-certificates"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
  echo "  (Run PowerShell as Admin)"
  echo "  \$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2"
  echo "  \$cert.Import(\"$CERT_DIR\\cloudflare-gateway-ca-g2.pem\")"
  echo "  \$store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root','LocalMachine')"
  echo "  \$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)"
  echo "  \$store.Add(\$cert)"
  echo "  \$store.Close()"
fi
echo ""

# 9. Verification
echo "✓ Step 9: Verification summary"
echo ""
echo "  Certificates:"
echo "    G2: $(basename "$CERT_DIR"/cloudflare-gateway-ca-g2.pem)"
echo "    G1: $(basename "$CERT_DIR"/cloudflare-gateway-ca-g1.pem)"
echo ""
echo "  Configuration:"
echo "    .env.cloudflare: $([ -f "$SCRIPT_DIR/.env.cloudflare" ] && echo "✓" || echo "✗")"
echo "    GCP Storage: $(gcloud secrets list --project="$GCP_PROJECT" --filter="name:cloudflare-ca*" --format="value(name)" 2>/dev/null | wc -l) secrets"
echo ""
echo "  Permissions:"
ls -l "$CERT_DIR"/*.pem
echo ""

echo "================================================"
echo "✓ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Review: $SCRIPT_DIR/.env.cloudflare"
echo "  2. Source: source $SCRIPT_DIR/.env.cloudflare"
echo "  3. Test:   npm run test:certificates"
echo "  4. Use:    Claude Code will validate Cloudflare connections"
echo ""
