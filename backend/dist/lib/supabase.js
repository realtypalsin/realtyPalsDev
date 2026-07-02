"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
// backend/src/lib/supabase.ts
// Service-role Supabase client for server-side storage and admin operations.
const supabase_js_1 = require("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!key) {
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY not set — storage operations will fail');
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(url, key);
