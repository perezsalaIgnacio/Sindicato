'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, FileText, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { isMocked, supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (isMocked) {
        // Simulación de envío de correo en modo desarrollo/mock
        console.log('Modo Simulación: Solicitud de reinicio para', email);
        setSuccess(true);
      } else {
        // Enviar correo de restablecimiento real con Supabase
        const redirectToUrl = `${window.location.origin}/reset-password`;
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: redirectToUrl }
        );
        if (resetErr) throw resetErr;
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Error al enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
      {/* Volver al login */}
      <Link 
        href="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Iniciar Sesión
      </Link>

      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
        {/* Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-2xl mb-3">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Recuperar Contraseña</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Introduce tu correo para recibir un enlace de restablecimiento
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
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">¡Correo enviado!</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Te hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada y la carpeta de correo no deseado.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-block px-6 py-2.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        ) : (
          /* Formulario */
          <form onSubmit={handleResetRequest} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-colors duration-200 mt-2 disabled:bg-zinc-400"
            >
              {loading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
