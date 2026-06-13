'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import SearchFilters from '@/components/SearchFilters';
import DocumentCard from '@/components/DocumentCard';
import { mockClient, isMocked, supabase } from '@/lib/supabase';
import { BookOpen, Star, History, Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [estatutoDoc, setEstatutoDoc] = useState(null);
  
  // Filtros activos
  const [filters, setFilters] = useState({ search: '', sector_id: '', scope_id: '' });

  // Carga inicial
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        let docs = [];
        if (isMocked) {
          docs = await mockClient.getDocuments();
        } else {
          // Cargar desde Supabase con relaciones
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
          
          // Formatear para que coincida con la estructura esperada por DocumentCard
          docs = (data || []).map(d => {
            const currentVersion = d.document_versions?.find(v => v.is_current) 
              || d.document_versions?.[0];
            return {
              ...d,
              sectors: d.sectors,
              geographic_scopes: d.geographic_scopes,
              current_version: currentVersion
            };
          });
        }

        setDocuments(docs);
        setFilteredDocs(docs);

        // Encontrar el Estatuto de los Trabajadores para el acceso rápido
        const estatuto = docs.find(d => d.title.toLowerCase().includes('estatuto de los trabajadores'));
        setEstatutoDoc(estatuto);

        // Cargar favoritos
        loadFavorites(docs);
      } catch (err) {
        console.error('Error al cargar documentos:', err);
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

  // Escuchar cambios de filtros
  const handleFilterChange = async (newFilters) => {
    setFilters(newFilters);
    
    // Aplicar filtros localmente para una respuesta ultra rápida y estética
    let results = [...documents];

    if (newFilters.search) {
      const q = newFilters.search.toLowerCase();
      results = results.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.description?.toLowerCase().includes(q)
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
    // Recargar favoritos cuando se cambia el estado en una tarjeta
    loadFavorites(documents);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Banner de Bienvenida / Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-red-600 via-red-700 to-amber-600 px-8 py-12 text-white shadow-xl dark:from-red-950/80 dark:via-zinc-900 dark:to-amber-950/40 mb-8 border border-red-500/10">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-64 w-64 rounded-full bg-white/5 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"></div>

          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-red-100 border border-white/10 mb-4 animate-pulse">
              <Sparkles className="h-3 w-3" /> Repositorio Laboral Oficial
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl leading-tight">
              Garantía Documental y Convenios Colectivos
            </h1>
            <p className="mt-4 text-base text-red-100/90 max-w-xl leading-relaxed">
              Consulta, descarga e investiga el Estatuto de los Trabajadores y las distintas versiones históricas de los convenios laborales vigentes en España de forma ágil y oficial.
            </p>
          </div>
        </div>

        {/* Panel de Tarjetas de Acceso Rápido */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 mb-10">
          
          {/* Tarjeta Estatuto (Principal) */}
          <div className="md:col-span-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col justify-between group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl">
                  <BookOpen className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-md">
                  Norma Estatal
                </span>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                Estatuto de los Trabajadores
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Acceso directo a la norma fundamental de las relaciones de trabajo. Revisa la versión actual de la Reforma Laboral o su historial de modificaciones.
              </p>
            </div>
            <div className="mt-6">
              {estatutoDoc ? (
                <Link
                  href={`/documentos/${estatutoDoc.id}`}
                  className="flex items-center justify-between w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-red-600 dark:bg-zinc-800 dark:hover:bg-red-700 transition-colors"
                >
                  <span>Consultar Estatuto Vigente</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="text-xs text-zinc-400">Estatuto de los Trabajadores no disponible</div>
              )}
            </div>
          </div>

          {/* Tarjeta Favoritos o Recientes */}
          <div className="md:col-span-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Mis Convenios Favoritos</h2>
              </div>
              
              <div className="space-y-3 overflow-y-auto max-h-[160px] pr-1">
                {favorites.length > 0 ? (
                  favorites.map(fav => (
                    <Link
                      key={fav.id}
                      href={`/documentos/${fav.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-red-50 hover:border-red-200 dark:border-zinc-800/40 dark:bg-zinc-950 dark:hover:bg-red-950/10 dark:hover:border-red-900/30 transition-all group/item"
                    >
                      <div className="truncate pr-4">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover/item:text-red-700 dark:group-hover/item:text-red-400">
                          {fav.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {fav.geographic_scopes?.type === 'nacional' ? 'Ámbito Nacional' : fav.geographic_scopes?.province_name || fav.geographic_scopes?.region_name}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover/item:text-red-600 transition-colors flex-shrink-0" />
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-400">
                    <p className="text-xs">No tienes convenios marcados como favoritos.</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Haz clic en el icono de corazón en las tarjetas para guardarlos aquí.</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Convenios Destacados en la parte inferior */}
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <History className="h-3.5 w-3.5 text-zinc-400" />
                Historial disponible en visor
              </span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {documents.length} documentos totales
              </span>
            </div>
          </div>

        </div>

        {/* Sección de Filtros y Búsqueda Global */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">Búsqueda de Documentación</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Usa filtros o palabras clave para encontrar convenios específicos.</p>
            </div>
            {filters.search || filters.sector_id || filters.scope_id ? (
              <span className="text-xs font-semibold px-2 py-1 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-md">
                Encontrados: {filteredDocs.length}
              </span>
            ) : null}
          </div>
          <SearchFilters onFilterChange={handleFilterChange} />
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-sm font-medium text-zinc-500">Cargando repositorio documental...</p>
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map((doc) => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                onFavoriteToggle={handleFavoriteToggleInCard} 
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white">No se encontraron documentos</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Prueba a cambiar los filtros o el término de búsqueda ingresado.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
