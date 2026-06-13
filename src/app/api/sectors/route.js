import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Supabase client – env vars expected
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

/**
 * GET /api/sectors
 * Returns list of sectors (id, name, slug).
 * Requires admin role (enforced by middleware on /admin routes).
 */
export async function GET() {
  const { data, error } = await supabase
    .from('sectors')
    .select('id, name, slug');
  if (error) {
    console.error('Supabase GET sectors error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}

/**
 * POST /api/sectors
 * Body JSON: { name: string, slug: string }
 * Creates a new sector. Admin only.
 */
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { name, slug } = payload;
  if (!name || !slug) {
    return NextResponse.json({ error: 'Missing name or slug' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('sectors')
    .insert([{ name, slug }]);
  if (error) {
    console.error('Supabase insert sector error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
