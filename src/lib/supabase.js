import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente público (browser / SSR)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo – solo para API Routes / Server Actions
// NUNCA usar en componentes cliente (expone la service role key)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : supabase; // fallback al cliente normal si no hay service key

// Ya no se usa mock – todo va a Supabase real
export const isMocked = false;
