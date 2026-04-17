# 📋 DEPLOYMENT CHECKLIST & QUICK START GUIDE

**Version:** 1.0.0  
**Last Updated:** April 14, 2026  
**Deployment Type:** Production Canary → Beta → Regional → Full Global  
**Estimated Duration:** 30 days (T-30 to T+0)

---

## QUICK REFERENCE

### Deployment Timeline at a Glance

```
T-30 Days  │ Planning & Kick-off
T-14 Days  │ Infrastructure Setup
T-7 Days   │ Code Freeze
T-3 Days   │ Staging Verification
T-1 Day    │ Pre-launch Checks
T-0 Day    │ LAUNCH DAY (Canary)
T+1 Week   │ Beta Phase (10K users)
T+2 Weeks  │ Regional Rollout Phase
T+4 Weeks  │ Full Global Phase
```

### Key Personnel & Roles

| Role | Name | Phone | Email |
|------|------|-------|-------|
| **Deployment Lead** | [TBD] | [TBD] | [TBD] |
| **Engineering Lead** | [TBD] | [TBD] | [TBD] |
| **DevOps Lead** | [TBD] | [TBD] | [TBD] |
| **QA Lead** | [TBD] | [TBD] | [TBD] |
| **Product Lead** | [TBD] | [TBD] | [TBD] |
| **Business Lead** | [TBD] | [TBD] | [TBD] |

### Emergency Contacts

```
Critical Issue:     +[emergency-line]
War Room:           [war-room-link]
Escalation Lead:    [escalation-contact]
24/7 On-Call:       [on-call-rotation]
```

---

## PHASE 1: PLANNING & KICK-OFF (T-30 Days)

### ✅ Week 1: Stakeholder Alignment

**Day 1: Kick-off Meeting**
- [ ] Schedule 90-minute kick-off meeting
- [ ] Confirm all stakeholders present
- [ ] Review deployment plan
- [ ] Set success criteria
- [ ] Document decisions
- [ ] Share calendar holds

**To Do:**
```
1. Create deployment project in GitHub
2. Set up #deployment-prod channel
3. Create Slack integration alerts
4. Schedule daily standup (9 AM)
5. Create WAR ROOM doc
```

**Actions Required:**
```
✓ Deployment Lead: Confirm kickoff participants
✓ Engineering Lead: Confirm code readiness
✓ DevOps Lead: Confirm infra plan
✓ QA Lead: Confirm test plan
✓ Product Lead: Confirm go-live criteria
```

**Day 2-3: Planning Documentation**
- [ ] Create detailed runbook (20 pages)
- [ ] Document rollback procedures
- [ ] Create incident response playbooks
- [ ] Create communication templates
- [ ] Create decision trees for issues

**Files to Prepare:**
```
1. DEPLOYMENT_RUNBOOK.md (this guide)
2. ROLLBACK_PROCEDURES.md
3. INCIDENT_PLAYBOOKS.md
4. COMMUNICATION_TEMPLATES.md
5. DECISION_TREES.md
```

**Day 4-7: Stakeholder Prep**
- [ ] Brief all team leads
- [ ] Conduct knowledge sharing sessions
- [ ] Distribute documentation
- [ ] Collect questions/concerns
- [ ] Record FAQ document

**Success Criteria:**
```
✓ All stakeholders briefed
✓ All concerns addressed
✓ Documentation complete
✓ Team ready signal from all leads
```

### ✅ Week 2: Infrastructure Planning

**Day 8-10: Infrastructure Review**
- [ ] Audit Kubernetes cluster
  ```bash
  kubectl get nodes
  kubectl get pods -A
  kubectl top nodes
  kubectl top pods -A
  ```

- [ ] Verify database replication
  ```sql
  SELECT * FROM pg_stat_replication;
  SHOW wal_level;
  ```

- [ ] Test backup/restore
  ```bash
  # Create backup
  pg_dump -Fc database_name > backup_prod.dump
  
  # Verify restore
  pg_restore -d test_database backup_prod.dump
  ```

- [ ] Verify monitoring setup
  ```bash
  curl http://prometheus:9090/-/healthy
  curl http://grafana:3000/api/health
  ```

**Checklist:**
- [ ] Kubernetes cluster health: GREEN
- [ ] Database replication healthy: GREEN
- [ ] Backup/restore verified: SUCCESS
- [ ] Monitoring operational: GREEN
- [ ] CDN configuration: VERIFIED
- [ ] SSL certificates: VALID (>30 days)
- [ ] Firewall rules: CONFIRMED
- [ ] VPN access: TESTED

**Day 11-14: Infrastructure Hardening**
- [ ] Apply security patches
- [ ] Update OS packages
- [ ] Rotate secrets/credentials
- [ ] Verify TLS 1.3+
- [ ] Configure DDoS protection
- [ ] Set up rate limiting

**Commands:**
```bash
# Update OS
sudo apt-get update && sudo apt-get upgrade -y

# Verify TLS
echo | openssl s_client -connect api.ourmusic.io:443

# Test rate limiting
ab -n 1000 -c 100 https://api.ourmusic.io/health

# Verify DDoS protection
curl -v https://api.ourmusic.io/
```

---

## PHASE 2: INFRASTRUCTURE SETUP (T-14 Days)

### ✅ Day 15-17: Kubernetes Configuration

**Task 1: Cluster Provisioning**
```bash
# 1. Create K8s manifests
cd kubernetes/
ls -la manifests/

# 2. Verify all YAML files
kubectl apply -f manifests/ --dry-run=client -o yaml

# 3. Pre-create namespaces
kubectl create namespace prod-v2
kubectl label namespace prod-v2 environment=production

# 4. Create secrets
kubectl create secret generic db-credentials \
  --from-literal=user=prod_user \
  --from-literal=password=$(openssl rand -base64 32) \
  -n prod-v2

# 5. Verify secrets created
kubectl get secrets -n prod-v2
```

**Task 2: CoreDNS & Service Discovery**
```bash
# 1. Verify CoreDNS
kubectl get pods -n kube-system | grep coredns

# 2. Test service discovery
kubectl exec -it [pod-name] -n prod-v2 -- nslookup postgres.prod-v2

# 3. Verify ingress
kubectl get ingress -n prod-v2
```

**Checklist:**
- [ ] Namespace created & labeled
- [ ] Secrets configured
- [ ] RBAC rules applied
- [ ] Network policies applied
- [ ] Ingress configured
- [ ] DNS resolution working
- [ ] Health checks passing

### ✅ Day 18-19: Database Setup

**Task 1: PostgreSQL Primary**
```sql
-- 1. Create production databases
CREATE DATABASE ourmusic_prod;
CREATE DATABASE ourmusic_analytics;
CREATE DATABASE ourmusic_cache;

-- 2. Create users
CREATE USER prod_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ourmusic_prod TO prod_user;

-- 3. Run migrations
\c ourmusic_prod
\i migrations/001_init.sql
\i migrations/002_schemas.sql
\i migrations/003_tables.sql
...

-- 4. Create replication user
CREATE USER replication_user WITH REPLICATION PASSWORD 'replication_password';

-- 5. Grant minimal permissions
ALTER USER prod_user CREATEDB;

-- 6. Verify with checksums
SHOW data_checksums;
```

**Task 2: PostgreSQL Replication**
```sql
-- On PRIMARY
-- 1. Enable WAL archiving
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 10;
ALTER SYSTEM SET wal_keep_size = '1GB';

-- 2. Reload config
SELECT pg_reload_conf();

-- On REPLICA
-- 1. Enable hot standby
ALTER SYSTEM SET hot_standby = on;

-- 2. Verify replication
SELECT * FROM pg_stat_replication;
```

**Task 3: Backup Strategy**
```bash
# Set up automated backups
cd /backup

# Create backup script
cat > backup_prod.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -Fc -h localhost -U prod_user ourmusic_prod > \
  ./backup_${TIMESTAMP}.dump
gzip ./backup_${TIMESTAMP}.dump
aws s3 cp ./backup_${TIMESTAMP}.dump.gz s3://ourmusic-backups/
echo "Backup completed: backup_${TIMESTAMP}.dump.gz"
EOF

# Schedule with cron (hourly)
0 * * * * /backup/backup_prod.sh >> /var/log/backup.log 2>&1
```

**Checklist:**
- [ ] Primary database operational
- [ ] Replica 1 synchronized
- [ ] Replica 2 synchronized
- [ ] Replication lag <100ms
- [ ] Backups automated
- [ ] Backup restoration tested
- [ ] Point-in-time recovery verified

### ✅ Day 20-21: Redis Setup

**Task 1: Redis Cluster Configuration**
```bash
# 1. Deploy Redis cluster
redis-cli DEBUG INFO

# 2. Configure persistence
redis-cli CONFIG SET save "3600 1 300 10 60 10000"

# 3. Set maxmemory policy
redis-cli CONFIG SET maxmemory-policy "allkeys-lru"

# 4. Verify replication
redis-cli INFO replication

# 5. Test failover
redis-cli SENTINEL masters
redis-cli SENTINEL failover <master-name>
```

**Task 2: Connection Pooling**
```bash
# 1. Deploy Pgbouncer (Redis equivalent for PostgreSQL)
# For Redis, verify client connection pooling in app code

# 2. Monitor connections
redis-cli CLIENT LIST | wc -l

# 3. Set connection limits
redis-cli CONFIG SET maxclients 10000

# 4. Monitor memory
redis-cli INFO memory
```

**Checklist:**
- [ ] Redis cluster operational
- [ ] Replication working
- [ ] Persistence enabled
- [ ] Failover tested
- [ ] Connection pooling verified
- [ ] Memory monitoring active
- [ ] Eviction policy set

### ✅ Day 22-23: CDN & DNS Setup

**Task 1: Cloudflare Configuration**
```bash
# 1. Add domain to Cloudflare
# Via dashboard: Add site → nameserver update

# 2. Configure DNS records
# A record: api.ourmusic.io → [load balancer IP]
# CNAME: www.ourmusic.io → ourmusic.io
# CNAME: cdn.ourmusic.io → d111111abcdef8.cloudfront.net

# 3. Enable SSL/TLS
# Full (strict) - requires valid certificate

# 4. Configure caching
# Browser cache TTL: 1 hour
# Cache everything rule: /api/v2/* → 5 minutes
# Do not cache rule: /api/v2/auth/* → 0 minutes

# 5. Test DNS propagation
dig api.ourmusic.io +short
nslookup api.ourmusic.io

# 6. Verify SSL
openssl s_client -connect api.ourmusic.io:443
```

**Task 2: AWS CloudFront Setup**
```bash
# 1. Create distribution
# Origin: api.ourmusic.io
# Cache behaviors:
#   - /static/* → 24h cache
#   - /api/v2/* → 5min cache
#   - Default → 0 cache

# 2. Enable HTTPS only
# SSL/TLS certificate: Use AWS Certificate Manager

# 3. Configure origins
# Primary: api.ourmusic.io (weighted 100%)

# 4. Test distribution
curl -I https://d111111abcdef8.cloudfront.net/health
```

**Checklist:**
- [ ] DNS propagated globally
- [ ] SSL certificate valid
- [ ] Cloudflare active
- [ ] CloudFront active
- [ ] Cache headers correct
- [ ] HTTPS enforced
- [ ] HTTP/2 enabled

---

## PHASE 3: CODE FREEZE (T-7 Days)

### ✅ Day 24-25: Final Code Review

**Task 1: Code Quality Verification**
```bash
# 1. Run full test suite
npm run test:all

# Expected results:
# ✓ Unit tests: 2,000+ passing
# ✓ Integration tests: 150+ passing
# ✓ E2E tests: 100+ passing
# ✓ Coverage: 95%+ unit, 85%+ integration

# 2. Run linting
npm run lint

# Expected: 0 errors, 0 warnings

# 3. Security audit
npm audit
npm audit fix --audit-level=moderate

# Expected: 0 vulnerabilities

# 4. Performance audit
npm run audit:perf

# Expected results:
# ✓ Bundle size: <2MB gzipped
# ✓ Lighthouse: >90 score
# ✓ Core Web Vitals: GOOD
```

**Task 2: Database Consistency Check**
```sql
-- 1. Check foreign key constraints
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- 2. Verify indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog', 'information_schema');

-- 3. Check data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM playlists;
SELECT COUNT(*) FROM favorites;
-- Verify counts match expected values

-- 4. Verify sequences
SELECT * FROM information_schema.sequences;

-- 5. Test triggers
SELECT trigger_name, action_statement
FROM information_schema.triggers;
```

**Task 3: Documentation Audit**
```bash
# Verify all documentation
✓ API documentation (OpenAPI 3.0)
✓ Database schema documentation
✓ Deployment procedures
✓ Rollback procedures
✓ Incident response playbooks
✓ Runbooks for top 20 scenarios

# Check version numbers
✓ Backend: v2.0.0
✓ Frontend: v2.0.0
✓ Mobile: v2.0.0
✓ API: v2
```

**Checklist:**
- [ ] All tests passing (unit/integration/E2E)
- [ ] Test coverage >85%
- [ ] Code quality: 0 errors
- [ ] Security audit: 0 vulnerabilities
- [ ] Performance targets met
- [ ] Database integrity verified
- [ ] Documentation complete

### ✅ Day 26-27: Staging Deployment

**Task 1: Deploy to Staging**
```bash
# 1. Build Docker image
docker build -t gcr.io/ourmusic/backend:staging-$(date +%Y%m%d) .

# 2. Push to registry
docker push gcr.io/ourmusic/backend:staging-$(date +%Y%m%d)

# 3. Update Kubernetes manifests
sed -i 's|STAGING_TAG|staging-'$(date +%Y%m%d)'|g' kubernetes/staging.yaml

# 4. Deploy to staging
kubectl apply -f kubernetes/staging.yaml -n staging

# 5. Wait for rollout
kubectl rollout status deployment/oursmusic -n staging

# 6. Verify pods
kubectl get pods -n staging
```

**Task 2: Run Staging Tests**
```bash
# 1. Run integration tests against staging
ENVIRONMENT=staging npm run test:integration

# 2. Run load tests
ENVIRONMENT=staging npm run test:load

# Expected:
# ✓ 10K concurrent users
# ✓ Latency <500ms p99
# ✓ Error rate <0.1%

# 3. Run security scan
ENVIRONMENT=staging npm run test:security

# 4. Run smoke tests
ENVIRONMENT=staging npm run test:smoke

# Expected: All critical paths working
```

**Checklist:**
- [ ] Staging deployment successful
- [ ] All pods running (replicas: 3)
- [ ] Health checks passing
- [ ] Integration tests pass
- [ ] Load tests pass
- [ ] Security tests pass
- [ ] Smoke tests pass

---

## PHASE 4: PRE-LAUNCH CHECKS (T-3 Days)

### ✅ Day 28: Final Verification

**Task 1: Infrastructure Health Check**
```bash
# 1. Kubernetes cluster
kubectl cluster-info
kubectl get nodes
kubectl top nodes

# Expected: All nodes healthy, >80GB available per node

# 2. Database health
psql -h db.prod.internal -U prod_user -c "SELECT 1"

# Expected: Connection successful

# 3. Redis health
redis-cli -h redis.prod.internal ping

# Expected: PONG

# 4. Monitoring stack
curl http://prometheus.internal:9090/-/healthy
curl http://grafana.internal:3000/api/health

# Expected: 200 OK from both

# 5. DNS/CDN
dig api.ourmusic.io @cloudflare-dns
curl -I https://api.ourmusic.io/health

# Expected: 200 OK
```

**Task 2: Backup Verification**
```bash
# 1. Create backup
pg_dump -Fc -h db.prod.internal -U prod_user ourmusic_prod > pre_launch_backup.dump

# 2. Compress and upload
gzip pre_launch_backup.dump
aws s3 cp pre_launch_backup.dump.gz s3://ourmusic-backups/

# 3. Verify on S3
aws s3 ls s3://ourmusic-backups/ | tail -5

# 4. Test restore on separate instance
pg_restore -d ourmusic_prod_test pre_launch_backup.dump

# 5. Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM songs;
SELECT COUNT(*) FROM playlists;

# Expected: Counts match production
```

**Checklist:**
- [ ] K8s cluster healthy
- [ ] Database operational
- [ ] Redis operational
- [ ] Monitoring operational
- [ ] DNS resolving
- [ ] CDN active
- [ ] Backup verified
- [ ] All systems GREEN

### ✅ Day 29: Communication Prep

**Task 1: Prepare Communications**
- [ ] Create launch announcement (internal)
- [ ] Create user-facing blog post
- [ ] Create FAQ document
- [ ] Create support team briefing
- [ ] Create community announcement
- [ ] Schedule social media posts

**Task 2: Prepare Support Team**
- [ ] Brief support team (2 hours)
- [ ] Provide common issues guide
- [ ] Set up escalation process
- [ ] Deploy knowledge base articles
- [ ] Test support systems
- [ ] Activate 24/7 support

**Task 3: Prepare Marketing**
- [ ] Final review of messaging
- [ ] Schedule announcement posts
- [ ] Brief sales team
- [ ] Prepare investor communication
- [ ] Plan PR outreach
- [ ] Set up media kit

**Checklist:**
- [ ] All communications drafted
- [ ] Support team briefed
- [ ] Marketing ready
- [ ] FAQ documented
- [ ] Teams coordinated

### ✅ Day 30: War Room Setup

**Task 1: Prepare War Room**
```bash
# 1. Create war room document
# Shared Google Doc with:
# - Real-time status
# - Decision log
# - Issue tracker
# - Timeline tracker

# 2. Set up communication channels
# - Primary: #deployment-prod (Slack)
# - Backup: Zoom call (link in pinned message)
# - Emergency: War room doc

# 3. Verify tools
curl https://war-room.ourmusic.io
curl https://metrics.ourmusic.io
curl https://logs.ourmusic.io

# 4. Test alert system
# Should receive Slack alerts for:
# - Pod failures
# - Error rate spikes
# - Latency spikes
# - Memory/CPU high
# - Database issues
```

**Task 2: Final Team Briefing**
- [ ] All-hands meeting (90 min)
- [ ] Review plan & timeline
- [ ] Assign roles & responsibilities
- [ ] Review decision trees
- [ ] Review rollback procedure
- [ ] Q&A session

**Checklist:**
- [ ] War room created
- [ ] All tools verified
- [ ] Communication channels active
- [ ] Team briefed & ready
- [ ] Everyone knows their role

---

## PHASE 5: LAUNCH DAY (T-0)

### ⚠️ CRITICAL: Launch Day Procedures

**Pre-Launch: T-6 Hours**

```bash
# 1. Verify everything GREEN
./scripts/pre-launch-checks.sh

# Expected output:
# ✓ K8s cluster: HEALTHY
# ✓ Database: HEALTHY
# ✓ Redis: HEALTHY
# ✓ Monitoring: ACTIVE
# ✓ CDN: ACTIVE
# ✓ Backups: VERIFIED
# ✓ All systems: GO

# 2. Notify teams
Slack message in #deployment-prod:
"🚀 Launch window T-6 hours. All systems GREEN. Preparing for Phase 1 (canary)."

# 3. Create rollback plan document
# Finalize rollback steps
# Brief rollback team
# Verify rollback tested
```

---

### 🚀 Launch: T-0

**06:00 AM UTC - PHASE 1: CANARY (1% Traffic)**

```bash
# Step 1: Deploy to single replica
kubectl set image deployment/oursmusic \
  oursmusic=gcr.io/ourmusic/backend:prod-v2.0.0 \
  -n production

# Verify single pod running
kubectl get pods -n production

# Step 2: Monitor (30 minutes)
# Check metrics:
# - Error rate: should be 0%
# - Latency p99: should be <500ms
# - CPU: should be <30%
# - Memory: should be <40%

# Step 3: Verify no issues
# Check logs for errors:
kubectl logs -f deployment/oursmusic -n production --all-containers=true

# Check metrics:
curl http://prometheus:9090/api/v1/query?query=rate(http_requests_total[1m])

# If issues detected: ROLLBACK IMMEDIATELY
# ./scripts/rollback.sh
```

**12:00 PM UTC - Monitor Phase 1**
```bash
# Run health check
./scripts/health-check.sh

# Expected results:
# ✓ API responding
# ✓ Error rate <0.1%
# ✓ Latency <500ms p99
# ✓ No critical errors

# Slack update:
"✅ Phase 1 (1% traffic) stable for 6 hours. No issues detected. Proceeding to Phase 2."
```

**18:00 UTC - PHASE 2: RAMP (5% Traffic)**

```bash
# Scale to 2 replicas (5% of traffic)
kubectl scale deployment oursmusic --replicas=2 -n production

# Verify deployment
kubectl get pods -n production
kubectl get deployment oursmusic -n production

# Monitor for 6 hours
# Expected: Same as Phase 1
# - Error rate <0.1%
# - Latency <500ms p99
```

**Decision Point:** Continue or Rollback?

```
If metrics all GREEN (6+ hours stable):
  ✅ Proceed to Phase 2 expansion

If issues detected:
  🔴 ROLLBACK IMMEDIATELY
  - Notify team
  - Execute rollback.sh
  - Post-mortem meeting
  - Fix issues
  - Re-plan launch
```

---

### DAY 2: Continue Deployment

**06:00 AM - PHASE 3: EXPANSION (10% Traffic)**

```bash
# Scale to 3 replicas (10% traffic)
kubectl scale deployment oursmusic --replicas=3 -n production

# Monitor (6 hours)
# Expected: Continue stable
```

**12:00 PM - PHASE 4: MODERATE (25% Traffic)**

```bash
# Scale to 8 replicas (25% traffic)
kubectl scale deployment oursmusic --replicas=8 -n production

# Monitor (6 hours)
# Expected: Slight load increase, but stable
```

**18:00 PM - PHASE 5: HALF (50% Traffic)**

```bash
# Scale to 15 replicas (50% traffic)
kubectl scale deployment oursmusic --replicas=15 -n production

# Monitor (6 hours - critical monitoring point!)
# Expected: Higher load, close to production peak
```

---

### DAY 3: Full Deployment

**06:00 AM - PHASE 6: FULL (100% Traffic)**

```bash
# Scale to 30 replicas (100% traffic - full deployment)
kubectl scale deployment oursmusic --replicas=30 -n production

# Monitor closely (next 24 hours)
# Critical metrics:
# - Error rate: must stay <0.1%
# - Latency p99: must stay <500ms
# - CPU: must stay <70%
# - Memory: must stay <80%
# - Pod restarts: must be 0

# Check every 15 minutes
./scripts/health-check.sh
```

**Slack Update Template:**
```
🚀 Deployment Update - Day 3

Phase 6: FULL (100% Traffic) - LIVE

System Health:
✅ Error Rate: 0.02% (target: <0.1%)
✅ Latency P99: 234ms (target: <500ms)
✅ CPU: 45% avg (target: <70%)
✅ Memory: 62% avg (target: <80%)
✅ Pod Restarts: 0 (target: 0)
✅ API Requests: 500K/sec
✅ All regions: OPERATIONAL

Status: STABLE & PERFORMING

Next: Continue monitoring for 72 hours
```

---

## ROLLBACK PROCEDURES

### Quick Rollback (Emergency)

```bash
#!/bin/bash
# ONLY USE IF CRITICAL ISSUE DETECTED

echo "⚠️ INITIATING EMERGENCY ROLLBACK"

# Step 1: Scale down new deployment
kubectl scale deployment oursmusic-v2 --replicas=0 -n production

# Step 2: Restore old deployment
kubectl scale deployment oursmusic-v1 --replicas=30 -n production

# Step 3: Wait for old version healthy
kubectl rollout status deployment/oursmusic-v1 -n production

# Step 4: Verify traffic routed to v1
curl https://api.ourmusic.io/health

# Step 5: Notify team
echo "✅ Rollback completed. Traffic restored to v1"

# Step 6: Post in war room
# Message: "🔴 ROLLBACK EXECUTED - Investigating issue..."
```

### Graceful Rollback (Pre-planned)

```bash
#!/bin/bash
# Use if issues detected during canary phase

echo "🔄 Initiating graceful rollback"

# Step 1: Gradually reduce traffic to v2
kubectl patch deployment oursmusic-v2 \
  -p '{"spec":{"replicas":2}}' -n production
sleep 300  # 5 min

kubectl patch deployment oursmusic-v2 \
  -p '{"spec":{"replicas":1}}' -n production
sleep 300

kubectl patch deployment oursmusic-v2 \
  -p '{"spec":{"replicas":0}}' -n production

# Step 2: Increase traffic to v1
kubectl scale deployment oursmusic-v1 --replicas=30 -n production

# Step 3: Verify
kubectl rollout status deployment/oursmusic-v1 -n production

echo "✅ Gradual rollback completed"
```

### Decision Tree for Rollback

```
Critical Issue Detected?
│
├─ Yes
│  ├─ Error rate > 1%? → IMMEDIATE ROLLBACK
│  ├─ Latency p99 > 2s? → IMMEDIATE ROLLBACK
│  ├─ Data corruption? → IMMEDIATE ROLLBACK
│  └─ API unavailable? → IMMEDIATE ROLLBACK
│
└─ No
   ├─ Minor issues (performance)? → PATCH & MONITOR
   ├─ Cosmetic issues? → LOG & FIX LATER
   └─ No issues? → CONTINUE PHASED ROLLOUT
```

---

## TROUBLESHOOTING GUIDE

### Issue: Pod CrashLoopBackOff

```bash
# 1. Check logs
kubectl logs [pod-name] -n production

# 2. Check events
kubectl describe pod [pod-name] -n production

# 3. Common causes & fixes:
# - Database connection error → verify DB credentials
# - Out of memory → increase resource limits
# - Image pull error → verify image in registry
# - Config error → verify ConfigMap/Secret

# 4. Fix (example: DB credentials)
kubectl set env deployment/oursmusic DB_PASSWORD=new_password -n production

# 5. Restart deployment
kubectl rollout restart deployment/oursmusic -n production
```

### Issue: High Latency (p99 > 500ms)

```bash
# 1. Check database latency
psql -h db.prod.internal -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 2. Check slow queries log
tail -f /var/log/postgresql/postgresql.log | grep "duration:"

# 3. Check cache hit rate
redis-cli INFO stats | grep hit_ratio

# 4. Check API metrics
# Use Grafana dashboard → API Performance

# 5. Common fixes:
# - Add database indexes
# - Increase Redis cache TTL
# - Enable query caching
# - Scale up replicas
```

### Issue: High Error Rate (>0.1%)

```bash
# 1. Check error logs
kubectl logs [pod-name] -n production | grep ERROR

# 2. Check error types
curl http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}\[5m\])

# 3. Common errors & fixes:
# - 500s → check application logs
# - 502/503 → check pod health
# - 504 → check database connection timeout
# - 429 → rate limiting, increase limits or add more replicas

# 4. Scale up if needed
kubectl scale deployment oursmusic --replicas=40 -n production
```

### Issue: Database Replication Lag

```bash
# On primary
psql -c "SELECT slot_name, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;"

# On replica
psql -c "SELECT now() - pg_last_xact_replay_time() as replication_lag;"

# If lag > 1GB:
# 1. Check network bandwidth
# 2. Check replica CPU/disk
# 3. Increase wal_keep_size on primary:
ALTER SYSTEM SET wal_keep_size = '2GB';
SELECT pg_reload_conf();
```

---

## POST-LAUNCH MONITORING

### Critical Metrics (First 72 Hours)

Monitor these continuously:

```
Every 15 minutes:
├─ Error rate (must be <0.1%)
├─ Latency p99 (must be <500ms)
├─ CPU usage (must be <70%)
├─ Memory usage (must be <80%)
└─ Pod restarts (must be 0)

Every hourly:
├─ User logins
├─ API request rate
├─ Database replication lag
└─ Cache hit rate

Every 4 hours:
├─ User engagement metrics
├─ Revenue tracking
├─ Feature usage
└─ Customer support tickets
```

### Escalation Path

```
Metric Alert triggers:
│
├─ Level 1 (Minor): Metric outside normal range
│  └─ Action: Notify Slack, monitor closely
│
├─ Level 2 (Major): Metric 2x outside normal range  
│  └─ Action: Page on-call engineer
│
├─ Level 3 (Critical): System functionality impacted
│  └─ Action: Page engineering manager & incident commander
│
└─ Level 4 (Severe): System down or data loss
   └─ Action: Declare SEV-1 incident, activate war room
```

---

## SUCCESS METRICS

### Launch Success Criteria

✅ **Technical Success**
- [ ] Zero data loss
- [ ] <0.1% error rate
- [ ] <500ms p99 latency
- [ ] 99.95%+ availability
- [ ] All automated tests passing
- [ ] Zero critical security issues

✅ **Business Success**
- [ ] 100K++ daily active users
- [ ] <20% churn in first week
- [ ] NPS score >50
- [ ] >80% feature adoption
- [ ] Zero major customer incidents

✅ **Operational Success**
- [ ] All runbooks executed successfully
- [ ] Zero unplanned incidents
- [ ] All teams coordinated smoothly
- [ ] Communication clear & timely
- [ ] Decision-making effective

### Post-Launch Review

Schedule for **T+3 Days**:
- [ ] Performance review (1 hour)
- [ ] Incident review (30 min)
- [ ] Lessons learned (60 min)
- [ ] Team retrospective (30 min)
- [ ] Update documentation (60 min)

---

## DEPLOYMENT COMMANDS AT A GLANCE

```bash
# Pre-Launch Checks
./scripts/pre-launch-checks.sh
./scripts/health-check.sh
./scripts/db-verify.sh

# Deploy Phases
kubectl scale deployment oursmusic --replicas=1 -n production   # 1% canary
kubectl scale deployment oursmusic --replicas=2 -n production   # 5%
kubectl scale deployment oursmusic --replicas=3 -n production   # 10%
kubectl scale deployment oursmusic --replicas=8 -n production   # 25%
kubectl scale deployment oursmusic --replicas=15 -n production  # 50%
kubectl scale deployment oursmusic --replicas=30 -n production  # 100%

# Monitoring
kubectl get pods -n production
kubectl top pods -n production
kubectl logs -f deployment/oursmusic -n production

# Rollback
./scripts/rollback.sh  # Emergency rollback

# Post-Launch
./scripts/performance-report.sh
./scripts/user-metrics-report.sh
```

---

**Ready to Launch. Good luck! 🚀**

Questions? Check the WAR ROOM: [link]
