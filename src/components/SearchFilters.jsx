'use client';

import React, { useState, useEffect } from 'react';
import { Search, Globe, Layers, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SearchFilters({ onFilterChange }) {
  const [sectors, setSectors] = useState([]);
  const [scopes, setScopes] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedScope, setSelectedScope] = useState('');

  useEffect(() => {
    async function loadFilters() {
      try {
        const { data: sData } = await supabase.from('sectors').select('*').order('name');
        const { data: scData } = await supabase.from('geographic_scopes').select('*').order('type');
        setSectors(sData || []);
        setScopes(scData || []);
      } catch (err) {
        // Silenciar errores de red (e.g. Supabase pausado)
        if (!err?.message?.includes('fetch')) {
          console.warn('Error al cargar filtros:', err);
        }
      }
    }
    loadFilters();
  }, []);

  const handleApply = (newSearch, newSector, newScope) => {
    onFilterChange({
      search: newSearch,
      sector_id: newSector,
      scope_id: newScope
    });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    handleApply(val, selectedSector, selectedScope);
  };

  const handleSectorChange = (e) => {
    const val = e.target.value;
    setSelectedSector(val);
    handleApply(search, val, selectedScope);
  };

  const handleScopeChange = (e) => {
    const val = e.target.value;
    setSelectedScope(val);
    handleApply(search, selectedSector, val);
  };

  const handleClear = () => {
    setSearch('');
    setSelectedSector('');
    setSelectedScope('');
    onFilterChange({ search: '', sector_id: '', scope_id: '' });
  };

  const hasFilters = search || selectedSector || selectedScope;

  return (
    <div className="flex flex-wrap gap-2.5">
      {/* Búsqueda de texto */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar convenios..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all"
        />
      </div>

      {/* Sector */}
      <div className="relative min-w-[180px]">
        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <select
          value={selectedSector}
          onChange={handleSectorChange}
          className="w-full appearance-none pl-9 pr-8 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all cursor-pointer"
        >
          <option value="">Todos los sectores</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Ámbito geográfico */}
      <div className="relative min-w-[200px]">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <select
          value={selectedScope}
          onChange={handleScopeChange}
          className="w-full appearance-none pl-9 pr-8 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all cursor-pointer"
        >
          <option value="">Todos los ámbitos</option>
          {scopes.map((sc) => {
            let label = '';
            if (sc.type === 'nacional') label = 'Nacional';
            else if (sc.type === 'autonomico') label = `Autonómico — ${sc.region_name}`;
            else if (sc.type === 'provincial') label = `Provincial — ${sc.province_name}`;
            return <option key={sc.id} value={sc.id}>{label}</option>;
          })}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Limpiar filtros */}
      {hasFilters && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-red-200 dark:hover:border-red-900/40 transition-colors"
          title="Limpiar filtros"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Limpiar</span>
        </button>
      )}
    </div>
  );
}
