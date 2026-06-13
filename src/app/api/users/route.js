import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Requires SUPABASE_SERVICE_ROLE_KEY (server-only, never exposed to client)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

export async function POST(request) {
  try {
    const { email, password, full_name, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 });
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '', role: role || 'usuario' },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Upsert profile (trigger should have created it, but just in case)
    await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email,
      full_name: full_name || '',
      role: role || 'usuario',
    });

    return NextResponse.json({ user: authData.user }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
