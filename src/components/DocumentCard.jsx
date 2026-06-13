'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, FileText, Globe, Layers, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';


export default function DocumentCard({ doc, onFavoriteToggle }) {
  const [isFav, setIsFav] = useState(false);

  const scope = doc.geographic_scopes;
  const sector = doc.sectors;
  const version = doc.current_version;

  useEffect(() => {
    // Cargar estado de favorito desde localStorage si es mock
    const favs = JSON.parse(localStorage.getItem('fav_documents') || '[]');
    setIsFav(favs.includes(doc.id));
  }, [doc.id]);

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const favs = JSON.parse(localStorage.getItem('fav_documents') || '[]');
    let updatedFavs;
    if (favs.includes(doc.id)) {
      updatedFavs = favs.filter(id => id !== doc.id);
      setIsFav(false);
    } else {
      updatedFavs = [...favs, doc.id];
      setIsFav(true);
    }
    localStorage.setItem('fav_documents', JSON.stringify(updatedFavs));
    
    if (onFavoriteToggle) {
      onFavoriteToggle(doc.id, !isFav);
    }
  };

  // Color de badge de estado
  const getStatusBadge = (status) => {
    switch (status) {
      case 'vigente':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/20 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Vigente
          </span>
        );
      case 'ultraactividad':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Ultraactividad
          </span>
        );
      case 'derogado':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10 dark:bg-rose-950/20 dark:text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            Derogado
          </span>
        );
      default:
        return null;
    }
  };

  const getScopeLabel = () => {
    if (!scope) return 'Nacional';
    if (scope.type === 'nacional') return 'Nacional';
    if (scope.type === 'autonomico') return scope.region_name;
    if (scope.type === 'provincial') return `${scope.province_name} (${scope.region_name})`;
    return 'Nacional';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700">
      
      {/* Botón Favorito */}
      <button
        onClick={handleFavoriteClick}
        className="absolute right-4 top-4 z-10 rounded-full p-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-90"
        title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
      >
        <Heart className={`h-5 w-5 transition-transform group-hover:scale-105 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
      </button>

      <div>
        {/* Metadatos Superiores */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {version && getStatusBadge(version.status)}
          
          <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Globe className="h-3 w-3" />
            {getScopeLabel()}
          </span>
        </div>

        {/* Título & Descripción */}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors pr-6">
          <Link href={`/documentos/${doc.id}`} className="focus:outline-none">
            {doc.title}
          </Link>
        </h3>
        
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
          {doc.description || 'Sin descripción adicional disponible.'}
        </p>
      </div>

      {/* Info Inferior */}
      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Sector */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Layers className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-medium truncate max-w-[150px]">
              {sector ? sector.name : 'General'}
            </span>
          </div>

          {/* Fecha entrada en vigor */}
          {version && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span>Vigor: {formatDate(version.effective_from)}</span>
            </div>
          )}

        </div>

        {/* Botón Ver Documento */}
        <Link
          href={`/documentos/${doc.id}`}
          className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-zinc-50 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-red-50 hover:text-red-700 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:bg-red-950/20 dark:hover:text-red-400"
        >
          <span>Consultar Documento</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  );
}
