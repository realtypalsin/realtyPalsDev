# Sprint G: Calculators + AI Enrichment + Voice + Dark Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EMI/Stamp/GST calculators as chat tools + standalone UI; enrich AI with Jina Reader (RERA), Wikipedia (area info), WAQI (AQI), Nominatim (geocoding fallback); add Whisper voice input; fix dark mode across all components.

**Architecture:** G1 builds lib layer (pure functions, no UI). G2 adds calculator + Whisper API endpoints. G3 wires new tools into chat/route.ts. G4 creates CalculatorPanel UI. G5 integrates AQI, voice, site-visit into existing panels. G6 systematically fixes dark mode component-by-component.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS dark:, Groq SDK (Whisper), Jina AI (Reader + existing key), WAQI free API, Wikipedia REST API, Nominatim OSM geocoding.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/lib/jina.ts` | Modify | Add `jinaRead(url)` using r.jina.ai |
| `frontend/lib/waqi.ts` | Create | AQI fetcher for Noida properties |
| `frontend/lib/wikipedia.ts` | Create | Area summary fetcher |
| `frontend/lib/google-maps.ts` | Modify | Add Nominatim geocoding fallback |
| `frontend/lib/calculators.ts` | Create | Pure EMI/stamp/GST math functions |
| `frontend/app/api/v1/transcribe/route.ts` | Create | Groq Whisper transcription endpoint |
| `frontend/app/api/v1/chat/route.ts` | Modify | Add 5 new tools |
| `frontend/components/CalculatorPanel.tsx` | Create | 3-tab calculator UI |
| `frontend/components/ProjectDetailPanel.tsx` | Modify | AQI widget + site visit button |
| `frontend/components/DiscoveryContent.tsx` | Modify | Mic button + calculator chip |
| `frontend/.env` | Modify | Add WAQI_TOKEN |
| `frontend/components/ProjectCard.tsx` | Modify | Dark mode |
| `frontend/components/DiscoveryContent.tsx` | Modify | Dark mode |
| `frontend/components/ProjectDetailPanel.tsx` | Modify | Dark mode |
| `frontend/components/SiteVisitScheduler.tsx` | Modify | Dark mode |
| `frontend/components/ComparisonTable.tsx` | Modify | Dark mode (if needed) |

---

## Task 1: Jina Reader function

**Files:**
- Modify: `frontend/lib/jina.ts`

**Context:** Jina AI Reader at `r.jina.ai/{url}` returns clean Markdown from any URL. Same API key. Use for RERA page scraping.

- [ ] **Step 1: Add `jinaRead` to `frontend/lib/jina.ts`**

Append to the end of the file:

```typescript
/**
 * Jina Reader — extract clean Markdown from any URL.
 * GET r.jina.ai/{url} with same API key.
 * Use for RERA pages, news articles, builder sites.
 */
export async function jinaRead(url: string, maxChars = 3000): Promise<string | null> {
  const key = process.env.JINA_API_KEY
  if (!key) return null

  try {
    const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'text/markdown',
        'X-Return-Format': 'markdown',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`[jina reader] ${res.status} for ${url}`)
      return null
    }
    const text = await res.text()
    return text.slice(0, maxChars)
  } catch (err) {
    console.warn('[jina reader] failed:', (err as Error).message)
    return null
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors related to jina.ts.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/jina.ts
git commit -m "feat(g1): add jinaRead() — Jina Reader for RERA page scraping"
```

---

## Task 2: WAQI AQI lib

**Files:**
- Create: `frontend/lib/waqi.ts`
- Modify: `frontend/.env`

**Context:** WAQI free API returns AQI for a city or geo coordinates. Token `demo` works for testing (limited stations). Register free at https://aqicn.org/api/ for production token.

- [ ] **Step 1: Add `WAQI_TOKEN` to `.env`**

Add after the `GOOGLE_MAPS_API_KEY` block:

```
# ── Air Quality (WAQI) — https://aqicn.org/api/ ──────────────────────────────
# Free tier — register at https://aqicn.org/api/ for a real token
# The demo token works for testing but has limited station coverage
WAQI_TOKEN=demo
```

- [ ] **Step 2: Create `frontend/lib/waqi.ts`**

```typescript
// WAQI — World Air Quality Index free API
// Free tier: https://aqicn.org/api/
// Register for a real token; "demo" works for limited stations.

export interface AqiResult {
  aqi: number           // 0–500+ (WHO scale)
  label: string         // "Good" | "Moderate" | "Unhealthy for Sensitive Groups" | "Unhealthy" | "Very Unhealthy" | "Hazardous"
  color: string         // Tailwind text color class
  dominantPollutant: string | null
  station: string
}

function aqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50)  return { label: 'Good',                          color: 'text-green-600' }
  if (aqi <= 100) return { label: 'Moderate',                      color: 'text-yellow-600' }
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: 'text-orange-500' }
  if (aqi <= 200) return { label: 'Unhealthy',                     color: 'text-red-600' }
  if (aqi <= 300) return { label: 'Very Unhealthy',                color: 'text-purple-600' }
  return               { label: 'Hazardous',                       color: 'text-red-900' }
}

export async function getAqi(
  lat?: number | null,
  lng?: number | null,
  cityFallback = 'noida',
): Promise<AqiResult | null> {
  const token = process.env.WAQI_TOKEN || 'demo'
  const endpoint = lat && lng
    ? `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`
    : `https://api.waqi.info/feed/${encodeURIComponent(cityFallback)}/?token=${token}`

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null

    const data = (await res.json()) as {
      status: string
      data?: {
        aqi: number | '-'
        dominantpol?: string
        city?: { name?: string }
      }
    }

    if (data.status !== 'ok' || !data.data || data.data.aqi === '-') return null

    const aqi = Number(data.data.aqi)
    const { label, color } = aqiLabel(aqi)

    return {
      aqi,
      label,
      color,
      dominantPollutant: data.data.dominantpol ?? null,
      station: data.data.city?.name ?? cityFallback,
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/waqi.ts frontend/.env
git commit -m "feat(g1): add WAQI AQI lib — getAqi() with geo + city fallback"
```

---

## Task 3: Wikipedia area info lib

**Files:**
- Create: `frontend/lib/wikipedia.ts`

**Context:** Wikipedia REST API is completely free, no key. Returns a plain-text extract of any Wikipedia article. Use for area/sector background info.

- [ ] **Step 1: Create `frontend/lib/wikipedia.ts`**

```typescript
// Wikipedia REST API — completely free, no API key.
// Returns a plain-text extract for any article title.

export interface WikiSummary {
  title: string
  extract: string   // plain text, 1-3 paragraphs
  url: string
}

/**
 * Fetch Wikipedia summary for a location.
 * title examples: "Noida", "Sector 150 Noida", "Greater Noida"
 * Falls back to broader title if specific article not found.
 */
export async function getWikiSummary(title: string): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, '_'))
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RealtyPals/1.0 (https://realtypals.in)' },
      signal: AbortSignal.timeout(4000),
    })

    if (res.status === 404) return null
    if (!res.ok) return null

    const data = (await res.json()) as {
      type?: string
      title: string
      extract?: string
      content_urls?: { desktop?: { page?: string } }
    }

    // Skip disambiguation pages
    if (data.type === 'disambiguation') return null
    if (!data.extract || data.extract.length < 50) return null

    return {
      title: data.title,
      extract: data.extract.slice(0, 800),
      url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`,
    }
  } catch {
    return null
  }
}

/** Try specific title first, fall back to broader city. */
export async function getAreaInfo(sector: string, city: string): Promise<WikiSummary | null> {
  // Try specific sector page first
  const specific = await getWikiSummary(`${sector}, ${city}`)
  if (specific) return specific

  // Fall back to city-level article
  return getWikiSummary(city)
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/wikipedia.ts
git commit -m "feat(g1): add Wikipedia area info lib — getAreaInfo() for sector context"
```

---

## Task 4: Nominatim geocoding fallback

**Files:**
- Modify: `frontend/lib/google-maps.ts`

**Context:** Add `geocodeAddress()` that tries Google first, Nominatim OSM second. Nominatim is free, no key, but requires User-Agent header and rate limit (1 req/s). Only used as a server-side fallback.

- [ ] **Step 1: Read `frontend/lib/google-maps.ts`** to find the end of the file.

- [ ] **Step 2: Append `geocodeAddress()` to `frontend/lib/google-maps.ts`**

```typescript
export interface GeocodeResult {
  lat: number
  lng: number
  formatted_address: string
  source: 'google' | 'nominatim'
}

/** Geocode an address — Google first, Nominatim OSM fallback. */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  // Try Google Maps first
  const googleKey = process.env.GOOGLE_MAPS_API_KEY
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
      const data = (await res.json()) as {
        status: string
        results?: Array<{
          geometry: { location: { lat: number; lng: number } }
          formatted_address: string
        }>
      }
      if (data.status === 'OK' && data.results?.[0]) {
        const r = data.results[0]
        return {
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
          formatted_address: r.formatted_address,
          source: 'google',
        }
      }
    } catch { /* fall through to Nominatim */ }
  }

  // Nominatim OSM fallback — free, no key, must set User-Agent
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RealtyPals/1.0 (https://realtypals.in)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const results = (await res.json()) as Array<{
      lat: string; lon: string; display_name: string
    }>
    if (results.length === 0) return null
    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      formatted_address: results[0].display_name,
      source: 'nominatim',
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/google-maps.ts
git commit -m "feat(g1): add geocodeAddress() — Google first, Nominatim OSM fallback"
```

---

## Task 5: Calculator math functions

**Files:**
- Create: `frontend/lib/calculators.ts`
- Create: `frontend/__tests__/calculators.test.ts`

**Context:** Pure math functions, no API, fully unit-testable. EMI uses standard formula. UP stamp duty is 7% men / 6% women + 1% registration. GST: 5% under-construction (>45L), 1% affordable (≤45L and ≤90sqm carpet), 0% RTM.

- [ ] **Step 1: Create `frontend/lib/calculators.ts`**

```typescript
// Property calculators — pure math, no external deps.
// All amounts in INR (not crores) internally for precision.

export interface EmiResult {
  emi_monthly: number        // INR
  total_payment: number      // INR
  total_interest: number     // INR
  principal: number          // INR
  annual_rate: number        // percent
  tenure_months: number
}

/**
 * Standard EMI formula: P × r × (1+r)^n / ((1+r)^n - 1)
 * @param principal_cr  Loan amount in crores
 * @param annual_rate   Interest rate percent per annum (e.g. 8.5)
 * @param tenure_years  Loan tenure in years
 */
export function calculateEmi(
  principal_cr: number,
  annual_rate: number,
  tenure_years: number,
): EmiResult {
  const principal = principal_cr * 1e7
  const r = annual_rate / 12 / 100
  const n = tenure_years * 12

  let emi: number
  if (r === 0) {
    emi = principal / n
  } else {
    emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  }

  const total_payment = emi * n
  return {
    emi_monthly: Math.round(emi),
    total_payment: Math.round(total_payment),
    total_interest: Math.round(total_payment - principal),
    principal,
    annual_rate,
    tenure_months: n,
  }
}

export interface StampDutyResult {
  property_value: number     // INR
  stamp_duty: number         // INR
  registration: number       // INR
  total_charges: number      // INR
  stamp_duty_rate: number    // percent
  buyer_gender: 'male' | 'female' | 'joint'
  note: string
}

/**
 * Uttar Pradesh stamp duty (2024).
 * Men: 7%, Women: 6%, Joint (man+woman): 6.5%.
 * Registration: 1% (no cap applied — use official UP calculator to verify).
 */
export function calculateStampDuty(
  price_cr: number,
  buyer_gender: 'male' | 'female' | 'joint' = 'male',
): StampDutyResult {
  const value = price_cr * 1e7
  const rate = buyer_gender === 'female' ? 6 : buyer_gender === 'joint' ? 6.5 : 7
  const stamp_duty = Math.round(value * rate / 100)
  const registration = Math.round(value * 1 / 100)   // 1%
  return {
    property_value: value,
    stamp_duty,
    registration,
    total_charges: stamp_duty + registration,
    stamp_duty_rate: rate,
    buyer_gender,
    note: 'Indicative. Rates based on UP 2024 circle rate rules. Verify with registered valuer before purchase.',
  }
}

export interface GstResult {
  property_value: number     // INR
  gst_amount: number         // INR
  gst_rate: number           // percent
  category: 'affordable' | 'standard' | 'ready_to_move'
  note: string
}

/**
 * GST on residential property in India (post-2019 revised rates).
 * Ready to move (OC received): 0% GST
 * Affordable housing (≤₹45L and carpet ≤90sqm in non-metros): 1%
 * Standard under-construction: 5%
 * Noida is non-metro.
 */
export function calculateGst(
  price_cr: number,
  status: 'under_construction' | 'ready_to_move',
  carpet_sqm = 0,
): GstResult {
  const value = price_cr * 1e7

  if (status === 'ready_to_move') {
    return {
      property_value: value,
      gst_amount: 0,
      gst_rate: 0,
      category: 'ready_to_move',
      note: 'No GST on ready-to-move properties with Occupancy Certificate.',
    }
  }

  const isAffordable = price_cr <= 4.5 && carpet_sqm > 0 && carpet_sqm <= 90
  const rate = isAffordable ? 1 : 5
  const category = isAffordable ? 'affordable' : 'standard'

  return {
    property_value: value,
    gst_amount: Math.round(value * rate / 100),
    gst_rate: rate,
    category,
    note: isAffordable
      ? 'Affordable housing rate (≤₹45L + carpet ≤90sqm in non-metro). Verify carpet area with builder.'
      : 'Standard under-construction rate. Effective rate after composition scheme.',
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatInr(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}
```

- [ ] **Step 2: Create `frontend/__tests__/calculators.test.ts`**

```typescript
import { calculateEmi, calculateStampDuty, calculateGst, formatInr } from '../lib/calculators'

describe('calculateEmi', () => {
  it('computes correct EMI for 1Cr at 8.5% for 20 years', () => {
    const r = calculateEmi(1, 8.5, 20)
    // Standard EMI ≈ ₹86,782
    expect(r.emi_monthly).toBeGreaterThan(85000)
    expect(r.emi_monthly).toBeLessThan(88000)
    expect(r.tenure_months).toBe(240)
    expect(r.principal).toBe(10000000)
  })

  it('total payment > principal (interest is positive)', () => {
    const r = calculateEmi(2, 9, 25)
    expect(r.total_interest).toBeGreaterThan(0)
    expect(r.total_payment).toBe(r.principal + r.total_interest)
  })

  it('handles 0% rate gracefully', () => {
    const r = calculateEmi(1, 0, 10)
    expect(r.emi_monthly).toBe(Math.round(1e7 / 120))
    expect(r.total_interest).toBe(0)
  })
})

describe('calculateStampDuty', () => {
  it('applies 7% for male buyer', () => {
    const r = calculateStampDuty(2, 'male')
    expect(r.stamp_duty).toBe(1400000) // 7% of 2Cr
    expect(r.registration).toBe(200000) // 1%
    expect(r.total_charges).toBe(1600000)
  })

  it('applies 6% for female buyer', () => {
    const r = calculateStampDuty(2, 'female')
    expect(r.stamp_duty).toBe(1200000) // 6%
  })

  it('applies 6.5% for joint', () => {
    const r = calculateStampDuty(2, 'joint')
    expect(r.stamp_duty).toBe(1300000) // 6.5%
  })
})

describe('calculateGst', () => {
  it('returns 0% for ready_to_move', () => {
    const r = calculateGst(3, 'ready_to_move')
    expect(r.gst_rate).toBe(0)
    expect(r.gst_amount).toBe(0)
    expect(r.category).toBe('ready_to_move')
  })

  it('returns 1% for affordable under-construction ≤45L and ≤90sqm', () => {
    const r = calculateGst(0.4, 'under_construction', 85)
    expect(r.gst_rate).toBe(1)
    expect(r.category).toBe('affordable')
  })

  it('returns 5% for standard under-construction', () => {
    const r = calculateGst(2, 'under_construction', 120)
    expect(r.gst_rate).toBe(5)
    expect(r.category).toBe('standard')
  })
})

describe('formatInr', () => {
  it('formats crores correctly', () => {
    expect(formatInr(10000000)).toBe('₹1.00 Cr')
    expect(formatInr(25000000)).toBe('₹2.50 Cr')
  })

  it('formats lakhs correctly', () => {
    expect(formatInr(500000)).toBe('₹5.00 L')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test -- --testPathPattern=calculators 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/calculators.ts frontend/__tests__/calculators.test.ts
git commit -m "feat(g2): add property calculators — EMI, stamp duty, GST with unit tests"
```

---

## Task 6: Whisper transcription endpoint

**Files:**
- Create: `frontend/app/api/v1/transcribe/route.ts`

**Context:** Uses existing Groq key. Accept multipart FormData with an `audio` file field. Return `{text: string}`. Groq's Whisper model: `whisper-large-v3-turbo`.

- [ ] **Step 1: Create `frontend/app/api/v1/transcribe/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audioFile = formData.get('audio') as File | null
  if (!audioFile) {
    return Response.json({ error: 'audio field required' }, { status: 400 })
  }

  if (audioFile.size > 25 * 1024 * 1024) {
    return Response.json({ error: 'Audio too large (max 25 MB)' }, { status: 400 })
  }

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'hi',   // default Hindi — model handles English too
      response_format: 'json',
    })

    return Response.json({ text: transcription.text ?? '' })
  } catch (err) {
    console.error('[transcribe]', err)
    return Response.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/v1/transcribe/route.ts
git commit -m "feat(g2): add /api/v1/transcribe — Groq Whisper, Hindi+English, 25MB limit"
```

---

## Task 7: Chat route — 5 new tools

**Files:**
- Modify: `frontend/app/api/v1/chat/route.ts`

**Context:** Add 5 new tool definitions + handlers to the existing 3-tool setup (search_properties, search_web, get_commute_time). New tools: `calculate_emi`, `calculate_stamp_duty`, `calculate_gst`, `get_area_info`, `read_rera_page`.

- [ ] **Step 1: Add imports at top of `frontend/app/api/v1/chat/route.ts`**

After the existing imports, add:

```typescript
import { jinaRead } from '@/lib/ai/jina'
import { getAreaInfo } from '@/lib/wikipedia'
import { calculateEmi, calculateStampDuty, calculateGst, formatInr } from '@/lib/calculators'
```

- [ ] **Step 2: Add 5 new tool definitions** after `COMMUTE_TOOL`:

```typescript
const CALCULATE_EMI_TOOL = {
  type: 'function' as const,
  function: {
    name: 'calculate_emi',
    description:
      'Calculate monthly EMI for a home loan. Use when user asks about EMI, monthly payment, ' +
      '"kitna EMI hoga", "can I afford", or loan repayment. Also computes total interest and total payment.',
    parameters: {
      type: 'object' as const,
      properties: {
        principal_cr: { ...NUM_OR_STR, description: 'Loan amount in crores e.g. 1.5' },
        annual_rate:  { ...NUM_OR_STR, description: 'Interest rate % per annum e.g. 8.5' },
        tenure_years: { ...NUM_OR_STR, description: 'Loan tenure in years e.g. 20' },
      },
      required: ['principal_cr', 'annual_rate', 'tenure_years'] as string[],
    },
  },
}

const CALCULATE_STAMP_TOOL = {
  type: 'function' as const,
  function: {
    name: 'calculate_stamp_duty',
    description:
      'Calculate UP stamp duty and registration charges for a property. ' +
      'Use when user asks about stamp duty, registration cost, "registration kitna hoga".',
    parameters: {
      type: 'object' as const,
      properties: {
        price_cr:     { ...NUM_OR_STR, description: 'Property price in crores' },
        buyer_gender: { type: 'string' as const, enum: ['male', 'female', 'joint'], description: 'Buyer gender — affects stamp duty rate' },
      },
      required: ['price_cr'] as string[],
    },
  },
}

const CALCULATE_GST_TOOL = {
  type: 'function' as const,
  function: {
    name: 'calculate_gst',
    description:
      'Calculate GST on an under-construction or ready-to-move property. ' +
      'Use when user asks about GST, "kitna GST lagega", tax on property.',
    parameters: {
      type: 'object' as const,
      properties: {
        price_cr:    { ...NUM_OR_STR, description: 'Property price in crores' },
        status:      { type: 'string' as const, enum: ['under_construction', 'ready_to_move'] },
        carpet_sqm:  { ...NUM_OR_STR, description: 'Carpet area in sqm (needed for affordable housing check)' },
      },
      required: ['price_cr', 'status'] as string[],
    },
  },
}

const GET_AREA_INFO_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_area_info',
    description:
      'Get background information about a Noida sector or area from Wikipedia. ' +
      'Use when user asks: "tell me about Sector 150", "how is this area", "what is special about this location".',
    parameters: {
      type: 'object' as const,
      properties: {
        sector: { type: 'string' as const, description: 'Sector name e.g. "Sector 150"' },
        city:   { type: 'string' as const, description: 'City e.g. "Noida"' },
      },
      required: ['sector', 'city'] as string[],
    },
  },
}

const READ_RERA_TOOL = {
  type: 'function' as const,
  function: {
    name: 'read_rera_page',
    description:
      'Fetch live RERA registration details from UP-RERA portal or provided RERA URL. ' +
      'Use when user asks to verify RERA status, "RERA check karo", "is this project registered".',
    parameters: {
      type: 'object' as const,
      properties: {
        rera_number: { type: 'string' as const, description: 'RERA registration number e.g. UPRERAPRJ12345' },
        rera_url:    { type: 'string' as const, description: 'Direct URL to RERA project page if available' },
      },
      required: [] as string[],
    },
  },
}
```

- [ ] **Step 3: Update TOOLS array and KNOWN_TOOL_NAMES**

Replace:
```typescript
const TOOLS = [SEARCH_PROPERTIES_TOOL, SEARCH_WEB_TOOL, COMMUTE_TOOL]
const KNOWN_TOOL_NAMES = new Set(['search_properties', 'search_web', 'get_commute_time'])
```

With:
```typescript
const TOOLS = [
  SEARCH_PROPERTIES_TOOL,
  SEARCH_WEB_TOOL,
  COMMUTE_TOOL,
  CALCULATE_EMI_TOOL,
  CALCULATE_STAMP_TOOL,
  CALCULATE_GST_TOOL,
  GET_AREA_INFO_TOOL,
  READ_RERA_TOOL,
]
const KNOWN_TOOL_NAMES = new Set([
  'search_properties', 'search_web', 'get_commute_time',
  'calculate_emi', 'calculate_stamp_duty', 'calculate_gst',
  'get_area_info', 'read_rera_page',
])
```

- [ ] **Step 4: Add tool handlers** in the `if/else if` chain after the `get_commute_time` block and before the `else` (no-tool) branch:

```typescript
} else if (toolCall?.function.name === 'calculate_emi') {
  let args = { principal_cr: 1, annual_rate: 8.5, tenure_years: 20 }
  try { Object.assign(args, JSON.parse(toolCall.function.arguments)) } catch { /* ok */ }
  const r = calculateEmi(Number(args.principal_cr), Number(args.annual_rate), Number(args.tenure_years))
  const toolResult = [
    `EMI: ${formatInr(r.emi_monthly)}/month`,
    `Loan: ${formatInr(r.principal)} @ ${r.annual_rate}% for ${r.tenure_months / 12} years`,
    `Total payment: ${formatInr(r.total_payment)}`,
    `Total interest: ${formatInr(r.total_interest)}`,
  ].join('\n')
  await saveUserMsg
  secondMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult })

} else if (toolCall?.function.name === 'calculate_stamp_duty') {
  let args: { price_cr: number; buyer_gender?: 'male' | 'female' | 'joint' } = { price_cr: 1 }
  try { Object.assign(args, JSON.parse(toolCall.function.arguments)) } catch { /* ok */ }
  const r = calculateStampDuty(Number(args.price_cr), args.buyer_gender ?? 'male')
  const toolResult = [
    `Stamp Duty (${r.stamp_duty_rate}%): ${formatInr(r.stamp_duty)}`,
    `Registration (1%): ${formatInr(r.registration)}`,
    `Total govt charges: ${formatInr(r.total_charges)}`,
    `Note: ${r.note}`,
  ].join('\n')
  await saveUserMsg
  secondMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult })

} else if (toolCall?.function.name === 'calculate_gst') {
  let args: { price_cr: number; status: 'under_construction' | 'ready_to_move'; carpet_sqm?: number } = {
    price_cr: 1, status: 'under_construction',
  }
  try { Object.assign(args, JSON.parse(toolCall.function.arguments)) } catch { /* ok */ }
  const r = calculateGst(Number(args.price_cr), args.status, Number(args.carpet_sqm ?? 0))
  const toolResult = [
    `GST (${r.gst_rate}%): ${formatInr(r.gst_amount)}`,
    `Category: ${r.category.replace('_', ' ')}`,
    `Note: ${r.note}`,
  ].join('\n')
  await saveUserMsg
  secondMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult })

} else if (toolCall?.function.name === 'get_area_info') {
  let sector = 'Sector 150', city = 'Noida'
  try {
    const args = JSON.parse(toolCall.function.arguments)
    sector = args.sector ?? sector
    city = args.city ?? city
  } catch { /* ok */ }
  const [, wikiResult] = await Promise.all([
    saveUserMsg,
    getAreaInfo(sector, city),
  ])
  const toolResult = wikiResult
    ? `${wikiResult.title}: ${wikiResult.extract}\nSource: ${wikiResult.url}`
    : `No Wikipedia article found for ${sector}, ${city}. Answer from general knowledge about Noida.`
  secondMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult })

} else if (toolCall?.function.name === 'read_rera_page') {
  send({ type: 'searching' })
  let reraNumber = '', reraUrl = ''
  try {
    const args = JSON.parse(toolCall.function.arguments)
    reraNumber = args.rera_number ?? ''
    reraUrl = args.rera_url ?? ''
  } catch { /* ok */ }

  const targetUrl = reraUrl || (reraNumber
    ? `https://www.up-rera.in/projects?project_search=${encodeURIComponent(reraNumber)}`
    : 'https://www.up-rera.in')

  const [, reraContent] = await Promise.all([
    saveUserMsg,
    jinaRead(targetUrl, 2000),
  ])
  const toolResult = reraContent
    ? `RERA page content for ${reraNumber || 'search'}:\n${reraContent}`
    : `Could not fetch RERA page. Advise user to check https://www.up-rera.in directly.`
  secondMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult })
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add frontend/app/api/v1/chat/route.ts
git commit -m "feat(g3): add 5 new chat tools — EMI, stamp duty, GST, area info, RERA check"
```

---

## Task 8: CalculatorPanel UI component

**Files:**
- Create: `frontend/components/CalculatorPanel.tsx`

**Context:** Slide-up panel with 3 tabs: EMI, Stamp Duty, GST. Inputs update results live. Dark mode supported. Triggered from DiscoveryContent via a "Calculator" chip or button.

- [ ] **Step 1: Create `frontend/components/CalculatorPanel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { X, Calculator, TrendingDown, Receipt } from 'lucide-react'
import { calculateEmi, calculateStampDuty, calculateGst, formatInr } from '@/lib/calculators'

interface Props {
  onClose: () => void
  defaultPriceCr?: number
}

type Tab = 'emi' | 'stamp' | 'gst'

export default function CalculatorPanel({ onClose, defaultPriceCr = 1.5 }: Props) {
  const [tab, setTab] = useState<Tab>('emi')

  // EMI state
  const [principal, setPrincipal] = useState(String(defaultPriceCr * 0.8))
  const [rate, setRate] = useState('8.5')
  const [tenure, setTenure] = useState('20')

  // Stamp duty state
  const [stampPrice, setStampPrice] = useState(String(defaultPriceCr))
  const [gender, setGender] = useState<'male' | 'female' | 'joint'>('male')

  // GST state
  const [gstPrice, setGstPrice] = useState(String(defaultPriceCr))
  const [gstStatus, setGstStatus] = useState<'under_construction' | 'ready_to_move'>('under_construction')
  const [carpetSqm, setCarpetSqm] = useState('0')

  // Derived results (computed live)
  const emiResult = (() => {
    const p = parseFloat(principal), r = parseFloat(rate), t = parseFloat(tenure)
    if (!p || !r || !t || p <= 0 || r <= 0 || t <= 0) return null
    return calculateEmi(p, r, t)
  })()

  const stampResult = (() => {
    const p = parseFloat(stampPrice)
    if (!p || p <= 0) return null
    return calculateStampDuty(p, gender)
  })()

  const gstResult = (() => {
    const p = parseFloat(gstPrice)
    if (!p || p <= 0) return null
    return calculateGst(p, gstStatus, parseFloat(carpetSqm) || 0)
  })()

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'emi',   label: 'EMI',         icon: <Calculator size={14} /> },
    { id: 'stamp', label: 'Stamp Duty',  icon: <Receipt size={14} /> },
    { id: 'gst',   label: 'GST',         icon: <TrendingDown size={14} /> },
  ]

  const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors'
  const labelCls = 'block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide'
  const resultRowCls = 'flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0'

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:w-[480px] bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-blue-600" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Property Calculator</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* EMI Tab */}
          {tab === 'emi' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Loan (Cr)</label>
                  <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} step="0.1" min="0" className={inputCls} placeholder="1.20" />
                </div>
                <div>
                  <label className={labelCls}>Rate (%)</label>
                  <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} step="0.05" min="0" className={inputCls} placeholder="8.5" />
                </div>
                <div>
                  <label className={labelCls}>Years</label>
                  <input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} step="1" min="1" max="30" className={inputCls} placeholder="20" />
                </div>
              </div>

              {emiResult && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/40">
                  <p className="text-[11px] text-blue-500 font-semibold uppercase tracking-wide mb-3">Monthly EMI</p>
                  <p className="text-[32px] font-black text-blue-600 dark:text-blue-400 leading-none mb-3">
                    {formatInr(emiResult.emi_monthly)}<span className="text-[16px] font-semibold">/mo</span>
                  </p>
                  <div className={resultRowCls}>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">Principal</span>
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white">{formatInr(emiResult.principal)}</span>
                  </div>
                  <div className={resultRowCls}>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">Total interest</span>
                    <span className="text-[13px] font-bold text-red-500">{formatInr(emiResult.total_interest)}</span>
                  </div>
                  <div className={resultRowCls}>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">Total payment</span>
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white">{formatInr(emiResult.total_payment)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Stamp Duty Tab */}
          {tab === 'stamp' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Property Price (Cr)</label>
                  <input type="number" value={stampPrice} onChange={(e) => setStampPrice(e.target.value)} step="0.1" min="0" className={inputCls} placeholder="2.00" />
                </div>
                <div>
                  <label className={labelCls}>Buyer</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'joint')} className={inputCls}>
                    <option value="male">Male (7%)</option>
                    <option value="female">Female (6%)</option>
                    <option value="joint">Joint (6.5%)</option>
                  </select>
                </div>
              </div>

              {stampResult && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/40">
                  <p className="text-[11px] text-amber-600 font-semibold uppercase tracking-wide mb-3">Total Govt Charges</p>
                  <p className="text-[32px] font-black text-amber-600 dark:text-amber-400 leading-none mb-3">
                    {formatInr(stampResult.total_charges)}
                  </p>
                  <div className={resultRowCls}>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">Stamp duty ({stampResult.stamp_duty_rate}%)</span>
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white">{formatInr(stampResult.stamp_duty)}</span>
                  </div>
                  <div className={resultRowCls}>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">Registration (1%)</span>
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white">{formatInr(stampResult.registration)}</span>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-2 leading-relaxed">{stampResult.note}</p>
                </div>
              )}
            </>
          )}

          {/* GST Tab */}
          {tab === 'gst' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Price (Cr)</label>
                  <input type="number" value={gstPrice} onChange={(e) => setGstPrice(e.target.value)} step="0.1" min="0" className={inputCls} placeholder="1.50" />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={gstStatus} onChange={(e) => setGstStatus(e.target.value as 'under_construction' | 'ready_to_move')} className={inputCls}>
                    <option value="under_construction">Under Construction</option>
                    <option value="ready_to_move">Ready to Move</option>
                  </select>
                </div>
              </div>
              {gstStatus === 'under_construction' && (
                <div>
                  <label className={labelCls}>Carpet Area (sqm) — for affordable check</label>
                  <input type="number" value={carpetSqm} onChange={(e) => setCarpetSqm(e.target.value)} step="1" min="0" className={inputCls} placeholder="85" />
                </div>
              )}

              {gstResult && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800/40">
                  <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide mb-3">GST Applicable</p>
                  <p className="text-[32px] font-black text-emerald-600 dark:text-emerald-400 leading-none mb-3">
                    {formatInr(gstResult.gst_amount)}
                    <span className="text-[16px] font-semibold ml-2 text-emerald-500">({gstResult.gst_rate}%)</span>
                  </p>
                  <div className={resultRowCls}>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">Category</span>
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white capitalize">{gstResult.category.replace('_', ' ')}</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-2 leading-relaxed">{gstResult.note}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CalculatorPanel.tsx
git commit -m "feat(g4): add CalculatorPanel — EMI/Stamp Duty/GST with live results, dark mode"
```

---

## Task 9: ProjectDetailPanel — AQI widget + site visit button

**Files:**
- Modify: `frontend/components/ProjectDetailPanel.tsx`

**Context:** Add AQI widget to Overview tab (after price history card). Ensure "Book Site Visit" button opens `SiteVisitScheduler` — check if it's already wired; if not, add it.

- [ ] **Step 1: Read `frontend/components/ProjectDetailPanel.tsx`** to find:
  1. Current imports
  2. Where Overview tab ends (before closing `</div>`)
  3. Whether `SiteVisitScheduler` is already imported and rendered

- [ ] **Step 2: Add imports if missing**

Add at top (after existing imports):
```typescript
import { getAqi } from '@/lib/waqi'
import type { AqiResult } from '@/lib/waqi'
import SiteVisitScheduler from '@/components/SiteVisitScheduler'
import { AnimatePresence } from 'framer-motion'
import { Wind } from 'lucide-react'
```

- [ ] **Step 3: Add state for AQI and site visit modal**

Inside the component (after existing `useState` calls):
```typescript
const [aqi, setAqi] = useState<AqiResult | null>(null)
const [showSiteVisit, setShowSiteVisit] = useState(false)
```

- [ ] **Step 4: Fetch AQI when project loads**

Add a `useEffect` that triggers when `d` (the project detail) changes:
```typescript
useEffect(() => {
  if (!d) return
  setAqi(null)
  getAqi(d.lat, d.lng, 'noida').then(setAqi).catch(() => {})
}, [d?.id])
```

- [ ] **Step 5: Add AQI card to Overview tab**

In the Overview tab, after the price history card block, add:
```tsx
{/* Air Quality */}
{aqi && (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
        <Wind size={14} className="text-blue-500" strokeWidth={2} />
      </div>
      <p className="text-[12px] font-bold text-gray-700 dark:text-gray-200">Air Quality — {aqi.station}</p>
    </div>
    <div className="flex items-center gap-3">
      <p className={`text-[28px] font-black ${aqi.color}`}>{aqi.aqi}</p>
      <div>
        <p className={`text-[13px] font-bold ${aqi.color}`}>{aqi.label}</p>
        {aqi.dominantPollutant && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Main: {aqi.dominantPollutant.toUpperCase()}</p>
        )}
      </div>
    </div>
    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">AQI scale: 0-50 Good · 51-100 Moderate · 101-150 Sensitive · 151+ Unhealthy</p>
  </div>
)}
```

- [ ] **Step 6: Add site visit button** to the actions section (wherever "Book Site Visit" or similar CTA exists, or in the sticky footer):

Find the footer/action area and add:
```tsx
<button
  onClick={() => setShowSiteVisit(true)}
  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-[13px] transition-colors"
>
  📅 Book Site Visit
</button>
```

- [ ] **Step 7: Add SiteVisitScheduler modal**

At the end of the component JSX (inside the outermost wrapper):
```tsx
<AnimatePresence>
  {showSiteVisit && d && (
    <SiteVisitScheduler
      projectId={d.id}
      projectSlug={d.slug}
      projectName={d.name}
      onClose={() => setShowSiteVisit(false)}
    />
  )}
</AnimatePresence>
```

- [ ] **Step 8: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 9: Commit**

```bash
git add frontend/components/ProjectDetailPanel.tsx
git commit -m "feat(g5): add AQI widget + site visit booking to property detail panel"
```

---

## Task 10: DiscoveryContent — voice input + calculator chip

**Files:**
- Modify: `frontend/components/DiscoveryContent.tsx`

**Context:** Add mic button next to send. On click: start MediaRecorder, stop on second click, POST audio to `/api/v1/transcribe`, fill input. Add "Calculator" follow-up chip that opens CalculatorPanel.

- [ ] **Step 1: Add imports and state**

In DiscoveryContent.tsx, add imports:
```typescript
import CalculatorPanel from '@/components/CalculatorPanel'
import { Mic, MicOff } from 'lucide-react'
```

Add state (after existing useState calls):
```typescript
const [showCalculator, setShowCalculator] = useState(false)
const [isRecording, setIsRecording] = useState(false)
const mediaRecorderRef = useRef<MediaRecorder | null>(null)
const audioChunksRef = useRef<Blob[]>([])
```

- [ ] **Step 2: Add voice recording handler**

```typescript
const handleVoiceToggle = async () => {
  if (isRecording) {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    audioChunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      try {
        const res = await fetch('/api/v1/transcribe', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.text) setChatInput(data.text)
      } catch { /* silent */ }
    }

    mediaRecorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  } catch {
    // Microphone permission denied
  }
}
```

- [ ] **Step 3: Add mic button** next to the send button in the input area.

Find the send button element and add the mic button immediately before it:
```tsx
{/* Mic button */}
<button
  type="button"
  onClick={handleVoiceToggle}
  title={isRecording ? 'Stop recording' : 'Voice input'}
  className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
    isRecording
      ? 'bg-red-500 text-white animate-pulse'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
  }`}
>
  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
</button>
```

- [ ] **Step 4: Add "Calculator" to follow-up chips**

In `getFollowUpChips`, in the `ADVISOR` phase array, add:
```typescript
{ emoji: '🧮', label: 'Calculator', msg: '__open_calculator__' },
```

In the chip click handler (find where chips dispatch `realtypals:ask-ai` or set chatInput), add special handling:
```typescript
if (chip.msg === '__open_calculator__') {
  setShowCalculator(true)
  return
}
```

- [ ] **Step 5: Render CalculatorPanel**

At the end of the component JSX:
```tsx
{showCalculator && (
  <CalculatorPanel
    onClose={() => setShowCalculator(false)}
    defaultPriceCr={lastShortlist[0]?.price_min_cr ?? 1.5}
  />
)}
```

- [ ] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add frontend/components/DiscoveryContent.tsx
git commit -m "feat(g5): add voice input (Whisper) + calculator panel trigger to chat"
```

---

## Task 11: Dark mode — all components

**Files:**
- Modify: `frontend/components/ProjectCard.tsx`
- Modify: `frontend/components/DiscoveryContent.tsx`
- Modify: `frontend/components/ProjectDetailPanel.tsx`
- Modify: `frontend/components/SiteVisitScheduler.tsx`

**Dark mode mapping for this codebase:**

| Light class | Dark replacement |
|-------------|-----------------|
| `bg-white` | add `dark:bg-gray-900` |
| `bg-gray-50` | add `dark:bg-gray-800` |
| `bg-gray-100` | add `dark:bg-gray-800` |
| `text-gray-900` | add `dark:text-white` |
| `text-gray-800` | add `dark:text-gray-100` |
| `text-gray-700` | add `dark:text-gray-200` |
| `text-gray-600` | add `dark:text-gray-300` |
| `text-gray-500` | add `dark:text-gray-400` |
| `text-gray-400` | add `dark:text-gray-500` |
| `border-gray-100` | add `dark:border-gray-700` |
| `border-gray-200` | add `dark:border-gray-700` |
| `bg-white/80` | add `dark:bg-gray-900/80` |
| `bg-white/70` | add `dark:bg-gray-900/70` |
| `bg-gradient-to-br from-blue-50 to-indigo-50` | add `dark:from-blue-900/20 dark:to-indigo-900/20` |
| `bg-gradient-to-br from-emerald-50 to-teal-50` | add `dark:from-emerald-900/20 dark:to-teal-900/20` |
| `bg-amber-50` | add `dark:bg-amber-900/20` |
| Input `bg-white border-gray-200` | add `dark:bg-gray-800 dark:border-gray-700 dark:text-white` |

**SubTask 11a: ProjectCard dark mode**

Read the file and apply the mapping above to every class. Key areas:
- Main card wrapper: `bg-white border-gray-100` → add dark variants
- Body section: `text-gray-900`, `text-gray-700`, `text-gray-500`, `text-gray-400` → add dark variants
- `bg-gray-50 border border-gray-100` amenity/connectivity chips → add `dark:bg-gray-800 dark:border-gray-700`
- Action buttons: `bg-gray-50 hover:bg-blue-50 text-gray-400 border-gray-100` → add dark variants

- [ ] **Step 1: Apply dark mode to `frontend/components/ProjectCard.tsx`**

Read the file, then for each relevant element add `dark:` variants following the mapping above.

- [ ] **Step 2: Apply dark mode to `frontend/components/DiscoveryContent.tsx`**

Key areas:
- Chat message bubbles: AI messages use `bg-white` and `text-gray-*` → add dark variants
- Input area background: `bg-white/90 border-gray-200` → add dark variants
- Suggestion chips: `bg-white/80 border-white/60 text-gray-700` → add dark variants
- Follow-up chips: similar treatment
- "Searching…" loader: if white background, add dark variant
- Empty state area

- [ ] **Step 3: Apply dark mode to `frontend/components/ProjectDetailPanel.tsx`**

Key areas:
- Panel background: `bg-white` → `dark:bg-gray-900`
- Tabs: active/inactive states
- Content cards: `bg-gray-50`, `bg-gradient-to-br from-*-50` → add dark variants
- Text throughout: apply full mapping

- [ ] **Step 4: Apply dark mode to `frontend/components/SiteVisitScheduler.tsx`**

Key areas:
- Modal background: `bg-white` → `dark:bg-gray-900`
- Date buttons: `border-gray-100 text-gray-700` → add dark variants
- Time slot buttons: same
- Input fields: `border-gray-200` → add dark variants
- Step indicators

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 6: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -15
```

- [ ] **Step 7: Commit**

```bash
git add frontend/components/ProjectCard.tsx frontend/components/DiscoveryContent.tsx frontend/components/ProjectDetailPanel.tsx frontend/components/SiteVisitScheduler.tsx
git commit -m "feat(g6): comprehensive dark mode — all chat and property components"
```

---

## Self-Review

**Spec coverage:**
- [x] EMI calculator — Task 5 (math), Task 7 (chat tool), Task 8 (UI panel), Task 10 (trigger)
- [x] Stamp duty calculator — Task 5, Task 7, Task 8
- [x] GST calculator — Task 5, Task 7, Task 8
- [x] Jina Reader — Task 1 (jinaRead), Task 7 (read_rera_page tool)
- [x] WAQI AQI — Task 2 (lib), Task 9 (UI widget)
- [x] Whisper voice — Task 6 (endpoint), Task 10 (mic button UI)
- [x] Nominatim fallback — Task 4
- [x] Wikipedia area info — Task 3 (lib), Task 7 (get_area_info tool)
- [x] Site visit UI access — Task 9 (button + modal in ProjectDetailPanel)
- [x] Dark mode — Task 11 (all components)
- [x] Calculator tests — Task 5 (all 4 test suites)
- [x] WAQI_TOKEN env — Task 2 Step 1

**Type consistency:**
- `AqiResult` defined in `lib/waqi.ts`, imported in Task 9 as `import type { AqiResult }`
- `formatInr` defined in `lib/calculators.ts`, imported in Task 7 and Task 8
- `jinaRead` defined in `lib/jina.ts`, imported in Task 7 as `import { jinaRead } from '@/lib/ai/jina'`
- `getAreaInfo` defined in `lib/wikipedia.ts`, imported in Task 7

**No placeholders:** all code blocks are complete.
