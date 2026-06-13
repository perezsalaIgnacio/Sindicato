import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Supabase client – expects env variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

/**
 * PATCH /api/versions/:id
 * Body JSON: { status?, version_name?, file_path?, published_at?, effective_from? }
 * Requires admin role (checked via middleware). Updates the specified fields.
 */
export async function PATCH(request, { params }) {
  const { id } = params; // version UUID
  if (!id) {
    return NextResponse.json({ error: 'Version id missing' }, { status: 400 });
  }
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const allowedFields = ['status', 'version_name', 'file_path', 'published_at', 'effective_from'];
  const updateData = {};
  for (const key of allowedFields) {
    if (payload[key] !== undefined) {
      updateData[key] = payload[key];
    }
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  // If only status is being changed, use the PL/pgSQL function for proper cascade logic
  if (Object.keys(updateData).length === 1 && updateData.status !== undefined) {
    const { error } = await supabase.rpc('set_version_status', {
      p_version_id: id,
      p_new_status: updateData.status,
    });
    if (error) {
      console.error('RPC error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Status updated via function' }, { status: 200 });
  }

  const { data, error } = await supabase
    .from('document_versions')
    .update(updateData)
    .eq('id', id);
  if (error) {
    console.error('Supabase update error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: data }, { status: 200 });
}

// For completeness, also allow GET to fetch a single version
export async function GET(request, { params }) {
  const { id } = params;
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}
