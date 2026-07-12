// backend/src/lib/supabase.ts
// Service-role Supabase client for server-side storage and admin operations.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!key) {
  console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY not set — storage operations will fail')
}

export const supabaseAdmin = createClient(url, key)
