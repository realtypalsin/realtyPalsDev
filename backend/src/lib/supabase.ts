// backend/src/lib/supabase.ts
// Service-role Supabase client for server-side storage and admin operations.
import { createClient } from '@supabase/supabase-js'
import { WebSocket as NodeWebSocket } from 'ws'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? 'http://localhost:54321'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dummy-service-role-key'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY not set — storage operations will fail')
}

// Pass a WebSocket implementation so Supabase Realtime works on Node <22
// (Node 22+ ships native WebSocket; ws provides it for older runtimes)
export const supabaseAdmin = createClient(url, key, {
  realtime: {
    transport: NodeWebSocket as unknown as typeof WebSocket,
  },
})
