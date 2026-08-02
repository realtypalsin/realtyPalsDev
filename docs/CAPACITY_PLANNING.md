# Capacity Planning

Phase 12: Infrastructure sizing and growth projections.

## Current Estimated Load

### Users
- Launch: 100 users/day
- Month 1: 500 users/day (5x growth)
- Month 3: 2,000 users/day
- Month 6: 5,000 users/day
- Year 1: 10,000 users/day

### Requests Per Day
- Assumption: 5 messages per user per day
- Launch: 500 requests/day (100 users × 5)
- Month 1: 2,500 requests/day
- Month 3: 10,000 requests/day
- Month 6: 25,000 requests/day
- Year 1: 50,000 requests/day

### Peak Load
- Assumption: peak = 3× average
- Requests per second at peak:
  - Launch: 0.02 req/s (negligible)
  - Month 1: 0.09 req/s
  - Month 3: 0.35 req/s
  - Month 6: 0.87 req/s
  - Year 1: 1.7 req/s

---

## Database Sizing

### Storage

**Project & Property Data:**
- Estimated 5,000 projects in database
- 50 fields per project (properties + computed fields)
- Average row size: ~4 KB
- Total: 5,000 × 4 KB = 20 MB

**Conversation History:**
- Assumption: keep 1 year of conversation history
- Conversations: 50,000/day × 365 days = 18.25M conversations/year
- Average conversation: 10 messages
- Message size: 500 bytes
- Total: 18.25M × 10 × 500 bytes = 91 GB

**Total Year 1:** ~100 GB (project data + conversations)

### Recommended Database Size

| Timeline | Size | Comments |
|----------|------|----------|
| Launch | 50 GB | Buffer for growth |
| Month 3 | 100 GB | Conversations accumulate |
| Month 6 | 120 GB | Consider archival |
| Year 1 | 150 GB | Archive old conversations |

### Database Tier (PostgreSQL)

**Launch:**
- Instance: db.t3.small (2 vCPU, 2 GB RAM)
- Storage: 100 GB gp3
- Connections: 20 max
- Estimated cost: $50/month

**Month 3 (scale-up trigger: > 5,000 DAU or latency p99 > 3s):**
- Instance: db.r5.large (2 vCPU, 16 GB RAM, optimized for memory)
- Storage: 150 GB gp3
- Connections: 40 max
- Read replicas: 1 (for scaling reads)
- Estimated cost: $200/month

**Month 6+ (HA setup):**
- Primary: db.r5.xlarge
- Replicas: 2 (for failover + read scaling)
- Estimated cost: $500/month

### Query Performance Targets

| Query Type | Target | Tolerance |
|-----------|--------|-----------|
| Project by ID | < 50ms | < 100ms |
| Project list (filter) | < 200ms | < 500ms |
| Conversation history | < 100ms | < 300ms |
| Aggregations (stats) | < 500ms | < 1000ms |

---

## Caching (Redis)

### Memory Usage

**Gateway Cache:**
- Key: `{projectId}:{intent}:{fields}`
- Value: FactValidation[] (~2 KB per project)
- Estimated keys: 50 projects × 6 intents × 2 variants = 600 keys
- Memory: 600 × 2 KB = 1.2 MB

**Query Planner Cache:**
- Key: normalized message
- Value: QueryPlan (~500 bytes)
- Estimated keys: 1,000 unique queries
- Memory: 1,000 × 500 bytes = 0.5 MB

**LLM Response Cache:**
- Key: `{intent}:{factKeys}`
- Value: summary string (~1 KB)
- Estimated keys: 500 unique summaries
- Memory: 500 × 1 KB = 0.5 MB

**Total Cache:** ~2.2 MB (very small)

### Redis Sizing

| Timeline | Size | Tier | Cost |
|----------|------|------|------|
| Launch | 2 GB | cache.t3.micro | $20/month |
| Month 6 | 4 GB | cache.t3.small | $40/month |
| Year 1 | 8 GB | cache.r5.large | $100/month |

**Note:** Cache is optional (system works without Redis, just slower). Can scale cache independently of database.

---

## API Servers (Application Layer)

### Requests Per Server

**Single server capacity (Node.js):**
- Assuming: 200 concurrent connections per process
- Average request duration: 2 seconds
- Max throughput: 200 / 2 = 100 req/s per server

**Launch requirement:**
- Peak: 0.02 req/s
- Servers needed: 0.02 / 100 = 0.0002 → **1 server** (with massive headroom)

**Month 3 requirement:**
- Peak: 0.35 req/s
- Servers needed: 0.35 / 100 = 0.0035 → **1 server**

**Month 6 requirement:**
- Peak: 0.87 req/s
- Servers needed: 0.87 / 100 = 0.0087 → **1 server** (or 2 for HA)

**Year 1 requirement:**
- Peak: 1.7 req/s
- Servers needed: 1.7 / 100 = 0.017 → **2 servers** (for HA + headroom)

### Server Sizing

| Timeline | Count | Instance | Memory | Cost |
|----------|-------|----------|--------|------|
| Launch | 1 | t3.micro | 1 GB | $10/month |
| Month 1 | 1 | t3.small | 2 GB | $20/month |
| Month 6 | 2 | t3.small | 2 GB | $40/month |
| Year 1 | 2-3 | t3.medium | 4 GB | $60-90/month |

**Strategy:**
- Launch: single server (no HA)
- Month 1+: add second server for HA (auto-failover)
- Year 1+: add third server for load distribution

---

## Frontend CDN

### Assets

**JavaScript:** ~300 KB (gzipped)
**CSS:** ~50 KB (gzipped)
**Images:** ~500 KB
**Fonts:** ~200 KB

**Total per user:** ~1 MB (cached by CDN)

### Bandwidth

**Launch:**
- 100 users × 1 MB per visit = 100 MB/day
- Assumption: users visit 2x/week = 50 MB/week
- Cost: negligible (most CDNs offer free tier up to 1 TB/month)

**Month 6:**
- 5,000 users × 1 MB × 2 visits/week = 10 GB/week
- Monthly: ~43 GB/month
- Cost: $0.085/GB = ~$3.50/month (Cloudflare, Vercel, etc.)

**Year 1:**
- 10,000 users × 1 MB × 2 visits/week = 20 GB/week
- Monthly: ~87 GB/month
- Cost: ~$7/month

**Strategy:** Vercel free tier covers entire forecast period.

---

## Monitoring & Observability

### Sentry

**Event quota:**
- Launch: ~500 errors/month (assume 0.1% error rate)
- Month 6: ~2,500 errors/month
- Year 1: ~5,000 errors/month

**Pricing:** Sentry free tier = 5,000 events/month
- Launch: Free tier sufficient
- Month 6: Upgrade to Sentry paid ($50/month) or stay on free
- Year 1: Evaluate need

### PostHog

**Event quota:**
- Launch: ~2,500 events/day (500 requests × 5 events each)
- Month 6: ~125,000 events/day
- Year 1: ~250,000 events/day

**Pricing:** PostHog free tier = 1M events/month
- Launch: Free tier sufficient
- Month 6: Still in free tier (~3.75M events/month)
- Year 1: Upgrade to paid (~$5/month) or higher volume

---

## Total Infrastructure Cost

| Timeline | Database | Cache | Servers | CDN | Monitoring | Total |
|----------|----------|-------|---------|-----|------------|-------|
| **Launch** | $50 | $20 | $10 | Free | Free | **$80/month** |
| **Month 3** | $50 | $40 | $20 | Free | Free | **$110/month** |
| **Month 6** | $200 | $40 | $40 | $4 | $50 | **$334/month** |
| **Year 1** | $300 | $100 | $90 | $7 | $50 | **$547/month** |

**Growth:** $80 → $547 over 12 months (~7x increase aligned with user growth)

---

## Scaling Timeline

### Launch (Day 1)
- Database: 100 GB capacity
- API servers: 1 instance
- Cache: 2 GB
- Monitoring: Sentry free, PostHog free
- Status: Minimal HA, manual backups

### Month 1 (Growth: 5x users)
- Check: Error rate < 0.1%, latency p95 < 2s, cache hit > 70%
- If needed: Scale database storage, add read replica
- Status: Single API instance (still sufficient)

### Month 3 (Growth: 20x users)
- Check: Database connections healthy, query latency acceptable
- Scale: Upgrade database tier to r5.large, add read replica
- Add: Second API server for HA
- Status: HA ready (database + servers)

### Month 6 (Growth: 50x users)
- Check: All metrics within SLAs
- Scale: Consider third API server
- Upgrade: Sentry to paid tier if needed
- Status: Full HA (database primary + replicas, 2 API servers)

### Year 1 (Growth: 100x users)
- Evaluate: Horizontal scaling vs vertical scaling
- Consider: Database sharding if bottleneck
- Plan: Next-year infrastructure (2-3 year horizon)

---

## Load Testing Assumptions

All capacity planning based on:
1. Average request latency: 2 seconds
2. Error rate: < 0.1%
3. Cache hit rate: > 70% (after warm-up)
4. Peak load: 3× average
5. Geographic distribution: India (single region)
6. Conversion: ~1% of daily active users → leads/sales

---

## Reserved Capacity

Plan to over-provision at each level:

**Database:** 2× expected data size (for indices, temp tables, growth)
**Servers:** 2× peak load (for headroom, maintenance)
**Cache:** 2× estimated hot keys (for flexibility)
**Bandwidth:** 2× projected peak (for spikes)

**Result:** System can handle 2x projected load without degradation.

---

## Estimated Growth Model

**Assumption:** Linear user growth 5,000 DAU/month
(Typical SaaS: 20-50% MoM growth → we assume conservative 5,000/month)

| Month | DAU | Requests/day | Peak RPS | DB Size | Est. Cost |
|-------|-----|--------------|----------|---------|-----------|
| 0 (Launch) | 100 | 500 | 0.02 | 20 GB | $80 |
| 1 | 5K | 25K | 0.09 | 30 GB | $110 |
| 2 | 10K | 50K | 0.17 | 40 GB | $120 |
| 3 | 15K | 75K | 0.26 | 50 GB | $200 |
| 4 | 20K | 100K | 0.35 | 60 GB | $220 |
| 5 | 25K | 125K | 0.43 | 70 GB | $250 |
| 6 | 30K | 150K | 0.52 | 80 GB | $334 |
| 9 | 45K | 225K | 0.78 | 120 GB | $400 |
| 12 | 60K | 300K | 1.0 | 160 GB | $547 |

---

## Risk Mitigation

**What could break scaling:**
1. Database becomes bottleneck → Add read replicas or shard
2. Cache miss rate high → Increase Redis memory or extend TTLs
3. LLM API slow → Add request batching or fallback to faster model
4. Unexpected traffic spike → Auto-scaling rules (horizontal + vertical)

**Mitigation strategies:**
- Monitor metrics hourly first month
- Auto-scale API servers when CPU > 70%
- Monitor DB connections and add replicas at 30+ connections
- Alert on cache hit rate < 50% (indicates undersizing)

---

## Summary

RealtyPals can scale from 100 to 60,000 DAU/month with:
- Minimal infrastructure ($80 → $547/month)
- Gradual scaling (no big bang investments)
- 2x headroom at each level
- Proven scaling path

**Recommendation:** Launch with current plan. Reassess at Month 3 and Month 6 based on actual usage patterns.
