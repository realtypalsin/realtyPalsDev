import type { createBrowserClient } from '@supabase/ssr'

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>

let clientPromise: Promise<SupabaseBrowserClient> | null = null

// The Supabase SDK (auth + postgrest + realtime + storage clients) is a large,
// non-tree-shakeable bundle. This app only ever uses the auth module, so we
// load it lazily on first use instead of statically importing it into every
// route's initial JS — and cache one client for the life of the page so
// concurrent callers share a single GoTrueClient instead of each spinning up
// their own.
export function getSupabaseClient(): Promise<SupabaseBrowserClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/ssr').then(({ createBrowserClient }) => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      if (!url || !key) {
        console.warn('Supabase URL or Key is missing. Check your environment variables.');
      }
      return createBrowserClient(url, key)
    })
  }
  return clientPromise

}
