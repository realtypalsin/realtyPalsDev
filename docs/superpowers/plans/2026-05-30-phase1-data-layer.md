# Phase 1: Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed all 7 Sector 150 Noida projects into PostgreSQL (Supabase) via Prisma, with a Google Places enrichment pipeline to fill null coordinates and distances.

**Architecture:** Static seed data in `prisma/data/seed-data.ts` → seed script `prisma/seed.ts` inserts builders, projects, unit types, amenities, and connectivity. Enrichment script `scripts/enrich.ts` runs Google Geocoding + Places Nearby to fill null coordinates and distances, tagging results with `data_source = 'google'`.

**Tech Stack:** Prisma 5, Supabase PostgreSQL, tsx (TypeScript runner), Google Maps API (Geocoding + Distance Matrix + Places Nearby), Node.js

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `.env.local` | Create | Supabase connection strings + API keys |
| `lib/db/prisma.ts` | Create | Prisma client singleton (Next.js safe) |
| `prisma/schema.prisma` | Already exists | Full schema — verify then push |
| `prisma/data/seed-data.ts` | Create | All 7 projects as static TypeScript objects |
| `prisma/seed.ts` | Create | Reads seed-data.ts, upserts all records |
| `scripts/enrich.ts` | Create | Google Places enrichment pipeline |
| `scripts/verify-seed.ts` | Create | Prints summary of seeded data |

---

## Task 1: Environment Setup

**Files:**
- Create: `.env.local`

- [ ] **Step 1.1: Create Supabase project**

Go to https://supabase.com/dashboard → New Project → name it `realtypals` → pick region `Southeast Asia (Singapore)` → set a database password → wait ~2 min for provisioning.

- [ ] **Step 1.2: Get connection strings**

In Supabase dashboard → Settings → Database → Connection string tab.

Copy:
- **Transaction pooler** (port 6543) → use for `DATABASE_URL`
- **Session pooler** (port 5432) → use for `DIRECT_URL`

Both will look like: `postgresql://postgres.XXXX:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:PORT/postgres`

- [ ] **Step 1.3: Create `.env.local`**

```bash
# .env.local (never commit — already in .gitignore)
DATABASE_URL="postgresql://postgres.XXXX:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.XXXX:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://XXXX.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

GROQ_API_KEY="gsk_..."
COHERE_API_KEY="..."
GOOGLE_MAPS_API_KEY="..."
SERPER_API_KEY="..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="RealtyPals"
```

- [ ] **Step 1.4: Install dependencies**

```bash
npm install
```

Expected: no errors, `node_modules/` populated.

- [ ] **Step 1.5: Generate Prisma client**

```bash
npm run db:generate
```

Expected output:
```
✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client
```

- [ ] **Step 1.6: Push schema to Supabase**

```bash
npm run db:push
```

Expected output:
```
🚀  Your database is now in sync with your Prisma schema.
```

If prompted "Are you sure you want to reset your database?" → yes (it's a fresh DB).

- [ ] **Step 1.7: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "feat: push Prisma schema to Supabase"
```

---

## Task 2: Prisma Client Singleton

**Files:**
- Create: `lib/db/prisma.ts`

- [ ] **Step 2.1: Create singleton**

```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2.2: Verify connection**

```bash
npx tsx -e "import('./lib/db/prisma.ts').then(m => m.prisma.\$queryRaw\`SELECT 1\`.then(r => { console.log('DB connected:', r); process.exit(0); }))"
```

Expected:
```
DB connected: [ { '?column?': 1n } ]
```

- [ ] **Step 2.3: Commit**

```bash
git add lib/db/prisma.ts
git commit -m "feat: add Prisma client singleton"
```

---

## Task 3: Seed Data File

**Files:**
- Create: `prisma/data/seed-data.ts`

This file contains all 7 projects as typed static objects. The seed script reads from here — no logic, just data.

- [ ] **Step 3.1: Create seed data file**

```typescript
// prisma/data/seed-data.ts
// Static brochure-extracted data for all 7 Sector 150 projects.

export const BUILDERS = [
  {
    name: 'ACE Group',
    slug: 'ace-group',
    tagline: 'Fulfilling ACEpirations',
    parent_group: null,
    founded_year: null,
    headquarters: 'Noida',
    website: null,
    credai_member: true,
    delivered_units: 5000,
    delivered_projects: ['ACE Platinum', 'ACE Aspire', 'ACE City', 'ACE Golfshire', 'ACE Studio', 'City Square'],
    ongoing_projects: ['ACE Parkway', 'ACE Divino'],
    awards: [],
    awards_count: null,
    description: 'Premium real estate developer delivering 5000+ units across Noida.',
  },
  {
    name: 'ATS Infrastructure Ltd',
    slug: 'ats-infrastructure',
    tagline: null,
    parent_group: 'ATS Group',
    founded_year: null,
    headquarters: 'Noida, Uttar Pradesh',
    website: 'https://www.atsgreens.com',
    credai_member: true,
    delivered_units: null,
    delivered_projects: [],
    ongoing_projects: ['ATS Pristine', 'ATS Kingston Heath'],
    awards: ['Builder Of The Year', 'Developer Of The Year'],
    awards_count: null,
    description: 'Premium real estate developer focused on residential developments across North India.',
  },
  {
    name: 'HomeKraft',
    slug: 'homekraft',
    tagline: null,
    parent_group: 'ATS Group',
    founded_year: null,
    headquarters: 'Noida, Uttar Pradesh',
    website: 'https://www.homekraft.in',
    credai_member: null,
    delivered_units: null,
    delivered_projects: [],
    ongoing_projects: ['ATS Pious Hideaways'],
    awards: [],
    awards_count: null,
    description: 'Aspirational housing venture of ATS Group. 20+ completed projects.',
  },
  {
    name: 'Godrej Properties',
    slug: 'godrej-properties',
    tagline: null,
    parent_group: 'Godrej Group',
    founded_year: 1897,
    headquarters: 'Mumbai',
    website: 'https://www.godrejproperties.com',
    credai_member: null,
    delivered_units: null,
    delivered_projects: [],
    ongoing_projects: ['Godrej Palm Retreat'],
    awards: ['Builder Of The Year', 'Most Trusted Brand', 'India Top Builders', 'Real Estate Company Of The Year'],
    awards_count: 200,
    description: 'Real estate arm of the Godrej Group with a 124+ year legacy.',
  },
  {
    name: 'Eldeco',
    slug: 'eldeco',
    tagline: null,
    parent_group: 'Eldeco Infrastructure & Properties Ltd / Lotus Greens',
    founded_year: null,
    headquarters: 'Noida',
    website: null,
    credai_member: null,
    delivered_units: null,
    delivered_projects: [],
    ongoing_projects: ['Eldeco Live By The Greens'],
    awards: [],
    awards_count: null,
    description: 'Joint venture between Eldeco Infrastructure and Lotus Greens. 175+ projects across 15 cities.',
  },
  {
    name: 'Prateek Group',
    slug: 'prateek-group',
    tagline: null,
    parent_group: null,
    founded_year: null,
    headquarters: 'Noida',
    website: null,
    credai_member: null,
    delivered_units: null,
    delivered_projects: [],
    ongoing_projects: ['Prateek Canary'],
    awards: [],
    awards_count: null,
    description: 'Luxury residential developer with projects in Noida.',
  },
]

export const PROJECTS = [
  // ─────────────────────────────────────────────────────────────────────
  // 1. ACE PARKWAY
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'ace-parkway-sector-150-noida',
    name: 'ACE Parkway',
    tagline: 'A Work of Art for Exquisite Living',
    builder_slug: 'ace-group',
    rera_number: 'UPRERAPRJ4514',
    rera_url: 'https://www.up-rera.in',
    city: 'Noida',
    sector: 'Sector 150',
    address: 'Sector 150 Sports City, Noida, Uttar Pradesh',
    lat: null,
    lng: null,
    land_area_acres: 11,
    total_units: 970,
    total_towers: 11,
    status: 'under_construction' as const,
    possession_date: null,
    possession_label: 'Verify with builder',
    description: 'Luxury residential development in Sector 150 Noida with Art Deco inspired architecture.',
    long_description: 'Luxury residential development in Sector 150 Noida with Art Deco inspired architecture, sports facilities and low-density planning. Designed by Hafeez Contractor with Gauri Khan interiors.',
    design_theme: 'Art Deco',
    architect: 'Hafeez Contractor',
    interior_designer: 'Gauri Khan',
    marketing_claims: ['Art Deco Design', 'Luxury Living', 'Low Density', 'Sports City', 'Vastu Compliant', 'Pollution Free Living', '42 Acre Green Belt', 'Three Side Open Plot', 'Golf Course Proximity', '51 Sports Facilities'],
    ai_search_keywords: ['ace parkway', 'sector 150', 'luxury apartments', 'noida', 'golf course', '4 bhk', 'sports city', 'clubhouse', 'swimming pool', 'cricket pitch', 'hafeez contractor', 'gauri khan', 'low density', 'rera approved'],
    hero_image_url: '/images/properties/aceParkway.avif',
    unit_types: [
      { name: 'Type D (2BHK)', bhk: 2, super_area_sqft: 1085, carpet_area_sqft: 700, balcony_area_sqft: 95, bathrooms: 2, utility_room: false, dress_area: false, towers: ['1', '3'], price_min_cr: 1.52, price_max_cr: 1.52, price_label: '₹1.52 Cr (est.)', price_is_estimated: true },
      { name: 'Type D2 (3BHK)', bhk: 3, super_area_sqft: 1395, carpet_area_sqft: 882, balcony_area_sqft: 142, bathrooms: 2, utility_room: false, dress_area: false, towers: ['2'], price_min_cr: 1.95, price_max_cr: 1.95, price_label: '₹1.95 Cr (est.)', price_is_estimated: true },
      { name: 'Type C (3BHK)', bhk: 3, super_area_sqft: 1750, carpet_area_sqft: 1159, balcony_area_sqft: 165, bathrooms: 3, utility_room: false, dress_area: true, towers: ['9', '10', '11'], price_min_cr: 2.40, price_max_cr: 2.40, price_label: '₹2.40 Cr (est.)', price_is_estimated: true },
      { name: 'Type B (3BHK)', bhk: 3, super_area_sqft: 2190, carpet_area_sqft: 1355, balcony_area_sqft: 289, bathrooms: 4, utility_room: true, dress_area: true, towers: ['4', '5', '6'], price_min_cr: 3.02, price_max_cr: 3.44, price_label: '₹3.02–3.44 Cr (est.)', price_is_estimated: true },
      { name: 'Type A2 (3BHK)', bhk: 3, super_area_sqft: 2460, carpet_area_sqft: 1505, balcony_area_sqft: 292, bathrooms: 4, utility_room: true, dress_area: true, towers: ['8'], price_min_cr: 3.30, price_max_cr: 3.44, price_label: '₹3.30–3.44 Cr (est.)', price_is_estimated: true },
      { name: 'Type A1 (4BHK)', bhk: 4, super_area_sqft: 3220, carpet_area_sqft: 1995, balcony_area_sqft: 360, bathrooms: 5, utility_room: true, dress_area: true, towers: ['7'], price_min_cr: 4.82, price_max_cr: 4.82, price_label: '₹4.82 Cr (est.)', price_is_estimated: true },
    ],
    amenities: [
      { name: 'Cricket Practice Pitch', category: 'sports' as const },
      { name: 'Tennis Court', category: 'sports' as const },
      { name: 'Basketball Court', category: 'sports' as const },
      { name: 'Volleyball Court', category: 'sports' as const },
      { name: 'Badminton Court', category: 'sports' as const },
      { name: 'Skating Rink', category: 'sports' as const },
      { name: 'Outdoor Gym', category: 'sports' as const },
      { name: 'Soccer Ground', category: 'sports' as const },
      { name: 'Jogging Trail', category: 'sports' as const },
      { name: 'Clubhouse', category: 'lifestyle' as const },
      { name: 'Swimming Pool', category: 'lifestyle' as const },
      { name: 'Kids Pool', category: 'lifestyle' as const },
      { name: 'Celebration Lawn', category: 'lifestyle' as const },
      { name: 'Amphitheatre', category: 'lifestyle' as const },
      { name: 'Meditation Garden', category: 'wellness' as const },
      { name: 'Yoga Garden', category: 'wellness' as const },
      { name: 'Reflexology Park', category: 'wellness' as const },
      { name: 'Kids Play Area', category: 'kids' as const },
      { name: 'Trampoline', category: 'kids' as const },
    ],
    connectivity: [
      { type: 'metro' as const, name: 'Sector 148 Metro Station', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Yamuna Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'DND Flyway', distance_km: null, data_source: 'brochure' as const },
      { type: 'landmark' as const, name: 'Jaypee Golf Course', distance_km: null, data_source: 'brochure' as const },
      { type: 'landmark' as const, name: 'Shaheed Bhagat Singh Park', distance_km: null, data_source: 'brochure' as const },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. ATS PRISTINE
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'ats-pristine-sector-150-noida',
    name: 'ATS Pristine',
    tagline: 'An Invitation To Reconnect With Nature',
    builder_slug: 'ats-infrastructure',
    rera_number: null,
    rera_url: null,
    city: 'Noida',
    sector: 'Sector 150',
    address: 'Sector 150, Noida Expressway, Noida, Uttar Pradesh',
    lat: null,
    lng: null,
    land_area_acres: 18,
    total_units: 728,
    total_towers: 9,
    status: 'under_construction' as const,
    possession_date: null,
    possession_label: 'Verify with builder',
    description: 'Low-density residential development in Sector 150 Noida.',
    long_description: 'Luxury low-density residential township on 18 acres, surrounded by landscaped greens, recreational facilities and nature-inspired living. 9 towers, 29 floors.',
    design_theme: null,
    architect: null,
    interior_designer: null,
    marketing_claims: ['Low Density Development', 'Nature Inspired Living', '18 Acres Of Greenery', 'Spacious Residences', 'Premium Clubhouse', 'Luxury Lifestyle', 'Sports Facilities', 'Reconnect With Nature'],
    ai_search_keywords: ['ats pristine', 'sector 150', 'noida', 'luxury apartments', 'low density', '18 acre township', '3 bhk', '4 bhk', 'clubhouse', 'swimming pool', 'sports city'],
    hero_image_url: '/images/properties/atsPristine.jpg',
    unit_types: [
      { name: 'Plan C (3BHK)', bhk: 3, super_area_sqft: 1750, carpet_area_sqft: 1202, balcony_area_sqft: null, bathrooms: 3, utility_room: true, dress_area: true, towers: [], price_min_cr: 2.71, price_max_cr: 2.71, price_label: '₹2.71 Cr (est.)', price_is_estimated: true },
      { name: 'Plan B (3BHK)', bhk: 3, super_area_sqft: 2300, carpet_area_sqft: null, balcony_area_sqft: null, bathrooms: 3, utility_room: true, dress_area: true, towers: [], price_min_cr: 3.17, price_max_cr: 3.57, price_label: '₹3.17–3.57 Cr (est.)', price_is_estimated: true },
      { name: 'Plan A (4BHK)', bhk: 4, super_area_sqft: 3200, carpet_area_sqft: null, balcony_area_sqft: null, bathrooms: 4, utility_room: true, dress_area: true, towers: [], price_min_cr: 4.80, price_max_cr: 5.12, price_label: '₹4.80–5.12 Cr (est.)', price_is_estimated: true },
      { name: '5BHK', bhk: 5, super_area_sqft: null, carpet_area_sqft: null, balcony_area_sqft: null, bathrooms: null, utility_room: false, dress_area: false, towers: [], price_min_cr: 5.60, price_max_cr: 5.60, price_label: '₹5.60 Cr (est.)', price_is_estimated: true },
    ],
    amenities: [
      { name: 'Swimming Pool', category: 'lifestyle' as const },
      { name: 'Clubhouse', category: 'lifestyle' as const },
      { name: 'Gymnasium', category: 'sports' as const },
      { name: 'Squash Court', category: 'sports' as const },
      { name: 'Billiards Room', category: 'lifestyle' as const },
      { name: 'Lawn Tennis Court', category: 'sports' as const },
      { name: 'Basketball Court', category: 'sports' as const },
      { name: 'Jogging Track', category: 'sports' as const },
      { name: 'Amphitheatre', category: 'lifestyle' as const },
      { name: 'Yoga Room', category: 'wellness' as const },
      { name: 'Landscaped Gardens', category: 'wellness' as const },
      { name: 'Nature Trails', category: 'wellness' as const },
      { name: 'Kids Play Area', category: 'kids' as const },
    ],
    connectivity: [
      { type: 'metro' as const, name: 'Sector 148 Metro Station', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Noida Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Yamuna Expressway', distance_km: null, data_source: 'brochure' as const },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. ATS PIOUS HIDEAWAYS
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'ats-pious-hideaways-sector-150-noida',
    name: 'ATS Pious Hideaways',
    tagline: "It's not a home, it's a hideaway",
    builder_slug: 'homekraft',
    rera_number: 'UPRERAPRJ442430',
    rera_url: 'https://www.up-rera.in',
    city: 'Noida',
    sector: 'Sector 150',
    address: 'Plot No. SC-02/J&K, Sector 150, Noida, Uttar Pradesh',
    lat: null,
    lng: null,
    land_area_acres: null,
    total_units: null,
    total_towers: 12,
    status: 'under_construction' as const,
    possession_date: null,
    possession_label: 'Verify with builder',
    description: 'Spanish themed premium residential apartments in Sector 150 Noida.',
    long_description: 'Premium residential development featuring Royal Spanish architecture, 12 residential towers, 80% open spaces, central greens, clubhouse, sports facilities and low-density living.',
    design_theme: 'Royal Spanish Architecture',
    architect: 'Hafeez Contractor',
    interior_designer: null,
    marketing_claims: ['Greenest Sector Of Noida', 'Low Density Living', 'Royal Spanish Architecture', '80 Percent Open Area', 'Every Apartment Faces Greens', 'Meditation Inspired Living', 'Central Greens'],
    ai_search_keywords: ['ats pious hideaways', 'homekraft', 'sector 150 noida', 'spanish architecture', 'hafeez contractor', '3 bhk apartments', 'low density apartments', '80 percent open area', 'meditation centre', 'sector 148 metro'],
    hero_image_url: '/images/properties/atsPious.jpg',
    unit_types: [
      { name: 'Type E (3BHK)', bhk: 3, super_area_sqft: 1400, carpet_area_sqft: 870, balcony_area_sqft: null, bathrooms: 2, utility_room: false, dress_area: false, towers: [], price_min_cr: 2.10, price_max_cr: 2.10, price_label: '₹2.10 Cr (est.)', price_is_estimated: true },
      { name: 'Type D (3BHK)', bhk: 3, super_area_sqft: 1615, carpet_area_sqft: 975, balcony_area_sqft: null, bathrooms: 3, utility_room: false, dress_area: false, towers: [], price_min_cr: 2.23, price_max_cr: 2.23, price_label: '₹2.23 Cr (est.)', price_is_estimated: true },
      { name: 'Type C (3BHK)', bhk: 3, super_area_sqft: 1675, carpet_area_sqft: 1020, balcony_area_sqft: null, bathrooms: 3, utility_room: false, dress_area: false, towers: [], price_min_cr: 2.31, price_max_cr: 2.51, price_label: '₹2.31–2.51 Cr (est.)', price_is_estimated: true },
    ],
    amenities: [
      { name: 'Basketball Court', category: 'sports' as const },
      { name: 'Tennis Court', category: 'sports' as const },
      { name: 'Squash Court', category: 'sports' as const },
      { name: 'Gymnasium', category: 'sports' as const },
      { name: 'Jogging Track', category: 'sports' as const },
      { name: 'Clubhouse', category: 'lifestyle' as const },
      { name: 'Swimming Pool', category: 'lifestyle' as const },
      { name: 'Multipurpose Hall', category: 'lifestyle' as const },
      { name: 'Pious Centre', category: 'wellness' as const },
      { name: 'Meditation Area', category: 'wellness' as const },
      { name: 'Open Greens', category: 'wellness' as const },
      { name: 'Kids Play Area', category: 'kids' as const },
      { name: 'Play Tunnel', category: 'kids' as const },
    ],
    connectivity: [
      { type: 'metro' as const, name: 'Sector 148 Metro Station', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Noida Greater Noida Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Yamuna Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'school' as const, name: 'DPS Noida', distance_km: null, data_source: 'brochure' as const },
      { type: 'school' as const, name: 'Lotus Valley School', distance_km: null, data_source: 'brochure' as const },
      { type: 'hospital' as const, name: 'Yatharth Hospital', distance_km: null, data_source: 'brochure' as const },
      { type: 'hospital' as const, name: 'Kailash Hospital', distance_km: null, data_source: 'brochure' as const },
      { type: 'mall' as const, name: 'Mall Of India', distance_km: null, data_source: 'brochure' as const },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 4. ATS KINGSTON HEATH
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'ats-kingston-heath-sector-150-noida',
    name: 'ATS Kingston Heath',
    tagline: 'Where Wellness Resides',
    builder_slug: 'ats-infrastructure',
    rera_number: 'UPRERAPRJ694037',
    rera_url: 'https://www.up-rera.in',
    city: 'Noida',
    sector: 'Sector 150',
    address: 'Sector 150, Noida, Uttar Pradesh',
    lat: null,
    lng: null,
    land_area_acres: 30,
    total_units: null,
    total_towers: 9,
    status: 'under_construction' as const,
    possession_date: null,
    possession_label: 'Verify with builder',
    description: "NCR's first wellness homes in Sector 150 Noida.",
    long_description: 'Biophilic wellness residences spread across 30 acres featuring golf views, wellness gardens, organic farming zones, sports infrastructure and luxury lifestyle amenities.',
    design_theme: 'Biophilic Wellness',
    architect: null,
    interior_designer: null,
    marketing_claims: ["NCR First Wellness Homes", 'Biophilic Wellness Haven', 'Where Wellness Resides', '30 Acre Greens', 'Golf Course Views', '80 Percent Open Green Spaces', 'Organic Farming', 'Nature Inspired Living', 'Air Purifying Landscape'],
    ai_search_keywords: ['ats kingston heath', 'sector 150 noida', 'wellness homes', 'biophilic homes', 'golf course view', '3 bhk study', '4 bhk luxury', 'organic farming', 'meditation garden', 'reflexology garden'],
    hero_image_url: '/images/properties/atsKingston.jpg',
    unit_types: [
      { name: '3 Bed + Study', bhk: 3, super_area_sqft: 2350, carpet_area_sqft: 1519, balcony_area_sqft: null, bathrooms: 4, utility_room: true, dress_area: false, towers: ['T1','T2','T3','T4','T5','T6','T7','T8','T9'], price_min_cr: 4.23, price_max_cr: 4.23, price_label: '₹4.23 Cr (est.)', price_is_estimated: true },
      { name: '4 Bed', bhk: 4, super_area_sqft: 3300, carpet_area_sqft: 2251, balcony_area_sqft: null, bathrooms: 4, utility_room: true, dress_area: false, towers: ['T1','T2','T3','T4','T5','T6','T7','T8','T9'], price_min_cr: 5.94, price_max_cr: 5.94, price_label: '₹5.94 Cr (est.)', price_is_estimated: true },
    ],
    amenities: [
      { name: '9 Hole Golf Course', category: 'sports' as const },
      { name: 'Basketball Court', category: 'sports' as const },
      { name: 'Tennis Court', category: 'sports' as const },
      { name: 'Cricket Pitch', category: 'sports' as const },
      { name: 'Jogging Track', category: 'sports' as const },
      { name: 'Swimming Pool', category: 'lifestyle' as const },
      { name: 'Clubhouse', category: 'lifestyle' as const },
      { name: 'Celebration Lawn', category: 'lifestyle' as const },
      { name: 'Amphitheatre', category: 'lifestyle' as const },
      { name: 'Outdoor Kitchen', category: 'lifestyle' as const },
      { name: 'Yoga Garden', category: 'wellness' as const },
      { name: 'Meditation Garden', category: 'wellness' as const },
      { name: 'Organic Farming Zone', category: 'wellness' as const },
      { name: 'Reflexology Garden', category: 'wellness' as const },
      { name: 'Herb Garden', category: 'wellness' as const },
      { name: 'Kids Play Area', category: 'kids' as const },
      { name: 'Kids Plaza', category: 'kids' as const },
    ],
    connectivity: [
      { type: 'metro' as const, name: 'Sector 148 Metro Station', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Noida Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Yamuna Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'airport' as const, name: 'Jewar Airport', distance_km: null, data_source: 'brochure' as const },
      { type: 'school' as const, name: 'Genesis Global School', distance_km: null, data_source: 'brochure' as const },
      { type: 'school' as const, name: 'Shiv Nadar School', distance_km: null, data_source: 'brochure' as const },
      { type: 'hospital' as const, name: 'Kailash Hospital', distance_km: null, data_source: 'brochure' as const },
      { type: 'hospital' as const, name: 'Yatharth Hospital', distance_km: null, data_source: 'brochure' as const },
      { type: 'mall' as const, name: 'Mall Of India', distance_km: null, data_source: 'brochure' as const },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. ELDECO LIVE BY THE GREENS
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'eldeco-live-by-the-greens-sector-150-noida',
    name: 'Eldeco Live By The Greens',
    tagline: 'Come, Live More',
    builder_slug: 'eldeco',
    rera_number: 'UPRERAPRJ315072',
    rera_url: 'https://www.up-rera.in',
    city: 'Noida',
    sector: 'Sector 150',
    address: 'Sports City, Sector 150, Noida, Uttar Pradesh',
    lat: null,
    lng: null,
    land_area_acres: 20,
    total_units: null,
    total_towers: 11,
    status: 'under_construction' as const,
    possession_date: null,
    possession_label: 'Verify with builder',
    description: '2 & 3 BHK apartments in Sports City Sector 150 Noida.',
    long_description: 'Nature-focused residential township on 20 acres offering 2 and 3 BHK apartments with cricket academy, river views and large green spaces. 11 towers (Life 1-4, Verve 1-7).',
    design_theme: null,
    architect: null,
    interior_designer: null,
    marketing_claims: ['Live More', 'Low Density Living', 'Sports City', 'Celebrity Cricket Academy', 'River Views', 'Golf Course Views', '80 Percent Green Cover', 'Healthy Living', 'Family Friendly Living'],
    ai_search_keywords: ['eldeco live by the greens', 'sector 150 noida', 'sports city', '2 bhk', '3 bhk', 'cricket academy', 'river view apartments', 'clubhouse', 'swimming pool', 'kids pool', 'low density', 'jewar airport'],
    hero_image_url: '/images/properties/eldecoByTheGreens.webp',
    unit_types: [
      { name: 'Type A1 (2BHK)', bhk: 2, super_area_sqft: 1137, carpet_area_sqft: 668, balcony_area_sqft: 139, bathrooms: 2, utility_room: false, dress_area: false, towers: ['Life 1','Life 2','Life 3','Life 4'], price_min_cr: 1.53, price_max_cr: 1.53, price_label: '₹1.53 Cr (est.)', price_is_estimated: true },
      { name: 'Type A2 (2BHK)', bhk: 2, super_area_sqft: 1155, carpet_area_sqft: 676, balcony_area_sqft: 140, bathrooms: 2, utility_room: false, dress_area: false, towers: ['Life 1','Life 2','Life 3','Life 4'], price_min_cr: 1.56, price_max_cr: 1.56, price_label: '₹1.56 Cr (est.)', price_is_estimated: true },
      { name: 'Type B (3BHK)', bhk: 3, super_area_sqft: 1404, carpet_area_sqft: 828, balcony_area_sqft: 166, bathrooms: 2, utility_room: false, dress_area: false, towers: ['Verve 1','Verve 2','Verve 3','Verve 4','Verve 5','Verve 6','Verve 7'], price_min_cr: 1.89, price_max_cr: 1.91, price_label: '₹1.89–1.91 Cr (est.)', price_is_estimated: true },
    ],
    amenities: [
      { name: 'Cricket Academy', category: 'sports' as const },
      { name: 'Lawn Tennis Court', category: 'sports' as const },
      { name: 'Badminton Courts', category: 'sports' as const },
      { name: 'Basketball Court', category: 'sports' as const },
      { name: 'Jogging Track', category: 'sports' as const },
      { name: 'Skating Rink', category: 'sports' as const },
      { name: 'Zumba Hall', category: 'sports' as const },
      { name: 'Yoga Area', category: 'wellness' as const },
      { name: 'Meditation Area', category: 'wellness' as const },
      { name: 'Clubhouse', category: 'lifestyle' as const },
      { name: 'Swimming Pool', category: 'lifestyle' as const },
      { name: 'Kids Pool', category: 'lifestyle' as const },
      { name: 'Mini Theatre', category: 'lifestyle' as const },
      { name: 'Party Lawn', category: 'lifestyle' as const },
      { name: 'Kids Play Area', category: 'kids' as const },
      { name: 'Rock Climbing Wall', category: 'kids' as const },
    ],
    connectivity: [
      { type: 'metro' as const, name: 'Sector 148 Metro Station', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Noida Greater Noida Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Yamuna Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'airport' as const, name: 'Jewar International Airport', distance_km: null, data_source: 'brochure' as const },
      { type: 'school' as const, name: 'DPS Noida', distance_km: null, data_source: 'brochure' as const },
      { type: 'school' as const, name: 'Lotus Valley School', distance_km: null, data_source: 'brochure' as const },
      { type: 'hospital' as const, name: 'Jaypee Hospital', distance_km: null, data_source: 'brochure' as const },
      { type: 'hospital' as const, name: 'Fortis Hospital', distance_km: null, data_source: 'brochure' as const },
      { type: 'mall' as const, name: 'Mall Of India', distance_km: null, data_source: 'brochure' as const },
      { type: 'landmark' as const, name: 'Buddh International Circuit', distance_km: null, data_source: 'brochure' as const },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 6. GODREJ PALM RETREAT
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'godrej-palm-retreat-sector-150-noida',
    name: 'Godrej Palm Retreat',
    tagline: '#Bliss',
    builder_slug: 'godrej-properties',
    rera_number: 'UPRERAPRJ745601',
    rera_url: 'https://www.up-rera.in',
    city: 'Noida',
    sector: 'Sector 150',
    address: 'Sector 150, Noida, Uttar Pradesh',
    lat: null,
    lng: null,
    land_area_acres: null,
    total_units: null,
    total_towers: 5,
    status: 'under_construction' as const,
    possession_date: null,
    possession_label: 'Verify with builder',
    description: 'Luxury low-rise resort themed residences in Sector 150 Noida.',
    long_description: 'Luxury resort-style residential development featuring low-rise low-density homes, 20,000 sqm green spaces, rooftop amenities, clubhouse, tropical landscaping and sports facilities.',
    design_theme: 'Resort Style Low Rise Development',
    architect: null,
    interior_designer: null,
    marketing_claims: ['Greenest Sector Of Noida', 'Resort Style Living', 'Low Rise Development', 'Low Density Living', 'Sky Gardens', 'Rooftop Amenities', 'Consciously Crafted', 'Tropical Lifestyle', 'Nature Inspired Living'],
    ai_search_keywords: ['godrej palm retreat', 'sector 150 noida', 'luxury apartments', 'resort style homes', 'low rise apartments', 'sky gardens', 'clubhouse', 'swimming pool', 'floating restaurant', 'golf course', 'cricket academy', 'sector 148 metro'],
    hero_image_url: '/images/properties/godrejPalm.avif',
    unit_types: [
      { name: '2BHK', bhk: 2, super_area_sqft: 894, carpet_area_sqft: 895, balcony_area_sqft: null, bathrooms: null, utility_room: false, dress_area: false, towers: ['C1','C2','C3','C4','C5'], price_min_cr: 1.34, price_max_cr: 2.12, price_label: '₹1.34–2.12 Cr (est.)', price_is_estimated: true },
      { name: '3BHK', bhk: 3, super_area_sqft: 1383, carpet_area_sqft: 1383, balcony_area_sqft: null, bathrooms: null, utility_room: false, dress_area: false, towers: ['C1','C2','C3','C4','C5'], price_min_cr: 2.07, price_max_cr: 3.34, price_label: '₹2.07–3.34 Cr (est.)', price_is_estimated: true },
      { name: '3BHK + Utility', bhk: 3, super_area_sqft: 1741, carpet_area_sqft: 1741, balcony_area_sqft: null, bathrooms: null, utility_room: true, dress_area: false, towers: ['C1','C2','C3','C4','C5'], price_min_cr: 2.60, price_max_cr: 2.60, price_label: '₹2.60 Cr (est.)', price_is_estimated: true },
      { name: '4BHK + Utility', bhk: 4, super_area_sqft: 2293, carpet_area_sqft: 2293, balcony_area_sqft: null, bathrooms: null, utility_room: true, dress_area: false, towers: ['C1','C2','C3','C4','C5'], price_min_cr: 3.44, price_max_cr: 4.21, price_label: '₹3.44–4.21 Cr (est.)', price_is_estimated: true },
    ],
    amenities: [
      { name: 'Tennis Court', category: 'sports' as const },
      { name: 'Badminton Court', category: 'sports' as const },
      { name: 'International Cricket Academy', category: 'sports' as const },
      { name: 'Golf Course', category: 'sports' as const },
      { name: 'Gym', category: 'sports' as const },
      { name: 'Jogging Track', category: 'sports' as const },
      { name: 'Swimming Pool', category: 'lifestyle' as const },
      { name: 'Sunken Clubhouse', category: 'lifestyle' as const },
      { name: 'Floating Restaurant', category: 'lifestyle' as const },
      { name: 'Mini Theatre', category: 'lifestyle' as const },
      { name: 'Banquet Hall', category: 'lifestyle' as const },
      { name: 'Sky Gardens', category: 'lifestyle' as const },
      { name: 'Poolside Cabanas', category: 'lifestyle' as const },
      { name: 'Meditation Arena', category: 'wellness' as const },
      { name: 'Reflexology Garden', category: 'wellness' as const },
      { name: 'Butterfly Garden', category: 'wellness' as const },
      { name: 'Fragrance Garden', category: 'wellness' as const },
      { name: 'Kids Play Area', category: 'kids' as const },
    ],
    connectivity: [
      { type: 'metro' as const, name: 'Sector 148 Metro Station', distance_km: 2.1, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Noida Greater Noida Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Yamuna Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'airport' as const, name: 'Noida International Airport', distance_km: null, data_source: 'brochure' as const },
      { type: 'airport' as const, name: 'IGI Airport', distance_km: null, data_source: 'brochure' as const },
      { type: 'school' as const, name: 'Lotus Valley', distance_km: null, data_source: 'brochure' as const },
      { type: 'school' as const, name: 'DPS', distance_km: null, data_source: 'brochure' as const },
      { type: 'hospital' as const, name: 'Fortis', distance_km: null, data_source: 'brochure' as const },
      { type: 'hospital' as const, name: 'Apollo', distance_km: null, data_source: 'brochure' as const },
      { type: 'mall' as const, name: 'Mall Of India', distance_km: null, data_source: 'brochure' as const },
      { type: 'landmark' as const, name: 'World Trade Center', distance_km: null, data_source: 'brochure' as const },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 7. PRATEEK CANARY
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'prateek-canary-sector-150-noida',
    name: 'Prateek Canary',
    tagline: 'A world where life sings with joy',
    builder_slug: 'prateek-group',
    rera_number: null,
    rera_url: null,
    city: 'Noida',
    sector: 'Sector 150',
    address: 'Sector 150, Noida, Uttar Pradesh',
    lat: null,
    lng: null,
    land_area_acres: 12.5,
    total_units: 664,
    total_towers: 8,
    status: 'under_construction' as const,
    possession_date: null,
    possession_label: 'Verify with builder',
    description: 'Luxury golf-facing residences and duplex penthouses in Sector 150 Noida.',
    long_description: 'Golf-facing luxury residences on 12.5 acres with duplex penthouses, double-decker clubhouse, private decks, and 664 units across 8 towers (27-29 floors each).',
    design_theme: null,
    architect: null,
    interior_designer: null,
    marketing_claims: ['Luxury', 'Golf Facing', 'Sector 150', 'Private Deck', 'Forest Retreat', 'Sports Zone', 'Double Decker Clubhouse', 'Duplex Penthouse', 'Low Density', 'Premium Residences'],
    ai_search_keywords: ['prateek canary', 'sector 150 noida', 'luxury apartments', 'golf facing', 'duplex penthouse', '3 bhk', '4 bhk', 'double decker clubhouse', 'private deck', 'sports zone'],
    hero_image_url: '/images/properties/prateekCanary.avif',
    unit_types: [
      { name: '3 BHK Elite', bhk: 3, super_area_sqft: 1700, carpet_area_sqft: 1139, balcony_area_sqft: 241, bathrooms: 3, utility_room: false, dress_area: false, towers: ['A','B','C'], price_min_cr: 2.89, price_max_cr: 2.89, price_label: '₹2.89 Cr (est.)', price_is_estimated: true },
      { name: '3 BHK Deluxe', bhk: 3, super_area_sqft: 2040, carpet_area_sqft: 1346, balcony_area_sqft: 290, bathrooms: 4, utility_room: false, dress_area: false, towers: ['A','B','C'], price_min_cr: 3.46, price_max_cr: 3.46, price_label: '₹3.46 Cr (est.)', price_is_estimated: true },
      { name: '3 BHK Luxury', bhk: 3, super_area_sqft: 2555, carpet_area_sqft: 1619, balcony_area_sqft: 439, bathrooms: 4, utility_room: false, dress_area: false, towers: ['D','E','H'], price_min_cr: 4.34, price_max_cr: 5.62, price_label: '₹4.34–5.62 Cr (est.)', price_is_estimated: true },
      { name: '4 BHK Luxury', bhk: 4, super_area_sqft: 3355, carpet_area_sqft: 2067, balcony_area_sqft: 566, bathrooms: 5, utility_room: false, dress_area: false, towers: ['F','G'], price_min_cr: 7.38, price_max_cr: 7.38, price_label: '₹7.38 Cr (est.)', price_is_estimated: true },
      { name: 'Duplex Penthouse', bhk: 6, super_area_sqft: 6100, carpet_area_sqft: 3752, balcony_area_sqft: 1131, bathrooms: null, utility_room: false, dress_area: false, towers: ['F','G'], price_min_cr: 9.46, price_max_cr: 9.46, price_label: '₹9.46 Cr (est.)', price_is_estimated: true },
    ],
    amenities: [
      { name: 'Half Football Field', category: 'sports' as const },
      { name: 'Basketball Court', category: 'sports' as const },
      { name: 'Tennis Court', category: 'sports' as const },
      { name: 'Cricket Practice Pitch', category: 'sports' as const },
      { name: 'Jogging Track', category: 'sports' as const },
      { name: 'Cycling Track', category: 'sports' as const },
      { name: 'Skating Rink', category: 'sports' as const },
      { name: 'Double Decker Clubhouse', category: 'lifestyle' as const },
      { name: 'Swimming Pool', category: 'lifestyle' as const },
      { name: 'Kids Pool', category: 'lifestyle' as const },
      { name: 'Banquet Hall', category: 'lifestyle' as const },
      { name: 'Poolside Cafe', category: 'lifestyle' as const },
      { name: 'Yoga Lawn', category: 'wellness' as const },
      { name: 'Wellness Garden', category: 'wellness' as const },
      { name: 'Sauna', category: 'wellness' as const },
      { name: 'Spa', category: 'wellness' as const },
      { name: 'Forest Trail', category: 'wellness' as const },
      { name: 'Kids Play Area', category: 'kids' as const },
      { name: 'Nature Kids Play Area', category: 'kids' as const },
      { name: 'Pet Park', category: 'kids' as const },
    ],
    connectivity: [
      { type: 'metro' as const, name: 'Sector 148 Metro Station', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Yamuna Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'road' as const, name: 'Noida Greater Noida Expressway', distance_km: null, data_source: 'brochure' as const },
      { type: 'airport' as const, name: 'Jewar Airport', distance_km: null, data_source: 'brochure' as const },
    ],
  },
]
```

- [ ] **Step 3.2: Verify the file has no TypeScript errors**

```bash
npx tsc --noEmit --skipLibCheck prisma/data/seed-data.ts 2>&1 | head -20
```

Expected: no output (no errors).

- [ ] **Step 3.3: Commit**

```bash
git add prisma/data/seed-data.ts
git commit -m "feat: add complete seed data for 7 Sector 150 projects"
```

---

## Task 4: Seed Script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 4.1: Create seed script**

```typescript
// prisma/seed.ts
import { PrismaClient, ProjectStatus, AmenityCategory, ConnectivityType, DataSource } from '@prisma/client'
import { BUILDERS, PROJECTS } from './data/seed-data'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding RealtyPals database...\n')

  // ── 1. Upsert builders ────────────────────────────────────────────
  console.log('📦 Seeding builders...')
  const builderMap = new Map<string, string>() // slug → id

  for (const b of BUILDERS) {
    const builder = await prisma.builder.upsert({
      where: { slug: b.slug },
      update: { ...b },
      create: { ...b },
    })
    builderMap.set(b.slug, builder.id)
    console.log(`  ✓ ${builder.name}`)
  }

  // ── 2. Upsert projects ────────────────────────────────────────────
  console.log('\n🏗️  Seeding projects...')

  for (const p of PROJECTS) {
    const builder_id = builderMap.get(p.builder_slug)
    if (!builder_id) {
      console.error(`  ✗ Builder not found for slug: ${p.builder_slug}`)
      continue
    }

    const { unit_types, amenities, connectivity, builder_slug, ...projectData } = p

    // Upsert project
    const project = await prisma.project.upsert({
      where: { slug: p.slug },
      update: { ...projectData, builder_id, status: projectData.status as ProjectStatus },
      create: { ...projectData, builder_id, status: projectData.status as ProjectStatus },
    })

    // Delete and re-insert related records (idempotent seed)
    await prisma.unitType.deleteMany({ where: { project_id: project.id } })
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    await prisma.connectivity.deleteMany({ where: { project_id: project.id } })

    // Insert unit types
    if (unit_types.length > 0) {
      await prisma.unitType.createMany({
        data: unit_types.map(u => ({ ...u, project_id: project.id })),
      })
    }

    // Insert amenities
    if (amenities.length > 0) {
      await prisma.amenity.createMany({
        data: amenities.map(a => ({
          ...a,
          project_id: project.id,
          category: a.category as AmenityCategory,
        })),
      })
    }

    // Insert connectivity
    if (connectivity.length > 0) {
      await prisma.connectivity.createMany({
        data: connectivity.map(c => ({
          ...c,
          project_id: project.id,
          type: c.type as ConnectivityType,
          data_source: c.data_source as DataSource,
        })),
      })
    }

    console.log(`  ✓ ${project.name} (${unit_types.length} units, ${amenities.length} amenities, ${connectivity.length} connectivity)`)
  }

  console.log('\n✅ Seed complete.')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 4.2: Add seed config to package.json**

Open `package.json`. Add after the `"scripts"` block:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

The full `package.json` should have this at the top level alongside `"scripts"`, `"dependencies"`, and `"devDependencies"`.

- [ ] **Step 4.3: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add database seed script"
```

---

## Task 5: Run Seed and Verify

**Files:**
- Create: `scripts/verify-seed.ts`

- [ ] **Step 5.1: Run the seed**

```bash
npm run db:seed
```

Expected output:
```
🌱 Seeding RealtyPals database...

📦 Seeding builders...
  ✓ ACE Group
  ✓ ATS Infrastructure Ltd
  ✓ HomeKraft
  ✓ Godrej Properties
  ✓ Eldeco
  ✓ Prateek Group

🏗️  Seeding projects...
  ✓ ACE Parkway (6 units, 19 amenities, 5 connectivity)
  ✓ ATS Pristine (4 units, 13 amenities, 3 connectivity)
  ✓ ATS Pious Hideaways (3 units, 13 amenities, 8 connectivity)
  ✓ ATS Kingston Heath (2 units, 17 amenities, 9 connectivity)
  ✓ Eldeco Live By The Greens (3 units, 16 amenities, 10 connectivity)
  ✓ Godrej Palm Retreat (4 units, 18 amenities, 11 connectivity)
  ✓ Prateek Canary (5 units, 20 amenities, 4 connectivity)

✅ Seed complete.
```

If any error → check the error message. Most likely cause: `.env.local` connection string wrong or Prisma client not generated. Run `npm run db:generate` then retry.

- [ ] **Step 5.2: Create verify script**

```typescript
// scripts/verify-seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const builders = await prisma.builder.count()
  const projects = await prisma.project.count()
  const unitTypes = await prisma.unitType.count()
  const amenities = await prisma.amenity.count()
  const connectivity = await prisma.connectivity.count()

  console.log('\n📊 Database Summary')
  console.log('─────────────────────────────────')
  console.log(`Builders:     ${builders} (expected: 6)`)
  console.log(`Projects:     ${projects} (expected: 7)`)
  console.log(`Unit Types:   ${unitTypes} (expected: 27)`)
  console.log(`Amenities:    ${amenities}`)
  console.log(`Connectivity: ${connectivity}`)

  console.log('\n📋 Projects Detail')
  console.log('─────────────────────────────────')
  const all = await prisma.project.findMany({
    include: {
      builder: true,
      _count: { select: { unit_types: true, amenities: true, connectivity: true } },
    },
    orderBy: { name: 'asc' },
  })

  for (const p of all) {
    const rera = p.rera_number ? `✓ ${p.rera_number}` : '✗ No RERA'
    console.log(`\n${p.name}`)
    console.log(`  Builder: ${p.builder.name}`)
    console.log(`  Status:  ${p.status}`)
    console.log(`  RERA:    ${rera}`)
    console.log(`  Units:   ${p._count.unit_types} types | Amenities: ${p._count.amenities} | Connectivity: ${p._count.connectivity}`)
    console.log(`  Coords:  lat=${p.lat ?? 'null'}, lng=${p.lng ?? 'null'}`)
  }

  const nullCoords = await prisma.project.count({ where: { lat: null } })
  const nullDist   = await prisma.connectivity.count({ where: { distance_km: null } })
  console.log(`\n⚠️  Gaps to enrich: ${nullCoords} projects with null coordinates, ${nullDist} connectivity entries with null distance`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 5.3: Run verify**

```bash
npx tsx scripts/verify-seed.ts
```

Expected: all 7 projects listed, RERA shown for 5 projects, 2 null RERA (ATS Pristine, Prateek Canary), all coordinates null, ~50 distances null.

- [ ] **Step 5.4: Open Prisma Studio and spot-check**

```bash
npm run db:studio
```

Opens browser at http://localhost:5555. Check:
- `projects` table: 7 rows
- `unit_types` table: ~27 rows
- Click any project → verify related records load

- [ ] **Step 5.5: Commit**

```bash
git add scripts/verify-seed.ts
git commit -m "feat: add seed verification script"
```

---

## Task 6: Google Places Enrichment Pipeline

**Files:**
- Create: `scripts/enrich.ts`

This script fills null coordinates and null distances for all projects. It's safe to re-run — it skips projects already enriched.

- [ ] **Step 6.1: Enable Google APIs**

Go to https://console.cloud.google.com → APIs & Services → Enable:
- Geocoding API
- Distance Matrix API
- Places API (New)

Go to APIs & Services → Credentials → Create API Key → restrict to these 3 APIs.

Add to `.env.local`:
```
GOOGLE_MAPS_API_KEY="AIzaSy..."
```

- [ ] **Step 6.2: Create enrichment script**

```typescript
// scripts/enrich.ts
// Fills null coordinates and distances via Google APIs.
// Safe to re-run — skips already-enriched records.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY

if (!GOOGLE_KEY) {
  console.error('GOOGLE_MAPS_API_KEY not set in .env.local')
  process.exit(1)
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`
  const res = await fetch(url)
  const data = await res.json() as { status: string; results: Array<{ geometry: { location: { lat: number; lng: number } } }> }
  if (data.status !== 'OK' || !data.results[0]) return null
  return data.results[0].geometry.location
}

async function getDistanceKm(origin: { lat: number; lng: number }, destinationName: string): Promise<number | null> {
  const dest = encodeURIComponent(destinationName + ', Noida, Uttar Pradesh, India')
  const orig = `${origin.lat},${origin.lng}`
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${orig}&destinations=${dest}&key=${GOOGLE_KEY}`
  const res = await fetch(url)
  const data = await res.json() as {
    status: string
    rows: Array<{ elements: Array<{ status: string; distance: { value: number } }> }>
  }
  if (data.status !== 'OK') return null
  const el = data.rows[0]?.elements[0]
  if (!el || el.status !== 'OK') return null
  return Math.round((el.distance.value / 1000) * 10) / 10 // km, 1 decimal
}

async function main() {
  console.log('🗺️  Starting enrichment pipeline...\n')

  const projects = await prisma.project.findMany({
    include: { connectivity: true },
  })

  for (const project of projects) {
    console.log(`\n📍 ${project.name}`)

    // ── Step 1: Geocode if coordinates missing ──────────────────────
    let coords: { lat: number; lng: number } | null = null

    if (project.lat === null || project.lng === null) {
      console.log(`   Geocoding: "${project.address}"`)
      coords = await geocode(project.address ?? `${project.sector}, Noida, Uttar Pradesh`)

      if (coords) {
        await prisma.project.update({
          where: { id: project.id },
          data: { lat: coords.lat, lng: coords.lng },
        })
        console.log(`   ✓ Coordinates: ${coords.lat}, ${coords.lng}`)
      } else {
        console.log(`   ✗ Geocoding failed — skipping distances`)
        continue
      }
    } else {
      coords = { lat: project.lat, lng: project.lng }
      console.log(`   Already geocoded: ${coords.lat}, ${coords.lng}`)
    }

    // ── Step 2: Fill null distances ─────────────────────────────────
    const nullDistEntries = project.connectivity.filter(c => c.distance_km === null)

    if (nullDistEntries.length === 0) {
      console.log(`   All distances already filled`)
      continue
    }

    console.log(`   Enriching ${nullDistEntries.length} distances...`)

    for (const entry of nullDistEntries) {
      const km = await getDistanceKm(coords, entry.name)
      if (km !== null) {
        await prisma.connectivity.update({
          where: { id: entry.id },
          data: { distance_km: km, data_source: 'google' },
        })
        console.log(`   ✓ ${entry.name}: ${km} km`)
      } else {
        console.log(`   ✗ ${entry.name}: distance lookup failed`)
      }
      // Rate limit: 10 req/sec for Distance Matrix free tier
      await new Promise(r => setTimeout(r, 120))
    }
  }

  console.log('\n✅ Enrichment complete.')
  await prisma.$disconnect()
}

main().catch(e => { console.error('❌ Enrichment failed:', e); process.exit(1) })
```

- [ ] **Step 6.3: Run enrichment**

```bash
npx tsx scripts/enrich.ts
```

Expected: each project gets geocoded, then distances filled. Takes ~2 minutes for 7 projects due to rate limiting.

- [ ] **Step 6.4: Verify enrichment**

```bash
npx tsx scripts/verify-seed.ts
```

Expected: 0 projects with null coordinates (or < 7 if any geocoding failed). Distances populated for metro, schools, hospitals.

- [ ] **Step 6.5: Commit**

```bash
git add scripts/enrich.ts
git commit -m "feat: add Google Places enrichment pipeline"
```

---

## Phase 1 Complete ✓

After this phase:
- 6 builders in DB
- 7 projects fully seeded (27 unit types, ~116 amenities, ~60 connectivity entries)
- All coordinates filled (via Google Geocoding)
- Distances filled for metro, schools, hospitals (via Google Distance Matrix)
- Prisma client available at `lib/db/prisma.ts`
- Verify script confirms data integrity

Run this to confirm everything is ready for Phase 2:
```bash
npx tsx scripts/verify-seed.ts
```

Expected final output:
```
📊 Database Summary
─────────────────────────────────
Builders:     6 (expected: 6)
Projects:     7 (expected: 7)
Unit Types:   27 (expected: 27)
...
⚠️  Gaps to enrich: 0 projects with null coordinates
```

---

## 4-Week Roadmap (All Phases)

| Week | Phase | Deliverable |
|------|-------|------------|
| **Week 1** | Phase 1 — Data Layer | DB seeded, enriched, verified. All 7 projects queryable. |
| **Week 2** | Phase 2 — AI Chat Engine | `/api/chat` route live. Intent extraction (Groq) + DB matching + Cohere synthesis. Session persistence. Anti-hallucination contract enforced. |
| **Week 3** | Phase 3 — Frontend | Chat UI live. Property cards + detail pages. Comparison tool with AI narrative. Total Cost Calculator. |
| **Week 4** | Phase 4 — Auth + Memory + Polish | Supabase Auth. 5-message gate. Cross-session UserMemory. Welcome Back popup. Slop audit. Mobile QA. |

**Next plan to write after Phase 1 is complete:** `2026-05-30-phase2-ai-chat-engine.md`
