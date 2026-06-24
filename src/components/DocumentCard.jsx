'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Globe, Layers, Calendar, ChevronRight, Tag } from 'lucide-react';

export default function DocumentCard({ doc, onFavoriteToggle }) {
  const [isFav, setIsFav] = useState(false);

  const scope = doc.geographic_scopes;
  const sector = doc.sectors;
  const version = doc.current_version;

  useEffect(() => {
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

  const STATUS_CONFIG = {
    vigente: { label: 'Vigente', dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600/10' },
    ultraactividad: { label: 'Ultraactividad', dot: 'bg-amber-500', badge: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-600/10' },
    derogado: { label: 'Derogado', dot: 'bg-zinc-400', badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 ring-1 ring-zinc-300/30 dark:ring-zinc-700/30' },
  };

  const statusCfg = version?.status ? STATUS_CONFIG[version.status] : null;

  const getScopeLabel = () => {
    if (!scope) return 'Nacional';
    if (scope.type === 'nacional') return 'Nacional';
    if (scope.type === 'autonomico') return scope.region_name;
    if (scope.type === 'provincial') return `${scope.province_name}`;
    return 'Nacional';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="group relative flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200 overflow-hidden">

      {/* Barra de estado superior */}
      {statusCfg && (
        <div className={`h-0.5 w-full ${statusCfg.dot}`} />
      )}

      <div className="flex flex-col flex-1 p-4">

        {/* Header: badges + favorito */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusCfg && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCfg.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
              <Globe className="h-2.5 w-2.5" />
              {getScopeLabel()}
            </span>
          </div>
          <button
            onClick={handleFavoriteClick}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
              isFav
                ? 'text-red-500 bg-red-50 dark:bg-red-950/20'
                : 'text-zinc-300 dark:text-zinc-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/15'
            }`}
            title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Título */}
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
          <Link href={`/documentos/${doc.id}`} className="focus:outline-none">
            {doc.title}
          </Link>
        </h3>

        {/* Descripción */}
        {doc.description && (
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed flex-1">
            {doc.description}
          </p>
        )}

        {/* Metadatos inferiores */}
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {sector && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Tag className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                <span className="truncate max-w-[110px]">{sector.name}</span>
              </div>
            )}
            {version?.effective_from && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Calendar className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                <span>{formatDate(version.effective_from)}</span>
              </div>
            )}
          </div>
          <Link
            href={`/documentos/${doc.id}`}
            className="flex-shrink-0 flex items-center gap-0.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Ver <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
