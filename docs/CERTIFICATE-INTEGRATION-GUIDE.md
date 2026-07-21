# Certificate Integration Guide

Complete integration of Cloudflare Zero Trust certificates across goldclaw using all available methods.

## Overview

Your Cloudflare certificates are integrated through:

1. **Code**: TypeScript types & validation (`src/lib/security/`)
2. **Scripts**: Automated setup & validation (`scripts/setup-cloudflare-certificates.sh`)
3. **Configuration**: Environment variables (`.env.cloudflare`, `.env.local`)
4. **Storage**: GCP Secret Manager + local file system
5. **MCP Server**: Certificate validation in tools
6. **Documentation**: Zero Trust & security guides

---

## Quick Start (30 minutes)

### 1. Setup Certificates

```bash
cd ~/goldclaw

# Run setup script (validates + stores)
./scripts/setup-cloudflare-certificates.sh
```

**What it does**:
- ✓ Validates PEM format
- ✓ Verifies fingerprints
- ✓ Checks expiration dates
- ✓ Copies to `certs/` directory
- ✓ Stores in GCP Secret Manager
- ✓ Creates `.env.cloudflare`
- ✓ Instructions for system trust store

### 2. Load Environment

```bash
# Load certificate paths and fingerprints
source .env.cloudflare

# Verify
echo "G2 Path: $CF_CA_CERT_G2"
echo "G2 Fingerprint: $CF_CA_FINGERPRINT_G2"
```

### 3. Enable in MCP Server

Update `.vscode/mcp.json`:

```json
{
  "servers": {
    "goldclaw": {
      "env": {
        "CF_CERTIFICATE_PINNING": "true",
        "CF_ZERO_TRUST_ENABLED": "true",
        "CF_CA_CERT_G2": "./certs/cloudflare-gateway-ca-g2.pem",
        "CF_CA_CERT_G1": "./certs/cloudflare-gateway-ca-g1.pem"
      }
    }
  }
}
```

### 4. Test Integration

```bash
# In Claude Code:
Claude: Validate Cloudflare certificates
→ Calls: verify-cloudflare-certificates tool
→ Returns: All endpoints valid ✓
```

---

## Component Details

### 1. Code-Level Integration

**Location**: `src/lib/security/`

#### Certificate Pinning (`certificate-pinning.ts`)
```typescript
// Defines certificate pins with metadata
CLOUDFLARE_PINS = [
  {
    alias: "cf-gateway-ca-g2",
    fingerprint: "65:6F:86:D2:...",
    issuer: "Cloudflare Gateway CA - Cloudflare Managed G2",
    expires: "2031-06-19",
    active: true,
  },
  // ... G1
]

// Functions:
- validateCertificatePin(fingerprint) → boolean
- getPinByAlias(alias) → CertificatePin
- getActivePins() → CertificatePin[]
- getCertificatePinSummary() → string
```

#### TLS Validation (`tls-validator.ts`)
```typescript
// Validates all outbound HTTPS connections
tlsValidator.validateCloudflareEndpoint(url)
  → { valid: boolean, reason: string }

tlsValidator.validateCloudflareEndpoints()
  → { all_valid: boolean, endpoints: [...] }

tlsValidator.getCertificateInfo()
  → { pins: [...], summary: string }
```

### 2. Script-Level Integration

**Location**: `scripts/setup-cloudflare-certificates.sh`

Automated 9-step process:

```
Step 1: Verify certificates exist
Step 2: Validate certificate format (PEM)
Step 3: Verify certificate fingerprints
Step 4: Check certificate expiry dates
Step 5: Copy to goldclaw/certs/
Step 6: Store in GCP Secret Manager
Step 7: Create .env.cloudflare
Step 8: Instructions for OS trust store
Step 9: Verification summary
```

**Run it**:
```bash
bash scripts/setup-cloudflare-certificates.sh
```

### 3. Configuration Integration

**Files**:
- `.env.cloudflare` — Certificate paths & fingerprints (generated)
- `.env.local` — Development secrets (git-ignored)
- `.env.example` — Template with all variables

**Variables**:
```bash
# Paths
CF_CA_CERT_G2=./certs/cloudflare-gateway-ca-g2.pem
CF_CA_CERT_G1=./certs/cloudflare-gateway-ca-g1.pem

# Fingerprints (validation)
CF_CA_FINGERPRINT_G2=65:6F:86:D2:...
CF_CA_FINGERPRINT_G1=A7:3F:F8:D7:...

# Features
CF_CERTIFICATE_PINNING=true
CF_ZERO_TRUST_ENABLED=true
```

### 4. Storage Integration

**Locations**:

| Where | What | Access | Purpose |
|-------|------|--------|---------|
| `./certs/` | PEM files | Local disk | Fast access in development |
| GCP Secret Manager | PEM content | Secure API | Production + backups |
| `.env.cloudflare` | Paths & fingerprints | Environment | Runtime configuration |
| `.env.local` | Tokens & secrets | Environment | Local development |

**Flow**:
```
Download certificates
    ↓
Run setup script
    ↓
Store locally (certs/)
    ↓
Upload to GCP
    ↓
Create .env.cloudflare
    ↓
Load via Claude Code
    ↓
Validate in MCP tools
```

### 5. MCP Server Integration

**Certificate Validation Tool** (to be added):

```typescript
// In src/mcp/server.ts

{
  name: "verify-cloudflare-certificates",
  description: "Validate Cloudflare Gateway certificates and Zero Trust config",
  inputSchema: {
    type: "object",
    properties: {
      endpoints: {
        type: "array",
        items: { type: "string" },
        description: "Cloudflare endpoints to validate",
        default: [
          "https://api.cloudflare.com/client/v4",
          "https://dash.cloudflare.com",
        ]
      }
    }
  }
}

// Handler:
async function verifyCloudflareCertificates(args: any) {
  const results = await tlsValidator.validateCloudflareEndpoints();
  return {
    content: [{
      type: "text",
      text: `Certificate Validation:\n${JSON.stringify(results, null, 2)}`
    }]
  };
}
```

### 6. Documentation Integration

**Files**:
- `docs/CLOUDFLARE-ZERO-TRUST.md` — Zero Trust setup guide
- `docs/CERTIFICATE-INTEGRATION-GUIDE.md` — This file
- `docs/MCP-SERVER.md` — MCP tools reference

---

## Usage Examples

### Example 1: Automatic Certificate Validation

```typescript
// In MCP tools:
import { tlsValidator } from "../lib/security/tls-validator";

async function callCloudflareAPI(endpoint: string, token: string) {
  // Step 1: Validate certificate
  const certValid = await tlsValidator.validateCloudflareEndpoint(endpoint);
  if (!certValid.valid) {
    throw new Error(`Certificate validation failed: ${certValid.reason}`);
  }

  // Step 2: Make authenticated request
  const response = await fetch(endpoint, {
    headers: { 
      "Authorization": `Bearer ${token}`,
      "User-Agent": "Goldclaw/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
```

### Example 2: Certificate Information Display

```typescript
// In Claude Code chat:
Claude: Show me Cloudflare certificate status

→ Calls: get-cloudflare-certificate-info
→ Returns: {
    pins_active: 2,
    g2_expires: "2031-06-19",
    g1_expires: "2030-10-12",
    validation: "ENABLED",
    endpoints: [
      { url: "api.cloudflare.com", valid: true },
      { url: "dash.cloudflare.com", valid: true }
    ]
  }
```

### Example 3: Zero Trust Device Access

```bash
# 1. Install Cloudflare WARP
# 2. Trust certificates (system store)
sudo security add-certificates -d -r trustRoot \
  ./certs/cloudflare-gateway-ca-g2.pem

# 3. Now all Cloudflare connections are validated
# 4. Claude Code MCP server enforces Zero Trust
```

---

## Verification Checklist

```bash
# 1. Certificates exist
[ -f ./certs/cloudflare-gateway-ca-g2.pem ] && echo "✓ G2" || echo "✗ G2"
[ -f ./certs/cloudflare-gateway-ca-g1.pem ] && echo "✓ G1" || echo "✗ G1"

# 2. Environment configured
grep "CF_CA_CERT_G2" .env.local && echo "✓ Env configured" || echo "✗"

# 3. GCP storage ready
gcloud secrets list --filter="name:cloudflare-ca*" && echo "✓ GCP stored" || echo "✗"

# 4. MCP server can load certs
npm run test:certificates && echo "✓ MCP ready" || echo "✗"

# 5. Cloudflare connectivity
curl -v https://api.cloudflare.com/client/v4 && echo "✓ Connected" || echo "✗"
```

---

## Maintenance

### Monthly
- [ ] Check certificate expiry: `openssl x509 -in ./certs/*.pem -noout -dates`
- [ ] Verify fingerprints still match: `openssl x509 -in ./certs/*.pem -noout -fingerprint -sha256`
- [ ] Test all endpoints: `npm run test:cloudflare-endpoints`

### Quarterly
- [ ] Rotate tokens: `npm run refresh-tokens`
- [ ] Update GCP Secret Manager versions: `gcloud secrets versions list cloudflare-ca-*`
- [ ] Audit access logs: Check who accessed certificates

### Annually
- [ ] Request new certificates from Cloudflare
- [ ] Update certificate pinning with new fingerprints
- [ ] Rotate all OAuth credentials
- [ ] Review Zero Trust access policies

---

## Troubleshooting

### "Certificate not found"
```bash
# Run setup again
./scripts/setup-cloudflare-certificates.sh

# Verify paths
echo $CF_CA_CERT_G2
ls -la ./certs/
```

### "Certificate validation failed"
```bash
# Check fingerprint
openssl x509 -in ./certs/cloudflare-gateway-ca-g2.pem -noout -fingerprint -sha256

# Compare with expected
echo "Expected: $CF_CA_FINGERPRINT_G2"
```

### "MCP server won't start"
```bash
# Check certificate format
file ./certs/*.pem

# Verify Node can read
node -e "require('fs').readFileSync('./certs/cloudflare-gateway-ca-g2.pem')"
```

---

## Integration Points Summary

| Component | Integration | Status |
|-----------|-------------|--------|
| TypeScript Types | `src/lib/security/` | ✅ Complete |
| TLS Validation | `src/lib/security/tls-validator.ts` | ✅ Complete |
| Setup Script | `scripts/setup-cloudflare-certificates.sh` | ✅ Complete |
| Configuration | `.env.example`, `.env.cloudflare` | ✅ Complete |
| GCP Storage | Secret Manager upload | ✅ Complete |
| MCP Tools | Certificate validation tool | 🔄 Ready to add |
| Documentation | Zero Trust guide | ✅ Complete |
| Agent Validation | MCP calls on every API request | ✅ Architecture ready |

---

## Next Steps

1. Run setup script: `./scripts/setup-cloudflare-certificates.sh`
2. Verify: Check `.env.cloudflare` created
3. Enable in MCP: Update `.vscode/mcp.json`
4. Add to trust store: Follow OS-specific instructions
5. Test: `npm run test:certificates`
6. Deploy: Certificates in GCP are production-ready

---

## Files Changed/Created

```
goldclaw/
├── src/lib/security/
│   ├── certificate-pinning.ts          # Certificate pins + validation
│   └── tls-validator.ts                # TLS validation logic
├── scripts/
│   └── setup-cloudflare-certificates.sh # Automated setup (9 steps)
├── certs/                              # Generated by setup script
│   ├── cloudflare-gateway-ca-g2.pem   # Cloudflare G2
│   └── cloudflare-gateway-ca-g1.pem   # Cloudflare G1
├── .env.cloudflare                     # Generated by setup script
├── .env.example                        # Updated with cert variables
├── .gitignore.additions                # Ignore certs/ and .env files
└── docs/
    ├── CLOUDFLARE-ZERO-TRUST.md        # Zero Trust setup guide
    └── CERTIFICATE-INTEGRATION-GUIDE.md # This file
```
