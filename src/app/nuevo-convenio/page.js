'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ConvenioForm from '@/components/ConvenioForm';
import Navbar from '@/components/Navbar';

export default function NuevoConvenioPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Volver"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Nuevo Convenio</h1>
            <p className="text-sm text-zinc-500">Crea un nuevo convenio colectivo o documento laboral</p>
          </div>
        </div>
        <ConvenioForm onSuccess={handleSuccess} />
      </section>
    </div>
  );
}
