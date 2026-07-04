# Quick Reference: Phase Migrations

## Phase 1 → Phase 2 Migration (1 Week)

### Preparation (Days 1-4)
```bash
# Monday: Set up HostGator
□ SSH into HostGator, create MySQL database
□ Test Node.js runs on HostGator (npm install, test locally)
□ Create .env file on server with MySQL credentials
□ Upload latest code to /public_html/

# Tuesday: Test locally
□ Export SQLite schema: sqlite3 openclaw.db ".dump" > schema.sql
□ Edit schema.sql (SQLite → MySQL syntax)
□ Test import: mysql yourdomain_openclaw < schema.sql
□ Verify row counts match

# Wednesday: Parallel systems
□ Deploy HostGator version (ready to accept orders)
□ Keep LaCie running in read-only mode
□ Set up ngrok tunnels for both systems
□ Test webhooks on both

# Thursday: Final prep
□ Write migration script (see below)
□ Test migration script locally
□ Brief team on cutover procedure
□ Create rollback runbook
```

### Migration Script (Run Thursday night)
```bash
#!/bin/bash
# Step 1: Export from SQLite (last sync)
sqlite3 ~/openclaw/data/openclaw.db ".dump" > /tmp/migration.sql

# Step 2: Convert SQLite → MySQL syntax
sed -i '' -e 's/AUTOINCREMENT/AUTO_INCREMENT/g' /tmp/migration.sql

# Step 3: Import to HostGator MySQL
mysql -h mysql123.yourdomain.com -u yourdomain_db -p < /tmp/migration.sql

# Step 4: Verify counts
echo "SQLite count:"
sqlite3 ~/openclaw/data/openclaw.db "SELECT COUNT(*) FROM orders;"

echo "MySQL count:"
mysql -h mysql123.yourdomain.com -u yourdomain_db -p yourdomain_openclaw -e "SELECT COUNT(*) FROM orders;"

# Step 5: If counts match, proceed to DNS switch
```

### Cutover (Friday night, 01:00 UTC)
```
01:00 - Stop LaCie app: kill node processes
01:05 - Run delta sync script
01:10 - Switch DNS nameservers to HostGator (via domain registrar)
01:15 - Verify DNS propagated: nslookup yourdomain.com
01:20 - Test HostGator live: curl https://yourdomain.com
01:30 - Notify customers: "Back online"
```

### Rollback (If something breaks)
```bash
# Switch DNS back to LaCie immediately
# (In domain registrar control panel)

# Monitor LaCie is back live
for i in {1..10}; do
  curl https://yourdomain.com && break
  sleep 30
done

# Investigate HostGator issue
ssh user@yourdomain.com "tail -100 ~/domains/yourdomain.com/error_log"

# Common issues:
# 1. MySQL credentials wrong: Check .env file
# 2. MySQL not accepting connections: Check firewall
# 3. Node.js not starting: Check npm install
# 4. Webhooks 404: Check app routes
```

---

## Phase 2 → Phase 3 Migration (2-3 Weeks)

### Week 1: Planning & Setup
```bash
□ Create AWS account
□ Set up VPC, security groups
□ Create RDS PostgreSQL (primary + Multi-AZ)
□ Create ECR repository
□ Create Application Load Balancer
□ Set up Route 53 DNS
□ Create IAM roles + policies
```

### Week 2: Application Changes
```bash
□ Containerize app (write Dockerfile)
□ Convert MySQL → PostgreSQL:
  - Change driver: mysql2 → pg
  - Update connection string
  - Fix any SQL syntax differences

□ Test Docker image locally:
  docker build -t openclaw:latest .
  docker run -e DB_HOST=localhost openclaw:latest

□ Push to ECR:
  aws ecr get-login-password | docker login --username AWS --password-stdin ...
  docker tag openclaw:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/openclaw:latest
  docker push ...

□ Create ECS task definition
□ Deploy to ECS cluster (create service)
```

### Week 3: Migration & Testing
```bash
Monday:
□ Set up AWS as read-only mirror of HostGator
□ Start real-time replication: MySQL → PostgreSQL
□ Monitor replication lag (<100ms)

Tuesday-Thursday:
□ Full load testing on AWS (1000+ req/s)
□ Test failover (kill containers, verify recovery)
□ Test backup/restore (RDS automated backups)
□ Security testing (WAF, rate limiting)

Friday (Cutover night):
□ Final data sync
□ Switch writes to AWS PostgreSQL
□ Update Route 53 to point to AWS ALB
□ Monitor error rates <0.1%
□ Keep HostGator running for 24h as backup
```

### Cutover Procedure
```
23:00 - Announce maintenance window
23:50 - Stop accepting writes on HostGator
23:55 - Final sync: MySQL → PostgreSQL
00:00 - Update Route 53: yourdomain.com → AWS ALB IP
00:05 - Verify AWS is live: curl https://yourdomain.com/health
00:30 - Announce "Back online"

Post-Cutover (Week 2):
□ Monitor AWS for 7 days (keep HostGator backup)
□ Fix any issues
□ Cancel HostGator (keep 30-day backup)
```

---

## Key CLI Commands by Phase

### Phase 1 (LaCie)
```bash
# Start app
cd ~/openclaw && node server.js

# Backup
cp ~/openclaw/data/openclaw.db /Volumes/USB/backup/openclaw.db.$(date +%Y-%m-%d)

# View logs
tail -100 ~/openclaw/logs/app.log

# Verify backup
sqlite3 /Volumes/USB/backup/openclaw.db.2024-07-02 "SELECT COUNT(*) FROM orders;"
```

### Phase 2 (HostGator)
```bash
# SSH in
ssh user@yourdomain.com

# Check Node.js status
ps aux | grep node

# Restart app
cPanel → Node.js → Restart Application

# View logs
tail -100 ~/domains/yourdomain.com/error_log

# Export MySQL backup
mysqldump -u yourdomain_db -p yourdomain_openclaw > ~/backup.sql

# Test restore
mysql test_db < ~/backup.sql
```

### Phase 3 (AWS)
```bash
# Push Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/openclaw:latest

# Check ECS service status
aws ecs describe-services --cluster openclaw --services openclaw-prod --region us-east-1

# View CloudWatch logs
aws logs tail /ecs/openclaw-prod --follow

# Check RDS database
aws rds describe-db-instances --db-instance-identifier openclaw-primary --region us-east-1

# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier openclaw-restore \
  --db-snapshot-identifier rds:openclaw-primary-2024-07-02
```

---

## Emergency Hotline (by phase)

### Phase 1 Emergency: Database Corrupted
```bash
# Restore from backup in 10 minutes
cp /Volumes/USB1/openclaw.db.backup ~/openclaw/data/openclaw.db
killall node
sleep 2
cd ~/openclaw && node server.js
```

### Phase 2 Emergency: HostGator MySQL Down
```bash
# Restore from cPanel backup
# Via cPanel → Backups → MySQL → Restore Date
# Or manual:
ssh user@yourdomain.com
mysql yourdomain_openclaw < ~/backups/openclaw_latest.sql
```

### Phase 3 Emergency: AWS Region Down
```bash
# Auto-failover to backup region (should be automatic)
# Monitor in AWS console
# If manual intervention needed:
aws route53 change-resource-record-sets --hosted-zone-id Z1234 \
  --change-batch file://failover.json
```

---

## Cost Per Phase (Monthly)

| Phase | Min | Max | Notes |
|-------|-----|-----|-------|
| **Phase 1** | $0 | $20 | Backups/USB only |
| **Phase 2** | $80 | $150 | HostGator shared hosting |
| **Phase 3** | $500 | $1500 | AWS: EC2, RDS, bandwidth, monitoring |

---

## Success Metrics Per Phase

### Phase 1 Success
- ✓ Can restore from backup in <10 min
- ✓ Zero missed webhooks
- ✓ All API keys secure in .env

### Phase 2 Success
- ✓ Uptime >99% (measured via UptimeRobot)
- ✓ Response time <1s P99
- ✓ Daily backups automated

### Phase 3 Success
- ✓ Uptime 99.95% (multi-region)
- ✓ Response time <200ms P99 globally
- ✓ Automatic failover working
- ✓ GDPR compliance verified
- ✓ Security audit passed

---

## When to Call for Help

**Phase 1:**
- Can't restore from backup
- Don't know what went wrong in logs

**Phase 2:**
- MySQL connection errors after migration
- Webhooks not triggering on new domain
- HostGator SSL certificate not working

**Phase 3:**
- ECS tasks not starting
- RDS failover didn't work
- DNS not resolving to AWS ALB
- Replication lag >5 seconds

---

*Last Updated: July 2024*
*Version: 1.0*
*Contact: ops@yourdomain.com*
