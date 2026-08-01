# RealtyPals — Deployment Guide

Step-by-step guide for deploying to Vercel (frontend) + Render (backend).

---

## Before you start

You need accounts on:
- [Supabase](https://supabase.com) — database + auth
- [Vercel](https://vercel.com) — frontend hosting
- [Render](https://render.com) — backend hosting
- [Groq](https://console.groq.com) — AI

---

## Step 1 — Push the code to GitHub

Open your terminal:

```bash
# Navigate to the project
cd /path/to/realtypals

# Make sure everything is committed
git add .
git commit -m "prepare for deployment"

# Push to GitHub (create a repo at github.com first if you haven't)
git remote add origin https://github.com/YOUR-USERNAME/realtypals.git
git push -u origin main
```

---

## Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Give it a name (e.g. `realtypals-prod`), pick a strong password, choose **Southeast Asia** region
3. Wait ~2 minutes for it to provision

**Get your credentials:**
1. In the Supabase dashboard → **Settings** → **API**
2. Copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
     *(also listed as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in your env file)*
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

**Get your database URL:**
1. Settings → **Database** → **Connection string** tab
2. Select **Transaction** pooler → copy the URI
3. Replace `[YOUR-PASSWORD]` with your project password → this is `DATABASE_URL`
4. Select **Session** pooler → copy → this is `DIRECT_URL`

**Run migrations:**
```bash
cd /path/to/realtypals/frontend
# Create .env.local from .env.example and fill in your DATABASE_URL and DIRECT_URL
npx prisma migrate deploy
npx prisma db seed
```

---

## Step 3 — Get Groq API key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / log in → **API Keys** → **Create API key**
3. Copy it — this is your `GROQ_API_KEY`

---

## Step 4 — Deploy Backend to Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Render auto-detects the `render.yaml` — click **Apply**
4. If it doesn't auto-detect, configure manually:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Node version:** 20

**Add environment variables in Render dashboard:**
Go to your service → **Environment** → add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `WEBHOOK_SECRET` | Generate a random 32-char string (see below) |
| `WEBHOOK_URL` | Your webhook target (e.g., CRM endpoint; optional) |
| `FRONTEND_URL` | Your Vercel URL (add this after Step 5) |
| `WHATSAPP_PROVIDER` | `none` (change to `meta` or `twilio` when ready) |

**Generate WEBHOOK_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output — use the same value in both Render and Vercel.

5. Deploy → wait ~3 minutes
6. Copy your Render service URL (e.g. `https://realtypals-backend.onrender.com`)

---

## Step 5 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo
3. Vercel detects the `vercel.json` at the root — no extra config needed

**Add environment variables in Vercel dashboard:**
Go to your project → **Settings** → **Environment Variables** → add all from `frontend/.env.example`:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Step 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Step 2 (same as NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) |
| `SUPABASE_SERVICE_ROLE_KEY` | From Step 2 |
| `DATABASE_URL` | From Step 2 (Transaction pooler) |
| `DIRECT_URL` | From Step 2 (Session pooler) |
| `GROQ_API_KEY` | From Step 3 |
| `WEBHOOK_URL` | `https://your-backend.onrender.com/api/v1/leads/webhook` (or external CRM endpoint) |
| `WEBHOOK_SECRET` | Same as Render's `WEBHOOK_SECRET` |
| `ADMIN_PASSWORD` | Any strong password for the admin panel |
| `ADMIN_PASSWORD` | Same or different — for admin auth |

Optional (add when ready):
| Key | Value |
|-----|-------|
| `UPSTASH_REDIS_REST_URL` | From [console.upstash.com](https://console.upstash.com) REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash REST token |
| `NEXT_PUBLIC_POSTHOG_KEY` | From [posthog.com](https://posthog.com) |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://app.posthog.com` |
| `TAVILY_API_KEY` | From [app.tavily.com](https://app.tavily.com) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | From Google Cloud Console |

4. Click **Deploy** → wait ~3-4 minutes
5. Your site is live at `https://your-project.vercel.app`

---

## Step 6 — Final wiring

After both deployments:

1. **Update Render:** Go to Render → Environment → set `FRONTEND_URL` to your Vercel URL
2. **Update Vercel:** If needed, update `NEXT_PUBLIC_APP_URL` and `WEBHOOK_URL` with actual URLs
3. **Redeploy both** if you changed env vars

---

## Step 7 — Set up WhatsApp notifications (when ready)

### Option A: Meta WhatsApp Cloud API (recommended, free)
1. Go to [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App
2. Add WhatsApp product → follow the setup wizard
3. Get your `Access Token`, `Phone Number ID`
4. In Render, set:
   - `WHATSAPP_PROVIDER=meta`
   - `META_WHATSAPP_TOKEN=your_token`
   - `META_PHONE_NUMBER_ID=your_id`
   - `META_RECIPIENT_NUMBER=91XXXXXXXXXX` (your sales team's number)

### Option B: Twilio (easiest sandbox test)
1. Sign up at [twilio.com](https://twilio.com)
2. Go to Messaging → Try WhatsApp Sandbox
3. In Render, set:
   - `WHATSAPP_PROVIDER=twilio`
   - `TWILIO_ACCOUNT_SID=ACxxxxxxx`
   - `TWILIO_AUTH_TOKEN=your_token`
   - `TWILIO_WHATSAPP_FROM=+14155238886`
   - `TWILIO_WHATSAPP_TO=+91XXXXXXXXXX`

---

## Useful commands

```bash
# Check TypeScript errors in frontend
cd frontend && npx tsc --noEmit

# Check TypeScript errors in backend
cd backend && npx tsc --noEmit

# Re-seed the database
cd frontend && npx prisma db seed

# View database in browser
cd frontend && npx prisma studio

# Run frontend locally
cd frontend && npm run dev

# Run backend locally (create backend/.env first)
cd backend && npm run dev
```

---

## Common issues

**"Function timeout" on chat route**
- On Vercel free plan, functions time out at 10s. Upgrade to Pro ($20/mo) or move the chat route to Render.
- The `vercel.json` sets `maxDuration: 60` which requires Vercel Pro.

**"Cannot find module '@prisma/client'"**
- Run `cd frontend && npx prisma generate` then redeploy.

**Render service sleeping**
- Free tier Render services sleep after 15 minutes of inactivity. The first request after sleep takes ~30s.
- Upgrade to a $7/mo instance for always-on.

**"Invalid DATABASE_URL"**
- Make sure you're using the Transaction pooler URL (port 6543) for `DATABASE_URL`, not the direct connection.
