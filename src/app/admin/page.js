'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Upload, ShieldAlert, CheckCircle, AlertCircle, ArrowLeft, FileText, Plus, Layers, Globe, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

// Componente secundario para envolver el uso de hooks de búsqueda
function AdminFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDocId = searchParams.get('document_id');
  const editDocId = searchParams.get('edit_id');
  const isEditMode = !!editDocId;

  const [sectors, setSectors] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isNewDocument, setIsNewDocument] = useState(false);
  
  // Estado del Formulario
  const [selectedDocId, setSelectedDocId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docSectorId, setDocSectorId] = useState('');
  const [docScopeId, setDocScopeId] = useState('');

  // Metadatos de la Versión
  const [versionName, setVersionName] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [status, setStatus] = useState('vigente');
  const [isCurrent, setIsCurrent] = useState(true);
  
  // Archivo PDF / URL externa
  const [pdfSourceType, setPdfSourceType] = useState('file'); // 'file' | 'url'
  const [externalPdfUrl, setExternalPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Dialog controls for adding new sector/scope
  const [showSectorDialog, setShowSectorDialog] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorSlug, setNewSectorSlug] = useState('');

  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [newScopeType, setNewScopeType] = useState('nacional');
  const [newRegionName, setNewRegionName] = useState('');
  const [newProvinceName, setNewProvinceName] = useState('');

  // Handlers to create sector and scope via API
  const createSector = async () => {
    if (!newSectorName || !newSectorSlug) {
      setMessage({ type: 'error', text: 'Nombre y slug del sector son obligatorios.' });
      return;
    }
    const res = await fetch('/api/sectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSectorName, slug: newSectorSlug }),
    });
    if (res.ok) {
      setMessage({ type: 'success', text: 'Sector creado correctamente.' });
      setShowSectorDialog(false);
      // Refresh sectors
      const s = await fetch('/api/sectors').then(r => r.json());
      setSectors(s);
    } else {
      const err = await res.json();
      setMessage({ type: 'error', text: err.error || 'Error al crear sector.' });
    }
  };

  const createScope = async () => {
    if (!newScopeType) {
      setMessage({ type: 'error', text: 'Tipo de ámbito es obligatorio.' });
      return;
    }
    const payload = { type: newScopeType };
    if (newScopeType !== 'nacional') {
      payload.region_name = newRegionName || null;
      payload.province_name = newScopeType === 'provincial' ? newProvinceName : null;
    }
    const res = await fetch('/api/scopes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMessage({ type: 'success', text: 'Ámbito creado correctamente.' });
      setShowScopeDialog(false);
      const sc = await fetch('/api/scopes').then(r => r.json());
      setScopes(sc);
    } else {
      const err = await res.json();
      setMessage({ type: 'error', text: err.error || 'Error al crear ámbito.' });
    }
  };


  useEffect(() => {
    // Cargar listas de selección y datos si estamos en modo edición
    async function loadFormMetadata() {
      try {
        const { data: sData } = await supabase.from('sectors').select('*').order('name');
        const { data: scData } = await supabase.from('geographic_scopes').select('*').order('type');
        const { data: dData } = await supabase
          .from('documents')
          .select(`
            *,
            sectors (*),
            geographic_scopes (*),
            document_versions (*)
          `)
          .order('title');

        setSectors(sData || []);
        setScopes(scData || []);
        setDocuments(dData || []);

        if (editDocId) {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', editDocId)
            .single();

          if (!error && data) {
            setDocTitle(data.title);
            setDocDescription(data.description || '');
            setDocSectorId(data.sector_id);
            setDocScopeId(data.scope_id);
            setIsNewDocument(true);
          }
        } else if (preselectedDocId) {
          setSelectedDocId(preselectedDocId);
          setIsNewDocument(false);
        }
      } catch (err) {
        if (!err?.message?.includes('fetch')) {
          console.warn('Error al cargar datos del formulario:', err);
        }
      }
    }
    loadFormMetadata();
  }, [preselectedDocId, editDocId]);

  const handleDeleteDocument = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar este convenio y todas sus versiones? Esta acción no se puede deshacer.')) return;
    
    const { error: verErr } = await supabase.from('document_versions').delete().eq('document_id', id);
    if (verErr) {
      setMessage({ type: 'error', text: 'Error al eliminar las versiones del convenio: ' + verErr.message });
      return;
    }
    
    const { error: docErr } = await supabase.from('documents').delete().eq('id', id);
    if (docErr) {
      setMessage({ type: 'error', text: 'Error al eliminar el convenio: ' + docErr.message });
    } else {
      setMessage({ type: 'success', text: 'Convenio eliminado correctamente.' });
      const { data } = await supabase
        .from('documents')
        .select(`
          *,
          sectors (*),
          geographic_scopes (*),
          document_versions (*)
        `)
        .order('title');
      setDocuments(data || []);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      let targetDocId = editDocId || selectedDocId;

      if (isEditMode) {
        // 1. MODO EDICIÓN
        if (!docTitle || !docSectorId || !docScopeId) {
          throw new Error('Por favor, rellene todos los campos obligatorios del convenio.');
        }

        const { error: docErr } = await supabase
          .from('documents')
          .update({
            title: docTitle,
            description: docDescription,
            sector_id: Number(docSectorId),
            scope_id: Number(docScopeId)
          })
          .eq('id', editDocId);

        if (docErr) throw docErr;

        // Si se seleccionó subir un archivo PDF o se enlazó una URL, crear una versión
        if (pdfFile || externalPdfUrl || versionName) {
          let filePath = '';
          if (pdfSourceType === 'url') {
            filePath = externalPdfUrl;
            if (!filePath) throw new Error('Debe proporcionar la URL externa del PDF.');
          } else if (pdfFile) {
            const fileExt = pdfFile.name.split('.').pop();
            const fileName = `${editDocId}_${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('labor-documents')
              .upload(fileName, pdfFile);
            if (uploadErr) throw uploadErr;
            const { data: urlData } = supabase.storage.from('labor-documents').getPublicUrl(fileName);
            filePath = urlData.publicUrl;
          }

          const versionData = {
            document_id: editDocId,
            version_name: versionName || `Versión Modificada ${new Date().getFullYear()}`,
            file_path: filePath,
            published_at: publishedAt || new Date().toISOString().split('T')[0],
            effective_from: effectiveFrom || new Date().toISOString().split('T')[0],
            status: status,
            is_current: isCurrent,
            file_size: pdfFile ? pdfFile.size : 1500000
          };

          if (isCurrent) {
            await supabase.from('document_versions').update({ is_current: false }).eq('document_id', editDocId);
          }
          const { error: verErr } = await supabase.from('document_versions').insert(versionData);
          if (verErr) throw verErr;
        }

        setMessage({ type: 'success', text: 'Convenio actualizado correctamente. Redirigiendo...' });
      } else {
        // 2. MODO CARGA NUEVO / NUEVA VERSIÓN
        if (pdfSourceType === 'file' && !pdfFile) {
          throw new Error('Es obligatorio subir un archivo PDF del documento o seleccionar el método de URL externa.');
        }
        if (pdfSourceType === 'url' && !externalPdfUrl) {
          throw new Error('Es obligatorio ingresar la URL externa del PDF.');
        }

        if (isNewDocument) {
          if (!docTitle || !docSectorId || !docScopeId) {
            throw new Error('Por favor, rellene todos los campos obligatorios del nuevo documento.');
          }
          const { data: newDoc, error: docErr } = await supabase
            .from('documents')
            .insert({
              title: docTitle,
              description: docDescription,
              sector_id: Number(docSectorId),
              scope_id: Number(docScopeId),
              is_active: true
            })
            .select()
            .single();
          if (docErr) throw docErr;
          targetDocId = newDoc.id;
        } else {
          if (!targetDocId) throw new Error('Seleccione un documento existente de la lista.');
        }

        let filePath = '';
        if (pdfSourceType === 'url') {
          filePath = externalPdfUrl;
        } else if (pdfFile) {
          const fileExt = pdfFile.name.split('.').pop();
          const fileName = `${targetDocId}_${Date.now()}.${fileExt}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('labor-documents')
            .upload(fileName, pdfFile);
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage.from('labor-documents').getPublicUrl(fileName);
          filePath = urlData.publicUrl;
        }

        const versionData = {
          document_id: targetDocId,
          version_name: versionName || `Versión ${new Date().getFullYear()}`,
          file_path: filePath,
          published_at: publishedAt || new Date().toISOString().split('T')[0],
          effective_from: effectiveFrom || new Date().toISOString().split('T')[0],
          status: status,
          is_current: isCurrent,
          file_size: pdfFile ? pdfFile.size : 1500000
        };

        if (isCurrent) {
          await supabase.from('document_versions').update({ is_current: false }).eq('document_id', targetDocId);
        }
        const { error: verErr } = await supabase.from('document_versions').insert(versionData);
        if (verErr) throw verErr;

        setMessage({ type: 'success', text: 'Documento y versión subidos correctamente. Redirigiendo...' });
      }

      setTimeout(() => {
        router.push(`/documentos/${targetDocId}`);
      }, 1500);

    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Ocurrió un error al procesar la solicitud.' });
    } finally {
      setUploading(false);
    }
  };

  if (!editDocId && !preselectedDocId) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Título y Acciones */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Panel de Control de Convenios</h1>
            <p className="text-sm text-zinc-500 mt-1">Gestiona y edita los convenios colectivos registrados en el repositorio.</p>
          </div>
          <button
            onClick={() => router.push('/admin/nuevo-convenio')}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-750 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Nuevo Convenio
          </button>
        </div>

        {/* Alertas */}
        {message.text && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-500/20'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
            <button className="ml-auto text-xs underline font-bold" onClick={() => setMessage({ text: '', type: '' })}>Cerrar</button>
          </div>
        )}

        {/* Stats Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Convenios</h3>
            <p className="text-3xl font-extrabold text-zinc-950 dark:text-white mt-2">{documents.length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Vigentes</h3>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              {documents.filter(d => d.document_versions?.find(v => v.is_current)?.status === 'vigente').length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sectores Activos</h3>
            <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-2">{sectors.length}</p>
          </div>
        </div>

        {/* Tabla de Documentos */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Convenio / Título</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Sector</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Ámbito</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Versión Activa</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900/30">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-sm text-zinc-500">
                      No hay convenios cargados en el repositorio.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const currentVersion = doc.document_versions?.find(v => v.is_current) || doc.document_versions?.[0];
                    const scopeLabel = doc.geographic_scopes?.type === 'nacional'
                      ? 'Nacional'
                      : doc.geographic_scopes?.province_name || doc.geographic_scopes?.region_name || 'Nacional';
                    
                    return (
                      <tr key={doc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                            <Link href={`/documentos/${doc.id}`} className="text-sm font-bold text-zinc-900 dark:text-white hover:text-red-600 hover:underline line-clamp-2">
                              {doc.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {doc.sectors?.name || 'General'}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {scopeLabel}
                        </td>
                        <td className="px-6 py-4">
                          {currentVersion ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 truncate max-w-[150px]">
                                {currentVersion.version_name}
                              </span>
                              <span className={`inline-flex items-center w-fit gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold mt-1 ${
                                currentVersion.status === 'vigente' 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                  : currentVersion.status === 'ultraactividad'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                  : 'bg-zinc-100 text-zinc-500'
                              }`}>
                                {currentVersion.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-450">Sin versión</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/admin?edit_id=${doc.id}`)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 transition-colors"
                              title="Editar convenio"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => router.push(`/admin?document_id=${doc.id}`)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 transition-colors"
                              title="Añadir nueva versión"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 transition-colors"
                              title="Eliminar convenio"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Botón de Retorno */}
      <button
        onClick={() => router.push(isEditMode ? `/documentos/${editDocId}` : '/')}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEditMode ? 'Volver al Convenio' : 'Volver al Dashboard'}
      </button>

      {/* Título de Página */}
      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-5 mb-8">
        <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {isEditMode ? 'Editar Convenio Colectivo' : 'Panel de Administración'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isEditMode 
              ? 'Modificar el título, descripción, sector o ámbito territorial del convenio.' 
              : 'Subir nuevos convenios, estatutos o versiones de documentos oficiales.'}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-start gap-3 mb-6 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-500/20'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Sección 1: Definición de Documento */}
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-4">
            <h2 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              {isEditMode ? '1. Datos Generales del Convenio' : '1. Selección de Documento'}
            </h2>
            {!isEditMode && (
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsNewDocument(false)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    !isNewDocument 
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white' 
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Existente
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewDocument(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    isNewDocument 
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white' 
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Crear Nuevo
                </button>
              </div>
            )}
          </div>

          {!isNewDocument ? (
            /* Documento Existente (solo disponible al crear versiones, no al editar el propio convenio) */
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Seleccionar Documento
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-800 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              >
                <option value="">-- Seleccione un documento --</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Documento Nuevo / Edición */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Título del Documento *
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ej: Convenio Colectivo de Oficinas y Despachos"
                  required
                  className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-900 placeholder-zinc-550 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Resumen del ámbito de aplicación y contenido del convenio..."
                  rows="3"
                  className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-900 placeholder-zinc-550 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    Sector Económico *
                  </label>
                  <select
                    value={docSectorId}
                    onChange={(e) => setDocSectorId(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-800 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  >
                    <option value="">Seleccione sector</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowSectorDialog(true)}
                    className="ml-2 px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    + Nuevo Sector
                  </button>
  {showSectorDialog && (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 bg-opacity-80 backdrop-blur-md rounded-xl p-6 w-96 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Agregar Nuevo Sector</h2>
          <button type="button"
            onClick={() => { setShowSectorDialog(false); setNewSectorName(''); setNewSectorSlug(''); }}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white">
            ✕
          </button>
        </div>
        <input
          type="text"
          placeholder="Nombre"
          value={newSectorName}
          onChange={(e) => setNewSectorName(e.target.value)}
          className="w-full mb-2 p-2 border rounded bg-white dark:bg-zinc-700"
        />
        <input
          type="text"
          placeholder="Slug"
          value={newSectorSlug}
          onChange={(e) => setNewSectorSlug(e.target.value)}
          className="w-full mb-4 p-2 border rounded bg-white dark:bg-zinc-700"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={createSector}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">
            Crear
          </button>
          <button
            type="button"
            onClick={() => { setShowSectorDialog(false); setNewSectorName(''); setNewSectorSlug(''); }}
            className="px-4 py-2 bg-gray-300 dark:bg-zinc-600 text-black dark:text-white rounded hover:bg-gray-400 transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )}
                </div>

{showScopeDialog && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="bg-white dark:bg-zinc-800 bg-opacity-80 backdrop-blur-md rounded-xl p-6 w-96 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Agregar Nuevo Ámbito</h2>
        <button type="button"
          onClick={() => { setShowScopeDialog(false); setNewScopeType('nacional'); setNewRegionName(''); setNewProvinceName(''); }}
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white"
        >✕</button>
      </div>
      <select value={newScopeType} onChange={(e)=> setNewScopeType(e.target.value)} className="w-full mb-2 p-2 border rounded bg-white dark:bg-zinc-700">
        <option value="nacional">Nacional</option>
        <option value="autonomico">Autónomico</option>
        <option value="provincial">Provincial</option>
      </select>
      {newScopeType !== 'nacional' && (
        <>
          <input type="text" placeholder="Nombre Región" value={newRegionName} onChange={(e)=> setNewRegionName(e.target.value)} className="w-full mb-2 p-2 border rounded bg-white dark:bg-zinc-700" />
          {newScopeType === 'provincial' && (
            <input type="text" placeholder="Nombre Provincia" value={newProvinceName} onChange={(e)=> setNewProvinceName(e.target.value)} className="w-full mb-4 p-2 border rounded bg-white dark:bg-zinc-700" />
          )}
        </>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={createScope} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Crear</button>
        <button type="button" onClick={() => { setShowScopeDialog(false); setNewScopeType('nacional'); setNewRegionName(''); setNewProvinceName(''); }} className="px-4 py-2 bg-gray-300 dark:bg-zinc-600 text-black dark:text-white rounded hover:bg-gray-400 transition">Cancelar</button>
      </div>
    </div>
  </div>
)}

                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    Ámbito Geográfico *
                  </label>
                  <select
                    value={docScopeId}
                    onChange={(e) => setDocScopeId(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-800 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  >
                    <option value="">Seleccione ámbito</option>
                    {scopes.map((sc) => {
                      let label = sc.type === 'nacional' ? 'Nacional' : '';
                      if (sc.type === 'autonomico') label = `Autonómico - ${sc.region_name}`;
                      if (sc.type === 'provincial') label = `Provincial - ${sc.province_name}`;
                      return (
                        <option key={sc.id} value={sc.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                    <button
                      type="button"
                      onClick={() => setShowScopeDialog(true)}
                      className="ml-2 px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      + Nuevo Ámbito
                    </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sección 2: Carga y Metadatos de Versión (Opcional en modo edición) */}
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800/60 pb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-red-600" />
            {isEditMode ? '2. Cargar Nueva Versión (Opcional)' : '2. Nueva Versión y Archivo'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre de la versión */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Nombre de la Versión {isEditMode ? '(Opcional)' : '*'}
              </label>
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder={isEditMode ? "Ej: Modificación Anexo 2025" : "Ej: Versión 2025"}
                required={!isEditMode}
                className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-900 placeholder-zinc-550 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-855 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              >
                <option value="vigente">Vigente</option>
                <option value="ultraactividad">Ultraactividad</option>
                <option value="derogado">Derogado</option>
              </select>
            </div>

            {/* Publicación BOE */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Fecha Publicación BOE/BOCM
              </label>
              <input
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-900 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            {/* Entrada en vigor */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Fecha Entrada en Vigor {isEditMode ? '(Opcional)' : '*'}
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required={!isEditMode && !!versionName}
                className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-900 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          </div>

          {/* Carga del PDF u Origen URL */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              Origen del Archivo PDF {isEditMode && '(Opcional)'}
            </label>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit mb-4">
              <button
                type="button"
                onClick={() => setPdfSourceType('file')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  pdfSourceType === 'file'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Subir Archivo (.pdf)
              </button>
              <button
                type="button"
                onClick={() => setPdfSourceType('url')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  pdfSourceType === 'url'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Enlazar URL Externa (ej: BOE)
              </button>
            </div>

            {pdfSourceType === 'file' ? (
              /* Carga del PDF */
              <div className="flex justify-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 px-6 py-8 bg-zinc-50/50 dark:bg-zinc-950/20">
                <div className="text-center">
                  <Upload className="mx-auto h-10 w-10 text-zinc-400" />
                  <div className="mt-4 flex text-sm text-zinc-600 dark:text-zinc-400">
                    <label className="relative cursor-pointer rounded-md font-semibold text-red-600 hover:text-red-500 focus-within:outline-none dark:text-red-400">
                      <span>Seleccionar archivo PDF</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">PDF de hasta 15MB</p>
                  {pdfFile && (
                    <p className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Seleccionado: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Input URL externa */
              <div className="space-y-2">
                <input
                  type="url"
                  value={externalPdfUrl}
                  onChange={(e) => setExternalPdfUrl(e.target.value)}
                  placeholder="https://www.boe.es/descargas/pdf/codigo.php?id=002_Codigo_del_Trabajo&modo=2"
                  required={!isEditMode && pdfSourceType === 'url'}
                  className="block w-full rounded-xl border border-zinc-200 py-3 px-4 text-sm bg-zinc-50/50 text-zinc-900 placeholder-zinc-500 outline-none focus:border-red-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
                <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                  Ingresa un enlace público directo a un PDF (ej: de boe.es). El visor utilizará el proxy integrado automáticamente para cargarlo sin problemas.
                </p>
              </div>
            )}
          </div>

          {/* Checkbox Vigencia Activa */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_current"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <label htmlFor="is_current" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Establecer esta versión como la vigente por defecto en consultas
            </label>
          </div>
        </div>

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-red-700 disabled:bg-zinc-400 disabled:cursor-not-allowed dark:bg-red-700 dark:hover:bg-red-600"
        >
          {uploading 
            ? 'Guardando...' 
            : isEditMode 
              ? 'Guardar Cambios del Convenio' 
              : 'Publicar Documento / Versión'}
        </button>

      </form>
    </div>
  );
}

// Envuelvo el formulario en un Suspense para cumplir con los requisitos de App Router de Next.js
export default function AdminPanelPage() {
  return (
    <div className="text-zinc-900 dark:text-zinc-50 w-full">
      <Suspense fallback={
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
        </div>
      }>
        <AdminFormContent />
      </Suspense>
    </div>
  );
}
