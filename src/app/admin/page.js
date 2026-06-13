'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { mockClient, isMocked, supabase } from '@/lib/supabase';
import { Upload, ShieldAlert, CheckCircle, AlertCircle, ArrowLeft, FileText, Plus, Layers, Globe } from 'lucide-react';

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

  useEffect(() => {
    // Cargar listas de selección y datos si estamos en modo edición
    async function loadFormMetadata() {
      try {
        let sectorsData = [];
        let scopesData = [];
        let docsData = [];

        if (isMocked) {
          sectorsData = await mockClient.getSectors();
          scopesData = await mockClient.getScopes();
          docsData = await mockClient.getDocuments();
        } else {
          const { data: sData } = await supabase.from('sectors').select('*');
          const { data: scData } = await supabase.from('geographic_scopes').select('*');
          const { data: dData } = await supabase.from('documents').select('*');
          sectorsData = sData || [];
          scopesData = scData || [];
          docsData = dData || [];
        }

        setSectors(sectorsData);
        setScopes(scopesData);
        setDocuments(docsData);

        if (editDocId) {
          let docToEdit = null;
          if (isMocked) {
            docToEdit = await mockClient.getDocumentById(editDocId);
          } else {
            const { data, error } = await supabase
              .from('documents')
              .select('*')
              .eq('id', editDocId)
              .single();
            if (!error) docToEdit = data;
          }

          if (docToEdit) {
            setDocTitle(docToEdit.title);
            setDocDescription(docToEdit.description || '');
            setDocSectorId(docToEdit.sector_id);
            setDocScopeId(docToEdit.scope_id);
            setIsNewDocument(true); // Mostrar campos de edición de texto directamente
          }
        } else if (preselectedDocId) {
          setSelectedDocId(preselectedDocId);
          setIsNewDocument(false);
        }
      } catch (err) {
        console.error('Error al cargar datos del formulario:', err);
      }
    }
    loadFormMetadata();
  }, [preselectedDocId, editDocId]);

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

        if (isMocked) {
          await mockClient.updateDocument(editDocId, {
            title: docTitle,
            description: docDescription,
            sector_id: docSectorId,
            scope_id: docScopeId
          });
        } else {
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
        }

        // Si se seleccionó subir un archivo PDF o se enlazó una URL, crear una versión
        if (pdfFile || externalPdfUrl || versionName) {
          let filePath = '';
          if (pdfSourceType === 'url') {
            filePath = externalPdfUrl;
            if (!filePath) {
              throw new Error('Debe proporcionar la URL externa del PDF.');
            }
          } else {
            if (!isMocked && pdfFile) {
              const fileExt = pdfFile.name.split('.').pop();
              const fileName = `${editDocId}_${Date.now()}.${fileExt}`;
              const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('labor-documents')
                .upload(fileName, pdfFile);

              if (uploadErr) throw uploadErr;
              
              const { data: urlData } = supabase.storage
                .from('labor-documents')
                .getPublicUrl(fileName);
              
              filePath = urlData.publicUrl;
            } else {
              filePath = pdfFile 
                ? URL.createObjectURL(pdfFile) 
                : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
            }
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

          if (isMocked) {
            await mockClient.createVersion(versionData);
          } else {
            if (isCurrent) {
              await supabase
                .from('document_versions')
                .update({ is_current: false })
                .eq('document_id', editDocId);
            }

            const { error: verErr } = await supabase
              .from('document_versions')
              .insert(versionData);

            if (verErr) throw verErr;
          }
        }

        setMessage({ type: 'success', text: 'Convenio actualizado correctamente. Redirigiendo...' });
      } else {
        // 2. MODO CARGA NUEVO / NUEVA VERSIÓN
        if (pdfSourceType === 'file' && !pdfFile && !isMocked) {
          throw new Error('Es obligatorio subir un archivo PDF del documento o seleccionar el método de URL externa.');
        }
        if (pdfSourceType === 'url' && !externalPdfUrl) {
          throw new Error('Es obligatorio ingresar la URL externa del PDF.');
        }

        if (isNewDocument) {
          if (!docTitle || !docSectorId || !docScopeId) {
            throw new Error('Por favor, rellene todos los campos obligatorios del nuevo documento.');
          }

          if (isMocked) {
            const newDoc = await mockClient.createDocument({
              title: docTitle,
              description: docDescription,
              sector_id: docSectorId,
              scope_id: docScopeId
            });
            targetDocId = newDoc.id;
          } else {
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
          }
        } else {
          if (!targetDocId) {
            throw new Error('Seleccione un documento existente de la lista.');
          }
        }

        let filePath = '';
        if (pdfSourceType === 'url') {
          filePath = externalPdfUrl;
        } else {
          if (!isMocked && pdfFile) {
            const fileExt = pdfFile.name.split('.').pop();
            const fileName = `${targetDocId}_${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('labor-documents')
              .upload(fileName, pdfFile);

            if (uploadErr) throw uploadErr;
            
            const { data: urlData } = supabase.storage
              .from('labor-documents')
              .getPublicUrl(fileName);
            
            filePath = urlData.publicUrl;
          } else {
            filePath = pdfFile 
              ? URL.createObjectURL(pdfFile) 
              : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
          }
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

        if (isMocked) {
          await mockClient.createVersion(versionData);
        } else {
          if (isCurrent) {
            await supabase
              .from('document_versions')
              .update({ is_current: false })
              .eq('document_id', targetDocId);
          }

          const { error: verErr } = await supabase
            .from('document_versions')
            .insert(versionData);

          if (verErr) throw verErr;
        }

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
                </div>

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <Navbar />
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
