'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PdfViewer from '@/components/PdfViewer';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Calendar, FileText, Clock, Plus,
  Layers, Globe, ShieldAlert, Award, Loader2,
  CheckCircle, AlertCircle, MinusCircle, Info
} from 'lucide-react';

export default function DocumentoViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id;

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [userRole, setUserRole] = useState('usuario');
  const [isOffline, setIsOffline] = useState(false);

  const [showEditVersionModal, setShowEditVersionModal] = useState(false);

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

  const [versionEditForm, setVersionEditForm] = useState({
    id: '',
    version_name: '',
    published_at: '',
    effective_from: '',
    status: 'vigente',
    is_current: false,
    file_path: ''
  });

  const openEditVersionModal = (ver) => {
    setVersionEditForm({
      id: ver.id,
      version_name: ver.version_name,
      published_at: ver.published_at || '',
      effective_from: ver.effective_from || '',
      status: ver.status || 'vigente',
      is_current: ver.is_current || false,
      file_path: ver.file_path || ''
    });
    setShowEditVersionModal(true);
  };

  const handleUpdateVersion = async (e) => {
    e.preventDefault();
    if (isOffline) {
      alert('No puedes editar versiones sin conexión a internet.');
      return;
    }
    try {
      if (versionEditForm.is_current) {
        await supabase
          .from('document_versions')
          .update({ is_current: false })
          .eq('document_id', docId);
      }

      const { error } = await supabase
          .from('document_versions')
          .update({
            version_name: versionEditForm.version_name,
            file_path: versionEditForm.file_path,
            published_at: versionEditForm.published_at,
            effective_from: versionEditForm.effective_from,
            status: versionEditForm.status,
            is_current: versionEditForm.is_current
          })
          .eq('id', versionEditForm.id);

      if (error) throw error;

      setShowEditVersionModal(false);
      window.location.reload();
    } catch (err) {
      alert('Error al actualizar la versión: ' + err.message);
    }
  };

  useEffect(() => {
    const simulatedUser = localStorage.getItem('simulated_user');
    if (simulatedUser) {
      setUserRole(JSON.parse(simulatedUser).role);
    }

    async function loadDocument() {
      const cacheKey = `cached_document_${docId}`;
      const cached = localStorage.getItem(cacheKey);
      let initialDataLoaded = false;
      if (cached) {
        try {
          const parsedDoc = JSON.parse(cached);
          setDocument(parsedDoc);
          const current = parsedDoc.versions?.find(v => v.is_current) || parsedDoc.versions?.[0];
          setSelectedVersion(current);
          setLoading(false);
          initialDataLoaded = true;
        } catch (e) {
          console.error('Error al analizar documento de caché local:', e);
        }
      }

      if (!initialDataLoaded) {
        setLoading(true);
      }

      try {
        const { data: doc, error } = await supabase
          .from('documents')
          .select(`
            *,
            sectors (*),
            geographic_scopes (*),
            document_versions (*)
          `)
          .eq('id', docId)
          .single();

        if (error) throw error;

        if (doc) {
          const versionsSorted = (doc.document_versions || []).sort(
            (a, b) => new Date(b.effective_from) - new Date(a.effective_from)
          );
          const docData = {
            ...doc,
            sectors: doc.sectors,
            geographic_scopes: doc.geographic_scopes,
            versions: versionsSorted
          };

          // Guardar en la caché local
          localStorage.setItem(cacheKey, JSON.stringify(docData));

          setDocument(docData);
          const current = docData.versions?.find(v => v.is_current) || docData.versions?.[0];
          setSelectedVersion(current);
        }
      } catch (err) {
        if (!err?.message?.includes('fetch')) {
          console.warn('Error al cargar documento desde la red:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    if (docId) loadDocument();
  }, [docId]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const STATUS_CONFIG = {
    vigente: {
      label: 'Vigente',
      icon: CheckCircle,
      badgeCls: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600/10',
      dotCls: 'bg-emerald-500',
    },
    ultraactividad: {
      label: 'Ultraactividad',
      icon: AlertCircle,
      badgeCls: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-600/10',
      dotCls: 'bg-amber-500',
    },
    derogado: {
      label: 'Derogado',
      icon: MinusCircle,
      badgeCls: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 ring-1 ring-zinc-200 dark:ring-zinc-700',
      dotCls: 'bg-zinc-400',
    },
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.badgeCls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotCls}`} />
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
          <p className="text-sm text-zinc-500 font-medium">Cargando visor documental...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <FileText className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Documento no encontrado</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const scopeLabel = document.geographic_scopes?.type === 'nacional'
    ? 'Nacional'
    : document.geographic_scopes?.province_name || document.geographic_scopes?.region_name || 'Nacional';

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 sm:px-6 lg:px-8 flex flex-col gap-4">
        {isOffline && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-3 text-amber-600 dark:text-amber-400 flex-shrink-0">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <div className="text-xs">
              <span className="font-bold">Modo sin conexión activo.</span> Estás visualizando la versión guardada localmente de este documento. No puedes modificar ni crear nuevas versiones hasta recuperar la conexión.
            </div>
          </div>
        )}

        {/* Cabecera */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => router.push('/')}
                className="mt-0.5 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {document.sectors?.name && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      <Layers className="h-3 w-3" />
                      {document.sectors.name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <Globe className="h-3 w-3" />
                    {scopeLabel}
                  </span>
                  {selectedVersion && getStatusBadge(selectedVersion.status)}
                </div>
                <h1 className="text-lg font-extrabold text-zinc-900 dark:text-white leading-tight">
                  {document.title}
                </h1>
                {document.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-2xl">
                    {document.description}
                  </p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => !isOffline && router.push(`/admin?edit_id=${document.id}`)}
                disabled={isOffline}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-colors ${
                  isOffline ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
                }`}
                title={isOffline ? 'No disponible sin conexión' : 'Editar convenio'}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-zinc-500" />
                Editar convenio
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={() => !isOffline && router.push(`/admin?document_id=${document.id}`)}
                  disabled={isOffline}
                  className={`flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-bold transition-colors ${
                    isOffline ? 'bg-zinc-500 opacity-40 cursor-not-allowed' : 'bg-zinc-900 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700'
                  }`}
                  title={isOffline ? 'No disponible sin conexión' : 'Nueva versión'}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva versión
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">

          {/* Visor PDF */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col min-h-[500px] md:min-h-[600px]">
            {selectedVersion ? (
              <PdfViewer
                fileUrl={selectedVersion.file_path}
                versionName={selectedVersion.version_name}
                title={document.title}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Sin versiones disponibles</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Este documento no tiene archivos PDF cargados.</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Control de versiones */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-3">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">

              {/* Header sidebar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <Clock className="h-4 w-4 text-zinc-400" />
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Control de Versiones</h3>
                  <p className="text-[10px] text-zinc-400">{document.versions?.length || 0} versiones registradas</p>
                </div>
              </div>

              {/* Lista de versiones */}
              <div className="overflow-y-auto max-h-[420px] p-3 space-y-2">
                {document.versions && document.versions.length > 0 ? (
                  document.versions.map((ver) => {
                    const isSelected = selectedVersion?.id === ver.id;
                    const vCfg = STATUS_CONFIG[ver.status];
                    return (
                      <div
                        key={ver.id}
                        onClick={() => setSelectedVersion(ver)}
                        className={`group cursor-pointer rounded-lg border p-3 transition-all relative ${
                          isSelected
                            ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10'
                            : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-red-500 rounded-r" />
                        )}

                        <div className="flex items-start justify-between gap-2 pl-1">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${vCfg?.dotCls || 'bg-zinc-400'}`} />
                              <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-red-700 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                {ver.version_name}
                              </h4>
                            </div>
                            {ver.is_current && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                <Award className="h-2.5 w-2.5" /> Versión actual
                              </span>
                            )}
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {ver.published_at && (
                                <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                                  <Calendar className="h-2.5 w-2.5" /> BOE {formatDate(ver.published_at)}
                                </span>
                              )}
                              {ver.effective_from && (
                                <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                                  <Clock className="h-2.5 w-2.5" /> Vigor {formatDate(ver.effective_from)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {getStatusBadge(ver.status)}
                            {userRole === 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditVersionModal(ver);
                                }}
                                className="p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                title="Editar versión"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-400 dark:text-zinc-600">
                    <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No hay versiones registradas.</p>
                  </div>
                )}
              </div>

              {/* Nota legal */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    <span className="font-bold">Nota legal:</span> Se muestra la versión vigente por defecto. El uso de versiones derogadas queda restringido a análisis comparativo.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Modal para Editar Versión */}
      {showEditVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Editar Versión</h3>
            </div>

            <form onSubmit={handleUpdateVersion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                  Nombre de la versión
                </label>
                <input
                  type="text"
                  value={versionEditForm.version_name}
                  onChange={(e) => setVersionEditForm({ ...versionEditForm, version_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">Estado</label>
                  <select
                    value={versionEditForm.status}
                    onChange={(e) => setVersionEditForm({ ...versionEditForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all"
                  >
                    <option value="vigente">Vigente</option>
                    <option value="ultraactividad">Ultraactividad</option>
                    <option value="derogado">Derogado</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="edit_is_current"
                    checked={versionEditForm.is_current}
                    onChange={(e) => setVersionEditForm({ ...versionEditForm, is_current: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="edit_is_current" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Marcar como vigente
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">Publicación BOE</label>
                  <input
                    type="date"
                    value={versionEditForm.published_at}
                    onChange={(e) => setVersionEditForm({ ...versionEditForm, published_at: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">Entrada en vigor</label>
                  <input
                    type="date"
                    value={versionEditForm.effective_from}
                    onChange={(e) => setVersionEditForm({ ...versionEditForm, effective_from: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                  Enlace del archivo PDF
                </label>
                <input
                  type="text"
                  value={versionEditForm.file_path}
                  onChange={(e) => setVersionEditForm({ ...versionEditForm, file_path: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEditVersionModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
