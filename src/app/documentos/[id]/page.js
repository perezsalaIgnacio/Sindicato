'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PdfViewer from '@/components/PdfViewer';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, FileText, Clock, Plus, Layers, Globe, ShieldAlert, Award } from 'lucide-react';
import Link from 'next/navigation';

export default function DocumentoViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id;

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [userRole, setUserRole] = useState('usuario');

  const [showEditVersionModal, setShowEditVersionModal] = useState(false);
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
    // Verificar rol de simulación local
    const simulatedUser = localStorage.getItem('simulated_user');
    if (simulatedUser) {
      setUserRole(JSON.parse(simulatedUser).role);
    }

    async function loadDocument() {
      setLoading(true);
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
          setDocument(docData);
          // Por defecto mostrar la versión marcada como vigente, si no hay ninguna, la más reciente
          const current = docData.versions?.find(v => v.is_current) || docData.versions?.[0];
          setSelectedVersion(current);
        }
      } catch (err) {
        console.error('Error al cargar documento:', err);
      } finally {
        setLoading(false);
      }
    }

    if (docId) {
      loadDocument();
    }
  }, [docId]);


  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'vigente':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/20 dark:text-emerald-400">
            Vigente
          </span>
        );
      case 'ultraactividad':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400">
            Ultraactividad
          </span>
        );
      case 'derogado':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10 dark:bg-rose-950/20 dark:text-rose-400">
            Derogado
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
          <p className="text-sm text-zinc-500 font-medium">Cargando visor documental...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Documento no encontrado</p>
          <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-6">
        {/* Cabecera / Retorno */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/')}
              className="mt-1 p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                  <Layers className="h-3.5 w-3.5 mr-0.5" />
                  {document.sectors?.name || 'General'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                  <Globe className="h-3.5 w-3.5 mr-0.5" />
                  {document.geographic_scopes?.type === 'nacional' 
                    ? 'Nacional' 
                    : document.geographic_scopes?.province_name || document.geographic_scopes?.region_name}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">
                {document.title}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl">
                {document.description}
              </p>
            </div>
          </div>

          {/* Botones de Admin: Editar y Nueva Versión */}
          {userRole === 'admin' && (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              <button
                onClick={() => router.push(`/admin?edit_id=${document.id}`)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-800 rounded-xl text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <span>Editar Convenio</span>
              </button>
              <button
                onClick={() => router.push(`/admin?document_id=${document.id}`)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-950 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-sm dark:bg-zinc-800 dark:hover:bg-red-700 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Versión</span>
              </button>
            </div>
          )}
        </div>

        {/* Contenido Principal: Visor a la izquierda, Historial a la derecha */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Columna Visor PDF */}
          <div className="lg:col-span-8 flex flex-col">
            {selectedVersion ? (
              <PdfViewer
                fileUrl={selectedVersion.file_path}
                versionName={selectedVersion.version_name}
                title={document.title}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-12 text-center bg-white dark:bg-zinc-900/40">
                <FileText className="h-12 w-12 text-zinc-400 mb-4" />
                <h3 className="text-lg font-bold">Sin versiones disponibles</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Este documento aún no tiene ningún archivo PDF cargado.</p>
              </div>
            )}
          </div>

          {/* Columna Historial Cronológico de Versiones (Sidebar) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col h-full shadow-sm">
              <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-4 mb-4">
                <Clock className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">Control de Versiones</h3>
                  <p className="text-[10px] text-zinc-500">Historial ordenado cronológicamente</p>
                </div>
              </div>

              {/* Lista de Versiones */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[480px]">
                {document.versions && document.versions.length > 0 ? (
                  document.versions.map((ver) => {
                    const isSelected = selectedVersion?.id === ver.id;
                    return (
                      <div
                        key={ver.id}
                        onClick={() => setSelectedVersion(ver)}
                        className={`group cursor-pointer p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                          isSelected
                            ? 'border-red-500 bg-red-50/20 dark:bg-red-950/10 dark:border-red-800/80 shadow-sm'
                            : 'border-zinc-100 bg-zinc-50/50 hover:bg-zinc-100/60 dark:border-zinc-800/50 dark:bg-zinc-950 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        {/* Indicador de Seleccionado */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-bold truncate max-w-[170px] ${isSelected ? 'text-red-700 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {ver.version_name}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(ver.status)}
                            {userRole === 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditVersionModal(ver);
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Editar versión"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {ver.is_current && (
                          <span className="inline-flex mt-1 items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:bg-emerald-950/30 dark:text-emerald-400">
                            <Award className="h-2.5 w-2.5" />
                            Versión Vigente
                          </span>
                        )}

                        {/* Metadatos Cronológicos */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Publicado: {formatDate(ver.published_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Vigor: {formatDate(ver.effective_from)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-400">
                    <p className="text-xs">No hay versiones registradas.</p>
                  </div>
                )}
              </div>

              {/* Advertencia Informativa sobre Vigencias */}
              <div className="mt-5 p-3.5 bg-red-50/50 border border-red-100 rounded-xl dark:bg-red-950/10 dark:border-red-900/20 text-[11px] text-zinc-600 dark:text-zinc-400 leading-normal">
                <span className="font-bold text-red-600 dark:text-red-400">Nota Legal: </span>
                Por defecto se muestra la versión vigente autorizada. El uso de versiones derogadas queda restringido a efectos comparativos o análisis de derechos adquiridos históricos.
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Modal para Editar Versión */}
      {showEditVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600 animate-pulse" />
              Editar Metadatos de la Versión
            </h3>

            <form onSubmit={handleUpdateVersion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                  Nombre de la Versión
                </label>
                <input
                  type="text"
                  value={versionEditForm.version_name}
                  onChange={(e) => setVersionEditForm({ ...versionEditForm, version_name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Estado
                  </label>
                  <select
                    value={versionEditForm.status}
                    onChange={(e) => setVersionEditForm({ ...versionEditForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
                  >
                    <option value="vigente">Vigente</option>
                    <option value="ultraactividad">Ultraactividad</option>
                    <option value="derogado">Derogado</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="edit_is_current"
                    checked={versionEditForm.is_current}
                    onChange={(e) => setVersionEditForm({ ...versionEditForm, is_current: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                  <label htmlFor="edit_is_current" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Establecer como Vigente
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Publicación BOE
                  </label>
                  <input
                    type="date"
                    value={versionEditForm.published_at}
                    onChange={(e) => setVersionEditForm({ ...versionEditForm, published_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Entrada en Vigor
                  </label>
                  <input
                    type="date"
                    value={versionEditForm.effective_from}
                    onChange={(e) => setVersionEditForm({ ...versionEditForm, effective_from: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                  Enlace del Archivo PDF
                </label>
                <input
                  type="text"
                  value={versionEditForm.file_path}
                  onChange={(e) => setVersionEditForm({ ...versionEditForm, file_path: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowEditVersionModal(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
