# Operations Manual

## System Overview

Project Detail Pipeline: Verified-data AI system for project queries.

**SLA Targets:**
- Availability: 99.5% (4.5 hours downtime/month)
- Response time p50: < 1.5s
- Response time p99: < 3s
- Error rate: < 0.1%
- Cache hit rate: > 70%

## Daily Operations

### Morning Checklist (9am)

```bash
# 1. Check system health
curl https://api.realtypals.com/health -v

# 2. Review error logs from overnight
tail -100 /var/log/realtypals/api.log | grep -E "ERROR|CRITICAL"

# 3. Check database size and growth
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('realtypals'));"

# 4. Review cache stats
redis-cli INFO stats

# 5. Check metrics
# - Error rate
# - p50/p99 latency
# - Cache hit rate
# - LLM token usage
```

### Weekly Tasks

**Monday**
- Review exception counts in Sentry
- Update runbook based on incidents
- Capacity planning: check growth trajectory

**Wednesday**
- Database maintenance: `VACUUM ANALYZE;`
- Backup verification
- Performance profile review

**Friday**
- Performance metrics review
- Plan optimization opportunities
- Deploy any pending fixes/optimizations

## Monitoring & Alerts

### Key Metrics to Watch

```
API Latency:
  - p50: target < 1.5s
  - p99: target < 3s
  - Max: alert if > 10s

Error Rate:
  - target < 0.1%
  - alert if > 1%

Cache Hit Rate:
  - target > 70%
  - alert if < 40%

Confidence Score:
  - avg should be > 0.85
  - alert if < 0.70

LLM Timeout Rate:
  - target < 1%
  - alert if > 5%

Database Connections:
  - target: 10-20 active
  - alert if > 50 or error rate spike

Queue Depth:
  - target: 0
  - alert if > 100
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 0.5% | > 2% |
| Latency p99 | > 5s | > 10s |
| Cache hit rate | < 50% | < 30% |
| DB connections | > 40 | > 80 |
| Memory usage | > 80% | > 95% |
| Disk usage | > 80% | > 95% |

## Troubleshooting

### High Error Rate

```bash
# 1. Check logs
tail -100 /var/log/realtypals/api.log | grep ERROR

# 2. Check database
psql $DATABASE_URL -c "SELECT * FROM pg_stat_database WHERE datname = 'realtypals';"

# 3. Check Redis
redis-cli PING
redis-cli INFO memory

# 4. Check LLM APIs
curl -s -H "Authorization: Bearer $GROQ_API_KEY" \
  https://api.groq.com/health

# 5. Restart if transient
systemctl restart realtypals-api
redis-cli FLUSHDB ASYNC  # Clear cache if corrupted
```

### High Latency

```bash
# 1. Check database query performance
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

# 2. Check slow queries
EXPLAIN ANALYZE
SELECT * FROM project WHERE id = 'xxx';

# 3. Check cache hit rate
redis-cli INFO stats | grep hits

# 4. Check LLM response times
grep "LLM_LATENCY" /var/log/realtypals/api.log | tail -20

# 5. Scale if needed
# - Add read replicas for database
# - Increase Redis memory
# - Add API server instances
```

### Low Cache Hit Rate

```bash
# Check cache configuration
redis-cli CONFIG GET "maxmemory"
redis-cli CONFIG GET "maxmemory-policy"

# Monitor cache evictions
redis-cli INFO stats | grep evicted

# Check TTLs
redis-cli KEYS "*" | xargs redis-cli TTL

# Clear cache and rebuild
redis-cli FLUSHDB ASYNC
# (Queries will re-populate)

# Check cache key patterns
redis-cli KEYS "*" | head -20
```

### Confidence Score Low

```bash
# Check what data is missing
SELECT id, name, 
  CASE WHEN price_min_cr IS NULL THEN 'missing_price' END,
  CASE WHEN possession_date IS NULL THEN 'missing_possession' END
FROM project
WHERE price_min_cr IS NULL OR possession_date IS NULL
LIMIT 10;

# Check which intents affected
grep "confidence < 0.65" /var/log/realtypals/api.log | tail -20

# Check data age
SELECT id, name, 
  EXTRACT(DAY FROM (now() - last_verified_at)) AS age_days
FROM project
WHERE last_verified_at < now() - interval '30 days'
LIMIT 10;
```

## Database Maintenance

### Daily
```bash
# Nothing required; autovacuum handles it
```

### Weekly
```bash
# Analyze tables
psql $DATABASE_URL -c "ANALYZE;"

# Check index health
psql $DATABASE_URL -c "
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC;"
```

### Monthly
```bash
# Reindex if needed
psql $DATABASE_URL -c "REINDEX TABLE project;"

# Vacuum full (requires downtime)
psql $DATABASE_URL -c "VACUUM FULL ANALYZE;"

# Backup
./scripts/backup-db.sh
```

## Scaling

### Horizontal Scaling (Add Servers)

When p99 latency > 5s and error rate increasing:

```bash
# Add API servers
kubectl scale deployment realtypals-api --replicas=3

# Add database read replicas (PostgreSQL streaming replication)
# 1. Provision new instance
# 2. Configure streaming replication
# 3. Update read-replica connection string
# 4. Test failover

# Load balance queries
# - Use PgBouncer or similar for connection pooling
# - Direct read-only queries to replicas
```

### Vertical Scaling (Bigger Servers)

When memory/CPU hitting limits:

```bash
# Increase instance size
# 1. Provision larger instance
# 2. Migrate traffic
# 3. Decommission old instance

# Monitor: watch metrics don't return to high levels after scaling
```

### Cache Scaling

When cache hit rate < 50%:

```bash
# Increase Redis memory
redis-cli CONFIG SET maxmemory 16gb

# Add Redis cluster if needed
# Configure Redis Cluster with sharding

# Update cache TTLs based on data change frequency
# - Stable data: 1 hour
# - Volatile data: 15-30 minutes
```

## Disaster Recovery

### Database Backup

```bash
# Automated daily backups to S3
./scripts/backup-db.sh

# Verify backup
pg_restore -l /backups/realtypals-2024-01-15.sql

# Restore (if needed)
dropdb realtypals
pg_restore /backups/realtypals-2024-01-15.sql
```

### Service Recovery

```bash
# If API completely down
# 1. Check logs
tail -100 /var/log/realtypals/api.log

# 2. Restart service
systemctl restart realtypals-api

# 3. Check health
curl https://api.realtypals.com/health

# 4. Run smoke tests
./scripts/smoke-tests.sh

# 5. Monitor metrics
watch 'curl -s https://metrics.realtypals.com | jq .'
```

### Cache Corruption Recovery

```bash
# If Redis corrupted
redis-cli SHUTDOWN NOSAVE

# Restart Redis
systemctl start redis

# Clear cache (will rebuild)
redis-cli FLUSHDB ASYNC

# Monitor rebuild
watch 'redis-cli INFO stats'
```

## Performance Optimization

### Identify Bottlenecks

```bash
# 1. Database query analysis
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

# 2. LLM latency analysis
grep "LLM_LATENCY:" /var/log/realtypals/api.log | tail -100 | \
  awk '{print $NF}' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'

# 3. Cache efficiency
redis-cli INFO stats | grep -E "hits|misses"

# 4. Frontend performance
# Check Core Web Vitals in monitoring dashboard
```

### Optimization Checklist

- [ ] Add database indexes for slow queries
- [ ] Increase cache TTL for stable data
- [ ] Reduce query payload (select only needed fields)
- [ ] Enable query batching
- [ ] Add request coalescing
- [ ] Optimize LLM prompts (shorter = faster)
- [ ] Upgrade database hardware
- [ ] Use read replicas for reads

## Communication

### On-Call Escalation

1. **Self-healing** (minutes 0-5)
   - Automated health checks
   - Auto-restart of failed services
   - Clear caches if corrupted

2. **On-call engineer** (minutes 5-15)
   - Page on-call engineer
   - Provide initial triage info
   - Check preliminary metrics

3. **Team response** (minutes 15+)
   - Add team members to bridge
   - Establish war room
   - Start incident investigation
   - Communicate status to users

## Change Management

All changes follow:
1. Development on feature branch
2. Tests pass locally
3. Code review approval
4. Staging deployment
5. Smoke tests on staging
6. Production deployment during business hours
7. Monitoring for 1 hour post-deploy

No emergency hotfixes without post-deploy review.

## Related Docs
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [API Documentation](./API_PROJECT_DETAIL.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
