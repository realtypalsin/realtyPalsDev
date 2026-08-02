# Deployment Runbook

## Pre-Deployment Checklist

- [ ] All tests passing: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Environment variables set in `.env.production`
- [ ] Database migrations current: `npx prisma migrate deploy`
- [ ] Rollback plan prepared
- [ ] Deployment window approved by team
- [ ] Monitoring alerts configured
- [ ] Incident response team on call

## Infrastructure Requirements

### Backend
- Node.js 18+
- PostgreSQL 13+ with 100GB+ storage
- Redis 6+ (for caching)
- Memory: 4GB+ recommended
- CPU: 2+ cores recommended

### Frontend
- CDN enabled (Vercel or similar)
- Gzip compression enabled
- Browser caching: 1 week for assets, 1 day for HTML

### Environment Variables
```bash
# Backend
DATABASE_URL=postgresql://user:pass@host/realtypals
REDIS_URL=redis://host:port
GROQ_API_KEY=xxxxx
OPENAI_API_KEY=xxxxx
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_BASE=https://api.realtypals.com
NEXT_PUBLIC_ANALYTICS_TOKEN=xxxxx
```

## Deployment Steps

### 1. Pre-Flight (5 min)

```bash
# Verify current main branch is clean
git status
git log --oneline -5

# Build locally to catch issues early
npm run build
npm test

# Tag release
git tag -a v1.0.0 -m "Release: Project Detail Pipeline Phase 10"
git push origin v1.0.0
```

### 2. Database Migrations (5-10 min)

```bash
# Backup production database (production script)
# Always backup before migrations
./scripts/backup-db.sh

# Run migrations (against staging first)
npx prisma migrate deploy --skip-generate
npx prisma db seed  # If seeds needed

# Verify migration success
psql $DATABASE_URL -c "SELECT version();"
```

### 3. Backend Deployment (10-15 min)

```bash
# Deploy to production environment
# Option 1: Docker
docker build -t realtypals:v1.0.0 .
docker push realtypals:v1.0.0
kubectl set image deployment/realtypals-api api=realtypals:v1.0.0

# Option 2: Node/PM2
npm install --production
npm run build
pm2 restart realtypals-api

# Option 3: Vercel (auto-deploys from main)
git push origin main
# Monitor: https://vercel.com/dashboard
```

### 4. Frontend Deployment (5-10 min)

```bash
# Frontend deploys automatically with Vercel
# Monitor build: https://vercel.com/dashboard

# Verify DNS and CDN
curl -I https://realtypals.com
curl -I https://api.realtypals.com

# Warm cache
for url in /discover /compare /saved; do
  curl -s https://realtypals.com$url > /dev/null
done
```

### 5. Smoke Tests (10 min)

```bash
# Payment query test
curl -X POST https://api.realtypals.com/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How much EMI for ATS Pristine?"}'

# Investment query test
curl -X POST https://api.realtypals.com/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Is Godrej a good investment?"}'

# Check response format
# Should include 'components' event with confidence >= 0.65

# Monitor logs for errors
tail -f /var/log/realtypals/api.log
tail -f /var/log/realtypals/error.log
```

### 6. Verification (5 min)

```bash
# Check key metrics
# - Request latency (target < 2s)
# - Error rate (target < 0.1%)
# - Cache hit rate (target > 60%)
# - LLM timeout rate (target < 1%)

# Manual testing: browser testing of key flows
# 1. Open https://realtypals.com/discover
# 2. Ask: "How much EMI for ATS?"
# 3. Verify: EMI calculator renders with correct monthly amount
# 4. Verify: confidence badge shows green (>80%)
# 5. Verify: sources attribution shows "database, calculator"

# Check logging
grep "PROJECT_DETAIL" /var/log/realtypals/api.log | head -20
grep "ERROR" /var/log/realtypals/error.log
```

## Rollback Procedure

If critical issue detected within 30 minutes:

```bash
# Option 1: Revert code
git revert HEAD
git push origin main

# Option 2: Restore previous Docker image
kubectl set image deployment/realtypals-api api=realtypals:v0.9.0

# Option 3: Database rollback (if migrations broke)
npx prisma migrate resolve --rolled-back <migration_name>

# Verify rollback
npm test
curl -s https://api.realtypals.com/health | jq .
```

Communicate:
- Notify #incident channel
- Update status page
- Post-mortem within 24h

## Monitoring Post-Deployment

### First Hour
- [ ] Error rate < 1%
- [ ] Response latency < 3s
- [ ] Database connections stable
- [ ] Cache hit rate building (should reach >40%)
- [ ] No unusual memory/CPU spikes
- [ ] Sentry alerts < 5

### First Day
- [ ] Cache hit rate > 60%
- [ ] Request latency p50 < 1.5s, p99 < 3s
- [ ] Zero unhandled errors
- [ ] All intents working (payment, investment, location, etc.)
- [ ] Component confidence scores healthy (avg > 0.85)
- [ ] No database slowness complaints

### First Week
- [ ] Sustained cache hit rate > 70%
- [ ] User satisfaction score stable/improved
- [ ] Zero production incidents
- [ ] All optimization targets met

## Incident Response

If issues detected:

```bash
# Check application logs
tail -100f /var/log/realtypals/api.log | grep ERROR

# Check database health
psql $DATABASE_URL -c "SELECT now() - pg_postmaster_start_time();"
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_statements WHERE calls > 0;"

# Check Redis cache
redis-cli INFO stats

# Restart service
systemctl restart realtypals-api
# or
pm2 restart realtypals-api
# or
kubectl rollout restart deployment/realtypals-api

# Clear caches if corrupted
redis-cli FLUSHDB ASYNC
# (Queries will re-populate cache)
```

## Post-Deployment Tasks

### Within 24 Hours
- [ ] Review error logs and Sentry
- [ ] Check database query performance
- [ ] Verify all cache TTLs working correctly
- [ ] Document any issues in runbook
- [ ] Update deployment success in ticket

### Within 1 Week
- [ ] Performance review meeting
- [ ] User feedback synthesis
- [ ] Database stats analysis
- [ ] Optimization recommendations
- [ ] Archive this deployment's logs

## Rollback Recovery

After rolling back:

```bash
# Fix issue in development
git checkout -b hotfix/issue-description
# ... make fixes ...
npm test
git commit -m "fix: description"

# Redeploy (go back to step 1: Pre-Flight)
# Don't skip steps; rushed deployments create more issues
```

## Emergency Contacts

- On-call engineer: $ON_CALL_SLACK
- Database DBA: $DBA_SLACK
- Infrastructure: $INFRA_SLACK
- Product: $PRODUCT_SLACK

## Related Docs
- [API Documentation](./API_PROJECT_DETAIL.md)
- [Operations Manual](./OPERATIONS_MANUAL.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
