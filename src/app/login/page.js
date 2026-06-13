'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, FileText, ArrowLeft, AlertCircle } from 'lucide-react';
import { isMocked, supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si ya hay sesión en mock o real, redirigir al dashboard
    if (isMocked) {
      const user = localStorage.getItem('simulated_user');
      if (user) {
        // Opcional: auto-redirigir si ya está logueado
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isMocked) {
        // Iniciar sesión en modo simulación
        const lowerEmail = email.toLowerCase().trim();
        const isAdmin = lowerEmail === 'perezsalaignacio@gmail.com' || lowerEmail === 'delegado@sindicato.org';
        
        const simulatedUser = {
          email: email || 'perezsalaignacio@gmail.com',
          role: isAdmin ? 'admin' : 'usuario',
          full_name: isAdmin ? 'Ignacio Pérez Sala (Admin)' : 'Juan Pérez'
        };
        localStorage.setItem('simulated_user', JSON.stringify(simulatedUser));
        router.push('/');
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        // Autenticación real con Supabase
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (authErr) throw authErr;
        router.push('/');
      }
    } catch (err) {
      setError(err.message || 'Error de inicio de sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = (role) => {
    const user = {
      email: role === 'admin' ? 'perezsalaignacio@gmail.com' : 'usuario@sindicato.org',
      role: role,
      full_name: role === 'admin' ? 'Ignacio Pérez Sala (Admin)' : 'Juan Pérez'
    };
    localStorage.setItem('simulated_user', JSON.stringify(user));
    router.push('/');
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
      {/* Volver al inicio */}
      <button 
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al Inicio
      </button>

      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
        {/* Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-2xl mb-3">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Acceso al Sistema</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Sindicato de Trabajadores - Repositorio Documental</p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 flex items-start gap-2 mb-6">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4.5 w-4.5 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@sindicato.org"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4.5 w-4.5 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-colors duration-200 mt-2 disabled:bg-zinc-400"
          >
            {loading ? 'Accediendo...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Acceso Rápido / Simulación si es Mock */}
        {isMocked && (
          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/80">
            <p className="text-[11px] font-bold text-zinc-400 text-center uppercase tracking-wider mb-4">
              Entornos de Desarrollo / Simulación
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleMockLogin('usuario')}
                className="px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                Lector Comun
              </button>
              <button
                type="button"
                onClick={() => handleMockLogin('admin')}
                className="px-3 py-2.5 rounded-xl bg-zinc-950 text-xs font-semibold text-white hover:bg-red-600 dark:bg-zinc-800 dark:hover:bg-red-700 transition-colors"
              >
                Admin / Delegado
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
