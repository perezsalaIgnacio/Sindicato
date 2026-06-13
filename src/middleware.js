import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Solo proteger rutas que empiecen con /admin
  if (pathname.startsWith('/admin')) {
    const isMocked = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Si estamos en modo de prueba/mocked, permitimos el acceso
    if (isMocked) {
      return NextResponse.next();
    }
    
    // En producción / Supabase real, verificamos la cookie de sesión
    // Nota: En una app real de Supabase se usaría @supabase/ssr middleware
    // para refrescar la sesión y verificar el rol.
    const token = request.cookies.get('sb-access-token');
    
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
