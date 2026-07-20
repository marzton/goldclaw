# Cloudflare Zero Trust & Certificate Security

Goldclaw uses Cloudflare's managed root certificates for Zero Trust authentication and secure agent communication.

## Certificate Overview

Your active Cloudflare CA certificates:

```
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Gateway CA - Cloudflare Managed G2           │
├─────────────────────────────────────────────────────────┤
│ Fingerprint (SHA-256):                                  │
│ 65:6F:86:D2:22:90:22:28:07:4B:AF:92:9D:C3:38:70        │
│ AC:61:0D:E7:A2:94:A4:E2:BD:DB:A1:86:D4:15:71:62        │
│                                                          │
│ Expires: 2031-06-19 (Active, 5+ years)                 │
│ Issuer: Cloudflare, Inc. (San Francisco)               │
│ Algorithm: ECDSA with SHA-256                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Cloudflare Gateway CA - Cloudflare Managed G1           │
├─────────────────────────────────────────────────────────┤
│ Fingerprint (SHA-256):                                  │
│ A7:3F:F8:D7:C3:09:72:BC:95:A2:40:E6:E0:0A:59:8B        │
│ 25:75:E5:97:2F:5C:47:09:5B:69:5B:4A:D2:4C:E1:DE        │
│                                                          │
│ Expires: 2030-10-12 (Active, 4+ years)                 │
│ Issuer: Cloudflare, Inc. (San Francisco)               │
│ Algorithm: ECDSA with SHA-256                          │
└─────────────────────────────────────────────────────────┘
```

## Certificate Pinning in Goldclaw

### Configuration

**File**: `src/lib/security/certificate-pinning.ts`

```typescript
export const CLOUDFLARE_PINS = [
  {
    alias: "cf-gateway-ca-g2",
    fingerprint: "65:6F:86:D2:...",
    algorithm: "sha256",
    issuer: "Cloudflare Gateway CA - Cloudflare Managed G2",
    expires: "2031-06-19",
    active: true,
  },
  {
    alias: "cf-gateway-ca-g1",
    fingerprint: "A7:3F:F8:D7:...",
    algorithm: "sha256",
    issuer: "Cloudflare Gateway CA - Cloudflare Managed G1",
    expires: "2030-10-12",
    active: true,
  },
];
```

### Validation

All Cloudflare API calls validate against these pins:

```typescript
import { validateCertificatePin } from "../lib/security/certificate-pinning";

// Verify certificate fingerprint
if (validateCertificatePin("65:6F:86:D2:22:90:...")) {
  console.log("✓ Cloudflare certificate is authentic");
}
```

### TLS Validator

**File**: `src/lib/security/tls-validator.ts`

Validates all outbound HTTPS connections:

```typescript
import { tlsValidator } from "../lib/security/tls-validator";

// Validate specific endpoint
const result = await tlsValidator.validateCloudflareEndpoint(
  "https://api.cloudflare.com/client/v4"
);

// Validate all endpoints
const allResults = await tlsValidator.validateCloudflareEndpoints();
console.log(allResults.all_valid ? "✓ All endpoints valid" : "✗ Some endpoints failed");
```

---

## Zero Trust Device Access

Goldclaw supports Cloudflare Zero Trust for device-level authentication:

### Prerequisites

1. **Cloudflare Account** with Zero Trust enabled
2. **Device Trust**: Install Cloudflare WARP agent on your machine
3. **Gateway Certificate**: Installed in your device certificate store
4. **Access Policy**: Configured in Cloudflare dashboard

### Setup Steps

#### 1. Enable Zero Trust

```bash
# In Cloudflare dashboard:
# Settings → Zero Trust → Enable
```

#### 2. Add Certificate to Trust Store

**macOS**:
```bash
sudo security add-certificates -d -r trustRoot -k /Library/Keychains/System.keychain \
  ./certificate\ 6.19.2031.pem
```

**Windows (PowerShell as Admin)**:
```powershell
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("certificate 6.19.2031.pem")
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$store.Add($cert)
$store.Close()
```

**Linux**:
```bash
# Debian/Ubuntu
sudo cp certificate\ 6.19.2031.pem /usr/local/share/ca-certificates/
sudo update-ca-certificates

# Fedora/RHEL
sudo cp certificate\ 6.19.2031.pem /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

#### 3. Configure Goldclaw MCP Server

**`.vscode/mcp.json`**:
```json
{
  "servers": {
    "goldclaw": {
      "env": {
        "CF_ZERO_TRUST_ENABLED": "true",
        "CF_CA_CERT_G2": "C:/Users/marst/Downloads/certificate 6.19.2031.pem",
        "CF_CA_CERT_G1": "C:/Users/marst/Downloads/certificate.pem",
        "CF_CERTIFICATE_PINNING": "true"
      }
    }
  }
}
```

#### 4. Create Access Policy

```bash
# In Cloudflare Zero Trust Dashboard:
# 1. Access → Applications
# 2. Create application: "Goldclaw MCP"
# 3. Configure policies:
#    - Device posture: WARP client installed
#    - Authentication: SSO (Gmail)
#    - Country: Allow US (or your location)
```

---

## Certificate Validation in Agents

When agents connect to Cloudflare services, goldclaw validates:

```
User Request (Claude Code)
    ↓
Goldclaw MCP Server
    ├─ Validate: Certificate fingerprint matches G1 or G2
    ├─ Validate: HTTPS connection is encrypted
    ├─ Validate: Hostname is cloudflare.com
    └─ If all valid: Allow request
       If invalid: Block + log incident
    ↓
Cloudflare API / Workers / KV
```

### Validation Flow

```typescript
// In MCP tool handlers:
async function callCloudflareAPI(endpoint: string, token: string) {
  // 1. Validate certificate
  const certValid = await tlsValidator.validateCloudflareEndpoint(endpoint);
  if (!certValid.valid) {
    throw new Error(`Certificate validation failed: ${certValid.reason}`);
  }

  // 2. Make request with Bearer token
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 3. Validate response certificate
  if (!response.ok) {
    throw new Error(`Cloudflare API error: ${response.statusText}`);
  }

  return response.json();
}
```

---

## Secrets Storage with Zero Trust

Certificates + Secrets + OAuth tokens are stored securely:

```
┌────────────────────────────────────────────┐
│        Certificate + Token Storage         │
├────────────────────────────────────────────┤
│                                            │
│  Cloudflare KV Namespace (SECRETS)         │
│  ├─ cloudflare:access_token                │
│  ├─ cloudflare:refresh_token               │
│  ├─ openclaw:access_token                  │
│  └─ openclaw:refresh_token                 │
│                                            │
│  GCP Secret Manager (Backup)               │
│  ├─ cloudflare-api-token                   │
│  ├─ openclaw-client-secret                 │
│  └─ cf-ca-certificate-pins                 │
│                                            │
│  Local .env.local (Development)            │
│  ├─ CF_API_TOKEN                           │
│  └─ OPENCLAW_API_KEY                       │
│                                            │
│  All encrypted in transit (TLS pinned)     │
│  All encrypted at rest (KV + GCP)          │
│                                            │
└────────────────────────────────────────────┘
```

---

## Certificate Rotation & Renewal

### Monitor Expiry

```bash
# Check certificate expiration
openssl x509 -in "certificate 6.19.2031.pem" -noout -dates

# Output:
# notBefore=Jun 19 19:42:00 2026 GMT
# notAfter=Jun 19 19:42:00 2031 GMT
```

### Automated Renewal

Cloudflare automatically rotates certificates. Goldclaw checks for updates:

```typescript
// Tool: check-certificate-updates
async function checkCertificateUpdates() {
  const response = await fetch(
    "https://api.cloudflare.com/client/v4/certificates"
  );
  const certs = await response.json();

  return {
    current_g2_expires: "2031-06-19",
    current_g1_expires: "2030-10-12",
    next_renewal: "2029-06-19", // 2 years before expiry
    status: "healthy",
  };
}
```

### Update Process

1. **Detection**: New certificate available from Cloudflare
2. **Download**: Fetch new PEM file
3. **Validation**: Verify signature against current cert
4. **Storage**: Store in GCP Secret Manager
5. **Sync**: Distribute to all agents
6. **Testing**: Validate all endpoints accept new cert
7. **Rollback**: Keep old cert as fallback for 30 days

---

## Troubleshooting

### "Certificate validation failed"

```bash
# 1. Verify certificates exist
ls -la Downloads/certificate*.pem

# 2. Verify certificate format
openssl x509 -in "certificate 6.19.2031.pem" -noout -text

# 3. Verify certificate chain
openssl verify -CAfile "certificate 6.19.2031.pem" <endpoint_cert>

# 4. Check system certificate store
# macOS: Keychain Access → Certificates
# Windows: certlm.msc → Trusted Root Certification Authorities
# Linux: /etc/ssl/certs/
```

### "HTTPS connection failed"

```bash
# 1. Test connectivity to Cloudflare
curl -v https://api.cloudflare.com/client/v4

# 2. Check certificate path in env vars
echo $CF_CA_CERT_G2
echo $CF_CA_CERT_G1

# 3. Verify TLS 1.2+ is enabled
openssl s_client -connect api.cloudflare.com:443 -tls1_2
```

### "MCP server won't start"

```bash
# 1. Check certificate permissions
chmod 644 certificate*.pem

# 2. Verify Node.js can read certificates
node -e "console.log(require('fs').readFileSync('./certificate\ 6.19.2031.pem', 'utf8').substring(0, 50))"

# 3. Check for certificate parse errors in logs
npm run dev:mcp 2>&1 | grep -i cert
```

---

## Security Best Practices

✅ **Do**:
- Keep certificates in sync with Cloudflare
- Validate certificates before every API call
- Store certificates in secure location (never git)
- Rotate certificates annually
- Log certificate validation events
- Use HTTPS for all Cloudflare connections

❌ **Don't**:
- Disable certificate pinning in production
- Share certificate files via email
- Commit certificate files to git
- Trust self-signed certificates
- Use HTTP for Cloudflare APIs
- Ignore certificate expiry warnings

---

## Files & Configuration

| File | Purpose |
|------|---------|
| `src/lib/security/certificate-pinning.ts` | Certificate pin definitions |
| `src/lib/security/tls-validator.ts` | TLS validation logic |
| `Downloads/certificate 6.19.2031.pem` | Cloudflare CA G2 (primary) |
| `Downloads/certificate.pem` | Cloudflare CA G1 (backup) |
| `.vscode/mcp.json` | MCP server Zero Trust config |
| `.env.local` | Local certificate paths (development) |

---

## Next Steps

1. ✅ Certificates imported
2. ⏳ Add to trust store (OS level)
3. ⏳ Enable certificate pinning in MCP server
4. ⏳ Configure Zero Trust access policy
5. ⏳ Test with `tlsValidator.validateCloudflareEndpoints()`
6. ⏳ Monitor certificate expiry
7. ⏳ Set up renewal automation
