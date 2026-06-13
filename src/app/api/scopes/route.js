import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

/** GET /api/scopes */
export async function GET() {
  const { data, error } = await supabase.from('geographic_scopes').select('*');
  if (error) {
    console.error('Supabase get scopes error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}

/** POST /api/scopes */
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { type, region_name = null, province_name = null } = payload;
  if (!type) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('geographic_scopes')
    .insert([{ type, region_name, province_name }])
    .select();
  if (error) {
    console.error('Supabase insert scope error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
