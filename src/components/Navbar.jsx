'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, ShieldAlert, User, LogOut, Layers, Heart } from 'lucide-react';
import { isMocked, supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (isMocked) {
      const savedUser = localStorage.getItem('simulated_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      } else {
        // No forzamos un login automático si el usuario cerró sesión explícitamente
        const isLoggedOut = localStorage.getItem('logged_out') === 'true';
        if (!isLoggedOut) {
          const defaultUser = { email: 'perezsalaignacio@gmail.com', role: 'admin', full_name: 'Ignacio Pérez Sala (Admin)' };
          localStorage.setItem('simulated_user', JSON.stringify(defaultUser));
          setCurrentUser(defaultUser);
        }
      }
    } else {
      // Sincronizar el usuario autenticado real
      const syncUser = async (session) => {
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (error) throw error;
            
            const userObj = {
              email: session.user.email,
              role: profile?.role || 'usuario',
              full_name: profile?.full_name || session.user.email.split('@')[0],
            };
            setCurrentUser(userObj);
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
          } catch (e) {
            console.error('Error fetching user profile:', e);
            const userObj = {
              email: session.user.email,
              role: 'usuario',
              full_name: session.user.email.split('@')[0],
            };
            setCurrentUser(userObj);
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
          }
        } else {
          setCurrentUser(null);
          document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure';
        }
      };

      // Obtener sesión activa inicial
      supabase.auth.getSession().then(({ data: { session } }) => {
        syncUser(session);
      });

      // Escuchar cambios de autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        syncUser(session);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleRoleChange = (role) => {
    const updatedUser = {
      ...currentUser,
      role: role,
      email: role === 'admin' ? 'perezsalaignacio@gmail.com' : 'usuario@sindicato.org',
      full_name: role === 'admin' ? 'Ignacio Pérez Sala (Admin)' : 'Juan Pérez'
    };
    localStorage.setItem('simulated_user', JSON.stringify(updatedUser));
    localStorage.removeItem('logged_out');
    setCurrentUser(updatedUser);
    setShowRoleSelector(false);
    window.location.reload(); // Recargar para aplicar cambios de rol en toda la UI
  };

  const handleSignOut = async () => {
    if (isMocked) {
      localStorage.removeItem('simulated_user');
      localStorage.setItem('logged_out', 'true');
      setCurrentUser(null);
      window.location.href = '/login';
    } else {
      const { supabase: supabaseClient } = await import('@/lib/supabase');
      await supabaseClient.auth.signOut();
      window.location.href = '/login';
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-red-600 dark:text-red-500 hover:opacity-90 transition-opacity">
              <span className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <FileText className="h-6 w-6" />
              </span>
              <span>Sindi<span className="text-zinc-900 dark:text-white">Doc</span></span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              Gestor Laboral
            </span>
          </div>

          {/* Menú de Navegación */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${
                pathname === '/' 
                  ? 'text-red-600 dark:text-red-500' 
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              Dashboard
            </Link>
            {currentUser?.role === 'admin' && (
              <Link 
                href="/admin" 
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  pathname === '/admin' 
                    ? 'text-red-600 dark:text-red-500' 
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                Panel Admin
              </Link>
            )}
          </div>

          {/* Usuario y Selector de Roles Mock */}
          <div className="flex items-center gap-4">
            {isMocked && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleSelector(!showRoleSelector)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
                >
                  <span>Simular: </span>
                  <span className={`capitalize font-bold ${currentUser?.role === 'admin' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {currentUser?.role || 'Cargando...'}
                  </span>
                </button>

                {showRoleSelector && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <button
                      onClick={() => handleRoleChange('usuario')}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                    >
                      <User className="h-4 w-4 text-blue-500" />
                      Rol: Usuario Lector
                    </button>
                    <button
                      onClick={() => handleRoleChange('admin')}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                    >
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      Rol: Admin/Delegado
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 border-l border-zinc-200 pl-4 dark:border-zinc-800 text-left focus:outline-none"
                >
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {currentUser?.full_name || 'Cargando...'}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {currentUser?.email || ''}
                    </span>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-sm hover:ring-2 hover:ring-red-500 transition-all">
                    {currentUser?.full_name?.charAt(0) || 'U'}
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-xl ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-1.5">
                      <p className="text-xs text-zinc-400">Sesión iniciada como</p>
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{currentUser.full_name}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{currentUser.email}</p>
                    </div>
                    {currentUser.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                      >
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                        Panel de Administración
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
