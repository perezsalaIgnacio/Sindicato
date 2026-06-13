'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ConvenioForm from '@/components/ConvenioForm';

export default function NuevoConvenioAdminPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/admin');
  };

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Nuevo Convenio</h1>
        <p className="text-sm text-zinc-500 mt-1">Crea un nuevo convenio colectivo o documento laboral</p>
      </div>
      <ConvenioForm onSuccess={handleSuccess} />
    </section>
  );
}
