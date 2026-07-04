# OpenClaw Scaling Architecture & Migration Playbook
## From Portable Hub to Enterprise Scale ($500 → $100K+)

---

## EXECUTIVE SUMMARY

This playbook handles **three phases** of scaling OpenClaw business:

| Phase | Revenue | Infrastructure | Database | Uptime | Users |
|-------|---------|-----------------|----------|--------|-------|
| **1: LaCie** | $500-5K | Portable hub | SQLite | 95% | <100 |
| **2: HostGator** | $5K-50K | Shared hosting | MySQL | 99% | 100-1000 |
| **3: Multi-Region** | $50K-100K+ | AWS/Cloud | PostgreSQL | 99.95% | 1000+ |

Each phase includes:
- Data architecture (storage, secrets, backups)
- Application deployment strategy
- Security posture
- Zero-downtime migration procedures
- Performance metrics & scaling triggers

---

## PHASE 1: LaCie PORTABLE HUB

**Timeline**: Startup launch → $5K revenue (1-3 months)
**Goal**: Get product to market fast with minimal cost

### 1.1 Data Architecture

#### Secrets Storage
```
Location: ~/.env (LaCie local filesystem)
Permissions: 600 (owner read-write only)
Tracked in Git: NO (.env in .gitignore)

Contains:
- Stripe API keys (pk_live_xxx, sk_live_xxx)
- Google OAuth credentials (client_id, client_secret, refresh_token)
- WhatsApp Business API token (Bearer token)
- Database connection strings
- JWT secret (for API auth)
- Session secret (for cookies)
- Any 3rd-party API keys (payment, analytics, etc.)
```

#### Business Data Storage
```
Database: SQLite (openclaw.db)
Location: ~/openclaw/data/openclaw.db
Size Limit: <50MB (Phase 1)

Tables:
- customers (id, phone, email, name, created_at)
- products (id, name, sku, price, stock)
- orders (id, customer_id, product_id, qty, status, created_at)
- order_items (id, order_id, product_id, qty, price)
- webhooks_log (id, event_type, payload, created_at)  # For debugging
- settings (key, value)  # Config storage

Driver: sqlite3 (npm package)
Connection: Direct file access (no pooling needed yet)
```

#### Backup Strategy
```
Frequency: Daily (manual or cron)
Method: File copy to USB drives

Backup Schedule:
- End of each business day: cp openclaw.db /mnt/usb1/openclaw.db.backup
- Weekly: Full copy + timestamp: openclaw.db.2024-07-02.backup

Storage:
- Primary: 2x external USB drives (kept offsite, rotate weekly)
- Secondary: Email encrypted backup to self (weekly)

Retention: 4 weeks rolling
Restore Test: Monthly manual restore to verify integrity

Recovery Time: ~10 minutes (restore + restart)
```

### 1.2 Application Deployment

#### Setup on LaCie
```bash
# Directory structure:
/Users/marston/openclaw/
├── app/                      # Node.js app
│   ├── server.js
│   ├── routes/
│   ├── models/
│   ├── webhook-handlers/
│   ├── public/
│   ├── package.json
│   └── .env                  # NEVER commit
├── data/
│   └── openclaw.db          # SQLite file
├── backups/                  # Local backups
├── logs/
└── README.md

# Installation:
cd openclaw
npm install
node server.js

# Runs on:
http://localhost:3000
```

#### Database Setup (SQLite)
```sql
-- customers.sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- products.sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- orders.sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- order_items.sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

#### Webhook Configuration
```javascript
// server.js
const express = require('express');
const app = express();

// WhatsApp Webhook
app.post('/webhook/whatsapp', (req, res) => {
  const message = req.body.entry[0].changes[0].value.messages[0];
  // Process order from WhatsApp
  res.status(200).send('OK');
});

// Stripe Webhook
app.post('/webhook/stripe', (req, res) => {
  const event = req.body;
  // Handle payment events
  res.status(200).send('OK');
});

// Google Sheets (if tracking orders there)
app.post('/webhook/google', (req, res) => {
  // Sync with Google Sheets API
  res.status(200).send('OK');
});

// During development: use ngrok for webhooks
// ngrok http 3000  → exposes localhost:3000 to public internet
// Set webhook URL to: https://abc123.ngrok.io/webhook/whatsapp
```

### 1.3 Security (Phase 1)

#### Threat Model
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| LaCie device stolen | TOTAL DATA LOSS | USB backups (offsite) |
| .env file leaked | API keys compromised | .gitignore, file permissions 600 |
| ngrok tunnel hijacked | Webhook manipulation | Verify webhook signatures |
| Local file corruption | DB corruption | Daily backups + test restores |
| Accidental git commit | Keys in history | Pre-commit hook to check .env |

#### Implementation
```bash
# 1. Permissions (.env file)
chmod 600 ~/.env
chmod 700 ~/openclaw/data/

# 2. Git hooks (prevent .env commit)
# .git/hooks/pre-commit
#!/bin/bash
if git diff --cached --name-only | grep -q "\.env"; then
  echo "ERROR: .env cannot be committed"
  exit 1
fi

# 3. Backup encryption (optional)
gpg --cipher-algo AES256 -c openclaw.db
# Creates: openclaw.db.gpg (encrypted)

# 4. Webhook verification (Stripe example)
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, signature, endpoint_secret);
```

### 1.4 Scaling Trigger → Phase 2

**Move to HostGator when ANY of these hit:**
- Revenue exceeds $5,000
- Processing >500 orders/month
- SQLite DB reaches 50MB
- Need uptime >95%
- Operating from multiple locations
- Need to run 24/7 (not just business hours)

**Warning Signs:**
- SQLite locks (concurrent writes fail)
- Response times >5s under load
- Frequent crashes requiring manual restart
- Can't backup while app is running

---

## PHASE 2: HostGator SHARED HOSTING

**Timeline**: $5K revenue → $50K revenue (3-12 months)
**Goal**: Reliable uptime, automated backups, no single point of failure

### 2.1 Data Architecture

#### Secrets Storage
```
Location: /home/user/domains/yourdomain.com/.env (on server)
Permissions: 600 (only your user can read)
Access: cPanel File Manager (restricted to your account)

Setup on HostGator:
1. SSH into server: ssh user@yourdomain.com
2. cd /home/user/public_html/
3. Create .env with database credentials
4. chmod 600 .env

Content:
DB_HOST=mysql123.yourdomain.com
DB_PORT=3306
DB_NAME=yourdomain_openclaw
DB_USER=yourdomain_db
DB_PASSWORD=strong_random_password_32char
STRIPE_KEY=pk_live_xxx
STRIPE_SECRET=sk_live_xxx
...
```

#### Business Data Storage
```
Database: MySQL (managed by HostGator)
Host: mysql123.yourdomain.com (or localhost from server)
Database: yourdomain_openclaw
User: yourdomain_db (limited to SELECT, INSERT, UPDATE, DELETE only)

Connection Pool:
- Max connections: 10
- Acquire timeout: 5s
- Idle timeout: 30s
- Queue limit: 20

Size Limit: Up to 1GB (HostGator shared hosting limit)

Backup Strategy:
- HostGator automatic: Daily backup (retained 7 days)
- Manual export: Weekly via cPanel → Backups → MySQL
- Stored: Download .sql file locally + to USB

Recovery Time: 1-2 hours (contact HostGator support)
```

#### MySQL User Permissions
```sql
-- Create limited user (HostGator cPanel or SSH)
CREATE USER 'yourdomain_db'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON yourdomain_openclaw.* TO 'yourdomain_db'@'localhost';
FLUSH PRIVILEGES;

-- This user CANNOT:
-- - ALTER table structures
-- - DROP database
-- - CREATE new databases
-- - Access other databases
```

### 2.2 Application Deployment

#### HostGator Setup (cPanel)
```
1. Domain Setup:
   - yourdomain.com → HostGator nameservers
   - Point MX records to mail server (if needed)
   - SSL: AutoSSL (automatic free Let's Encrypt)

2. Code Upload:
   Method 1 (Git): 
   - SSH into server
   - git clone https://github.com/yourrepo/openclaw.git
   - cd openclaw
   - npm install
   
   Method 2 (SFTP):
   - Use File Manager or FileZilla
   - Upload to /public_html/

3. Node.js Setup (cPanel/SSH):
   - cPanel → Node.js → Create Application
   - Application Root: /home/user/public_html
   - Application Startup File: server.js
   - Port: 3001 (internal, proxied through Apache)
   - Enable Passenger/Node Module

4. Environment:
   - Copy .env to server
   - chmod 600 .env
   - Restart Node.js app: cPanel → Node.js → Restart

5. Database Migration:
   - Export from SQLite: sqlite3 openclaw.db ".dump" > schema.sql
   - Create MySQL database in cPanel
   - Import schema: mysql yourdomain_openclaw < schema.sql
   - Migrate data (see section 2.4)
```

#### Reverse Proxy Configuration (Apache → Node.js)
```apache
# cPanel auto-creates this, but for reference:
<IfModule mod_proxy.c>
  <IfModule mod_proxy_http.c>
    ProxyPass / http://127.0.0.1:3001/
    ProxyPassReverse / http://127.0.0.1:3001/
  </IfModule>
</IfModule>
```

#### Node.js with MySQL Connection Pool
```javascript
// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 20,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 30000
});

// server.js
const express = require('express');
const pool = require('./db');
const app = express();

app.get('/orders', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [orders] = await connection.query('SELECT * FROM orders LIMIT 100');
    res.json(orders);
  } finally {
    connection.release();
  }
});

// Webhook handlers (now receive real domain requests, not ngrok)
app.post('/webhook/whatsapp', (req, res) => {
  // ... webhook code
});

app.listen(3001, () => console.log('Running on :3001'));
```

#### SSL/HTTPS
```
HostGator provides:
1. Free AutoSSL (automatic Let's Encrypt renewal)
   - cPanel → AutoSSL → Enable

2. Force HTTPS redirect:
   # .htaccess in /public_html/
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### 2.3 Security (Phase 2)

#### Threat Model Expansion
| Threat | Impact | Mitigation |
|--------|--------|-----------|
| Shared hosting neighbor attack | DB breach | HostGator isolates, limited DB privileges |
| Webhook DDoS | Service down | Rate limiting on webhook routes |
| Forgotten password reset | Account takeover | Email verification + TOTP (2FA) |
| SQL injection | Data theft | Prepared statements (parameterized queries) |
| Plaintext DB password in code | Easy breach | Use .env file (600 permissions) |
| Lost HostGator backups | Data loss | Manual weekly export to USB |

#### Implementation
```javascript
// Prepared statements (prevent SQL injection)
const [result] = await connection.execute(
  'SELECT * FROM orders WHERE customer_id = ? AND status = ?',
  [customerId, status]  // Parameters bound separately
);

// Rate limiting on webhooks
const rateLimit = require('express-rate-limit');
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100,  // 100 requests per minute
  message: 'Too many webhook requests'
});
app.post('/webhook/whatsapp', webhookLimiter, (req, res) => { ... });

// Webhook signature verification (Stripe)
const signature = req.headers['stripe-signature'];
try {
  const event = stripe.webhooks.constructEvent(
    req.body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  // ... handle event
} catch (err) {
  return res.status(400).send(`Webhook error: ${err.message}`);
}
```

#### Data Encryption at Rest
```bash
# Optional: Encrypt MySQL backups
gpg --cipher-algo AES256 -c backup.sql
# Creates: backup.sql.gpg

# Restore:
gpg --output backup.sql --decrypt backup.sql.gpg
```

### 2.4 Zero-Downtime Migration: LaCie → HostGator

#### Pre-Migration Checklist (1 week before)

```bash
# 1. Full LaCie backup
cp ~/openclaw/data/openclaw.db ~/backup/openclaw.db.full.2024-07-02
cp ~/openclaw/data/openclaw.db /Volumes/USB1/openclaw.db.backup

# 2. HostGator MySQL created & tested
# (via cPanel or SSH)

# 3. Test data migration locally
sqlite3 ~/openclaw/data/openclaw.db ".dump" > /tmp/schema.sql
# Edit schema.sql: SQLite → MySQL syntax conversions
mysql yourdomain_openclaw < /tmp/schema.sql
# Verify: SELECT COUNT(*) FROM orders;

# 4. Node.js app tested on HostGator
# Try running app locally with HostGator MySQL connection

# 5. All API keys verified on HostGator
# - Stripe: Test charge $0.01
# - WhatsApp: Send test message
# - Google: Verify OAuth redirect URL

# 6. Document rollback procedure
# (see below)
```

#### Phase 1 → Phase 2: Dual-Run Period (3 days)

**Timeline:**

**Day 1 (Monday)**
```
08:00 - Push code to HostGator
08:15 - Verify app runs: https://yourdomain.com
08:30 - Point test customer to HostGator (manual orders only)
10:00 - Monitor logs for errors
12:00 - Start initial data sync (see script below)
16:00 - Verify webhook signatures work
```

**Day 2 (Tuesday)**
```
08:00 - Both systems accept orders (dual-write)
        LaCie: Active, accepts orders
        HostGator: Active, accepts orders
        
        • Stripe charges go to PRODUCTION account
        • Webhooks from Stripe trigger on BOTH servers
        
12:00 - Sync LaCie → HostGator (delta sync)
16:00 - Customer feedback: test throughput
20:00 - Verify reconciliation (check databases match)
```

**Day 3 (Wednesday) - Final Cutover**
```
23:50 (Midnight Monday) - START MAINTENANCE WINDOW

23:55 - Stop LaCie app server
        sudo systemctl stop openclaw
        
00:00 - Run FINAL delta sync script (see below)

00:05 - Switch DNS nameservers to HostGator
        (Propagates ~5 minutes)
        
00:10 - Verify HostGator live:
        curl -I https://yourdomain.com
        # Should return 200 OK

00:30 - Send "Back Online" notification to customers

00:45 - END MAINTENANCE WINDOW
        Keep LaCie running (read-only) as backup
```

#### Data Migration Script: SQLite → MySQL

```bash
#!/bin/bash
# migrate.sh - Sync LaCie (SQLite) → HostGator (MySQL)

SQLITE_DB="/Users/marston/openclaw/data/openclaw.db"
MYSQL_HOST="mysql123.yourdomain.com"
MYSQL_DB="yourdomain_openclaw"
MYSQL_USER="yourdomain_db"

echo "=== Phase 1: Export SQLite Schema ==="
sqlite3 "$SQLITE_DB" ".dump" > /tmp/sqlite_dump.sql

echo "=== Phase 2: Convert SQLite → MySQL Syntax ==="
# Fix SQLite-specific syntax
sed -i '' \
  -e 's/AUTOINCREMENT/AUTO_INCREMENT/g' \
  -e "s/'//g" \
  /tmp/sqlite_dump.sql

echo "=== Phase 3: Get timestamp of last sync ==="
LAST_SYNC=$(mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e \
  "SELECT MAX(created_at) FROM orders" "$MYSQL_DB" 2>/dev/null)

echo "Last sync: $LAST_SYNC"

echo "=== Phase 4: Export new records from SQLite ==="
# Export orders created since last sync
sqlite3 "$SQLITE_DB" <<EOF > /tmp/new_orders.sql
SELECT * FROM orders WHERE created_at > '$LAST_SYNC';
EOF

echo "=== Phase 5: Insert into MySQL ==="
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DB" < /tmp/new_orders.sql

echo "=== Phase 6: Verify row counts ==="
SQLITE_COUNT=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM orders;")
MYSQL_COUNT=$(mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e \
  "SELECT COUNT(*) FROM orders" "$MYSQL_DB" 2>/dev/null)

echo "SQLite orders: $SQLITE_COUNT"
echo "MySQL orders: $MYSQL_COUNT"

if [ "$SQLITE_COUNT" -eq "$MYSQL_COUNT" ]; then
  echo "✓ Migration successful! Counts match."
  exit 0
else
  echo "✗ Migration failed! Count mismatch."
  exit 1
fi
```

#### Rollback Procedure (If something breaks)

```bash
#!/bin/bash
# rollback.sh - Revert to LaCie if HostGator fails

echo "=== ROLLBACK IN PROGRESS ==="

# 1. Revert DNS (switch back to LaCie IP)
echo "Reverting DNS nameservers back to LaCie..."
# (Do this in domain registrar control panel)
# Set nameservers to: ns1.lacie.local, ns2.lacie.local
# OR point A record directly to LaCie IP: 192.168.1.100

# 2. Monitor LaCie (should be live in ~5 minutes)
for i in {1..10}; do
  if curl -s https://yourdomain.local | grep -q "openclaw"; then
    echo "✓ LaCie is back online"
    break
  fi
  echo "Waiting... ($i/10)"
  sleep 30
done

# 3. Investigate HostGator failure
echo "Checking HostGator logs..."
ssh user@yourdomain.com "tail -50 ~/domains/yourdomain.com/error_log"

# 4. Fix issue
# - Check MySQL connection
# - Verify .env file
# - Check Node.js version compatibility
# - Review webhook signatures

# 5. Once fixed, retry migration
echo "Once you've fixed the issue, run: ./migrate.sh"
```

### 2.5 Monitoring & Maintenance

#### Health Checks
```javascript
// server.js - Health endpoint (used for monitoring)
app.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query('SELECT 1');
    connection.release();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message,
      database: 'disconnected'
    });
  }
});
```

#### Uptime Monitoring
```
Use free/cheap tools:
1. UptimeRobot (free plan)
   - Monitor: https://yourdomain.com/health
   - Check every 5 minutes
   - Alert if down for >5 minutes

2. HostGator built-in monitoring
   - cPanel → Monitors → Add monitor for your site

3. Manual checks:
   - Daily: Test login, place order, verify webhook
```

#### Logs & Debugging
```bash
# HostGator: View logs via SSH
ssh user@yourdomain.com
tail -100 ~/domains/yourdomain.com/error_log
tail -100 ~/domains/yourdomain.com/access_log

# Node.js application logs (if redirected)
tail -100 ~/.pm2/logs/openclaw-error.log

# MySQL slow queries
tail -100 ~/.mysql_slow_query.log
```

#### Weekly Maintenance
```
Monday morning checklist:
□ Verify all webhooks executed (0 errors)
□ Check error logs (any new errors?)
□ Export MySQL backup manually
□ Test recovery: import backup locally
□ Verify all API keys still valid
□ Check disk usage (hosting panel)
□ Check database size (cPanel → MySQL)
□ Review customer complaints (email)
```

---

## PHASE 3: MULTI-REGION AWS INFRASTRUCTURE

**Timeline**: $50K revenue → $100K+ revenue (6-24 months)
**Goal**: Global scale, high availability, compliance (GDPR), enterprise-grade

### 3.1 Data Architecture

#### Secrets Management: HashiCorp Vault
```
Setup:
- AWS EC2 instance (t3.small, $15/month)
- Vault server (open-source)
- All secrets encrypted at rest

Usage:
app → Vault (secure token) → Decrypt secret → Use

Configuration:
VAULT_ADDR=https://vault.yourdomain.com
VAULT_TOKEN=s.abc123xyz (rotated every 30 days)

Secret Format:
vault kv put secret/stripe \
  pk_live=pk_live_xxx \
  sk_live=sk_live_xxx

vault kv put secret/google \
  client_id=xxx.apps.googleusercontent.com \
  client_secret=xxx
```

#### Database: PostgreSQL Multi-Region
```
Primary Database (US-East):
- AWS RDS PostgreSQL 14
- db.t3.medium instance
- Multi-AZ failover (automatic)
- Automated daily backups (35-day retention)
- Encryption at rest (KMS)

Configuration:
DB_HOST=openclaw-primary.abc123.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=openclaw_prod
DB_USER=openclaw_app
DB_PASSWORD=<from Vault>

Connection Pool:
- Max connections: 30 (RDS limit)
- Acquire timeout: 10s
- SSL: Required (RDS enforces)
- Read replicas: Enable for scaling reads

Read Replicas (for global latency):
1. EU-West (Ireland)
   - Async replication from US-East
   - Read-only endpoint for EU users
   - 50-100ms replication lag

2. Asia-Pacific (Singapore)
   - Async replication from US-East
   - Read-only endpoint for Asia users
   - 100-200ms replication lag

Writes ALWAYS go to US-East primary.
Reads are routed to nearest replica based on geography.

Backup Strategy:
- Automated: RDS automatic snapshots (daily, 35-day retention)
- Manual: Weekly export to S3 (encrypted)
- Disaster recovery: S3 backup to separate AWS region

Recovery Time: <15 minutes (failover automatic)
Recovery Point: <1 minute (continuous replication)
```

#### Application Layer: Containerized with ECS

```
Docker Container:
- Node.js 18 LTS
- Alpine Linux (small image ~200MB)
- Multi-stage build (reduce final size)

Deployment:
- AWS ECR (Elastic Container Registry)
- AWS ECS (Elastic Container Service)
- Auto-scaling: 2-10 containers based on load

Regions:
1. US-East (Primary)
   - 2 containers (always)
   - Up to 5 during peak

2. EU-West (Secondary)
   - 1 container (always)
   - Up to 3 during peak

3. Asia-Pacific (Tertiary)
   - 1 container (always)
   - Up to 3 during peak

Load Balancer:
- Application Load Balancer (ALB) per region
- Auto-scales with traffic
- Health checks every 5s

DNS Routing:
- Route 53 (AWS DNS service)
- Geo-proximity routing:
  * US users → US-East ALB
  * EU users → EU-West ALB
  * Asia users → Asia-Pacific ALB
- Failover: If ALB down, route to backup region
```

### 3.2 Application Architecture (Phase 3)

#### Docker Setup
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app

# Copy and install
COPY package*.json ./
RUN npm ci --only=production

# Build stage (if TypeScript)
COPY . .
RUN npm run build

# Final stage
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```

#### ECS Task Definition
```json
{
  "family": "openclaw-prod",
  "containerDefinitions": [
    {
      "name": "openclaw",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/openclaw:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "VAULT_ADDR",
          "value": "https://vault.yourdomain.com"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:openclaw/db-password"
        },
        {
          "name": "VAULT_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:openclaw/vault-token"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/openclaw-prod",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "memory": 512,
      "cpu": 256
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "256",
  "memory": "512"
}
```

#### Application Code with Multi-Region Support
```javascript
// db.js - Multi-region connection logic
const { Pool } = require('pg');
const geoip = require('geoip-lite');

// Define regional endpoints
const REGION_ENDPOINTS = {
  'us-east-1': 'openclaw-primary.abc123.us-east-1.rds.amazonaws.com',
  'eu-west-1': 'openclaw-read-eu.abc123.eu-west-1.rds.amazonaws.com',
  'ap-southeast-1': 'openclaw-read-ap.abc123.ap-southeast-1.rds.amazonaws.com'
};

// Create pools for each region
const pools = {};
Object.entries(REGION_ENDPOINTS).forEach(([region, host]) => {
  pools[region] = new Pool({
    host,
    port: 5432,
    database: 'openclaw_prod',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
});

// Route writes to primary, reads to nearest replica
const db = {
  query: async (sql, params, userIp) => {
    let pool;
    
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      // READ: Use nearest replica
      const geo = geoip.lookup(userIp);
      const region = geo?.continent === 'EU' ? 'eu-west-1' 
                   : geo?.continent === 'AS' ? 'ap-southeast-1'
                   : 'us-east-1';
      pool = pools[region];
    } else {
      // WRITE: Always use primary
      pool = pools['us-east-1'];
    }
    
    return pool.query(sql, params);
  }
};

module.exports = db;
```

#### Monitoring & Observability
```javascript
// server.js with DataDog integration
const tracer = require('dd-trace').init();
const StatsD = require('statsd-client');
const dogstatsd = new StatsD();

const express = require('express');
const app = express();

// Track all requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    dogstatsd.timing('http.request.duration', duration);
    dogstatsd.increment('http.requests', 1, [`path:${req.path}`, `method:${req.method}`, `status:${res.statusCode}`]);
  });
  next();
});

// Database query monitoring
const originalQuery = db.query;
db.query = async (sql, params) => {
  const start = Date.now();
  try {
    const result = await originalQuery(sql, params);
    dogstatsd.timing('db.query.duration', Date.now() - start);
    return result;
  } catch (err) {
    dogstatsd.increment('db.errors', 1);
    throw err;
  }
};

// Custom metrics
dogstatsd.gauge('orders.active', activeOrders);
dogstatsd.gauge('customers.total', totalCustomers);
dogstatsd.gauge('revenue.daily', dailyRevenue);

app.listen(3000, () => {
  console.log('Server running with monitoring');
});
```

### 3.3 Security (Phase 3)

#### WAF & DDoS Protection
```
AWS Shield (DDoS Protection):
- Standard: Free, Layer 3/4 protection
- Advanced: $3,000/month, more sophisticated attacks

AWS WAF (Web Application Firewall):
- Rules for SQL injection, XSS, rate limiting
- $5/month + $1 per rule

Cloudflare (Optional Additional Layer):
- DDoS protection
- Rate limiting
- Bot filtering
- $20+/month
```

#### Data Encryption
```
At Rest:
- RDS: KMS encryption (AWS key management)
- S3: AES-256 encryption
- Secrets Manager: AES-256 encryption

In Transit:
- All traffic: HTTPS/TLS 1.2+
- Database connections: SSL required
- API calls: Mutual TLS (mTLS)

Application-Level:
- Passwords: bcrypt (cost: 12)
- API keys: Never logged, only hash stored
- Sensitive PII: Encrypted field-level (optional)
```

#### GDPR Compliance (EU Customer Data)
```
Requirements:
- Data residency: EU customer data stored in EU region
- Data deletion: Implement "right to be forgotten"
- Data export: Generate JSON export of customer data
- Privacy policy: Clear disclosure of data handling

Implementation:
1. EU-West RDS: Stores EU customer data only
2. Data deletion API:
   DELETE /api/v1/customers/{id}?gdpr=true
   → Hard delete customer + all orders + personal data
   
3. Data export API:
   GET /api/v1/customers/{id}/export
   → Returns JSON: customer info, orders, activity

4. Audit logging:
   - Log all data access (who accessed what, when)
   - 1-year retention for compliance
   - Encrypted storage
```

### 3.4 Scaling Triggers & Metrics

#### Performance Targets
```
Target Metrics (Phase 3):
- API latency: P99 < 200ms
- Database latency: P99 < 50ms
- Error rate: < 0.1%
- Uptime: 99.95% (52 minutes/year downtime allowed)

Monitoring (DataDog / New Relic):
dashboards:
  - Request latency by endpoint
  - Error rates and types
  - Database connection pool usage
  - Memory/CPU usage per container
  - Webhook delivery success rate
```

#### Auto-Scaling Rules
```
ECS Auto-Scaling:
- Scale UP if: CPU > 70% for 2 minutes
- Scale DOWN if: CPU < 30% for 5 minutes
- Min containers: 2 (always-on)
- Max containers: 10 (cost control)

Database Scaling:
- Monitor: Connections, CPU, storage
- Scale UP if: Connections > 20 or CPU > 80%
- Scale READ replicas: If reads lag behind

Cost Monitoring:
- Set budget alerts: $500/month
- Daily cost report (email)
- Unused resources cleanup (monthly)
```

### 3.5 Phase 2 → Phase 3 Migration

#### Pre-Migration (4 weeks before)

```
Week 1: Architecture Planning
□ Design Terraform/CloudFormation IaC
□ Create AWS account structure
□ Plan migration timeline
□ Brief team on changes

Week 2: AWS Setup
□ VPC, subnets, security groups
□ RDS PostgreSQL primary + replicas
□ ECR repository created
□ ALB + Target groups
□ Route 53 setup

Week 3: Application Changes
□ Convert SQLite/MySQL → PostgreSQL
□ Containerize app (Dockerfile)
□ Add region-aware routing
□ Implement Vault integration

Week 4: Testing
□ Load testing (JMeter, k6)
□ Failover testing (kill containers)
□ Backup/restore testing
□ Disaster recovery drill
```

#### Migration Timeline (Low-Downtime)

**Phase 1: Parallel Run (1 week)**
```
Monday:
- Deploy app to AWS (standby mode)
- HostGator: Primary (still serving)
- AWS: Read-only mirror of HostGator

Tuesday-Thursday:
- Real-time sync: HostGator → PostgreSQL
- Monitor replication lag (<100ms)
- Test failover: Switch reads to AWS

Friday:
- Final sync + cutover window (01:00-02:00 UTC)
- Switch writes to PostgreSQL
- Monitor error rates (should stay <0.1%)
```

**Phase 2: Shutdown HostGator**
```
Post-Cutover (Week 2):
- Keep HostGator live as backup (read-only)
- Monitor AWS for stability
- Fix any issues

Week 3:
- Confirm no issues
- Keep HostGator backups for 30 days
- Archive HostGator for compliance

Week 4:
- Cancel HostGator (keep backup for 6 months)
```

---

## DATABASE SCHEMA MIGRATION GUIDE

### SQLite → MySQL (Phase 1 → 2)

```javascript
// migration-phase1-to-2.js
const sqlite3 = require('sqlite3');
const mysql = require('mysql2/promise');

async function migrate() {
  // Open SQLite
  const db = new sqlite3.Database('./openclaw.db');
  
  // Connect to MySQL
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Define table mapping with type conversions
  const tables = {
    customers: {
      ddl: `
        CREATE TABLE IF NOT EXISTS customers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone VARCHAR(20) UNIQUE NOT NULL,
          email VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      rows: 'SELECT * FROM customers'
    },
    products: {
      ddl: `
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(100) UNIQUE NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          stock INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      rows: 'SELECT * FROM products'
    },
    orders: {
      ddl: `
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          total DECIMAL(10, 2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
      `,
      rows: 'SELECT * FROM orders'
    },
    order_items: {
      ddl: `
        CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          qty INT NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `,
      rows: 'SELECT * FROM order_items'
    }
  };

  for (const [tableName, config] of Object.entries(tables)) {
    console.log(`Migrating ${tableName}...`);
    
    // Create table
    await connection.execute(config.ddl);
    
    // Get rows from SQLite
    const rows = await new Promise((resolve, reject) => {
      db.all(config.rows, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Insert into MySQL
    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const placeholders = keys.map(() => '?').join(', ');
      
      await connection.execute(
        `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
    
    console.log(`✓ ${tableName}: ${rows.length} rows migrated`);
  }

  // Verify
  for (const tableName of Object.keys(tables)) {
    const [result] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    console.log(`${tableName}: ${result[0].count} rows`);
  }

  db.close();
  await connection.end();
  console.log('✓ Migration complete!');
}

migrate().catch(console.error);
```

### MySQL → PostgreSQL (Phase 2 → 3)

```sql
-- migration-phase2-to-3.sql
-- Use AWS Database Migration Service (DMS) for this
-- Or manual approach:

-- 1. Export from MySQL
mysqldump -h <mysql-host> -u <user> -p <db> > backup.sql

-- 2. Convert to PostgreSQL syntax
-- (Use tool: pgloader or manual sed)

-- 3. Import into PostgreSQL
psql -h <postgres-host> -U <user> < backup.sql

-- 4. Fix sequences (for auto-increment)
SELECT setval(pg_get_serial_sequence('customers', 'id'), (SELECT MAX(id) FROM customers));
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products));
SELECT setval(pg_get_serial_sequence('orders', 'id'), (SELECT MAX(id) FROM orders));
SELECT setval(pg_get_serial_sequence('order_items', 'id'), (SELECT MAX(id) FROM order_items));
```

---

## COST BREAKDOWN BY PHASE

### Phase 1: LaCie (Monthly Cost: ~$20)
```
LaCie Portable Hub: $200 one-time
External USB drives: $50/each x2 = $100 one-time
Total first month: $200-300
Ongoing: $0 (no hosting costs)
```

### Phase 2: HostGator (Monthly Cost: ~$80-150)
```
HostGator Shared Hosting:
  - Basic: $5.95/month → $180/year
  - Premium: $13.95/month → $420/year (recommended)
  - Business: $26.95/month → $814/year (with free domain)

Domain: $10-15/year
SSL Certificate: Free (AutoSSL)
Backup service: Included
Email accounts: Included

Total: $80-120/month
```

### Phase 3: AWS Multi-Region (Monthly Cost: ~$500-1000+)
```
EC2 (Application Servers):
  - t3.small x 3 regions = ~$60/month total

RDS (PostgreSQL):
  - db.t3.small primary (Multi-AZ): ~$150/month
  - Read replicas x2: ~$80/month

Data Transfer:
  - Inter-region replication: ~$50/month
  - Internet outbound: ~$50/month (first 1TB free)

Storage:
  - S3 backups: ~$10/month
  - RDS backups: Included (free up to DB size)

Monitoring/Logging:
  - DataDog: ~$100-200/month
  - CloudWatch: ~$10/month

DNS/Load Balancer:
  - Route 53: ~$1 per 1M queries = ~$10/month
  - ALB x3 regions: ~$30/month

Total: $500-800/month (scale up as revenue grows)
```

---

## MONITORING & ALERTING BY PHASE

### Phase 1: LaCie (Manual)
```
Daily Checks:
□ App running (manual restart if crashed)
□ Database file exists (du openclaw.db)
□ Backups completed (ls -lh backup/)

Weekly:
□ Backup verification (restore to test DB locally)
□ Webhook success rate (manual check logs)
□ No critical errors in logs
```

### Phase 2: HostGator (Semi-Automated)
```
Automated Alerts:
- UptimeRobot: Alert if site down >5 min
- cPanel alerts: Disk usage >80%

Weekly Maintenance:
□ Review error logs
□ Check MySQL slow query log
□ Backup export (manual)
□ Test database restore
```

### Phase 3: AWS (Fully Automated)
```
DataDog Dashboards:
- Request latency (P50, P95, P99)
- Error rates by endpoint
- Database connection pool
- Memory/CPU usage
- Webhook delivery success

PagerDuty Alerts:
- Uptime <99.95%
- Error rate >0.5%
- Latency P99 >1s
- Database lag >5s
- Webhook delivery failures >10/hour

Daily Reports:
- Revenue trend
- Order volume
- Performance summary
- Cost breakdown
```

---

## DEPLOYMENT CHECKLIST

### Before Phase 1 Launch
- [ ] Node.js + Express app running locally
- [ ] SQLite schema created + tested
- [ ] All API keys (Stripe, Google, WhatsApp) obtained
- [ ] Webhooks tested with ngrok
- [ ] Backup procedure documented
- [ ] README.md written for team

### Before Phase 2 Migration
- [ ] HostGator account created + domain pointing
- [ ] MySQL database created + user privileges set
- [ ] Node.js app tested on HostGator
- [ ] SSL certificate working (HTTPS)
- [ ] All API keys updated for production
- [ ] Migration script written + tested locally
- [ ] Rollback plan documented
- [ ] Team trained on new procedures
- [ ] Backup/restore tested end-to-end

### Before Phase 3 Migration
- [ ] AWS account created + billing alerts set
- [ ] VPC, RDS, ECS infrastructure built
- [ ] Docker image created + pushed to ECR
- [ ] PostgreSQL schema created + data migrated
- [ ] App tested in staging environment
- [ ] Load testing completed (min 1000 req/s)
- [ ] Failover testing completed
- [ ] Monitoring dashboards created
- [ ] On-call runbook created
- [ ] Team trained on AWS tools

---

## EMERGENCY PROCEDURES

### Phase 1: Restore from USB Backup
```bash
# If openclaw.db corrupted:
cp /Volumes/USB1/openclaw.db.backup ~/openclaw/data/openclaw.db
node server.js
# Should come back online within 5 minutes
```

### Phase 2: MySQL Restoration
```bash
# If MySQL corrupted (HostGator):
# 1. SSH into server
ssh user@yourdomain.com

# 2. Restore from cPanel backup
# Via cPanel → Backups → MySQL → Restore

# Or manual:
mysql yourdomain_openclaw < ~/backups/openclaw_backup.sql

# 3. Verify app connects
curl https://yourdomain.com/health
```

### Phase 3: AWS RDS Failover
```bash
# If primary RDS down:
# 1. AWS automatically fails over to standby (Multi-AZ)
#    - Automatic failover: 1-5 minutes
#    - Connection string stays the same
#    - Apps reconnect automatically

# 2. Monitor failover in RDS console
# 3. Check application logs for connection errors

# If both AZs down (rare):
# 4. Restore from automated backup
#    - AWS RDS → Automated backups → Restore
#    - Takes 5-10 minutes
#    - May lose <1 minute of data
```

---

## FINAL CHECKLIST: $500 → $100K+

**Phase 1 Exit Criteria (Move to HostGator)**
- [x] $5K+ revenue
- [x] 500+ orders/month
- [x] SQLite DB >50MB
- [x] Need >95% uptime
- [x] Team trained on backup procedures

**Phase 2 Exit Criteria (Move to AWS)**
- [x] $50K+ revenue
- [x] 2000+ orders/month
- [x] MySQL DB >500MB
- [x] Need 99%+ uptime
- [x] Global customer base
- [x] DDoS/security concerns

**Phase 3 Maturity Indicators**
- [x] $100K+ annual revenue
- [x] 5000+ orders/month
- [x] Multiple geographic regions
- [x] <200ms P99 latency globally
- [x] 99.95% uptime SLA
- [x] Compliance: GDPR, PCI-DSS
- [x] Enterprise customer support

---

## Questions & Answers

**Q: Can I skip Phase 2 and go straight to Phase 3?**
A: Not recommended. Phase 2 teaches you operations basics (backups, monitoring, alerting). Phase 3 assumes you have strong operational discipline.

**Q: What if revenue plateaus at $30K/month (Phase 2)?**
A: Stay in Phase 2. Scale HostGator plan, add caching (Redis), optimize queries. Move to Phase 3 only when HostGator is bottlenecking.

**Q: How much developer time per phase?**
- Phase 1: 1 week setup
- Phase 2: 2-3 days migration + 4 weeks stabilization
- Phase 3: 2-4 weeks planning + 1-2 weeks execution + 4 weeks stabilization

**Q: What's the biggest risk per phase?**
- Phase 1: Single device failure = total loss
- Phase 2: Shared hosting neighbor attack or MySQL corruption
- Phase 3: AWS account compromise or data residency violation

**Q: Do I need to rewrite code for each phase?**
A: No. Code stays mostly the same. Main changes:
- Phase 1→2: SQLite driver → MySQL driver (connection string change)
- Phase 2→3: MySQL driver → PostgreSQL driver (same driver interface)

**Q: What about the API keys? Do they change per phase?**
A: No. Stripe, Google, WhatsApp keys stay the same. Just moved from .env file → server env var → Vault.

---

Generated: 2024-07-02
Version: 1.0
For: OpenClaw Business Scaling
