# Enhanced Launch Runbook

Phase 12: Day-of deployment with data readiness, minute-by-minute timeline, and rollback procedures.

---

## Pre-Launch Data Verification (T-24 hours)

### Tier 1 Data Validation (Critical — Launch Blocker)

**Builder Data:**
```sql
SELECT COUNT(*) as builder_count 
FROM builder 
WHERE name IS NOT NULL AND slug IS NOT NULL;
-- Target: >= 5 builders (sufficient for launch)
```
- [ ] >= 5 builders with name + slug
- [ ] Each builder has: founded_year, headquarters, phone, email
- [ ] Each builder has delivery_score (0-100)

**Project Data (Tier 1):**
```sql
SELECT COUNT(*) as project_count 
FROM project 
WHERE name IS NOT NULL AND builder_id IS NOT NULL AND status IS NOT NULL;
-- Target: >= 20 projects
```
- [ ] >= 20 projects live
- [ ] Each project: name, slug, sector, status, builder_id
- [ ] Each project: lat, lng, address
- [ ] Each project: at least 1 hero image URL

**Unit Types (Tier 1):**
```sql
SELECT COUNT(*) as unit_count 
FROM unit_type 
WHERE bhk IS NOT NULL AND super_area_sqft IS NOT NULL AND price_min_cr IS NOT NULL;
-- Target: >= 40 unit types (avg 2 per project)
```
- [ ] >= 40 unit types across all projects
- [ ] Each unit: bhk, super_area_sqft, carpet_area_sqft, price_min_cr
- [ ] No NULL prices (return "Contact team" if missing)

**Payment Plans (Tier 2):**
```sql
SELECT COUNT(*) as plan_count 
FROM payment_plan 
WHERE project_id IS NOT NULL AND plan_type IS NOT NULL;
-- Target: >= 20 payment plans (avg 1 per project)
```
- [ ] >= 20 payment plans documented
- [ ] Each plan: down_payment_pct, milestones (JSON array)
- [ ] Plans cover main types: construction_linked, easy_payment, investor

**Cost Sheets (Tier 2):**
```sql
SELECT COUNT(*) as cost_count 
FROM cost_sheet 
WHERE project_id IS NOT NULL AND gst_rate_pct IS NOT NULL;
-- Target: >= 15 cost sheets (75% of projects)
```
- [ ] >= 15 cost sheets
- [ ] Each sheet: base price, gst_rate_pct, stamp_duty_pct, parking_cost_lakh
- [ ] Total unit costs calculated

**Images (Tier 1):**
```sql
SELECT project_id, COUNT(*) as image_count 
FROM project_image 
GROUP BY project_id 
HAVING COUNT(*) < 2;
-- Should return 0 rows (all projects have >= 2 images)
```
- [ ] All projects have >= 1 hero image
- [ ] All projects have >= 1 floor plan image
- [ ] Image URLs valid (test 5 random URLs with curl)

**Connectivity (Tier 2):**
```sql
SELECT project_id, COUNT(*) as connectivity_count 
FROM connectivity 
GROUP BY project_id;
-- Target: avg >= 3 per project
```
- [ ] >= 20 connectivity records total
- [ ] Cover types: metro, school, hospital, mall, landmark

**Amenities (Tier 2):**
```sql
SELECT project_id, COUNT(*) as amenity_count 
FROM amenity 
GROUP BY project_id;
-- Target: avg >= 5 per project
```
- [ ] >= 50 amenities total (avg 2.5 per project)
- [ ] Cover categories: wellness, sports, lifestyle, kids, parking

**Database Integrity:**
```sql
-- Check foreign keys
SELECT 'project without builder' as issue FROM project WHERE builder_id IS NULL;
SELECT 'unit_type without project' as issue FROM unit_type WHERE project_id IS NULL;
SELECT 'image without project' as issue FROM project_image WHERE project_id IS NULL;
-- Should return 0 rows
```
- [ ] No orphaned records (all FKs valid)
- [ ] No circular references
- [ ] Timestamps reasonable (created_at < now, < 1 year in future)

**Pass Criteria:**
- All Tier 1 checks PASS
- >= 60% of Tier 2 checks pass
- Zero constraint violations

**If FAIL:** Do NOT deploy. Return to data entry. Re-run checks after 2 hours.

---

## Launch Day Timeline

### T-60 min (60 minutes before launch)

- [ ] All team members present
- [ ] Slack #incidents channel open
- [ ] PagerDuty on-call confirmed
- [ ] Monitoring dashboards loaded (Sentry, PostHog, Health checks)
- [ ] Database backup taken
- [ ] Final data verification complete (see above)
- [ ] Rollback plan reviewed and approved by tech lead

### T-30 min (30 minutes before launch)

- [ ] Build test: `npm run build` → succeeds, no TypeScript errors
- [ ] Test suite: `npm test -- --coverage` → all tests pass
- [ ] Type checking: `npm run type-check` → zero errors
- [ ] Lint: `npm run lint` → zero errors
- [ ] Security scan: `npm audit` → zero vulnerabilities
- [ ] Secrets verification: `.env.production` contains all required keys
- [ ] DNS verified: 
  - `nslookup realtypals.com` → CDN IP
  - `nslookup api.realtypals.com` → load balancer IP
- [ ] SSL certificate valid:
  - `openssl s_client -connect realtypals.com:443` → expires > 30 days
  - `openssl s_client -connect api.realtypals.com:443` → expires > 30 days
- [ ] Database migrations tested on staging: `npx prisma migrate deploy --skip-generate`
- [ ] Redis connectivity verified: `redis-cli PING` → PONG
- [ ] LLM API working: test query to Groq API succeeds

**Status:** Green light to proceed?

### T-15 min (15 minutes before launch)

**Deployment:**

1. **Database (2 min)**
   ```bash
   # Backup production database
   ./scripts/backup-db.sh
   # Verify backup
   pg_restore -l /backups/realtypals-$(date +%Y%m%d).sql | head -10
   # Run migrations
   npx prisma migrate deploy --skip-generate
   # Verify migration success
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. **Backend (5 min)**
   ```bash
   # Option A: Docker
   docker build -t realtypals:v1.0.0 .
   docker push realtypals:v1.0.0
   kubectl set image deployment/realtypals-api api=realtypals:v1.0.0
   
   # Option B: Direct Node
   npm install --production
   npm run build
   pm2 restart realtypals-api
   
   # Verify health
   curl http://localhost:3000/health/deep
   ```

3. **Frontend (3 min)**
   ```bash
   # Vercel auto-deploys from main
   git push origin main
   # Monitor: https://vercel.com/dashboard
   # Wait for "Preview ready"
   ```

4. **Smoke Tests (5 min)**
   ```bash
   # Payment query
   curl -X POST https://api.realtypals.com/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"How much EMI for ATS Pristine?","sessionId":"test-001"}' \
     -w "\nStatus: %{http_code}\n"
   # Expected: 200, response includes "emi-calculator"
   
   # Investment query
   curl -X POST https://api.realtypals.com/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Is Godrej a good investment?","sessionId":"test-002"}' \
     -w "\nStatus: %{http_code}\n"
   # Expected: 200, response includes "investment-score"
   
   # Health checks
   curl https://api.realtypals.com/health → status: "ok"
   curl https://api.realtypals.com/health/deep → all components green
   curl https://realtypals.com → loads, no JS errors in console
   ```

**Status:** All green? Proceed. Any red → immediate rollback.

### T-5 min (5 minutes before launch)

- [ ] Announcement posted: Slack #general + status page
- [ ] On-call engineer standing by
- [ ] Database monitoring active (watch connections, query latency)
- [ ] Error monitoring active (Sentry dashboard open)
- [ ] Analytics monitoring active (PostHog dashboard open)
- [ ] Performance monitoring active (Lighthouse, Core Web Vitals)

### T+0 (Launch — GO)

**Announcement:**
```
🚀 RealtyPals Project Detail Pipeline LIVE

v1.0.0 deployed to production.

What's live:
✅ AI-powered property recommendations
✅ EMI calculator, investment analysis, location insights
✅ Real-time data from database (no hallucinations)
✅ Confidence badges for transparency

Try it: https://realtypals.com

Issues? Ping #incidents on Slack
```

---

## Post-Launch Monitoring (First 24 Hours)

### Hour 1 (T+0 to T+1)

**Check every 5 minutes:**
- [ ] Health: `curl /health/deep` → status: "healthy"
- [ ] Error rate: Sentry dashboard < 1%
- [ ] Latency: p95 < 3s (acceptable post-launch)
- [ ] Cache hit rate: > 10% (initial warm-up)
- [ ] User activity: PostHog showing page views, chat messages

**Alert thresholds (escalate if exceeded):**
- Error rate > 2%
- Latency p95 > 5s
- Database connections > 30
- API timeouts > 5/min

**First issue protocol:**
1. Check `/health/deep` → identify component
2. Check Sentry error log → root cause
3. If obvious fix: apply + re-deploy
4. If unclear: rollback (see procedure below)
5. Post-incident: root cause analysis in Slack

### Hours 1-4 (T+1 to T+4)

**Check every 15 minutes:**
- [ ] Error rate trend: declining or stable?
- [ ] Latency trend: p95 staying < 3s?
- [ ] Cache hit rate: building toward > 40%?
- [ ] No spike in timeout errors
- [ ] No spike in rate-limit rejections
- [ ] User feedback: any support tickets?

**Cumulative metrics:**
- Error rate: should be < 0.5% by hour 2
- P95 latency: should be < 2.5s by hour 2
- Cache hits: should reach 30-50% by hour 4

### Hours 4-24 (T+4 to T+24)

**Check every hour:**
- [ ] Error rate: < 0.1% (target met)
- [ ] P95 latency: < 2s (target met)
- [ ] Cache hit rate: > 60% (target met)
- [ ] Database CPU: < 60%
- [ ] Memory usage: stable
- [ ] No error rate spikes in Sentry

**Daily metrics to log:**
```
Date: 2026-01-15
- Avg error rate: 0.08%
- P95 latency: 1847ms
- Cache hit rate: 71%
- Peak concurrent users: 47
- Unique users: 312
- Total messages: 1,847
```

---

## Rollback Procedure (If Critical Issue)

### Decision to Rollback

Rollback is **automatic** if:
- Error rate > 2% sustained for 5 min
- Database connections exhausted (> 50)
- API response time p99 > 10s sustained
- Data corruption suspected

Rollback is **manual** (tech lead decision) if:
- High error rate (> 1%) with unclear cause
- User reports major feature broken
- Security vulnerability disclosed

### Rollback Steps (< 10 minutes)

**Step 1: Notify team (30 sec)**
```
🚨 ROLLBACK IN PROGRESS

Reason: [error rate spike / database issue / security issue]
Previous version: v0.9.5
Rolling back to: v0.9.5
ETA: 5 minutes
```

**Step 2: Database rollback (2 min)**
```bash
# Restore from last backup
pg_restore /backups/realtypals-backup-prelaunch.sql

# Or: Revert migration
npx prisma migrate resolve --rolled-back migration-name
```

**Step 3: Backend rollback (2 min)**
```bash
# Option A: Docker
kubectl set image deployment/realtypals-api api=realtypals:v0.9.5

# Option B: Direct Node
git checkout v0.9.5
npm install
npm run build
pm2 restart realtypals-api
```

**Step 4: Verify health (1 min)**
```bash
curl https://api.realtypals.com/health/deep
# Must return status: "healthy"
```

**Step 5: Notify team (1 min)**
```
✅ ROLLBACK COMPLETE

v0.9.5 restored from backup
Previous version (v1.0.0) rolled back
Error rate: [monitoring]

Next steps:
- Investigate root cause
- Fix in development
- Re-deploy after verification

Details: [link to error logs]
```

### Root Cause Analysis (Post-Rollback)

1. **Check database:** `SELECT * FROM pg_stat_statements WHERE mean_time > 1000;`
2. **Check logs:** `tail -100 /var/log/realtypals/api.log | grep ERROR`
3. **Check Sentry:** Top 10 errors + stack traces
4. **Check performance:** Was deployment slow? Out of memory?
5. **Write incident report:** What failed, why, how to prevent

---

## Success Criteria (End of Day 1)

- [ ] Error rate: < 0.1% (target met)
- [ ] P50 latency: < 1s
- [ ] P95 latency: < 2s (target met)
- [ ] P99 latency: < 5s
- [ ] Cache hit rate: > 60% (target met)
- [ ] Zero unhandled exceptions
- [ ] Zero data corruption
- [ ] Zero security incidents
- [ ] >= 100 unique users
- [ ] >= 500 messages sent
- [ ] Support: < 5 critical tickets

**Launch Status:** ✅ SUCCESS or 🔴 ISSUES?

---

## First Week Schedule

| Day | Task | Owner | Status |
|-----|------|-------|--------|
| Day 1 | Monitor (24/7), hourly reports | On-call | |
| Day 2 | Review Sentry errors, PostHog analytics | Engineering | |
| Day 3 | Database optimization (add indices if slow) | DBA | |
| Day 4 | Performance review, cache tuning | Engineering | |
| Day 5 | Weekly metrics review, user feedback synthesis | Product | |
| Day 6-7 | Capacity planning, staffing, optional tweaks | Eng Lead | |

---

## Escalation Contacts

**Critical (P1 — Page immediately):**
- On-call engineer: [Slack handle]
- Engineering lead: [Slack handle]
- CTO: [Slack handle]

**High (P2 — Notify within 30 min):**
- Data lead: [Slack handle]
- DevOps: [Slack handle]
- Product: [Slack handle]

**Medium (P3 — Notify within 2 hours):**
- Team lead: [Slack handle]
- Back-up engineer: [Slack handle]

---

## Post-Launch Celebration 🎉

Once all success criteria met:
- [ ] Team call to celebrate
- [ ] Announce to company + investors
- [ ] Share metrics in #general
- [ ] Thank product, design, engineering
- [ ] Plan for next phase (monitoring enhancements, Phase 13)

---

## Sign-Off

**Launch Date:** _________________

**Deployed By:** _________________

**Verified By:** _________________

**On-Call Engineer:** _________________

**Status:** ✅ SUCCESS / 🔴 ROLLBACK

**Notes:** ________________________________________________________________

