import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Opciones compartidas: desactivar Realtime para evitar intentos de reconexión
// WebSocket continuos cuando el proyecto está pausado o sin conexión.
const clientOptions = {
  realtime: { enabled: false },
  auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: true },
  global: {
    fetch: (...args) =>
      fetch(...args).catch((err) => {
        // Silenciar errores de red en consola del navegador; relanzar para que
        // los bloques try/catch de cada componente los gestionen.
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Supabase] Sin conexión –', err.message);
        }
        throw err;
      }),
  },
};

// Cliente público (browser / SSR)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

// Cliente administrativo – solo para API Routes / Server Actions
// NUNCA usar en componentes cliente (expone la service role key)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : supabase; // fallback al cliente normal si no hay service key

// Ya no se usa mock – todo va a Supabase real
export const isMocked = false;
