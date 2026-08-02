# Production Launch Checklist

Phase 12: Pre-flight verification before production deployment.

## Code Quality (2 hours)

- [ ] All tests passing: `npm test -- --coverage`
  - Backend coverage: >= 80%
  - Frontend coverage: >= 70%
  - Chat routes coverage: >= 90%
  
- [ ] Build succeeds: `npm run build`
  - No TypeScript errors: `npm run type-check`
  - No linting issues: `npm run lint`
  - No bundle warnings

- [ ] No console.logs in production code
  - Grep: `grep -r "console\." backend/src --include="*.ts" | grep -v "test\|mock"`
  - Keep: error logging, startup messages only
  - Remove: debug logs, development prints

- [ ] No hardcoded secrets/credentials
  - Grep: `grep -r "password\|secret\|key\|token" backend/src --include="*.ts" | grep -v "config\|env"`
  - All secrets in `.env.production` only
  - Never commit `.env.production`

- [ ] Error handling complete
  - All try-catch blocks have fallbacks
  - No unhandled promise rejections
  - Database errors return user-friendly messages

- [ ] No deprecated dependencies
  - `npm audit` zero vulnerabilities
  - `npm outdated` review major versions
  - Update if security patches available

## Database (1 hour)

- [ ] Migrations current
  - `npx prisma migrate status` shows "All migrations have been applied"
  - Latest migration tested locally
  - Rollback script created for emergency

- [ ] Backup strategy tested
  - Backup script exists: `./scripts/backup-db.sh`
  - Restore script tested: `pg_restore test.sql` works
  - Keep 30-day rotation of backups

- [ ] Performance indices present
  - `CREATE INDEX idx_project_status ON project(status)`
  - `CREATE INDEX idx_project_price ON project(price_min_cr)`
  - `CREATE INDEX idx_project_builder ON project(builder_id)`
  - Query plans verified (EXPLAIN ANALYZE)

- [ ] Database capacity planned
  - Current size: __ GB
  - Growth rate: __ GB/month
  - Retention policy: 1 year of data
  - Archival plan: monthly snapshots to S3

- [ ] Connection pooling configured
  - Max connections: 40 (10 per API pod, 5 reserve for maintenance)
  - Idle timeout: 5 minutes
  - Validated: `SELECT COUNT(*) FROM pg_stat_activity`

## Caching (30 min)

- [ ] Redis configured
  - Maxmemory: 2GB (production size)
  - Eviction policy: `allkeys-lru`
  - Persistence: RDB snapshots every 60s
  - Replication: Primary + replica for HA

- [ ] Cache TTLs set correctly
  - Gateway cache: 1hr (stable) / 30min (volatile)
  - Query planner cache: 30min
  - LLM response cache: 2hr

- [ ] Cache invalidation strategy tested
  - Data update triggers cache clear
  - Manual flush script: `redis-cli FLUSHDB ASYNC`

## Environment Configuration (1 hour)

- [ ] All secrets in production environment
  ```bash
  # Backend
  DATABASE_URL=postgresql://...
  REDIS_URL=redis://...
  GROQ_API_KEY=gsk_xxxxx
  OPENAI_API_KEY=sk_xxxxx
  NODE_ENV=production
  
  # Frontend
  NEXT_PUBLIC_API_BASE=https://api.realtypals.com
  NEXT_PUBLIC_POSTHOG_API_KEY=phc_xxxxx
  NEXT_PUBLIC_SENTRY_DSN=https://...
  
  # Monitoring
  SENTRY_DSN=https://...
  POSTHOG_API_KEY=phc_xxxxx
  ```

- [ ] No local `.env` files in git
  - `.env` in `.gitignore`
  - `.env.example` has template only (no real keys)

- [ ] Environment variable validation
  - Code validates all required vars at startup
  - Fails fast if missing critical vars
  - Logs what's set (not values)

- [ ] Production-only configs
  - Sentry sample rate: 10% (not 100%)
  - PostHog flush interval: 30s
  - CORS: specific domains only
  - Rate limiting: enabled

## Security (1.5 hours)

- [ ] SQL injection prevented
  - All database queries use Prisma (no raw SQL)
  - OR validated with Zod before queries
  - Grep: `$queryRaw\|$executeRaw` (should be zero)

- [ ] XSS prevented
  - All user input sanitized
  - React: no `dangerouslySetInnerHTML`
  - Frontend form validation present

- [ ] Rate limiting enforced
  - 1 req/sec per project (verified in code)
  - 5 concurrent per user (verified in code)
  - Returns 429 Too Many Requests with retry-after

- [ ] CORS configured
  - Allowed origins: `https://realtypals.com`, `https://*.realtypals.com`
  - Not `*` (wildcard)
  - Methods: GET, POST, OPTIONS only
  - Credentials: included

- [ ] Auth enforced
  - All protected routes require session
  - Session token validated server-side
  - CSRF token present in forms

- [ ] Data validation present
  - All API inputs validated with Zod
  - User IDs verified (can't access other user's data)
  - No SQL injection via filters/sorts

## Performance (1 hour)

- [ ] Load tests passing (see LOAD_TESTING.md)
  - 100 concurrent users
  - Average latency < 2s
  - p99 latency < 5s
  - Error rate < 0.5%

- [ ] Lighthouse score >= 80
  - Performance: >= 80
  - Accessibility: >= 90
  - Best Practices: >= 90
  - SEO: >= 90

- [ ] Core Web Vitals acceptable
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

- [ ] API latency verified
  - Intent classification: < 50ms (p95)
  - Query planning: < 100ms (p95)
  - Data gateway: < 200ms (p95)
  - LLM reasoning: < 1000ms (p95)
  - Total: < 2000ms (p95)

- [ ] Bundle size acceptable
  - Frontend JS: < 500KB (gzipped)
  - Frontend CSS: < 100KB (gzipped)
  - No unused dependencies

## Monitoring & Observability (1 hour)

- [ ] Health checks functional
  - `curl /health` returns 200
  - `curl /health/deep` shows all components green
  - `curl /health/ready` shows ready: true
  - `curl /health/live` responds immediately

- [ ] Sentry configured
  - DSN set in backend + frontend
  - Sample rate: 10% traces (production)
  - Test: trigger error, verify Sentry receives it
  - Alert rules created for error spikes

- [ ] PostHog configured
  - API key set in backend + frontend
  - Test: send event, verify in dashboard
  - Dashboard created for key metrics

- [ ] Logging aggregation set up
  - All logs sent to centralized system (Datadog, CloudWatch, etc.)
  - Log retention: 30 days minimum
  - Searchable by userId, intent, error type

- [ ] Metrics exportable
  - Prometheus endpoints available (optional)
  - Custom metrics tracked (latency, errors, cache hits)
  - Dashboard created for operations team

## Deployment (2 hours)

- [ ] Deployment pipeline tested
  - Build passes in CI
  - Tests run in CI
  - Deploy scripts executable
  - Rollback script tested locally

- [ ] Infrastructure ready
  - Database: PostgreSQL 13+, 100GB storage
  - Redis: 2GB memory, replication configured
  - API servers: 2+ pods (HA)
  - Load balancer: traffic distributed
  - CDN: frontend assets cached

- [ ] SSL/TLS certificates
  - Domain certificate: valid and not expiring soon
  - API certificate: matches api.realtypals.com
  - Automatic renewal: set up (Let's Encrypt)

- [ ] DNS configured
  - `realtypals.com` → frontend CDN
  - `api.realtypals.com` → API load balancer
  - Propagation verified (nslookup)
  - TTL: 300 seconds (low for quick changes)

- [ ] Backup automation
  - Database: automated daily backups
  - Retention: 30 days
  - Restore tested: can recover from any day
  - Location: secure S3 bucket

- [ ] Monitoring alerts configured
  - Error rate spike: pages on-call
  - Database down: pages on-call
  - High latency: Slack notification
  - Certificate expiry: 30 days before

## Documentation (30 min)

- [ ] README updated
  - Installation instructions
  - Configuration guide
  - Running locally instructions
  - Deployment instructions

- [ ] Runbooks completed
  - DEPLOYMENT_RUNBOOK.md: step-by-step deploy
  - OPERATIONS_MANUAL.md: daily tasks + troubleshooting
  - ARCHITECTURE.md: system design + data flow
  - MONITORING.md: analytics setup

- [ ] API documentation updated
  - API_PROJECT_DETAIL.md: intent types + examples
  - Error codes documented
  - Rate limits documented
  - Examples include real property IDs

- [ ] Incident response plan
  - On-call schedule defined
  - Escalation paths clear
  - Incident response checklist created
  - War room process documented

## Launch Day (1 hour)

- [ ] Team notified
  - Engineering team ready
  - On-call engineer identified
  - Product/marketing aware
  - Support team trained

- [ ] Smoke tests prepared
  - Test queries: EMI, investment, location, timeline, builder
  - Test edge cases: low confidence, missing data
  - Test errors: invalid input, timeout fallback

- [ ] Monitoring dashboards active
  - Latency dashboard visible
  - Error rate dashboard visible
  - Cache hit rate visible
  - Health status visible

- [ ] Communication channel open
  - Slack #incidents channel ready
  - PagerDuty escalation active
  - Status page accessible
  - Customer communication template ready

## Post-Launch (First Week)

- [ ] Monitor metrics hourly (first 4 hours)
  - Error rate: should be < 0.1%
  - Latency p95: should be < 2s
  - Cache hit rate: should build to > 40%

- [ ] Monitor metrics daily (first week)
  - Error rate: should stabilize < 0.1%
  - Latency p95: should be < 2s sustained
  - Cache hit rate: should reach > 70%
  - User feedback: no major complaints

- [ ] Review logs daily
  - Check for unexpected errors
  - Check for security warnings
  - Check database query performance

- [ ] Performance optimization
  - Add indices if slow queries found
  - Adjust cache TTLs if hit rate low
  - Scale if latency degrading

---

## Sign-Off

**Backend Lead:** ___________________ Date: ___________

**Frontend Lead:** ___________________ Date: ___________

**DevOps/Infrastructure:** ___________________ Date: ___________

**Product Manager:** ___________________ Date: ___________

**Ready to launch:** YES / NO (circle one)
