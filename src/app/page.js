'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import SearchFilters from '@/components/SearchFilters';
import DocumentCard from '@/components/DocumentCard';
import { supabase } from '@/lib/supabase';
import { BookOpen, Star, History, Sparkles, ArrowUpRight, Loader2, FileText, TrendingUp, Shield } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [estatutoDoc, setEstatutoDoc] = useState(null);
  const [filters, setFilters] = useState({ search: '', sector_id: '', scope_id: '' });
  const [isOffline, setIsOffline] = useState(false);

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
    async function loadInitialData() {
      // 1. Cargar datos desde caché local para acceso inmediato
      const cached = localStorage.getItem('cached_documents');
      let initialDataLoaded = false;
      if (cached) {
        try {
          const parsedDocs = JSON.parse(cached);
          setDocuments(parsedDocs);
          setFilteredDocs(parsedDocs);
          const estatuto = parsedDocs.find(d => d.title.toLowerCase().includes('estatuto de los trabajadores'));
          setEstatutoDoc(estatuto);
          loadFavorites(parsedDocs);
          setLoading(false);
          initialDataLoaded = true;
        } catch (e) {
          console.error('Error al analizar documentos de caché local:', e);
        }
      }

      if (!initialDataLoaded) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from('documents')
          .select(`
            *,
            sectors (*),
            geographic_scopes (*),
            document_versions (*)
          `)
          .eq('is_active', true);

        if (error) throw error;

        const docs = (data || []).map(d => {
          const currentVersion = d.document_versions?.find(v => v.is_current)
            || d.document_versions?.[0];
          return {
            ...d,
            sectors: d.sectors,
            geographic_scopes: d.geographic_scopes,
            current_version: currentVersion
          };
        });

        // Guardar copia fresca en caché local
        localStorage.setItem('cached_documents', JSON.stringify(docs));

        setDocuments(docs);
        setFilteredDocs(docs);

        const estatuto = docs.find(d => d.title.toLowerCase().includes('estatuto de los trabajadores'));
        setEstatutoDoc(estatuto);

        loadFavorites(docs);
      } catch (err) {
        if (!err?.message?.includes('fetch')) {
          console.warn('Error al cargar documentos desde red:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  const loadFavorites = (allDocs) => {
    const favIds = JSON.parse(localStorage.getItem('fav_documents') || '[]');
    const favDocs = allDocs.filter(d => favIds.includes(d.id));
    setFavorites(favDocs);
  };

  const handleFilterChange = async (newFilters) => {
    setFilters(newFilters);
    let results = [...documents];

    if (newFilters.search) {
      const normalize = (str) =>
        (str || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
      const q = normalize(newFilters.search);
      results = results.filter(d =>
        normalize(d.title).includes(q) ||
        normalize(d.description).includes(q)
      );
    }

    if (newFilters.sector_id) {
      results = results.filter(d => d.sector_id === Number(newFilters.sector_id));
    }

    if (newFilters.scope_id) {
      results = results.filter(d => d.scope_id === Number(newFilters.scope_id));
    }

    setFilteredDocs(results);
  };

  const handleFavoriteToggleInCard = () => {
    loadFavorites(documents);
  };

  const vigentes = documents.filter(d => d.current_version?.status === 'vigente').length;
  const ultraactividad = documents.filter(d => d.current_version?.status === 'ultraactividad').length;
  const hasActiveFilters = filters.search || filters.sector_id || filters.scope_id;

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
        {isOffline && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <div className="text-xs">
              <span className="font-bold">Modo sin conexión activo.</span> Estás viendo una versión guardada localmente del repositorio. Algunas funciones como la edición de convenios no están disponibles.
            </div>
          </div>
        )}


        {/* Accesos Rápidos */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Estatuto de los Trabajadores */}
          <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">
                Estatal
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                Estatuto de los Trabajadores
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Norma fundamental de las relaciones laborales. Texto consolidado y vigente.
              </p>
            </div>
            {estatutoDoc ? (
              <Link
                href={`/documentos/${estatutoDoc.id}`}
                className="mt-auto flex items-center justify-between w-full rounded-lg bg-zinc-900 dark:bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
              >
                <span>Consultar texto vigente</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <div className="mt-auto text-xs text-zinc-400">No disponible</div>
            )}
          </div>

          {/* Favoritos */}
          <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Mis Favoritos</h2>
              {favorites.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                  {favorites.length}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[130px]">
              {favorites.length > 0 ? (
                favorites.map(fav => (
                  <Link
                    key={fav.id}
                    href={`/documentos/${fav.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-red-50 dark:hover:bg-red-950/15 transition-colors group/item border border-transparent hover:border-red-100 dark:hover:border-red-900/20"
                  >
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate group-hover/item:text-red-700 dark:group-hover/item:text-red-400">
                      {fav.title}
                    </p>
                    <ArrowUpRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600 group-hover/item:text-red-500 flex-shrink-0 ml-2" />
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                  <Star className="h-5 w-5 text-zinc-200 dark:text-zinc-700 mb-1.5" />
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Sin favoritos guardados</p>
                  <p className="text-[10px] text-zinc-300 dark:text-zinc-600 mt-0.5">Pulsa el corazón en las tarjetas</p>
                </div>
              )}
            </div>
          </div>

          {/* Resumen / Estadísticas */}
          <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Estado del Repositorio</h2>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Vigentes</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{vigentes}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Ultraactividad</span>
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{ultraactividad}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Total documentos</span>
                </div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{documents.length}</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
              <History className="h-3 w-3" />
              <span>Historial completo en cada documento</span>
            </div>
          </div>

        </div>

        {/* Búsqueda y Filtros */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-white">Todos los Convenios</h2>
              {!loading && (
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  {hasActiveFilters ? `${filteredDocs.length} resultados` : `${documents.length} documentos`}
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded border border-red-100 dark:border-red-900/30">
                Filtro activo
              </span>
            )}
          </div>
          <SearchFilters onFilterChange={handleFilterChange} />
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-red-600" />
            <p className="text-xs font-medium text-zinc-500">Cargando repositorio documental...</p>
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onFavoriteToggle={handleFavoriteToggleInCard}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Sin resultados</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
              No se encontraron documentos con los filtros actuales. Prueba a cambiar los criterios de búsqueda.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
