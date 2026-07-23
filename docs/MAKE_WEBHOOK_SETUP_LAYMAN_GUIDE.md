# Make.com Lead Webhook Setup — Complete Beginner Guide

**What is this?** When someone requests a callback on RealtyPals, their information — plus how serious a buyer they are — automatically flows to Make.com, which saves it to a Google Sheet (and can ping your sales team for the hot ones). No manual copy-paste. Fully automatic.

**How long?** 30–45 minutes. Zero coding.

**Verified against the live backend on 2026-07-22.** Every field and URL below is what the app actually sends.

---

## PART 1: The Big Picture

```
Buyer requests a callback on RealtyPals
                 ↓
Backend sends the buyer's data + a "lead score" (how serious they are)
                 ↓
Make.com webhook catches it
                 ↓
Make.com saves it to Google Sheets  (and pings sales for HOT leads)
                 ↓
Your sales team calls the serious buyers first
```

**Why this matters:** you don't just get a name and phone. You get **budget, loan status, timeline, and a HOT/WARM/COLD score** — so your team calls the ready-to-buy people first instead of wasting time on browsers.

---

## PART 2: What Your Backend Actually Sends (the real payload)

When a **callback** is requested, the backend POSTs this JSON to your Make.com webhook:

```json
{
  "event": "callback_requested",
  "ts": 1721600000000,
  "data": {
    "name": "Rahul Sharma",
    "phone": "9876543210",
    "project_name": "Godrej Woods",
    "budget_cr": { "min": 1.2, "max": 1.5 },
    "bhk": 3,
    "purpose": "end_use",
    "possession_pref": "under_construction",
    "timeline": "immediate",
    "loan_pre_approved": true,
    "preferred_sector": "Sector 150",
    "work_location": "Sector 62",
    "engagement": { "projects_viewed": 8, "projects_saved": 3 },
    "ai_summary": "Family upgrader, 3BHK end-use, loan pre-approved, wary of possession delays.",
    "lead_score": 70,
    "lead_tier": "HOT"
  }
}
```

When a **site visit** is requested, the backend sends a simpler payload:

```json
{
  "event": "site_visit_requested",
  "ts": 1721600000000,
  "data": {
    "name": "Anil Kumar",
    "phone": "9999888877",
    "projectName": "Shriram Greenfield",
    "visitDate": "2026-08-01",
    "timeSlot": "11:00 AM"
  }
}
```

Notes for the person setting this up:
- `event` tells you which kind of lead it is — route on it (Part 5).
- `lead_tier` is `HOT`, `WARM`, or `COLD`. **HOT = call now.**
- Some fields (budget, loan, timeline) are only filled if the buyer chatted enough for the AI to learn them. Empty is normal for a quick lead — Make just leaves that cell blank.
- **A signature header `X-Signature` is attached** if you set a secret (Step 4). You can ignore it on the free tier — the secret webhook URL is already unguessable.

---

## PART 3: Setup (Step by Step)

### Step 1: Sign up for Make.com (free tier)
1. Go to **https://www.make.com** → **Sign up free** (top right).
2. Use a work email, verify it, set a password.
3. You land on the dashboard. Leave it open.

### Step 2: Create a new automation ("scenario")
1. Left sidebar → **Create a new scenario** (or the big **+**).
2. A blank canvas appears.
3. Click the large **+** in the center.
4. Search **"Webhooks"** → select **Custom webhook** (not the paid one).
5. Click **Add**.

### Step 3: Name the webhook & copy its URL
1. Webhook name: change to `realtypals-leads` (just a label).
2. Click **Save**.
3. Click **Copy address to clipboard**. You get a URL like:
   ```
   https://hook.eu2.make.com/abc123def456ghi789klm
   ```
4. **Save this URL** in Notepad — you need it next.

### Step 4: Tell your backend where to send data

**On your computer:**
1. Open `backend/.env` (if missing, copy `backend/.env.example` and rename it to `backend/.env`).
2. Set the URL you copied:
   ```env
   WEBHOOK_URL=https://hook.eu2.make.com/abc123def456ghi789klm
   ```
3. Generate a secret — run this in your terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the long random string it prints.
4. Set it:
   ```env
   WEBHOOK_SECRET=paste-the-long-random-string-here
   ```
5. **Restart the backend** so it picks up the new values.

**⛔ On your deployed server (Render/Railway/etc.) — only with a human "yes":**
- Open your hosting dashboard → Environment Variables.
- Add the **same** `WEBHOOK_URL` and `WEBHOOK_SECRET`.
- **Redeploy.**

### Step 5: Teach Make.com the data shape
1. Back in Make, click the Webhooks box → **Redetermine data structure**. Make now listens.
2. **Trigger one real lead.** ⚠️ **Callbacks now require sign-in** — so:
   - Log into your RealtyPals app.
   - Request a callback on any property (name + phone + the timeline/loan chips).
   - *(Or use the curl test in Part 6 to avoid signing in.)*
3. Within seconds Make catches the sample. The webhook indicator turns green. ✅ It now knows every field (`event`, `data.name`, `data.lead_tier`, …).

### Step 6: Save every lead to Google Sheets
1. After the Webhooks box, click **+** → search **Google Sheets** → **Add a Row**.
2. **Sign in with Google** and authorize.
3. **Spreadsheet** dropdown → **Create a spreadsheet** → name it `RealtyPals Leads`.
4. Map the columns. Recommended full set (matches the live enriched payload):

   | Sheet column | Map from |
   |---|---|
   | Time | `ts` |
   | Event | `event` |
   | Name | `data.name` |
   | Phone | `data.phone` |
   | Project | `data.project_name` |
   | Budget (min) | `data.budget_cr.min` |
   | Budget (max) | `data.budget_cr.max` |
   | BHK | `data.bhk` |
   | Loan pre-approved | `data.loan_pre_approved` |
   | Timeline | `data.timeline` |
   | Sector | `data.preferred_sector` |
   | Viewed | `data.engagement.projects_viewed` |
   | Saved | `data.engagement.projects_saved` |
   | **Score** | `data.lead_score` |
   | **Tier** | `data.lead_tier` |
   | AI Summary | `data.ai_summary` |

   *(Prefer a minimal sheet? Just map Time, Event, Name, Phone, Project, Score, Tier — that already lets sales prioritize.)*

5. Click **OK**.

### Step 7: Turn it on
- Bottom-left toggle → **ON** (shows "Scheduled: Immediately"). ✅ Live.

---

## PART 4: Test It

**Manual (easiest):** log in → request a callback → open the `RealtyPals Leads` sheet → new row appears. Done.

**Command line (skips sign-in):**
```bash
curl -X POST "https://hook.eu2.make.com/abc123def456ghi789klm" \
  -H "Content-Type: application/json" \
  -d '{"event":"callback_requested","ts":1721600000000,"data":{"name":"Test Buyer","phone":"9999999999","project_name":"Demo Project","lead_score":70,"lead_tier":"HOT"}}'
```
Then Make → **History** (bottom bar) → one execution → one new Sheet row.

---

## PART 5: Route the HOT Leads (optional, still free tier)

Add a **Router** after the Google Sheets module:

```
Branch 1:  if  data.lead_tier = "HOT"   → also send an email/WhatsApp to sales instantly
Branch 2:  if  data.event = "site_visit_requested"  → a separate "Site Visits" sheet or an urgent ping
Branch 3:  everything else               → sheet only
```

This is how you later sell builders on "we send you the serious buyers first."

*(Email is free via a Gmail module. WhatsApp needs Twilio, which is paid — add it once you outgrow free tier.)*

---

## PART 6: Data Governance (read this — it's important)

You are forwarding a real person's profile to a third party (a builder). Two rules:

1. **Consent.** Under India's DPDP Act 2023, get the buyer's consent before sharing their requirements with a builder. Make sure the callback form has a line like *"Share my requirements with the verified advisor for this project."* (If it doesn't yet, that's a known gap — flag it before going live in India.)
2. **Never put the buyer's private shortlist in the sheet.** The backend deliberately sends the **AI summary + counts**, not the raw list of every property the buyer viewed or rejected. Don't add columns that expose a buyer's full browsing history to builders — that's your buyer's competitor shortlist. The current payload already protects this; keep it that way.

---

## TROUBLESHOOTING

| Symptom | Cause | Fix |
|---|---|---|
| No execution in Make History | `WEBHOOK_URL` wrong, or backend not restarted | Check `backend/.env`, restart backend; look for `WEBHOOK_URL not configured` in backend logs |
| Callback test does nothing | You're not signed in (callbacks require login now) | Log in first, or use the curl test in Part 4 |
| Execution runs but no Sheet row | Field mapping empty | Re-run **Redetermine data structure**, re-map `data.*` |
| Fields show as one `data` blob | Sample wasn't captured | Trigger a real lead while "determine structure" is listening |
| Can't tell callback from site visit | Both hit the same URL | Add a Router keyed on `data.event` (Part 5) |
| Backend log says `webhook failed` | Make URL down or wrong | Re-copy the URL from Make, update `.env`, redeploy |

---

## FREE-TIER LIMITS

- **1000 operations/month.** Each lead ≈ 2 ops (webhook + Sheet row) → ~500 leads/month headroom.
- Webhooks are instant (push), so the "15-min polling" limit doesn't apply.
- Outgrow it (>500 leads/mo, or you add WhatsApp routing)? Upgrade to **Core (~$9/mo, 10k ops)**.

---

## SETUP CHECKLIST

```
[ ] Sign up at Make.com
[ ] Create scenario → Custom webhook
[ ] Copy the webhook URL
[ ] Set WEBHOOK_URL + WEBHOOK_SECRET in backend/.env, restart backend
[ ] (⛔ human) Set the same two vars on the deployed server, redeploy
[ ] Redetermine data structure (log in, trigger a callback)
[ ] Add Google Sheets → Add a Row, map columns (incl. Score + Tier)
[ ] Turn scenario ON
[ ] Test: request callback → row appears in sheet
[ ] (India) Confirm the consent line is on the callback form
[ ] Optional: Router to ping sales on HOT leads
```

---

## WHAT YOUR SALES TEAM SEES

```
Time              | Event              | Name          | Phone       | Project          | Tier | Score | Loan | Timeline
2026-07-22 14:32  | callback_requested | Rahul Sharma  | 9876543210  | Godrej Woods     | HOT  | 70    | true | immediate
2026-07-22 14:45  | callback_requested | Priya Desai   | 9988776655  | Prestige Pinnacle| WARM | 45    | false| 1-3-months
2026-07-22 15:12  | site_visit_requested| Anil Kumar   | 9999888877  | Shriram Greenfield| —   | —     | —    | (visit 2026-08-01, 11 AM)
```

Sort by **Tier**. Call the HOT ones first. That's the whole point.

---

**You've connected the app to the real world. Serious buyers now surface automatically, ranked. Congratulations.**
