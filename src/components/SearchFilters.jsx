'use client';

import React, { useState, useEffect } from 'react';
import { Search, Globe, Layers, X } from 'lucide-react';
import { mockClient, isMocked, supabase } from '@/lib/supabase';

export default function SearchFilters({ onFilterChange }) {
  const [sectors, setSectors] = useState([]);
  const [scopes, setScopes] = useState([]);
  
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedScope, setSelectedScope] = useState('');

  useEffect(() => {
    async function loadFilters() {
      try {
        let sectorsData = [];
        let scopesData = [];
        
        if (isMocked) {
          sectorsData = await mockClient.getSectors();
          scopesData = await mockClient.getScopes();
        } else {
          const { data: sData } = await supabase.from('sectors').select('*');
          const { data: scData } = await supabase.from('geographic_scopes').select('*');
          sectorsData = sData || [];
          scopesData = scData || [];
        }
        
        setSectors(sectorsData);
        setScopes(scopesData);
      } catch (err) {
        console.error('Error al cargar filtros:', err);
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
    <div className="w-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 transition-all duration-300 hover:shadow-md">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Búsqueda de Texto */}
        <div className="relative md:col-span-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por título o descripción (ej: Estatuto, Panadería)..."
            className="block w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-4 text-sm bg-zinc-50/50 text-zinc-900 placeholder-zinc-500 outline-none transition-all focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:placeholder-zinc-600 dark:focus:border-red-500 dark:focus:bg-zinc-950 dark:focus:ring-red-950/30"
          />
        </div>

        {/* Selector de Sector */}
        <div className="relative md:col-span-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Layers className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <select
            value={selectedSector}
            onChange={handleSectorChange}
            className="block w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-3 text-sm bg-zinc-50/50 text-zinc-800 outline-none transition-all appearance-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:focus:border-red-500"
          >
            <option value="">Todos los sectores</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Selector de Ámbito */}
        <div className="relative md:col-span-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Globe className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <select
            value={selectedScope}
            onChange={handleScopeChange}
            className="block w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-3 text-sm bg-zinc-50/50 text-zinc-800 outline-none transition-all appearance-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:focus:border-red-500"
          >
            <option value="">Todos los ámbitos</option>
            {scopes.map((sc) => {
              let label = sc.type === 'nacional' ? 'Nacional' : '';
              if (sc.type === 'autonomico') label = `Autonómico - ${sc.region_name}`;
              if (sc.type === 'provincial') label = `Provincial - ${sc.province_name} (${sc.region_name})`;
              return (
                <option key={sc.id} value={sc.id}>
                  {label}
                </option>
              );
            })}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Limpiar Filtros */}
        <div className="flex items-center justify-end md:col-span-1">
          {hasFilters ? (
            <button
              onClick={handleClear}
              className="flex w-full md:w-auto items-center justify-center gap-1 rounded-xl border border-zinc-200 py-3 px-4 text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4" />
              <span className="md:hidden">Limpiar</span>
            </button>
          ) : (
            <div className="w-full h-full min-h-[44px] hidden md:block" />
          )}
        </div>
      </div>
    </div>
  );
}
