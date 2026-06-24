'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, ShieldAlert, User, LogOut, WifiOff, Sun, Moon } from 'lucide-react';
import { isMocked, supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const goOnline = () => setIsOffline(false);
      const goOffline = () => setIsOffline(true);
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (isMocked) {
      const savedUser = localStorage.getItem('simulated_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      } else {
        const isLoggedOut = localStorage.getItem('logged_out') === 'true';
        if (!isLoggedOut) {
          const defaultUser = { email: 'perezsalaignacio@gmail.com', role: 'admin', full_name: 'Ignacio Pérez Sala' };
          localStorage.setItem('simulated_user', JSON.stringify(defaultUser));
          setCurrentUser(defaultUser);
        }
      }
    } else {
      const syncUser = async (session) => {
        if (session?.user) {
          try {
            let profileData = null;
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) {
              if (error.code === 'PGRST116') {
                const newProfile = {
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                  role: 'usuario'
                };
                const { data: insertedProfile, error: insertError } = await supabase
                  .from('profiles')
                  .insert(newProfile)
                  .select()
                  .single();

                if (!insertError) profileData = insertedProfile;
              } else {
                throw error;
              }
            } else {
              profileData = profile;
            }

            const userObj = {
              email: session.user.email,
              role: profileData?.role || 'usuario',
              full_name: profileData?.full_name || session.user.email.split('@')[0],
            };
            setCurrentUser(userObj);

            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax${isLocalhost ? '' : '; Secure'}`;
          } catch (e) {
            console.error('Error fetching user profile:', e.message || e);
            const userObj = {
              email: session.user.email,
              role: 'usuario',
              full_name: session.user.email.split('@')[0],
            };
            setCurrentUser(userObj);
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax${isLocalhost ? '' : '; Secure'}`;
          }
        } else {
          setCurrentUser(null);
          const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax${isLocalhost ? '' : '; Secure'}`;
        }
      };

      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          syncUser(session);
        })
        .catch(() => {
          // Supabase no disponible (proyecto pausado o sin conexión)
        });

      let subscription;
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          syncUser(session);
        });
        subscription = data.subscription;
      } catch {
        // Supabase no disponible
      }

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  const handleRoleChange = (role) => {
    const updatedUser = {
      ...currentUser,
      role: role,
      email: role === 'admin' ? 'perezsalaignacio@gmail.com' : 'usuario@sindicato.org',
      full_name: role === 'admin' ? 'Ignacio Pérez Sala' : 'Juan Pérez'
    };
    localStorage.setItem('simulated_user', JSON.stringify(updatedUser));
    localStorage.removeItem('logged_out');
    setCurrentUser(updatedUser);
    setShowRoleSelector(false);
    window.location.reload();
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

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    ...(currentUser?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: ShieldAlert }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold text-zinc-900 dark:text-white hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <span className="flex items-center justify-center h-7 w-7 bg-red-600 text-white rounded-lg">
                <FileText className="h-4 w-4" />
              </span>
              <span className="text-sm font-extrabold tracking-tight">
                Sindi<span className="text-red-600">Doc</span>
              </span>
            </Link>

            {isOffline && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/15 dark:border-amber-500/15">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                <WifiOff className="h-3 w-3" />
                <span className="hidden sm:inline">Sin Conexión</span>
              </span>
            )}
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === link.href
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                {link.icon && <link.icon className="h-3.5 w-3.5" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
              title="Alternar tema claro/oscuro"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-500 fill-amber-500/20" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-600 fill-zinc-100" />
              )}
            </button>

            {/* Selector de rol simulado */}
            {isMocked && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleSelector(!showRoleSelector)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${currentUser?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <span>{currentUser?.role === 'admin' ? 'Admin' : 'Usuario'}</span>
                </button>

                {showRoleSelector && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Simular rol</p>
                    </div>
                    {[
                      { role: 'usuario', label: 'Usuario Lector', color: 'bg-blue-500' },
                      { role: 'admin', label: 'Admin / Delegado', color: 'bg-red-500' },
                    ].map(item => (
                      <button
                        key={item.role}
                        onClick={() => handleRoleChange(item.role)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${currentUser?.role === item.role ? 'bg-zinc-50 dark:bg-zinc-800 font-bold' : ''}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${item.color} flex-shrink-0`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Perfil */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800 focus:outline-none"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
                      {currentUser?.full_name}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {currentUser?.role === 'admin' ? 'Administrador' : 'Lector'}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {currentUser?.full_name?.charAt(0) || 'U'}
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{currentUser.full_name}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{currentUser.email}</p>
                    </div>
                    {currentUser.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                        Panel de Administración
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
