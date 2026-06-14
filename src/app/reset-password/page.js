'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { isMocked, supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Opcional: Podríamos verificar si hay una sesión activa de recuperación,
  // pero Supabase se encarga de esto bajo el capó.
  useEffect(() => {
    // Si no está mockeado, verificamos que el hash de la URL contenga el token de recuperación
    // o al menos que el usuario sea redirigido por Supabase.
    if (!isMocked) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        // En algunos casos, si no hay sesión, podríamos mostrar una advertencia.
        // Pero a veces el hash se procesa asíncronamente por el cliente de supabase,
        // por lo que no forzamos la redirección inmediatamente para evitar falsos negativos.
      });
    }
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    try {
      if (isMocked) {
        // Simulación en modo desarrollo/mock
        console.log('Modo Simulación: Contraseña actualizada correctamente');
        setSuccess(true);
      } else {
        // Actualizar contraseña con Supabase
        const { error: updateErr } = await supabase.auth.updateUser({
          password: password
        });
        if (updateErr) throw updateErr;
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
        {/* Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-2xl mb-3">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Nueva Contraseña</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Ingresa tu nueva contraseña para actualizar tu cuenta
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 flex items-start gap-2 mb-6">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Mensaje de éxito */}
        {success ? (
          <div className="text-center space-y-4 py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">¡Contraseña restablecida!</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  // Cerrar sesión para limpiar el estado de recuperación y redirigir
                  if (!isMocked) supabase.auth.signOut();
                  router.push('/login');
                }}
                className="w-full py-3 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Ir a Iniciar Sesión
              </button>
            </div>
          </div>
        ) : (
          /* Formulario */
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-colors duration-200 mt-4 disabled:bg-zinc-400"
            >
              {loading ? 'Guardando contraseña...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
