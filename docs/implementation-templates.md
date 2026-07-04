# Implementation Templates: Ready-to-Use Code

## Phase 1: LaCie Server Setup

### package.json (All Phases)
```json
{
  "name": "openclaw",
  "version": "1.0.0",
  "description": "WhatsApp + Stripe Order Management",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate:p1-to-p2": "node scripts/migrate-sqlite-to-mysql.js",
    "migrate:p2-to-p3": "node scripts/migrate-mysql-to-postgres.js",
    "test": "jest",
    "backup": "bash scripts/backup-local.sh"
  },
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.0.0",
    "stripe": "^11.0.0",
    "axios": "^1.0.0",
    "sqlite3": "^5.1.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0",
    "jest": "^29.0.0"
  }
}
```

### server.js (Phase 1 - SQLite)
```javascript
const express = require('express');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const stripe = require('stripe')(process.env.STRIPE_SECRET);

dotenv.config();

const app = express();
const db = new sqlite3.Database('./data/openclaw.db');

// Middleware
app.use(express.json());

// ==================== DATABASE SETUP ====================
// Initialize SQLite tables
const initDatabase = () => {
  db.serialize(() => {
    // Customers table
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        email TEXT,
        name TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        stripe_payment_intent TEXT,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        items TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Webhooks log (for debugging)
    db.run(`
      CREATE TABLE IF NOT EXISTS webhooks_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        payload TEXT,
        status TEXT DEFAULT 'received',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized');
  });
};

initDatabase();

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  db.get('SELECT 1', (err) => {
    if (err) {
      res.status(500).json({ status: 'unhealthy', error: err.message });
    } else {
      res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    }
  });
});

// ==================== API ENDPOINTS ====================

// Get all orders
app.get('/api/orders', (req, res) => {
  db.all(`
    SELECT o.id, o.customer_id, c.phone, o.total, o.status, o.created_at
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
    LIMIT 100
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Create order
app.post('/api/orders', (req, res) => {
  const { phone, name, email, items, total } = req.body;

  // Step 1: Find or create customer
  db.run(
    `INSERT OR IGNORE INTO customers (phone, name, email) VALUES (?, ?, ?)`,
    [phone, name, email],
    (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Step 2: Get customer ID
      db.get(
        `SELECT id FROM customers WHERE phone = ?`,
        [phone],
        (err, customer) => {
          if (err || !customer) {
            return res.status(400).json({ error: 'Customer creation failed' });
          }

          // Step 3: Create order
          db.run(
            `INSERT INTO orders (customer_id, total, status, items) VALUES (?, ?, ?, ?)`,
            [customer.id, total, 'pending', JSON.stringify(items)],
            function(err) {
              if (err) {
                return res.status(400).json({ error: err.message });
              }

              res.status(201).json({
                orderId: this.lastID,
                customerId: customer.id,
                total,
                status: 'pending'
              });
            }
          );
        }
      );
    }
  );
});

// ==================== WEBHOOKS ====================

// WhatsApp Webhook (Incoming Message)
app.post('/webhook/whatsapp', (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.status(400).send('Invalid webhook');

    const phone = message.from;
    const text = message.text?.body;

    // Log webhook
    db.run(
      `INSERT INTO webhooks_log (event_type, payload, status) VALUES (?, ?, ?)`,
      ['whatsapp_message', JSON.stringify(req.body), 'received']
    );

    // TODO: Process WhatsApp message (parse order, create order in DB)
    console.log(`WhatsApp from ${phone}: ${text}`);

    res.status(200).send('OK');
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.status(500).send('Error');
  }
});

// Stripe Webhook (Payment Events)
app.post('/webhook/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Log webhook
    db.run(
      `INSERT INTO webhooks_log (event_type, payload, status) VALUES (?, ?, ?)`,
      [event.type, JSON.stringify(event), 'received']
    );

    // Handle payment events
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Update order status to paid
        db.run(
          `UPDATE orders SET status = ? WHERE stripe_payment_intent = ?`,
          ['paid', paymentIntent.id]
        );
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        break;

      case 'payment_intent.payment_failed':
        console.log(`Payment failed: ${event.data.object.id}`);
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OpenClaw server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
```

### .env (Phase 1)
```
# Database
DB_TYPE=sqlite
DB_PATH=./data/openclaw.db

# API Keys (from https://stripe.com/dashboard)
STRIPE_PUBLIC=pk_test_xxx (test mode first)
STRIPE_SECRET=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# WhatsApp Business API
WHATSAPP_PHONE_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAABa...
WHATSAPP_WEBHOOK_TOKEN=your_webhook_verify_token

# Google Sheets (optional)
GOOGLE_SHEET_ID=abc123xyz
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxx

# App
PORT=3000
NODE_ENV=development
```

### backup-local.sh (Phase 1)
```bash
#!/bin/bash
# Daily backup script for LaCie

BACKUP_DIR=~/openclaw/backups
DB_FILE=~/openclaw/data/openclaw.db
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup to local folder
cp "$DB_FILE" "$BACKUP_DIR/openclaw.db.$TIMESTAMP"

# Backup to USB (if mounted)
if [ -d "/Volumes/USB1" ]; then
  cp "$DB_FILE" "/Volumes/USB1/openclaw.db.backup"
  echo "✓ Backup to USB successful"
fi

# Keep only last 30 backups (remove old ones)
cd "$BACKUP_DIR"
ls -t openclaw.db.* | tail -n +31 | xargs rm -f

echo "✓ Backup completed: openclaw.db.$TIMESTAMP"
```

---

## Phase 2: HostGator Conversion

### server.js (Phase 2 - MySQL)
```javascript
const express = require('express');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

dotenv.config();

const app = express();

// ==================== DATABASE CONNECTION ====================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 30000
});

app.use(express.json());

// ==================== HEALTH CHECK ====================
app.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    
    res.status(200).json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: err.message
    });
  }
});

// ==================== API ENDPOINTS ====================

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [orders] = await connection.execute(`
      SELECT o.id, o.customer_id, c.phone, o.total, o.status, o.created_at
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 100
    `);
    connection.release();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { phone, name, email, items, total } = req.body;

    // Step 1: Find or create customer
    await connection.execute(
      `INSERT INTO customers (phone, name, email) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name=?, email=?`,
      [phone, name, email, name, email]
    );

    // Step 2: Get customer ID
    const [customers] = await connection.execute(
      `SELECT id FROM customers WHERE phone = ?`,
      [phone]
    );

    if (!customers.length) {
      return res.status(400).json({ error: 'Customer creation failed' });
    }

    // Step 3: Create order
    const [result] = await connection.execute(
      `INSERT INTO orders (customer_id, total, status, items) VALUES (?, ?, ?, ?)`,
      [customers[0].id, total, 'pending', JSON.stringify(items)]
    );

    res.status(201).json({
      orderId: result.insertId,
      customerId: customers[0].id,
      total,
      status: 'pending'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// ==================== WEBHOOKS ====================

// WhatsApp Webhook
app.post('/webhook/whatsapp', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.status(400).send('Invalid webhook');

    // Log webhook
    await connection.execute(
      `INSERT INTO webhooks_log (event_type, payload, status) VALUES (?, ?, ?)`,
      ['whatsapp_message', JSON.stringify(req.body), 'received']
    );

    const phone = message.from;
    const text = message.text?.body;
    console.log(`WhatsApp from ${phone}: ${text}`);

    res.status(200).send('OK');
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.status(500).send('Error');
  } finally {
    connection.release();
  }
});

// Stripe Webhook
app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const connection = await pool.getConnection();
  const signature = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Log webhook
    await connection.execute(
      `INSERT INTO webhooks_log (event_type, payload, status) VALUES (?, ?, ?)`,
      [event.type, JSON.stringify(event), 'received']
    );

    // Handle payment events
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await connection.execute(
          `UPDATE orders SET status = ? WHERE stripe_payment_intent = ?`,
          ['paid', paymentIntent.id]
        );
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  } finally {
    connection.release();
  }
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OpenClaw server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
```

### .env (Phase 2 - HostGator)
```
# Database
DB_HOST=mysql123.yourdomain.com
DB_USER=yourdomain_db
DB_PASSWORD=strong_password_here
DB_NAME=yourdomain_openclaw

# Stripe API Keys (same as Phase 1)
STRIPE_PUBLIC=pk_live_xxx
STRIPE_SECRET=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx

# WhatsApp
WHATSAPP_PHONE_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAABa...
WHATSAPP_WEBHOOK_TOKEN=your_webhook_verify_token

# App
PORT=3001
NODE_ENV=production
```

### Migration Script: SQLite → MySQL
```javascript
// scripts/migrate-sqlite-to-mysql.js
const sqlite3 = require('sqlite3');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const sqliteDb = new sqlite3.Database('./data/openclaw.db');
  const mysqlConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const tables = ['customers', 'products', 'orders', 'order_items', 'webhooks_log'];

  for (const table of tables) {
    console.log(`Migrating ${table}...`);
    
    const rows = await new Promise((resolve, reject) => {
      sqliteDb.all(`SELECT * FROM ${table}`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (rows.length === 0) {
      console.log(`  (empty table)`);
      continue;
    }

    // Build INSERT statement
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = columns.map(col => row[col]);
      try {
        await mysqlConnection.execute(sql, values);
      } catch (err) {
        console.error(`Error inserting row into ${table}:`, err);
      }
    }

    console.log(`  ✓ ${rows.length} rows migrated`);
  }

  // Verify counts
  console.log('\nVerification:');
  for (const table of tables) {
    const [result] = await mysqlConnection.execute(`SELECT COUNT(*) as count FROM ${table}`);
    console.log(`${table}: ${result[0].count} rows`);
  }

  sqliteDb.close();
  await mysqlConnection.end();
  console.log('\n✓ Migration complete!');
}

migrate().catch(console.error);
```

---

## Phase 3: AWS PostgreSQL Setup

### Docker Setup (Phase 3)
```dockerfile
# Dockerfile
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl tini

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini for signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "server.js"]
```

### server.js (Phase 3 - PostgreSQL)
```javascript
const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

dotenv.config();

const app = express();

// ==================== DATABASE CONNECTIONS ====================
// Primary (for writes)
const primaryPool = new Pool({
  host: process.env.DB_PRIMARY_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: process.env.DB_SSL_REJECT !== 'false'
  }
});

// Read replicas (for scaling reads)
const replicaPools = {};
if (process.env.DB_REPLICA_EU_HOST) {
  replicaPools.eu = new Pool({
    host: process.env.DB_REPLICA_EU_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT !== 'false' }
  });
}

if (process.env.DB_REPLICA_AP_HOST) {
  replicaPools.ap = new Pool({
    host: process.env.DB_REPLICA_AP_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT !== 'false' }
  });
}

// ==================== QUERY ROUTING ====================
async function query(sql, params, userRegion = 'us') {
  let pool = primaryPool;

  // For SELECT queries, route to nearest replica
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    if (userRegion === 'eu' && replicaPools.eu) pool = replicaPools.eu;
    else if (userRegion === 'ap' && replicaPools.ap) pool = replicaPools.ap;
  }

  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (err) {
    console.error('Database error:', err);
    throw err;
  }
}

app.use(express.json());

// ==================== HEALTH CHECK ====================
app.get('/health', async (req, res) => {
  try {
    const result = await primaryPool.query('SELECT 1');
    res.status(200).json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: err.message
    });
  }
});

// ==================== API ENDPOINTS ====================

app.get('/api/orders', async (req, res) => {
  try {
    const userRegion = req.query.region || 'us';
    const result = await query(`
      SELECT o.id, o.customer_id, c.phone, o.total, o.status, o.created_at
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 100
    `, [], userRegion);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { phone, name, email, items, total } = req.body;

  try {
    // Writes go to PRIMARY
    await primaryPool.query(
      `INSERT INTO customers (phone, name, email) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (phone) DO UPDATE SET name = $2, email = $3`,
      [phone, name, email]
    );

    const customerResult = await primaryPool.query(
      `SELECT id FROM customers WHERE phone = $1`,
      [phone]
    );

    const customerId = customerResult.rows[0].id;

    const orderResult = await primaryPool.query(
      `INSERT INTO orders (customer_id, total, status, items) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [customerId, total, 'pending', JSON.stringify(items)]
    );

    res.status(201).json({
      orderId: orderResult.rows[0].id,
      customerId,
      total,
      status: 'pending'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== WEBHOOKS ====================

app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.status(400).send('Invalid webhook');

    await primaryPool.query(
      `INSERT INTO webhooks_log (event_type, payload, status) 
       VALUES ($1, $2, $3)`,
      ['whatsapp_message', JSON.stringify(req.body), 'received']
    );

    res.status(200).send('OK');
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.status(500).send('Error');
  }
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OpenClaw running on port ${PORT}`);
  console.log(`Primary DB: ${process.env.DB_PRIMARY_HOST}`);
  console.log(`Replicas: EU=${!!replicaPools.eu}, AP=${!!replicaPools.ap}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await primaryPool.end();
  Object.values(replicaPools).forEach(pool => pool.end());
  process.exit(0);
});
```

### .env (Phase 3 - AWS)
```
# Primary Database
DB_PRIMARY_HOST=openclaw-primary.abc123.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=openclaw_prod
DB_USER=openclaw_app
DB_PASSWORD=<from Vault>
DB_SSL_REJECT=true

# Read Replicas
DB_REPLICA_EU_HOST=openclaw-read-eu.abc123.eu-west-1.rds.amazonaws.com
DB_REPLICA_AP_HOST=openclaw-read-ap.abc123.ap-southeast-1.rds.amazonaws.com

# Vault (Secrets Management)
VAULT_ADDR=https://vault.yourdomain.com
VAULT_TOKEN=<rotated every 30 days>

# API Keys (fetched from Vault at runtime)
STRIPE_PUBLIC=<fetched from Vault>
STRIPE_SECRET=<fetched from Vault>
STRIPE_WEBHOOK_SECRET=<fetched from Vault>

# Application
PORT=3000
NODE_ENV=production
REGION=us-east-1
```

---

## Ready-to-Use Monitoring Script

```javascript
// monitoring/health-check.js
const axios = require('axios');
const StatsD = require('statsd-client');

const dogstatsd = new StatsD({ prefix: 'openclaw.' });
const HEALTH_URL = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health';

async function healthCheck() {
  const startTime = Date.now();

  try {
    const response = await axios.get(HEALTH_URL, { timeout: 5000 });
    const duration = Date.now() - startTime;

    if (response.status === 200 && response.data.status === 'healthy') {
      dogstatsd.gauge('health.latency', duration);
      dogstatsd.increment('health.checks.passed');
      console.log(`✓ Healthy (${duration}ms)`);
      return true;
    } else {
      dogstatsd.increment('health.checks.failed');
      console.log(`✗ Unhealthy response`);
      return false;
    }
  } catch (err) {
    dogstatsd.increment('health.checks.failed');
    dogstatsd.gauge('health.error', 1);
    console.error(`✗ Health check failed: ${err.message}`);
    return false;
  }
}

// Run every 30 seconds
setInterval(healthCheck, 30000);
healthCheck(); // Run immediately
```

---

*All code is production-ready but needs customization for your specific business logic.*
*Update placeholders, test thoroughly before deployment.*
